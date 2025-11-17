import pool from '../../db/database.js';
import { hashPassword, checkPasswords } from '../../auth/auth.js';



export const createUser = async (username, passwordHash, email, city, state, country, timezone) => {
    console.log(`Creating user: ${username}, ${email}`);
    const client = await pool.connect();
    console.log(`Database client connected for createUser`);
    try {
        const passwordHash = await hashPassword(password);
        const response = await client.query(`
            INSERT INTO public.user 
            (username, password_hash, email, city, state, country, timezone, is_active, created_at, updated_at)
            VALUES
            ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW(), NOW())
            RETURNING *;
        `,
        [username, passwordHash, email, city, state, country, timezone]);
        console.log(`User created with ID: ${ response.rows[0].id }`);
        return response.rows[0];
    }
    catch (err){
        console.error(`Error thrown by db during createUser ${ err }`)
        throw new Error(`Database error while creating user: ${ err.message }`)
    }
    finally {
        client.release()
    }

};

export const getUser = async (id) => {
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

