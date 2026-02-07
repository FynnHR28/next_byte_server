import pool from '../../db/database.js';
import { hashPassword, checkPasswords } from '../../auth/auth.js';
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv';

dotenv.config();


const APP_SECRET = process.env.SUPER_SECRET

/* User related functions:
 Used internally and by user resolvers
 TODO: abstract database hits, set up database wrapper for query building, abstract server side field validation
*/

/* ================================================================================================================================================== */
/* Used in resolvers */ 

// called by createUser mutation, some fields may be null, TODO: abstract server side validators 
export const createUser = async (username, password, email, city, state, country, timezone) => {
    console.log(`Creating user: ${username}, ${email}`);
    const client = await pool.connect();
    console.log(`Database client connected for createUser`);

    const user = await getUserByEmail(email);

    if (user && !user.is_active) {
        throw new Error('Account was deleted');
    }

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

export const activateUser = async (email) => {
    const client = await pool.connect();
    console.log(`Attempting to activate user with email: ${email}`)
    try {
        const response = await client.query(`
            UPDATE public.user 
            SET 
            is_active = TRUE,
            updated_at = NOW()
            WHERE LOWER(email) = LOWER($1)
            RETURNING id
        `,
        [email]);
        if (response.rowCount === 0) {
            throw new Error('User not found or could not be activated');
        }
    } catch (err) {
        console.error(`Error thrown by db during activateUser ${ err }`)
        throw new Error(`Database error while activating user: ${ err.message }`)
    } finally {
        client.release()
    }
    return true;
}

export const deleteUser = async (id) => {
    const client = await pool.connect();
    console.log(`Attempting to delete user with id: ${id}`)
    try {
        const response = await client.query(`
            DELETE FROM public.user 
            WHERE id = $1
            RETURNING id
        `,
        [id]);
        if (response.rowCount === 0) {
            throw new Error('User not found or could not be deleted');
        }
    } catch (err) {
        console.error(`Error thrown by db during deleteUser ${ err }`)
        throw new Error(`Database error while deleting user: ${ err.message }`)
    } finally {
        client.release()
    }
    return true;
}

export const deactivateUser = async (id) => {
    const client = await pool.connect();
    console.log(`Attempting to deactivate user with id: ${id}`)
    try {
        const response = await client.query(`
            UPDATE public.user 
            SET 
            is_active = FALSE,
            updated_at = NOW()
            WHERE id = $1
            RETURNING id
        `,
        [id]);
        if (response.rowCount === 0) {
            throw new Error('User not found or could not be deactivated');
        }
    } catch (err) {
        console.error(`Error thrown by db during deactivateUser ${ err }`)
        throw new Error(`Database error while deactivating user: ${ err.message }`)
    } finally {
        client.release()
    }
    return true;
}

// called by user query
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

// called by login mutation 
export const verifyUser = async (email, password) => {

    const user = await getUserByEmail(email);

    // User email must exist
    if (!user) {
        throw new Error('Invalid email');
    }
    // Passwords must match
    const isValid = await checkPasswords(password, user.password_hash);
    if (!isValid) {
        throw new Error('Incorrect password, please try again');
    }

    // User must be active
    if (user && !user.is_active) {
        throw new Error('Account was deleted');
    }

    // Making sure to update user metadata upon successful login
    const client = await pool.connect();
    const response = await client.query(`
        UPDATE public.user 
        SET 
        last_login = NOW(),
        updated_at = NOW()
        WHERE id = $1
    `,
    [user.id]);
    client.release()

    // generate jwt to send to client, sign with env key
    const token = jwt.sign({ userId: user.id }, APP_SECRET, { expiresIn:"10m" });

    // schema of AuthPayload type is string, user
    return {
        token,
        user
    }
};

// called by logout mutation
export const logout = async (id) => {
    const client = await pool.connect();
    console.log('in backend logout')

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
            updated_at = NOW()
            WHERE id = $1
            RETURNING id
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

/* ================================================================================================================================================== */
/* helper functions */ 


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


