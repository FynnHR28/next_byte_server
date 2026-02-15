import { Pool } from 'pg';
import dotenv from 'dotenv';
import { initDbCache } from './init_dbcache.js'
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});


pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1); // Exit process or handle error appropriately
});
pool.on('connect', (client) => {
  console.error('Database connection initiated');  
});

// We can add more objects to this cache if it becomes apparent we might want some things easily accesible and not 
// hard coded in backend or frontend code

export const dbCache = await initDbCache(pool)
console.log('Database cache initiated')

export default pool; 



