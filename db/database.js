import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();




const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

client = await pool.connect();
console.log('Database connected successfully');
client.release();

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1); // Exit process or handle error appropriately
});
pool.on('connect', (client) => {
  console.error('connection initiated');  
});

export default pool; 



