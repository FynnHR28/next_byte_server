import { getUser, deleteUser, deactivateUser, activateUser, 
    createUser, verifyUser, logout, refreshSession, revokeRefreshToken, revokeAllRefreshTokensForUser
} from "./user_functions.js";
import { timestampsToDateResolver } from "../globals/global_res.js";
import { enforceAdminOnlyAccess, enforceAuthenticatedAccess } from "../serviceLayer/routes.js";
import { accessCookieOptions, refreshCookieOptions } from "../../auth/auth.js";


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
            await revokeAllRefreshTokensForUser(context.userId);
            const result = await deleteUser(context.userId);
            context.res.clearCookie("access_token", { path: "/" }); // Clear the cookie
            context.res.clearCookie("refresh_token", { path: "/" });
            return result;
        },

        deactivateUser: async (_, __, context) => {
            enforceAuthenticatedAccess(context.userId);
            await revokeAllRefreshTokensForUser(context.userId);
            const result = await deactivateUser(context.userId);
            context.res.clearCookie("access_token", { path: "/" });
            context.res.clearCookie("refresh_token", { path: "/" });
            return result;
        },

        activateUser: async (_, { email }, context) => {
            const result = await activateUser(email);
            return result;
        },

        login: async (_, { email, password }, context) => {
            if(context.userId) throw new Error("user is already logged in");
            const result = await verifyUser(email, password);
            context.res.cookie("access_token", result.token, accessCookieOptions);
            context.res.cookie("refresh_token", result.refreshToken, refreshCookieOptions);
            return result;
        },

        refreshToken: async (_, __, context) => {
            const rawRefreshToken = context.req.cookies?.refresh_token;
            if (!rawRefreshToken) {
                throw new Error("No refresh token provided");
            }

            const result = await refreshSession(rawRefreshToken);
            context.res.cookie("access_token", result.token, accessCookieOptions);
            context.res.cookie("refresh_token", result.refreshToken, refreshCookieOptions);
            return result;
        },

        logout: async (_, __, context) => {
            enforceAuthenticatedAccess(context.userId);
            await logout(context.userId); // Sets is_active to false for the user
            const rawRefreshToken = context.req.cookies?.refresh_token;
            if (rawRefreshToken) {
                await revokeRefreshToken(rawRefreshToken);
            }
            context.res.clearCookie("access_token", { path: "/" }); // Clear the cookie
            context.res.clearCookie("refresh_token", { path: "/" });
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
