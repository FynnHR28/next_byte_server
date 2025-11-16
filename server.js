import { ApolloServer } from "@apollo/server";
import { expressMiddleware as apolloMiddleware } from "@as-integrations/express4";
import cors from 'cors';
import express from 'express';
import { mergedTypeDefs, mergedResolvers } from './graphql/index.js';

const PORT = 9000;
const app = express();
app.use(cors(), express.json());

const apolloServer = new ApolloServer({ 
    typeDefs: mergedTypeDefs, 
    resolvers: mergedResolvers 
});

await apolloServer.start();

app.use('/graphql', apolloMiddleware(apolloServer))


app.listen({ port: PORT}, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`)
})



