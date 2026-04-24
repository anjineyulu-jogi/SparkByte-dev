import fs from 'fs/promises';
import path from 'path';
import algoliasearch from 'algoliasearch';
import { fileURLToPath } from 'url';

// Initialize Dotenv if working locally
import 'dotenv/config'; 

// Algolia requires the Admin API key to save objects, NOT the frontend search key
// Make sure you have your ALGOLIA_ADMIN_API_KEY environment variable set
const appID = process.env.VITE_ALGOLIA_APP_ID || process.env.ALGOLIA_APP_ID;
const adminKey = process.env.ALGOLIA_ADMIN_API_KEY; 
const indexName = process.env.VITE_ALGOLIA_INDEX_NAME || 'sparkbyte_products';

if (!appID || !adminKey) {
  console.error("Missing ALGOLIA_APP_ID or ALGOLIA_ADMIN_API_KEY environment variables!");
  process.exit(1);
}

const client = algoliasearch(appID, adminKey);
const index = client.initIndex(indexName);

async function pushToAlgolia() {
  const filePath = path.join(process.cwd(), 'openfoodfacts_india.json');
  
  try {
    const fileData = await fs.readFile(filePath, 'utf8');
    const products = JSON.parse(fileData);
    
    // Algolia requires a unique 'objectID' for every record. 
    // We will use the barcode mapped to objectID.
    const algoliaRecords = products.map(product => ({
      ...product,
      objectID: product.code // Critical field for Algolia
    }));

    console.log(`Uploading ${algoliaRecords.length} records to Algolia Index: "${indexName}"...`);
    
    // We save them in chunks to prevent payload too large errors
    await index.saveObjects(algoliaRecords);
    
    console.log("Upload complete!");
    
    // Auto-configure searchable attributes for best search results!
    await index.setSettings({
      searchableAttributes: [
        'product_name',
        'brands',
        'ingredients_text',
        'C8_parent_company', // custom mapped
        'product_name_hi',
        'code'
      ],
      customRanking: [
        'desc(ecoscore_score)' // Give better ecoscores higher ranking if possible
      ]
    });
    
    console.log("Configured index settings correctly!");

  } catch (err) {
    console.error("Error during upload:", err);
  }
}

pushToAlgolia();
