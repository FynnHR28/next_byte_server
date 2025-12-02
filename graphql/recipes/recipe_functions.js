import pool from '../../db/database.js';

export const getRecipe = async (id) => {
    const client = await pool.connect();
    try {
        const response = await client.query(
            `SELECT * FROM public.recipe WHERE id = $1`,
            [id]
        );
        return response.rows[0];   
    }
    catch (err){
        console.error(`Error thrown by db during getRecipe ${ err }`)
        throw new Error(`Database error while retrieving recipe: ${ err.message }`)
    }
    finally {
        client.release()
    }
}

        