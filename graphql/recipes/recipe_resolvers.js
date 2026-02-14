import { timestampsToDateResolver } from "../globals/global_res.js";
import { getUser } from "../users/user_functions.js";
import { getRecipe, createRecipe, deleteRecipe, updateRecipe } from "./recipe_functions.js";
import { getFieldContextById } from "../globals/global_functions.js";
import { enforceAdminOnlyAccess, enforceAuthenticatedAccess } from '../serviceLayer/routes.js'


export default {
    Query: {
        recipe: (_, { id }, context) => getRecipe(id),
        my_recipes: (_, { userId }, context) => getRecipes(userId),
        recipes: (_, __, context) => getRecipes(context.userId)
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
        }
    },

    Recipe: {
        ...timestampsToDateResolver,
        ingredients: (recipe) => getIngredientsByRecipeId(recipe.id),
        instructions: (recipe) => getInstructionsByRecipeId(recipe.id),
        difficulty: (recipe) => getFieldContextById(
            recipe.ref_difficulty_id, 
            'public.ref_difficulty', 
            'name'
        ),
        category: (recipe) => getFieldContextById(
            recipe.ref_recipe_category_id, 
            'public.ref_recipe_category', 
            'name'
        ),
        cuisine: (recipe) => getFieldContextById(
            recipe.ref_cuisine_id, 
            'public.ref_cuisine', 
            'name'
        ),
        user: (recipe) => getUser(recipe.user_id)
    }
}