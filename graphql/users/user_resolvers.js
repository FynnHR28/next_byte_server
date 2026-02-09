import { getUser, deleteUser, deactivateUser, activateUser, 
    createUser, verifyUser, logout 
} from "./user_functions.js";
import { timestampsToDateResolver } from "../globals/global_res.js";
import { enforceAdminOnlyAccess, enforceAuthenticatedAccess } from "../serviceLayer/routes.js";


export default {
    Query: {
        me: (_, __, context) => {
            enforceAuthenticatedAccess(context.userId)
            return getUser(context.userId, context.userId)
        },
        user: (_, { id }, context) => {
            enforceAuthenticatedAccess(context.userId)
            return getUser(id, context.userId)
        },
        users: () => getUsers()
    },

    Mutation: {
        createUser: async (_, { username, password, email, city, state, country, timezone }) =>
            createUser(username, password, email, city, state, country, timezone),

        deleteUser: async (_, __, context) => {
            enforceAdminOnlyAccess(context.userId);
            const result = await deleteUser(context.userId);
            context.res.clearCookie("access_token", { path: "/" }); // Clear the cookie
            return result;
        },

        deactivateUser: async (_, __, context) => {
            enforceAuthenticatedAccess(context.userId);
            const result = await deactivateUser(context.userId);
            return result;
        },

        activateUser: async (_, { email }, context) => {
            const result = await activateUser(email);
            return result;
        },

        login: async (_, { email, password }, context) => {
            if(context.userId) throw new Error("user is already logged in");
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
            enforceAuthenticatedAccess(context.userId);
            await logout(context.userId); // Sets is_active to false for the user
            context.res.clearCookie("access_token", { path: "/" }); // Clear the cookie
            return true;
        }
    },

    User: {
        ...timestampsToDateResolver,
        is_active: (user,_, context) => {
            enforceAdminOnlyAccess(context.userRole)
            return user.is_active
        }
    }
}
