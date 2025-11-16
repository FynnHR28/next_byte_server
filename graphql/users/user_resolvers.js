import { createUser } from "./user_functions.js"


export default {
    Query: {
        user: (_, { id }) => getUser(id),
        users: () => getUsers()
    },

    Mutation: {
        createUser: async (_, { username, passwordHash, email, city, state, country, timezone}) => {
            try{
                return await createUser(username, passwordHash, email, city, state, country, timezone);
            } catch (err){
                throw err;
            }
        }
    }
}
