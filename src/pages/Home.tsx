import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Loader2, Scale, X, FileText } from 'lucide-react';
import { searchProducts } from '../lib/algolia';
import { Product } from '../types';
import AksharaAnalyzer from '../components/AksharaAnalyzer';
import { compareProducts } from '../lib/gemini';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<string | null>(null);

  const location = useLocation();

  useEffect(() => {
    if (location.state?.barcodeResults) {
      setResults(location.state.barcodeResults as Product[]);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

  const toggleCompare = (product: Product) => {
    setCompareList(prev => {
      const exists = prev.find(p => p.objectID === product.objectID);
      if (exists) return prev.filter(p => p.objectID !== product.objectID);
      return [...prev, product];
    });
  };

  const runCompare = async () => {
    setIsComparing(true);
    const toCompare = compareList.map(p => ({
      name: p.name || (p as any).product_name || 'Unknown',
      ingredients: p.ingredients || (p as any).ingredients_text || 'No standard ingredient string found'
    }));
    const result = await compareProducts(toCompare);
    setCompareResult(result);
    // Let animation show loading state then result
  };

  const closeCompare = () => {
    setIsComparing(false);
    setCompareResult(null);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8 w-full animate-in fade-in duration-500 pb-24">
      
      {/* Hidden ARIA region for screen reader announcements */}
      <div aria-live="polite" className="sr-only">
        {isSearching ? 'Searching products...' : results.length > 0 ? `Found ${results.length} results.` : 'Search for a product to begin.'}
      </div>

      <div className="text-center rounded-3xl bg-[rgb(var(--m3-primary-container))] text-[rgb(var(--m3-on-primary-container))] p-8 sm:p-12 relative overflow-hidden">
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
            className="w-full pl-6 pr-14 min-h-[48px] py-4 rounded-full border-none shadow-[0_4px_24px_rgba(0,0,0,0.06)] focus:ring-2 focus:ring-[rgb(var(--m3-primary))] outline-none text-gray-900"
            aria-label="Search for a food product field"
          />
          <button 
            type="submit" 
            disabled={isSearching || !query.trim()}
            className="absolute right-2 min-w-[48px] min-h-[48px] flex items-center justify-center p-3 bg-[rgb(var(--m3-primary))] text-white rounded-full hover:brightness-110 disabled:opacity-50 transition-all font-bold"
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
            {results.map((product, idx) => {
              const pId = product.objectID || idx;
              return (
                 <ProductCard 
                    key={pId} 
                    id={`product-${pId}`}
                    product={product} 
                    isCompared={compareList.some(p => p.objectID === product.objectID)}
                    onToggleCompare={() => toggleCompare(product)}
                 />
              );
            })}
          </div>
          
          <button
              className="mt-4 mx-auto m3-button-tonal min-h-[48px] px-8 py-3 text-sm"
              aria-label="Load more products"
              onClick={() => {
                 const region = document.createElement('div');
                 region.setAttribute('aria-live', 'polite');
                 region.className = 'sr-only';
                 region.textContent = "Loading more products";
                 document.body.appendChild(region);
                 setTimeout(() => document.body.removeChild(region), 2000);
              }}
          >
              Load More
          </button>
        </div>
      )}

      {/* Floating Compare Bar */}
      {compareList.length > 1 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[rgb(var(--m3-surface))] border-t border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.1)] p-4 z-50 flex items-center justify-between animate-in slide-in-from-bottom-8">
            <div className="flex flex-col">
               <span className="font-bold">{compareList.length} products selected</span>
               <span className="text-sm text-gray-500">Compare side-by-side</span>
            </div>
            <div className="flex items-center gap-4">
               <button onClick={() => setCompareList([])} className="text-gray-500 font-medium min-h-[48px] px-4" aria-label="Clear comparison list">Clear</button>
               <button onClick={runCompare} className="m3-button-primary min-h-[48px] px-6 gap-2" aria-label="Compare selected products">
                  <Scale className="w-5 h-5" /> Compare
               </button>
            </div>
        </div>
      )}

      {/* Compare Modal */}
      {isComparing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="compare-title">
           <div className="bg-[rgb(var(--m3-surface))] rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 shadow-2xl overflow-hidden">
               <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                   <h2 id="compare-title" className="text-2xl font-bold flex items-center gap-2">
                       <Scale className="w-6 h-6 text-[rgb(var(--m3-primary))]" /> Side-by-Side Analysis
                   </h2>
                   <button onClick={closeCompare} className="p-2 min-h-[48px] min-w-[48px] rounded-full hover:bg-gray-200 transition-colors flex items-center justify-center" aria-label="Close Comparison">
                       <X className="w-6 h-6" />
                   </button>
               </div>
               
               <div className="p-6 overflow-y-auto w-full">
                   {!compareResult ? (
                       <div className="flex flex-col items-center justify-center py-12">
                           <Loader2 className="w-8 h-8 animate-spin text-[rgb(var(--m3-primary))] mb-4" />
                           <p className="font-medium text-gray-600">Akshara is comparing the biochemistry...</p>
                       </div>
                   ) : (
                       <div className="prose prose-emerald max-w-none text-gray-800 format-markdown">
                          <ReactMarkdown>{compareResult}</ReactMarkdown>
                       </div>
                   )}
               </div>
           </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, id, isCompared, onToggleCompare }: { product: Product, id: string, isCompared: boolean, onToggleCompare: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;

  const productName = product.name || (product as any).product_name || (product as any).title || (product as any).ProductName || 'Unknown Product';
  const brandName = product.brand || (product as any).Brand || (product as any).brand_name || '';

  return (
    <div 
      className={`m3-card relative p-6 cursor-pointer hover:border-[rgb(var(--m3-primary-container))] focus-within:ring-2 focus-within:ring-[rgb(var(--m3-primary))] transition-all ${expanded ? 'col-span-1 sm:col-span-2 shadow-xl hover:border-transparent scale-[1.01] z-10' : ''}`}
      onClick={(e) => {
        // Prevent toggle if clicking on checkboxes or buttons
        if ((e.target as HTMLElement).closest('button, input')) return;
        if (!expanded) setExpanded(true);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded(!expanded);
        }
      }}
      tabIndex={0}
      role="button"
      aria-expanded={expanded}
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <div className="flex justify-between items-start gap-4" onClick={(e) => {
        if (expanded) {
           e.stopPropagation(); 
           setExpanded(false);
        }
      }}>
        <div>
          <h3 id={titleId} className="font-bold text-xl leading-tight mb-1 transition-colors pr-8">
            {productName}
          </h3>
          <p id={descId} className="text-sm text-gray-500 font-medium">{brandName}</p>
        </div>
        
        {/* Compare Checkbox */}
        <div className="absolute top-6 right-6 flex flex-col items-center gap-1 z-20">
           <label className="min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer">
              <input 
                  type="checkbox" 
                  checked={isCompared}
                  onChange={onToggleCompare}
                  className="w-5 h-5 rounded border-gray-300 text-[rgb(var(--m3-primary))] focus:ring-[rgb(var(--m3-primary))] cursor-pointer m-2"
                  aria-label={`Add ${productName} to compare`}
              />
           </label>
        </div>
      </div>
      
      {expanded && (
        <div className="mt-6 pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-top-4 duration-300 relative z-10 cursor-auto" onClick={e => e.stopPropagation()}>
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Ingredients</h4>
          <p className="text-sm text-gray-600 mb-6 bg-white p-4 rounded-xl border border-gray-100">
             {product.ingredients || (product as any).Ingredients || (product as any).ingredients_text || 'No ingredients information available. View raw data below.'}
          </p>
          
          {/* Akshara component runs directly when expanded */}
          <div className="bg-emerald-50/50 rounded-2xl p-4 sm:p-6 mb-6">
             <AksharaAnalyzer product={product} onClose={() => setExpanded(false)} />
          </div>

          <button 
             className="text-sm font-semibold min-h-[48px] px-6 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors w-full sm:w-auto mt-4" 
             onClick={() => setExpanded(false)}
             aria-label="Collapse card"
          >
             Close Details
          </button>
        </div>
      )}
    </div>
  );
}
