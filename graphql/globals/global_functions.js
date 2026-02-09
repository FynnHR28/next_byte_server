import pool from '../../db/database.js';


export const getFieldContextById = async (id, tableName, fieldKey) => {
    const client = await pool.connect();
    try {
        const queryText = `SELECT ${fieldKey} FROM ${tableName} WHERE id = $1`;
        const response = await client.query(
            queryText,
            [id]
        );
        return response.rows[0][fieldKey];   
    }
    catch (err){
        console.error(`Error thrown by db during getFieldContextById ${ err }`)
        throw new Error(`Database error while retrieving ${fieldKey} from ${tableName}: ${ err.message }`)
    }
    finally {
        client.release()
    }
}