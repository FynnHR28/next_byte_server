import { hashPassword } from "../../auth/auth.js";
import { getUser, createUser } from "./user_functions.js";
import { timestampsToDateResolver } from "../globals/field_resolvers.js";


export default {
    Query: {
        user: (_, { id }) => getUser(id),
        users: () => getUsers()
    },

    Mutation: {
        createUser: async (_, { username, passwordHash, email, city, state, country, timezone}) => {
            try{
                passwordHash = await hashPassword(passwordHash);
                return await createUser(username, passwordHash, email, city, state, country, timezone);
            } catch (err){
                throw err;
            }
        }
    },

    User: {
        ...timestampsToDateResolver
    }
}
