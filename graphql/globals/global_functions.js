import { dbCache } from '../../db/database.js';


export const getReferenceValueFromId = async (id, tableName) => {
    const value = dbCache[tableName.toString().toLowerCase()][id.toString()];
    if (!value) throw new Error(`Bad request: requested id for ${tableName} does not exist`);
    return value;
}