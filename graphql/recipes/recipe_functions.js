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

export const getRecipesForUser = async (userId) => {
    if (!userId) {
        throw new Error('User not authenticated');
    }

    const client = await pool.connect();
    try {
        const response = await client.query(
            `SELECT * FROM public.recipe WHERE user_id = $1 ORDER BY updated_at DESC`,
            [userId]
        );
        return response.rows;
    } catch (err) {
        console.error(`Error thrown by db during getRecipesForUser ${ err }`)
        throw new Error(`Database error while retrieving recipes: ${ err.message }`)
    } finally {
        client.release()
    }
}

export const getIngredientsByRecipeId = async (recipeId) => {
    const client = await pool.connect();
    try {
        const response = await client.query(
            `
            SELECT 
                ri.id,
                ri.display_text,
                ru.name AS unit,
                ri.quantity,
                ri.created_at,
                ri.updated_at
            FROM public.recipe_ingredient ri
            LEFT JOIN public.ref_unit ru ON ri.ref_unit_id = ru.id
            WHERE ri.recipe_id = $1
            ORDER BY ri.id ASC
            `,
            [recipeId]
        );
        return response.rows;
    } catch (err) {
        console.error(`Error thrown by db during getIngredientsByRecipeId ${ err }`)
        throw new Error(`Database error while retrieving ingredients: ${ err.message }`)
    } finally {
        client.release()
    }
}

export const getInstructionsByRecipeId = async (recipeId) => {
    const client = await pool.connect();
    try {
        const response = await client.query(
            `
            SELECT id, position, description, created_at, updated_at
            FROM public.recipe_instruction
            WHERE recipe_id = $1
            ORDER BY position ASC
            `,
            [recipeId]
        );
        return response.rows;
    } catch (err) {
        console.error(`Error thrown by db during getInstructionsByRecipeId ${ err }`)
        throw new Error(`Database error while retrieving instructions: ${ err.message }`)
    } finally {
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

            const { query: instructionInsert, values: instructionValues } = generateRowInsert(instructionsFull, "public.recipe_instruction");
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
            // Remove any ingredients that were deleted on the client.
            const ingredientIds = ingredients
                .filter((ing) => ing.id)
                .map((ing) => Number(ing.id))
                .filter((id) => !Number.isNaN(id));

            if (ingredientIds.length > 0) {
                // Map ingredient ids that still exist and delete those that aren't in the list
                const placeholders = ingredientIds.map((_, idx) => `$${idx + 2}`).join(', ');
                await client.query(
                    `DELETE FROM public.recipe_ingredient WHERE recipe_id = $1 AND id NOT IN (${placeholders})`,
                    [recipe.id, ...ingredientIds]
                );
            } else {
                // If no ingredient ids were passed (all were deleted), delete all ingredients for the recipe
                await client.query(
                    `DELETE FROM public.recipe_ingredient WHERE recipe_id = $1`,
                    [recipe.id]
                );
            }
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
            // Remove any instructions that were deleted on the client.
            const instructionIds = instructions
                .filter((instr) => instr.id)
                .map((instr) => Number(instr.id))
                .filter((id) => !Number.isNaN(id));

            if (instructionIds.length > 0) {
                // Map instruction ids that still exist and delete those that aren't in the list
                const placeholders = instructionIds.map((_, idx) => `$${idx + 2}`).join(', ');
                await client.query(
                    `DELETE FROM public.recipe_instruction WHERE recipe_id = $1 AND id NOT IN (${placeholders})`,
                    [recipe.id, ...instructionIds]
                );
            } else {
                // If no instruction ids were passed (all were deleted), delete all instructions for the recipe
                await client.query(
                    `DELETE FROM public.recipe_instruction WHERE recipe_id = $1`,
                    [recipe.id]
                );
            }
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
/* Recipe Book Functions */

/**
 * Get all recipe books for a given user. 
 * 
 * @param userId - The user id of the recipe books to retrieve
 * @returns An array of recipe book objects for the given user
 */
export const getRecipeBooksForUser = async (userId) => {
    const client = await pool.connect();
    try {
        const response = await client.query(
            `SELECT * FROM public.recipe_book WHERE user_id = $1`,
            [userId]
        );
        return response.rows;
    } catch (err) {
        console.error(`Error thrown by db during getRecipeBooksForUser ${ err }`)
        throw new Error(`Database error while retrieving recipe books: ${ err.message }`)
    } finally {
        client.release()
    }
}

/**
 * Get all recipes for a given recipe book.
 * 
 * @param recipeBookId - The recipe book id of the recipes to retrieve
 * @param userId - The user id of the owner requesting recipes
 * @returns An array of recipe objects for the given recipe book
 */
export const getRecipesForRecipeBook = async (recipeBookId, userId) => {
    const client = await pool.connect();
    try {
        const response = await client.query(
            `
            SELECT r.*
            FROM public.recipe r
            JOIN public.recipe_book_recipe rbr ON r.id = rbr.recipe_id
            WHERE rbr.recipe_book_id = $1
            AND rbr.user_id = $2
            `,
            [recipeBookId, userId]
        );
        return response.rows;
    } catch (err) {
        console.error(`Error thrown by db during getRecipesForRecipeBook ${ err }`)
        throw new Error(`Database error while retrieving recipes for recipe book: ${ err.message }`)
    } finally {
        client.release()
    }
}

/**
 * Create a new recipe book for a given user.
 * 
 * @param recipeBookInput - The input object containing the name and isPublic fields for the recipe book
 * @param userId - The user id of the owner of the recipe book
 * @returns The id of the newly created recipe book
 */
export const createRecipeBook = async (recipeBookInput, userId) => {
    const { name, isPublic } = recipeBookInput; 
    if (!name?.trim()) {
        throw new Error('Recipe book name is required');
    }

    const client = await pool.connect();
    try {
        const response = await client.query(
            `
            INSERT INTO public.recipe_book (name, is_public, user_id, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            RETURNING id
            `,
            [name.trim(), isPublic ?? false, userId]
        );
        return response.rows[0].id;
    } catch (err) {
        console.error(`Error thrown by db during createRecipeBook ${ err }`)
        throw new Error(`Database error while creating recipe book: ${ err.message }`)
    } finally {
        client.release()
    }
}

/**
 * Delete a recipe book if it belongs to the user. Also deletes all entries in the recipe_book_recipe table that reference 
 * the deleted recipe book, but doesn't delete any recipes since they can exist independently.
 * 
 * @param recipeBookId - The id of the recipe book to delete
 * @param userId - The user id of the owner of the recipe book
 * @returns True if the recipe book was successfully deleted, false otherwise
 */
export const deleteRecipeBook = async (recipeBookId, userId) => {
    const client = await pool.connect();

    // Check if the recipe book belongs to the user
    const belongsToUser = await checkIfRecipeBookBelongsToUser(recipeBookId, userId);
    if (!belongsToUser) {
        throw new Error('Recipe book not found or does not belong to user');
    }

    try {
        const response = await client.query(`
                DELETE FROM public.recipe_book
                WHERE id = $1
        `, [recipeBookId]
        );
        if (response.rowCount === 0) {
            throw new Error('Recipe book could not be deleted');
        }
        return true
    } 
    catch(err){
        throw new Error(`Server errored when attempting delete recipe book: ${err}`)
    } 
    finally{
        client.release()
    }
}

/**
 * Updates the name and/or isPublic fields of a recipe book if it belongs to currently signed in user.
 * 
 * @param recipeBookId - The id of the recipe book to update
 * @param recipeBookInput - The fields to update for the recipe book (name and/or isPublic)
 * @param userId - The user id of the owner of the recipe book
 * @returns True if the recipe book was successfully updated, false otherwise
 */
export const updateRecipeBook = async (recipeBookId, recipeBookInput, userId) => {
    const { name, isPublic } = recipeBookInput;

    const client = await pool.connect();

    // Check if the recipe book belongs to the user
    const belongsToUser = await checkIfRecipeBookBelongsToUser(recipeBookId, userId);
    if (!belongsToUser) {
        throw new Error('Recipe book not found or does not belong to user');
    }

    try {
        const response = await client.query(
            `
            UPDATE public.recipe_book
            SET
                name = COALESCE($1, name),
                is_public = COALESCE($2, is_public),
                updated_at = NOW()
            WHERE id = $3
            `,
            [name ?? null, isPublic ?? null, recipeBookId]
        );
        if (response.rowCount === 0) {
            throw new Error('Recipe book could not be updated');
        }
        return true;
    } catch (err) {
        console.error(`Error thrown by db during updateRecipeBook ${ err }`)
        throw new Error(`Database error while updating recipe book: ${ err.message }`)
    } finally {
        client.release()
    }
}

/**
 * Checks if the recipe book belongs to the user and if so, adds the given recipes to the given recipe book.
 * 
 * @param recipeIds - The recipe ids to add to the recipe book
 * @param recipeBookId - The recipe book id of the recipe book to add the recipe to
 * @param userId - The user id of the owner of the recipe book
 * @returns True if the recipes were processed successfully, false otherwise
 */
export const addRecipesToRecipeBook = async (recipeIds, recipeBookId, userId) => {
    if (!Array.isArray(recipeIds) || recipeIds.length < 1) {
        throw new Error('recipeIds must contain at least one recipe id');
    }

    const parsedRecipeIds = [...new Set(recipeIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id)))];
    if (parsedRecipeIds.length < 1) {
        throw new Error('No valid recipe ids were provided');
    }

    const client = await pool.connect();
    try {
        // Check if the recipe book belongs to the user
        const belongsToUser = await checkIfRecipeBookBelongsToUser(recipeBookId, userId);
        if (!belongsToUser) {
            throw new Error('Recipe book not found or does not belong to user');
        }

        const ownedRecipeIds = await getOwnedRecipeIds(parsedRecipeIds, userId);
        if (ownedRecipeIds.length !== parsedRecipeIds.length) {
            throw new Error('One or more recipes do not belong to user');
        }

        // Add recipes to the recipe book. Duplicates are ignored.
        await client.query(
            `
            INSERT INTO public.recipe_book_recipe (recipe_book_id, recipe_id, user_id, created_at, updated_at)
            SELECT $1, recipe_id, $2, NOW(), NOW()
            FROM UNNEST($3::int[]) AS recipe_id
            WHERE NOT EXISTS (
                SELECT 1
                FROM public.recipe_book_recipe existing
                WHERE existing.recipe_book_id = $1
                  AND existing.recipe_id = recipe_id
                  AND existing.user_id = $2
            )
            `,
            [recipeBookId, userId, ownedRecipeIds]
        );

        return true;
    } catch (err) {
        console.error(`Error thrown by db during addRecipesToRecipeBook ${ err }`)
        throw new Error(`Database error while adding recipes to recipe book: ${ err.message }`)
    } finally {
        client.release()
    }
}

/**
 * Checks if the recipe book belongs to the user and if so, deletes the given recipes from the given recipe book.
 * 
 * @param recipeIds - The recipe ids to delete from the recipe book
 * @param recipeBookId - The recipe book id of the recipe book to delete the recipe from
 * @param userId - The user id of the owner of the recipe book
 * @returns True if the recipes were processed successfully, false otherwise
 */
export const removeRecipesFromRecipeBook = async (recipeIds, recipeBookId, userId) => {
    if (!Array.isArray(recipeIds) || recipeIds.length < 1) {
        throw new Error('recipeIds must contain at least one recipe id');
    }

    const parsedRecipeIds = [...new Set(recipeIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id)))];
    if (parsedRecipeIds.length < 1) {
        throw new Error('No valid recipe ids were provided');
    }

    const client = await pool.connect();
    try {
        // Check if the recipe book belongs to the user
        const belongsToUser = await checkIfRecipeBookBelongsToUser(recipeBookId, userId);
        if (!belongsToUser) {
            throw new Error('Recipe book not found or does not belong to user');
        }
        
        // Delete recipes from the recipe book.
        await client.query(
            `
            DELETE FROM public.recipe_book_recipe 
            WHERE recipe_book_id = $1 AND recipe_id = ANY($2::int[]) AND user_id = $3
            `,
            [recipeBookId, parsedRecipeIds, userId]
        );

        return true;
    } catch (err) {
        console.error(`Error thrown by db during removeRecipesFromRecipeBook ${ err }`)
        throw new Error(`Database error while removing recipes from recipe book: ${ err.message }`)
    } finally {
        client.release()
    }
}

/* ================================================================================================================================================================ */
/* Helper Functions */
const checkIfRecipeBookBelongsToUser = async (recipeBookId, userId) => {
    const client = await pool.connect();
    try {
        const response = await client.query(
            `SELECT * FROM public.recipe_book WHERE id = $1 AND user_id = $2`,
            [recipeBookId, userId]
        );
        return response.rows.length > 0;
    } catch (err) {
        console.error(`Error thrown by db during checkIfRecipeBookBelongsToUser ${ err }`)
        throw new Error(`Database error while checking recipe book ownership: ${ err.message }`)
    } finally {
        client.release()
    }
}

const getOwnedRecipeIds = async (recipeIds, userId) => {
    const client = await pool.connect();
    try {
        const response = await client.query(
            `SELECT id FROM public.recipe WHERE id = ANY($1::int[]) AND user_id = $2`,
            [recipeIds, userId]
        );
        return response.rows.map((row) => Number(row.id));
    } catch (err) {
        console.error(`Error thrown by db during getOwnedRecipeIds ${ err }`)
        throw new Error(`Database error while checking recipe ownership: ${ err.message }`)
    } finally {
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
