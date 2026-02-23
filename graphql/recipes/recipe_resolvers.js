import { timestampsToDateResolver } from "../globals/global_res.js";
import { getUser } from "../users/user_functions.js";
import {
    getRecipe,
    getRecipesForUser,
    getIngredientsByRecipeId,
    getInstructionsByRecipeId,
    createRecipe,
    deleteRecipe,
    updateRecipe,
    getRecipeBooksForUser,
    getRecipesForRecipeBook,
    createRecipeBook,
    updateRecipeBook,
    deleteRecipeBook,
    addRecipesToRecipeBook,
    removeRecipesFromRecipeBook,
} from "./recipe_functions.js";
import { getReferenceValueFromId } from "../globals/global_functions.js";
import { enforceAuthenticatedAccess } from '../serviceLayer/routes.js'

export default {
    Query: {
        recipe: (_, { id }, context) => {
            enforceAuthenticatedAccess(context.userId)
            return getRecipe(id);
        },
        recipes: (_, __, context) => {
            enforceAuthenticatedAccess(context.userId)
            return getRecipesForUser(context.userId)
        },
        recipeBooks: (_, __, context) => {
            enforceAuthenticatedAccess(context.userId)
            return getRecipeBooksForUser(context.userId)
        },
        recipesForRecipeBook: (_, { recipeBookId }, context) => {
            enforceAuthenticatedAccess(context.userId)
            return getRecipesForRecipeBook(recipeBookId, context.userId)
        }
    },

    Mutation: {
        createRecipe: (_, { recipeInput }, context) => {
            enforceAuthenticatedAccess(context.userId)
            return createRecipe(recipeInput, context.userId)
        },
        deleteRecipe: (_, {recipeId}, context) => {
            enforceAuthenticatedAccess(context.userId)
            return deleteRecipe(recipeId, context.userId, context.userRole)
        },
        updateRecipe: (_, {updateRecipeInput}, context) => {
            enforceAuthenticatedAccess(context.userId)
            return updateRecipe(updateRecipeInput,context.userId, context.userRole);
        },
        createRecipeBook: (_, { recipeBookInput }, context) => {
            enforceAuthenticatedAccess(context.userId)
            return createRecipeBook(recipeBookInput, context.userId)
        },
        updateRecipeBook: (_, { recipeBookId, recipeBookInput }, context) => {
            enforceAuthenticatedAccess(context.userId)
            return updateRecipeBook(recipeBookId, recipeBookInput, context.userId)
        },
        deleteRecipeBook: (_, { recipeBookId }, context) => {
            enforceAuthenticatedAccess(context.userId)
            return deleteRecipeBook(recipeBookId, context.userId)
        },
        addRecipesToRecipeBook: (_, { recipeIds, recipeBookId }, context) => {
            enforceAuthenticatedAccess(context.userId)
            return addRecipesToRecipeBook(recipeIds, recipeBookId, context.userId)
        },
        removeRecipesFromRecipeBook: (_, { recipeIds, recipeBookId }, context) => {
            enforceAuthenticatedAccess(context.userId)
            return removeRecipesFromRecipeBook(recipeIds, recipeBookId, context.userId)
        }
    },

    Recipe: {
        ...timestampsToDateResolver,
        ingredients: (recipe) => getIngredientsByRecipeId(recipe.id),
        instructions: (recipe) => getInstructionsByRecipeId(recipe.id),
        difficulty: (recipe) => getReferenceValueFromId(
            recipe.ref_difficulty_id, 
            'ref_difficulty'
        ),
        category: (recipe) => getReferenceValueFromId(
            recipe.ref_recipe_category_id, 
            'ref_recipe_category'
        ),
        cuisine: (recipe) => getReferenceValueFromId(
            recipe.ref_cuisine_id, 
            'ref_cuisine'
        ),
        user: (recipe) => getUser(recipe.user_id)
    }
}
