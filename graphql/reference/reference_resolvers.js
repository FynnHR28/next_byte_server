import { hashPassword } from "../../auth/auth.js";
import { getUser, createUser } from "./user_functions.js";
import { timestampsToDateResolver } from "../globals/global_res.js";


export default {
    Query: {
        cuisine: async ( id ) => 
    },


    User: {
        ...timestampsToDateResolver
    }
}
