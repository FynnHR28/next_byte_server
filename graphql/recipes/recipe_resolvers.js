import { get } from "http";
import { timestampsToDateResolver } from "../globals/field_resolvers";


export default {
    Query: {
        recipe: (_, { id }) => getRecipe(id),
        recipes: (_, { userId }) => getRecipes(userId)
    },

    Recipe: {
        ...timestampsToDateResolver,
        ingredients: (recipe) => getIngredientsByRecipeId(recipe.id),
        instructions: (recipe) => getInstructionsByRecipeId(recipe.id)
    }
}