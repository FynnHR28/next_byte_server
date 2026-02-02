import { ApolloServer } from "@apollo/server";
import { expressMiddleware as apolloMiddleware } from "@as-integrations/express4";
import cors from 'cors';
import express from 'express';
import { mergedTypeDefs, mergedResolvers } from './graphql/index.js';
import { authMiddleware } from "./auth/auth.js";

const PORT = 9000;
const app = express();
app.use(cors(), express.json(), authMiddleware);


const apolloServer = new ApolloServer({ 
    typeDefs: mergedTypeDefs, 
    resolvers: mergedResolvers 
});
console.debug("Merged typeDefs and resolvers");

await apolloServer.start();

app.use('/graphql', apolloMiddleware(apolloServer, {
    // all resolvers have access to this context value, which will now hold user id set by jwtMiddleWare (if valid)
    context: async ({ req, _ }) => {
        return { userId: req.userId}
    }
 }))


app.listen({ port: PORT}, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`)
})



