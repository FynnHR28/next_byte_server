import { ApolloServer } from "@apollo/server";
import { expressMiddleware as apolloMiddleware } from "@as-integrations/express4";
import cors from 'cors';
import express from 'express';
import { mergedTypeDefs, mergedResolvers } from './graphql/index.js';
import { authMiddleware } from "./auth/auth.js";
import cookieParser from "cookie-parser";

const PORT = 9000;
const app = express();

app.use(cors({
    origin: `http://localhost:3000`, // Frontend origin
    credentials: true
}));

app.use(cookieParser());
app.use(express.json(), authMiddleware);

const apolloServer = new ApolloServer({ 
    typeDefs: mergedTypeDefs, 
    resolvers: mergedResolvers 
});
console.debug("Merged typeDefs and resolvers");

await apolloServer.start();

app.use('/graphql', apolloMiddleware(apolloServer, {
    // all resolvers have access to this context value, which will now hold user id set by jwtMiddleWare (if valid)
    context: async ({ req, res }) => { // Request and response, respectively
        return { userId: req.userId, userRole: req.userRole, res }
    }
 }))



app.listen({ port: PORT}, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`)
})



