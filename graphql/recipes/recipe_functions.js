import pool from '../../db/database.js';
import { generateRowInsert } from '../../db/transactions.js';
import { rawIngredientToCanonicalPipeline } from '../../nlp/ingredients/canonical_ingredient.js';
import { dbCache } from '../../db/database.js';

// Store this to reduce DB reads, restart app if you make a change to the canonical_ingredient table
const { canonicalIngredients } = dbCache;


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

export const createRecipe = async (recipeInput, userId) => {
    const client = await pool.connect();
    console.log(`in create recipe for user: ${userId}`);
    
 
    // Extract the ingredients and instructions (if passed) since they are inserted into different tables
    const { ingredients, instructions, ...recipeData } = recipeInput; 
    
    
    // Add the necessary data for insert that would not be passed from client
    const recipeDataFull = [{...recipeData, "user_id": userId, "created_at": "NOW()", "updated_at": "NOW()"}];
   
    // generate the query string and values list
    const { query: recipeInsert, values: recipeValues } = generateRowInsert(recipeDataFull, "public.recipe");


    try {
        // insert recipe and store the recipe id for inserting ingredients and instructions
        // const recipeResponse = await client.query(
        //     recipeInsert,
        //     recipeValues
        // );
        // const recipeId = recipeResponse.rows[0].id;  
        
        // const instructionsFull = instructions.map((instr) => {
        //     return {...instr, "recipe_id": recipeId, "created_at": "NOW()", "updated_at": "NOW()"}
        // });

        // const { query: instructionInsert, values: instructionValues } = generateRowInsert(instructionsFull, "public.recipe_instructions");

        // const instructionsResponse = await client.query(instructionInsert, instructionValues);

        const recipeId = 2;

       

        const ingredientsFull = ingredients.map((ingredient) => {
            
            // Initialize the server side fields that need to be added to each recipe_ingredient insert
            let ingredientFieldsToAdd = {"recipe_id": recipeId, "created_at": "NOW()", "updated_at": "NOW()"}
            
            // returns a match object with the id of the canonical ingredient this ingredient was matched to (if a match was determined)
            const canonicalIngredientMatch = rawIngredientToCanonicalPipeline(ingredient.display_text, canonicalIngredients);
            // If there is a real match, add it into the fields to add
            if(canonicalIngredientMatch.matchId) ingredientFieldsToAdd = {...ingredientFieldsToAdd, 'master_ingredient_id': canonicalIngredientMatch.matchId}

            return {...ingredient, ...ingredientFieldsToAdd}
        });

        const { query: ingredientsInsert, values: ingredientsValues } = generateRowInsert(ingredientsFull, "public.recipe_ingredient");

        console.log('Generated insert for recipe ingredients!')
        console.log(ingredientsInsert);
        console.log(ingredientsValues);


        
    }
    catch (err){
        console.error(`Error thrown by db during getRecipe ${ err }`)
        throw new Error(`Database error while retrieving recipe: ${ err.message }`)
    }
    finally {
        client.release()
    }
 }


/* ================================================================================================================================================================ */


        