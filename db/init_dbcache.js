
// Using the connection to our db, cache some results that are needed frequently in our resolvers to significantly reduce DB reads
export const initDbCache = async (pool) => {
  
    let dbCache = {};
    const client = await pool.connect()

    // 1. master ingredient list
    const canonicalResp = await client.query(`
        SELECT id, canonical_name from public.canonical_ingredient;
    `);

    const canonicalIngredients = canonicalResp.rows.reduce( (acc, currData) => {
        acc[currData.canonical_name] = currData.id;
        return acc
    }, {});
    
    dbCache['canonicalIngredients'] = canonicalIngredients;

    // 2. All reference values for inexpensive lookups
    const referenceValuesResponse = await client.query(`
        
        select 'ref_cuisine' as table_name, id, name from ref_cuisine
        UNION ALL
         select 'ref_recipe_category' as table_name, id, name from ref_recipe_category
        UNION ALL
         select 'ref_unit' as table_name, id, name from ref_unit
        UNION ALL
         select 'ref_difficulty' as table_name, id, name from ref_difficulty
        UNION ALL
         select 'ref_diet_info' as table_name, id, name from ref_diet_info

    `);

    const refRows = referenceValuesResponse.rows;
    refRows.forEach(refRow => {
        dbCache[refRow.table_name.toString()] ??= {};
        dbCache[refRow.table_name.toString()][refRow.id.toString()] = refRow.name;
        dbCache[refRow.table_name.toString()][refRow.id.toString()] = refRow.name
    });


    // 3. Release and return
    client.release()

    return dbCache
}

