import { liteClient } from 'algoliasearch/lite';

let _algoliaClient: any = null;

export const getAlgoliaClient = () => {
  if (!_algoliaClient) {
    const appId = import.meta.env.VITE_ALGOLIA_APP_ID || 'APP_ID';
    const searchKey = import.meta.env.VITE_ALGOLIA_SEARCH_KEY || 'SEARCH_KEY';
    _algoliaClient = liteClient(appId, searchKey);
  }
  return _algoliaClient;
}

export const searchProducts = async (query: string) => {
  if (!import.meta.env.VITE_ALGOLIA_APP_ID) {
    console.warn("Algolia App ID not set!");
    return [];
  }
  
  try {
    const client = getAlgoliaClient();
    const { results } = await client.search({
      requests: [
        {
          indexName: import.meta.env.VITE_ALGOLIA_INDEX_NAME || 'sparkbyte_products',
          query,
          hitsPerPage: 20,
        },
      ],
    });
    
    // Algoliasearch v5 returns results[0].hits
    return (results[0] as any)?.hits || [];
  } catch (error) {
    console.error('Algolia Search Error', error);
    return [];
  }
};
