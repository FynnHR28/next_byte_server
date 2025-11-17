import { createUser } from "./user_functions.js"
import { hashPassword } from "../../auth/auth.js";
import { getUser } from "./user_functions.js";


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
        created_at: (user) => new Date(user.created_at).toISOString().split('T')[0],
        updated_at: (user) => new Date(user.updated_at).toISOString().split('T')[0]
    }
}
