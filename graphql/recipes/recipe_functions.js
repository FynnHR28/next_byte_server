import pool from '../../db/database.js';
import { generateRowInsert, generateDynamicUpdate } from '../../db/transactions.js';
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

/* ================================================================================================================================================================ */
/* DELETE RECIPE */

export const deleteRecipe = async (recipeId, actorId, actorRole) => {
    const client = await pool.connect();
    const recipe = await getRecipe(recipeId);

    // unauthorized guardrails
    if(!recipe) throw new Error('Requested recipe does not exist');
    if(recipe.user_id != actorId && actorRole != "admin") throw new Error('You are not authorized to request this action!');

    try {
        const response = await client.query(`
                DELETE FROM public.recipe
                WHERE id = $1
        `, [recipeId])

        return true
    } 
    catch(err){
        throw new Error(`Server errored when attempting delete recipe: ${err}`)
    } 
    finally{
        client.release()
    }


}

/* ================================================================================================================================================================ */
/* CREATE RECIPE */

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
        const recipeResponse = await client.query(
            recipeInsert + '\n RETURNING id', // Making sure the response has the new id
            recipeValues
        );

        const recipeId = recipeResponse.rows[0].id;  
        console.log(`recipe created with id: ${recipeId}`);


        // instructions are not required to create a recipe, see recipe_typeDefs.graphql
        if (instructions) {

            const instructionsFull = instructions.map((instr) => {
                return {...instr, "recipe_id": recipeId, "created_at": "NOW()", "updated_at": "NOW()"}
            });

            const { query: instructionInsert, values: instructionValues } = generateRowInsert(instructionsFull, "public.recipe_instructions");
            const instructionsResponse = await client.query(instructionInsert, instructionValues);
        };
     
        
        // ingredients are not required to create a recipe, see recipe_typeDefs.graphql

        if (ingredients) {
            
            const ingredientsFull = processIngredientsInput(ingredients, recipeId, 'insert')
            const { query: ingredientsInsert, values: ingredientsValues } = generateRowInsert(ingredientsFull, "public.recipe_ingredient");
            const ingredientsResponse = await client.query(ingredientsInsert, ingredientsValues);
        
        };
        
        return true;

        
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
/* UPDATE RECIPE */

export const updateRecipe = async (updateRecipeInput, actorId, actorRole) => {
    const client = await pool.connect();
    const recipe = await getRecipe(updateRecipeInput.id);
    
    // unauthorized guardrails
    if(!recipe) throw new Error('Requested recipe does not exist');
    if(recipe.user_id != actorId && actorRole != "admin") throw new Error('You are not authorized to request this action!');

    const { ingredients, instructions, ...recipeData } = updateRecipeInput; 
    

    try {
        // if any recipe related fields OTHER THAN ID are passed, go ahead and update them
        if(Object.keys(recipeData).length > 1){
            console.log('updating recipe')
            const { query: recipeUpdate, values: recipeValues } = generateDynamicUpdate([recipeData], 'public.recipe', 'user_id', recipe.user_id)
            const updateRecipeResponse = await client.query(recipeUpdate, recipeValues);
        }
        // If ingredients were passed, make the necessary inserts and updates
        if (ingredients) {
              console.log('updating ingredients')
            // ingredients with an id passed from the client are ingredients to update
            const ingredientsToUpdate = ingredients.filter(ing => 'id' in ing );
            if (ingredientsToUpdate.length > 0) {
                const ingredientsUpdateFull = processIngredientsInput(ingredientsToUpdate, recipe.id, 'update');
                const { query:updateIngredientsQuery, values: updateIngredientsValues } = generateDynamicUpdate(ingredientsUpdateFull, 'recipe_ingredient', 'recipe_id', recipe.id);
                const updateIngredientsResponse = await client.query(updateIngredientsQuery, updateIngredientsValues);
            }
            
            // ingredients to add will be any ingredient without an id passed from the client
            const ingredientsToInsert = ingredients.filter(ing => !('id' in ing))
            
            if (ingredientsToInsert.length > 0) {
                
                const ingredientsInsertFull = processIngredientsInput(ingredientsToInsert, recipe.id, 'insert');
                const { query: ingredientsInsert, values: ingredientsValues } = generateRowInsert(ingredientsInsertFull, "public.recipe_ingredient");
                const ingredientsInsertResponse = await client.query(ingredientsInsert, ingredientsValues);
            }
        }
        // if Instructions were passed, make the necessary inserts and updates
        if(instructions){
              console.log('updating instr')
            // ingredients with an id passed from the client are ingredients to update
            const instructionsToUpdate = instructions.filter(instr => 'id' in instr );
            if (instructionsToUpdate.length > 0) {
                const instructionsUpdateFull = processInstructionsInput(instructionsToUpdate, recipe.id, 'update');
                const { query:updateinstructionsQuery, values: updateinstructionsValues } = generateDynamicUpdate(instructionsUpdateFull, 'recipe_instruction', 'recipe_id', recipe.id);
                const updateinstructionsResponse = await client.query(updateinstructionsQuery, updateinstructionsValues);
            }
            
            // instructions to add will be any ingredient without an id passed from the client
            const instructionsToInsert = instructions.filter(ing => !('id' in ing))
            
            if (instructionsToInsert.length > 0) {
                const instructionsInsertFull = processInstructionsInput(instructionsToInsert, recipe.id, 'insert');
                const { query: instructionsInsert, values: instructionsValues } = generateRowInsert(instructionsInsertFull, "public.recipe_instruction");
                const instructionsInsertResponse = await client.query(instructionsInsert, instructionsValues);
            }
        }

        return true
    } 
    catch(err){
        throw new Error(`Server errored when attempting update recipe: ${err}`)
    } 
    finally{
        client.release()
    }


}

/* ================================================================================================================================================================ */
/* Formatting Functions */

const processIngredientsInput = (ingredients, recipeId, operationType='insert') => {
    
        return ingredients.map((ingredient) => {
            // Initialize the server side fields that need to be added to each recipe_ingredient insert
            let ingredientFieldsToAdd;
            operationType == 'insert'? ingredientFieldsToAdd = {"recipe_id": recipeId, "created_at": "NOW()", "updated_at": "NOW()"} : {};
            
            let canonicalIngredientMatch;

            if(ingredient.display_text) canonicalIngredientMatch = rawIngredientToCanonicalPipeline(ingredient.display_text, canonicalIngredients);
           
            if(canonicalIngredientMatch) ingredientFieldsToAdd = {...ingredientFieldsToAdd, 'canonical_ingredient_id': canonicalIngredientMatch.matchId}
            return {...ingredient, ...ingredientFieldsToAdd}
    });
}

const processInstructionsInput = (instructions, recipeId, operationType='insert') => {
    
        return instructions.map((instructions) => {
            // Initialize the server side fields that need to be added to each recipe_instructions insert
            let instructionsFieldsToAdd;
            operationType == 'insert'? instructionsFieldsToAdd = {"recipe_id": recipeId, "created_at": "NOW()", "updated_at": "NOW()"} : {};
            return {...instructions, ...instructionsFieldsToAdd}
    });
}
   

/* ================================================================================================================================================================ */