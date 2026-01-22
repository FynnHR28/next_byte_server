import { loadFiles } from '@graphql-tools/load-files';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';

export const mergedTypeDefs = mergeTypeDefs(
  await loadFiles('./**/*_typeDefs.graphql')
);

export const mergedResolvers = mergeResolvers(
  await loadFiles('./**/*_resolvers.js', {
    requireMethod: async (path) => {
      return (await import(path)).default;
    }
  })
);