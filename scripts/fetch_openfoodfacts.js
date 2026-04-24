import fs from 'fs/promises';
import path from 'path';

// Most of these fields are available via OpenFoodFacts API, we specifically fetch what we need.
const OFF_FIELDS = [
  'code', 'product_name', 'image_url', 'nutriments', 'amino_acids_tags',
  'nova_group', 'nova_groups_tags', 'additives_n', 'additives_tags',
  'additives_original_tags', 'ingredients_analysis_tags',
  'ingredients_from_palm_oil_n', 'ingredients_that_may_be_from_palm_oil_n',
  'ingredients_text', 'ingredients_non_nutritive_sweeteners_n',
  'ingredients_sweeteners_n', 'generic_name_hi', 'product_name_hi',
  'ingredients_text_hi', 'generic_name_bn', 'generic_name_te',
  'generic_name_ta', 'fssai_license_number', 'india_fssai_license_number',
  'indian_fssai_license_number', 'labels_tags', 'labels_hi', 'halal', 'kosher',
  'brand_owner', 'brand_owner_imported', 'brands', 'brands_tags', 'brands_hierarchy',
  'manufacturing_places', 'emb_codes', 'owner_id', 'ecoscore_grade', 'ecoscore_score',
  'carbon_footprint_100g', 'nutriscore_grade', 'fsa_score', 'data_quality_warning_tags',
  'customer_service', 'serving_size', 'expiration_date', 'ingredients_text_with_allergens',
  'environment_infocard', 'forest_footprint_data'
];

const API_URL = `https://in.openfoodfacts.org/api/v2/search?fields=${OFF_FIELDS.join(',')}&page_size=100`;

const safeJoin = (val) => {
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'string') return val;
  return '';
};

async function fetchIndianProducts(pagesToFetch = 1) {
  let allProducts = [];
  
  for (let page = 1; page <= pagesToFetch; page++) {
    console.log(`Fetching page ${page} from Open Food Facts...`);
    try {
      const response = await fetch(`${API_URL}&page=${page}`, {
        headers: {
          'User-Agent': 'SparkByte App / Contact: jogianji62@gmail.com',
          'Accept': 'application/json'
        }
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error(`Received non-JSON response (${response.status}): ${text.substring(0, 200)}`);
        break;
      }

      const data = await response.json();
      
      if (!data.products || data.products.length === 0) {
        break;
      }
      
      const mappedProducts = data.products.map(p => {
        const nutriments = p.nutriments || {};
        
        return {
          code: p.code || '',
          product_name: p.product_name || '',
          image_url: p.image_url || '',
          
          // Nutriments mapped properly
          energy_100g: nutriments.energy_100g || 0,
          'energy-kcal_100g': nutriments['energy-kcal_100g'] || 0,
          fat_100g: nutriments.fat_100g || 0,
          'saturated-fat_100g': nutriments['saturated-fat_100g'] || 0,
          'monounsaturated-fat_100g': nutriments['monounsaturated-fat_100g'] || 0,
          'polyunsaturated-fat_100g': nutriments['polyunsaturated-fat_100g'] || 0,
          'trans-fat_100g': nutriments['trans-fat_100g'] || 0,
          cholesterol_100g: nutriments.cholesterol_100g || 0,
          'omega-3-fat_100g': nutriments['omega-3-fat_100g'] || 0,
          carbohydrates_100g: nutriments.carbohydrates_100g || 0,
          sugars_100g: nutriments.sugars_100g || 0,
          fiber_100g: nutriments.fiber_100g || 0,
          proteins_100g: nutriments.proteins_100g || 0,
          salt_100g: nutriments.salt_100g || 0,
          sodium_100g: nutriments.sodium_100g || 0,
          'vitamin-a_100g': nutriments['vitamin-a_100g'] || 0,
          'vitamin-d_100g': nutriments['vitamin-d_100g'] || 0,
          'vitamin-c_100g': nutriments['vitamin-c_100g'] || 0,
          'vitamin-b1_100g': nutriments['vitamin-b1_100g'] || 0,
          'vitamin-b2_100g': nutriments['vitamin-b2_100g'] || 0,
          'vitamin-pp_100g': nutriments['vitamin-pp_100g'] || 0,
          'vitamin-b6_100g': nutriments['vitamin-b6_100g'] || 0,
          'vitamin-b9_100g': nutriments['vitamin-b9_100g'] || 0,
          'vitamin-b12_100g': nutriments['vitamin-b12_100g'] || 0,
          'vitamin-k_100g': nutriments['vitamin-k_100g'] || 0,
          'vitamin-e_100g': nutriments['vitamin-e_100g'] || 0,
          calcium_100g: nutriments.calcium_100g || 0,
          iron_100g: nutriments.iron_100g || 0,
          magnesium_100g: nutriments.magnesium_100g || 0,
          zinc_100g: nutriments.zinc_100g || 0,
          potassium_100g: nutriments.potassium_100g || 0,
          phosphorus_100g: nutriments.phosphorus_100g || 0,
          iodine_100g: nutriments.iodine_100g || 0,
          selenium_100g: nutriments.selenium_100g || 0,
          
          // Arrays & Strings
          amino_acids_tags: safeJoin(p.amino_acids_tags),
          nova_group: p.nova_group || '',
          nova_groups_tags: safeJoin(p.nova_groups_tags),
          additives_n: p.additives_n || 0,
          additives_tags: safeJoin(p.additives_tags),
          additives_original_tags: safeJoin(p.additives_original_tags),
          ingredients_analysis_tags: safeJoin(p.ingredients_analysis_tags),
          ingredients_from_palm_oil_n: p.ingredients_from_palm_oil_n || 0,
          ingredients_that_may_be_from_palm_oil_n: p.ingredients_that_may_be_from_palm_oil_n || 0,
          ingredients_text: p.ingredients_text || '',
          ingredients_non_nutritive_sweeteners_n: p.ingredients_non_nutritive_sweeteners_n || 0,
          ingredients_sweeteners_n: p.ingredients_sweeteners_n || 0,
          generic_name_hi: p.generic_name_hi || '',
          product_name_hi: p.product_name_hi || '',
          ingredients_text_hi: p.ingredients_text_hi || '',
          generic_name_bn: p.generic_name_bn || '',
          generic_name_te: p.generic_name_te || '',
          generic_name_ta: p.generic_name_ta || '',
          fssai_license_number: p.fssai_license_number || '',
          india_fssai_license_number: p.india_fssai_license_number || '',
          indian_fssai_license_number: p.indian_fssai_license_number || '',
          labels_tags: safeJoin(p.labels_tags),
          labels_hi: p.labels_hi || '',
          halal: p.halal || '',
          kosher: p.kosher || '',
          brand_owner: p.brand_owner || '',
          brand_owner_imported: p.brand_owner_imported || '',
          brands: p.brands || '',
          brands_tags: safeJoin(p.brands_tags),
          brands_hierarchy: safeJoin(p.brands_hierarchy),
          manufacturing_places: safeJoin(p.manufacturing_places),
          emb_codes: p.emb_codes || '',
          owner_id: p.owner_id || '',
          ecoscore_grade: p.ecoscore_grade || '',
          ecoscore_score: p.ecoscore_score || 0,
          carbon_footprint_100g: p.carbon_footprint_100g || 0,
          nutriscore_grade: p.nutriscore_grade || '',
          fsa_score: p.fsa_score || 0,
          data_quality_warning_tags: safeJoin(p.data_quality_warning_tags),
          customer_service: p.customer_service || '',
          serving_size: p.serving_size || '',
          expiration_date: p.expiration_date || '',
          ingredients_text_with_allergens: p.ingredients_text_with_allergens || '',
          
          // Some derived mock states for custom columns (C1-C10)
          C1_is_palm_free: p.ingredients_from_palm_oil_n === 0 ? 'Yes' : 'No',
          C2_glycemic_bulking_count: '',
          C3_total_ins_additives: p.additives_n || 0,
          C4_jain_index: '',
          C5_calculated_inr_stars: '',
          C6_is_hfss_flag: '',
          C7_nova_processing_grade: p.nova_group || '',
          C8_parent_company: p.brand_owner || p.brands || '',
          C9_artificial_sweetener_flag: (p.ingredients_sweeteners_n > 0) ? 'Yes' : 'No',
          C10_health_grade_alpha: p.ecoscore_grade || p.nutriscore_grade || ''
        };
      });
      
      allProducts.push(...mappedProducts);
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
    }
  }

  // Remove elements missing product_name and code to keep DB clean
  const cleanData = allProducts.filter(p => p.product_name && p.code);

  const outputPath = path.join(process.cwd(), 'openfoodfacts_india.json');
  await fs.writeFile(outputPath, JSON.stringify(cleanData, null, 2));
  console.log(`Successfully mapped and saved ${cleanData.length} Indian products to ${outputPath}!`);
}

// Modify the number '5' to extract more pages (100 products per page)
// Setting to 5 pulls the top 500 records. Make to 10 for 1000 etc.
fetchIndianProducts(5);
