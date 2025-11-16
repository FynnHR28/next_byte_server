import { ApolloServer } from "@apollo/server";
import { expressMiddleware as apolloMiddleware } from "@as-integrations/express4";
import cors from 'cors';
import express from 'express';

const PORT = 9000;
const app = express();
app.use(cors(), express.json());

const apolloServer = new ApolloServer({/**/});

await apolloServer.start();

app.use('/graphql', apolloMiddleware(apolloServer))


app.listen({ port: PORT}, () => {
    console.log(`Server running on port ${PORT}`);
})



