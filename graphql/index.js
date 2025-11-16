import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';



const loadedTypeDefs = loadFilesSync(`./**/*_typeDefs.graphql`);
const loadedResolvers = loadFilesSync(`./**/*_resolvers.js`);

export const mergedTypeDefs = mergeTypeDefs(loadedTypeDefs);
export const mergedResolvers = mergeResolvers(loadedResolvers);
