import pool from '../../db/database.js';
import bcrypt from 'bcrypt';


export const createUser = async (username, password, email, city, state, country, timezone) => {
    console.log(`Creating user: ${username}, ${email}`);
    const client = await pool.connect();
    console.log(`Database client connected for createUser`);
    const passwordHash = await bcrypt.hash(password, 10);
    try {
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
    client = await pool.connect();
    try {
        response = await client.query(`
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
