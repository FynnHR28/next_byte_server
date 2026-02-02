import { loadFiles } from '@graphql-tools/load-files';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';
import { pathToFileURL } from 'node:url';

export const mergedTypeDefs = mergeTypeDefs(
  await loadFiles('./**/*_typeDefs.graphql')
);

export const mergedResolvers = mergeResolvers(
  await loadFiles('./**/*_resolvers.js', {
    requireMethod: async (path) => {
      return (await import(pathToFileURL(path).href)).default;
    }
  })
);