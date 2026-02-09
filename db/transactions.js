
const generatePlaceholders = (rowCount, colCount) => {
    return Array.from( {length: rowCount}, (_, i) => {
        return '(' + Array.from( {length: colCount}, (_, j) => `$${(i * colCount) + (j + 1)}`).join(', ') + ')'
    }).join(', \n')
}


export const generateRowInsert = (rows, tableName) => {

    if(rows.length < 1) throw new Error('List of data objects must contain at least one object');
    // extract the fields from the first data object (row)
    const fields = Object.keys(rows[0]);


    const values = rows.map((row) => {
        const rowVals =  Object.values(row)
        if(rowVals.length != fields.length) throw new Error("All rows must have the same number of fields");
        return rowVals;
    }).flat()

    const placeholders = generatePlaceholders(rows.length, fields.length);
    
    const query = `
        INSERT INTO ${tableName} (${fields.join(', ')})
        VALUES ${placeholders}
    `

    return {"query": query, "values": values}

}


