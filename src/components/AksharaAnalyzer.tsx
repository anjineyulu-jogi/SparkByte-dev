import { useEffect, useState } from 'react';
import { FileText, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Product } from '../types';
import { analyzeIngredients } from '../lib/gemini';

export default function AksharaAnalyzer({ product, onClose }: { product: Product, onClose: () => void }) {
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [showRawData, setShowRawData] = useState(false);

  useEffect(() => {
    async function runAnalysis() {
      setIsAnalyzing(true);
      const ingredients = product.ingredients || (product as any).Ingredients || (product as any).ingredient_text || JSON.stringify(product);
      const name = product.name || (product as any).product_name || (product as any).title || (product as any).ProductName || 'this product';
      const text = await analyzeIngredients(ingredients, name);
      setAnalysisText(text);
      setIsAnalyzing(false);
    }
    runAnalysis();
  }, [product]);

  return (
    <div className="mt-6 pt-6 border-t border-gray-100 animate-in slide-in-from-bottom-4 duration-300 relative">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-xl font-bold flex items-center gap-2">
           Akshara Analysis
        </h4>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowRawData(!showRawData)}
            className="text-sm px-4 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors font-medium text-gray-700"
            aria-label={showRawData ? "Hide Raw Data" : "View Raw Data"}
            aria-expanded={showRawData}
          >
            {showRawData ? "View Summary" : "View Raw Data"}
          </button>
        </div>
      </div>

      <div aria-live="polite" className="sr-only">
        {isAnalyzing ? "Akshara is verifying ingredients. Please wait." : "Analysis complete."}
      </div>

      {isAnalyzing ? (
        <div className="flex flex-col items-center justify-center py-12 rounded-2xl bg-[rgb(var(--m3-surface))]">
          <Loader2 className="w-8 h-8 animate-spin text-[rgb(var(--m3-primary))] mb-4" />
          <p className="text-gray-600 font-medium">Akshara is verifying ingredients...</p>
        </div>
      ) : showRawData ? (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 overflow-x-auto text-sm font-mono text-gray-700">
          <table className="w-full text-left border-collapse">
            <tbody>
              {Object.entries(product).map(([key, value]) => (
                <tr key={key} className="border-b border-gray-200 last:border-0">
                  <td className="py-2 pr-4 font-semibold text-gray-900">{key}</td>
                  <td className="py-2 text-wrap">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="prose prose-sm prose-emerald max-w-none text-gray-800 format-markdown">
           <ReactMarkdown>{analysisText || ''}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
