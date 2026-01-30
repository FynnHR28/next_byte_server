import pool from '../../db/database.js';
import { hashPassword, checkPasswords } from '../../auth/auth.js';

/* User related functions:
 Used internally and by user resolvers
 TODO: abstract database hits, set up database wrapper for query building, abstract server side field validation
*/

// function used by createUser resolver, some fields may be null, TODO: abstract server side validators 
export const createUser = async (username, password, email, city, state, country, timezone) => {
    console.log(`Creating user: ${username}, ${email}`);
    const client = await pool.connect();
    console.log(`Database client connected for createUser`);

    // cannot have multiple emails
    const dup_email = await client.query(`
        SELECT COUNT(1) FROM public.user WHERE email = LOWER($1)
    `, [email])
    if(dup_email.rows[0].count > 0){
        throw new Error('Email is unavailable (case insensitive), please choose another')
    }

    // cannot have multiple usernames
    const dup_username = await client.query(`
        SELECT COUNT(1) FROM public.user WHERE username = LOWER($1)
    `, [username])
    if(dup_username.rows[0].count > 0){
        throw new Error('Username is unavailable (case insensitive), please choose another')
    }
    
    try {
        const passwordHash = await hashPassword(password);
        const response = await client.query(`
            INSERT INTO public.user 
            (username, password_hash, email, city, state, country, timezone, is_active, created_at, updated_at, last_login)
            VALUES
            ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW(), NOW(), NOW())
            RETURNING *;
        `,
        [username, passwordHash, email, city, state, country, timezone]);
        console.log(`User created with ID: ${ response.rows[0].id }`);
        return response.rows[0];
    }
    catch (err){
        console.error(`Error thrown during createUser ${ err }`)
        throw new Error(`${err.message }`)
    }
    finally {
        client.release()
    }
};

export const getUser = async (id) => {
    console.log(`Attempting to retrieve user with id: ${id}`)
    const client = await pool.connect();
    try {
        const response = await client.query(`
            SELECT * FROM public.user WHERE id = $1
        `,
        [id]);
        return response.rows[0];
    } catch (err) {
        console.error(`Error thrown by db during getUser ${ err }`)
        throw new Error(`Database error while retrieving user: ${ err.message }`)
    } finally {
        client.release()
    }
};

export const getUserByEmail = async (email) => {
    const client = await pool.connect();
    try {
        const response = await client.query(`
            SELECT * FROM public.user WHERE email = $1
        `,
        [email]);
        return response.rows[0];
    } catch (err) {
        console.error(`Error thrown by db during getUserByEmail ${ err }`)
        throw new Error(`Database error while retrieving user by email: ${ err.message }`)
    } finally {
        client.release()
    }
};

// Currently used for login resolver logic
export const verifyUser = async (email, password) => {

    const user = await getUserByEmail(email);
    // User email must exist
    if (!user) {
        throw new Error('Invalid email');
    }
    // User must be inactive
    if (user.is_active){
        throw new Error('User is already active, cannot log in')
    }
    // Passwords must match
    const isValid = await checkPasswords(password, user.password_hash);
    if (!isValid) {
        throw new Error('Incorrect password, please try again');
    }
    // Making sure to update user metadata upon successful login
    const client = await pool.connect();
    const response = await client.query(`
            UPDATE public.user 
            SET 
            last_login = NOW(),
            is_active = TRUE,
            updated_at = NOW()
            WHERE id = $1
    `,
    [user.id]);
    client.release()

    return user;
};


export const logout = async (id) => {
    const client = await pool.connect();

    try {
        const user = await getUser(id)
        console.log(`Attempting to logout user: ${user.id}`)
        if(!user.is_active) {
            throw new Error('User is not active, cannot log out')
        }
        // If user is active, update metadata
        const response = await client.query(`
            UPDATE public.user 
            SET 
            is_active = FALSE,
            updated_at = NOW()
            WHERE id = $1
            RETURNING id, is_active
        `,
        [id]);
        return true;
    } catch (err) {
        console.error(`Error thrown by db during logout ${ err }`)
        throw new Error(`${err.message }`)
    } finally {
        client.release()
    }
}


