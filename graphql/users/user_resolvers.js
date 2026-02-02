import { getUser, createUser, verifyUser, logout } from "./user_functions.js";
import { timestampsToDateResolver } from "../globals/global_res.js";


export default {
    Query: {
        user: (_, __, context) => getUser(context.userId),
        users: () => getUsers()
    },

    Mutation: {
        createUser: (_, { username, password, email, city, state, country, timezone }) =>
            createUser(username, password, email, city, state, country, timezone),

        login: (_, { email, password }) => verifyUser(email, password),

        logout: (_, __, context) => logout(context.userId)

    },

    User: {
        ...timestampsToDateResolver
    }
}
