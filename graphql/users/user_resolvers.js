import { getUser, deleteUser, deactivateUser, createUser, verifyUser, logout } from "./user_functions.js";
import { timestampsToDateResolver } from "../globals/global_res.js";


export default {
    Query: {
        user: (_, __, context) => getUser(context.userId),
        users: () => getUsers()
    },

    Mutation: {
        createUser: (_, { username, password, email, city, state, country, timezone }) =>
            createUser(username, password, email, city, state, country, timezone),

        deleteUser: async (_, __, context) => {
            const result = await deleteUser(context.userId);
            context.res.clearCookie("access_token", { path: "/" }); // Clear the cookie
            return result;
        },

        deactivateUser: async (_, __, context) => {
            const result = await deactivateUser(context.userId);
            return result;
        },

        login: async (_, { email, password }, context) => {
            const result = await verifyUser(email, password);
            context.res.cookie("access_token", result.token, {
                httpOnly: true,
                sameSite: "lax",
                secure: false, // TODO: Change this to true for production (I think it just changes it to HTTPS only)
                path: "/",
                maxAge: 20 * 60 * 1000, // 5 minutes
            });
            return result;
        },

        logout: async (_, __, context) => {
            await logout(context.userId); // Sets is_active to false for the user
            context.res.clearCookie("access_token", { path: "/" }); // Clear the cookie
            return true;
        }
    },

    User: {
        ...timestampsToDateResolver
    }
}
