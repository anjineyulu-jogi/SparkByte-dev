import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { searchProducts } from '../lib/algolia';
import { Product } from '../types';
import AksharaAnalyzer from '../components/AksharaAnalyzer';

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // We handle compare separately but allow multiple products later in an array.

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const hits = await searchProducts(query);
      setResults(hits as unknown as Product[]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8 w-full animate-in fade-in duration-500">
      
      {/* Hidden ARIA region for screen reader announcements */}
      <div aria-live="polite" className="sr-only">
        {isSearching ? 'Searching products...' : results.length > 0 ? `Found ${results.length} results.` : 'Search for a product to begin.'}
      </div>

      <div className="text-center rounded-3xl bg-[rgb(var(--m3-primary-container))] text-[rgb(var(--m3-on-primary-container))] p-8 sm:p-12">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Akshara Intelligence</h1>
        <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
          Search for food products or use the Live Scanner to decode biochemical ingredients and verify health safety.
        </p>
        
        <form onSubmit={handleSearch} className="relative max-w-lg mx-auto flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a food product (e.g. Tomato Soup)..."
            className="w-full pl-6 pr-14 py-4 rounded-full border-none shadow-[0_4px_24px_rgba(0,0,0,0.06)] focus:ring-2 focus:ring-[rgb(var(--m3-primary))] outline-none text-gray-900"
            aria-label="Search for a food product field"
          />
          <button 
            type="submit" 
            disabled={isSearching || !query.trim()}
            className="absolute right-2 p-3 bg-[rgb(var(--m3-primary))] text-white rounded-full hover:brightness-110 disabled:opacity-50 transition-all font-bold"
            aria-label="Submit search"
          >
            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </button>
        </form>
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold ml-2">Top Results ({results.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.map((product, idx) => (
              <ProductCard key={product.objectID || idx} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const [expanded, setExpanded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  return (
    <div 
      className={`m3-card p-6 cursor-pointer hover:border-[rgb(var(--m3-primary-container))] focus-within:ring-2 focus-within:ring-[rgb(var(--m3-primary))] ${expanded ? 'col-span-1 sm:col-span-2 shadow-md hover:border-transparent' : ''}`}
      onClick={() => {
        if (!expanded) setExpanded(true);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!expanded) setExpanded(true);
        }
      }}
      tabIndex={0}
      role="button"
      aria-expanded={expanded}
      aria-label={`${product.name} by ${product.brand}. Press to expand details.`}
    >
      <div className="flex justify-between items-start gap-4" onClick={(e) => {
        if (expanded) {
           e.stopPropagation(); 
           setExpanded(false);
           setAnalyzing(false);
        }
      }}>
        <div>
          <h3 className="font-bold text-xl leading-tight mb-1 transition-colors">
            {product.name}
          </h3>
          <p className="text-sm text-gray-500 font-medium">{product.brand}</p>
        </div>
        {expanded && (
          <button className="text-xs font-semibold px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200" aria-label="Collapse card">
            Close
          </button>
        )}
      </div>
      
      {expanded && (
        <div className="mt-6 pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-top-4 duration-300 relative z-10" onClick={e => e.stopPropagation()}>
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Ingredients</h4>
          <p className="text-sm text-gray-600 mb-6">{product.ingredients || 'No ingredients information available.'}</p>
          
          {!analyzing ? (
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); setAnalyzing(true); }}
                className="m3-button-primary text-sm px-5 py-2 w-full sm:w-auto"
                aria-label={`Ask Akshara to analyze ${product.name}`}
              >
                Ask Akshara to Analyze
              </button>
            </div>
          ) : (
            <AksharaAnalyzer product={product} onClose={() => setAnalyzing(false)} />
          )}
        </div>
      )}
    </div>
  );
}
