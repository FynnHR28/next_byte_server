
// generate place holder values using the row, col dimensions of the insert object
const generatePlaceholders = (rowCount, colCount, operationType='insert') => {

    if(operationType == 'insert'){
        return Array.from( {length: rowCount}, (_, i) => {
            return '(' + Array.from( {length: colCount}, (_, j) => `$${(i * colCount) + (j + 1)}`).join(', ') + ')'
        });
    } 
}

   

const generateFlatValuesList = (rows, expectedFieldCount) => {
    return rows.map((row) => {
        const rowVals =  Object.values(row)
        if(rowVals.length != expectedFieldCount) throw new Error("All rows must have the same number of fields");
        return rowVals;
    }).flat()
}

export const generateRowInsert = (rows, tableName) => {

    if(rows.length < 1) throw new Error('List of data objects must contain at least one object');
    // extract the fields from the first data object (row)
    if(rows.length > 20) throw new Error('REJECTED. Please limit your insert requests to 20 at a time')
    
    const fields = Object.keys(rows[0]);

    // flatten all row values into a single list
    const values = generateFlatValuesList(rows, fields.length);

    const placeholders = generatePlaceholders(rows.length, fields.length).join(', \n');

    
    const query = `
        INSERT INTO ${tableName} (${fields.join(', ')})
        VALUES ${placeholders}
    `

    return {"query": query, "values": values}

}

export const generateDynamicUpdate = (rows, tableName, parentField=null, parentValue=null) => {
    
    if (!rows || rows.length < 1) throw new Error('list of rows must contain at least one object')
    
    const allFields = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
    
    // remove id from fields to update
    const fieldsToUpdate = allFields.filter((field) => field != 'id');
    
    const fieldSetters = fieldsToUpdate.map((field) => `${field} = COALESCE(data.${field}, prod.${field})`).join(', \n')
    
    let parentWhereClause = '';

    if (parentValue && parentValue) parentWhereClause = `AND prod.${parentField} = $2`;

    const query = `
        UPDATE ${tableName} prod
        SET ${fieldSetters},
        updated_at = NOW()
        FROM jsonb_populate_recordset(NULL::${tableName}, $1::jsonb) AS data
        
        WHERE prod.id = data.id
        ${parentWhereClause}
    `

    return { "query": query, "values": [JSON.stringify(rows), parentValue]};

}



