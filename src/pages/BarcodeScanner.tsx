import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ScanLine, X } from 'lucide-react';
import { processBarcodeScan } from '../lib/gemini';
import { searchProducts } from '../lib/algolia';

export default function BarcodeScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [guidance, setGuidance] = useState<string>("Initializing camera...");
  const [isScanning, setIsScanning] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    async function setupCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
        setGuidance("Camera ready. Position barcode in frame.");
        startScanningLoop();
      } catch (err) {
        setHasPermission(false);
        setGuidance("Camera access required for barcode scanning.");
      }
    }
    setupCamera();
    
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const speakGuidance = (text: string) => {
      if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.1;
          window.speechSynthesis.speak(utterance);
      }
  };

  const processFrame = async () => {
    if (!videoRef.current || !canvasRef.current || isScanning) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = Math.min(640, video.videoWidth);
    canvas.height = Math.min(480, video.videoHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
    
    setIsScanning(true);
    
    try {
      const result = await processBarcodeScan(base64Image, 'image/jpeg');
      setGuidance(result.guidance);
      speakGuidance(result.guidance);

      if (result.status === 'found' && result.barcode) {
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          
          setGuidance(`Found barcode: ${result.barcode}. Resolving data...`);
          // Note: "Pull the Firestore data" requested by user is routed to Algolia here, per application context
          const hits = await searchProducts(result.barcode);
          if (hits && hits.length > 0) {
              // Usually we'd go to a product page or return to Home with state
              navigate('/', { state: { barcodeResults: hits } });
          } else {
              setGuidance("Product not found in database.");
              speakGuidance("Product not found in database.");
          }
      }
    } catch (e) {
        // silence error
    } finally {
      setIsScanning(false);
    }
  };

  const startScanningLoop = () => {
      // Process a frame every 2 seconds to not overload API
      const loop = async () => {
          await processFrame();
          setTimeout(() => {
              animationFrameRef.current = requestAnimationFrame(loop);
          }, 2000);
      };
      loop();
  };

  return (
    <div className="flex flex-col h-[85vh] animate-in fade-in duration-300">
      <div aria-live="assertive" className="sr-only" role="alert">
        {guidance}
      </div>

      <div className="relative flex-grow bg-black rounded-3xl overflow-hidden shadow-lg border-4 border-black">
        {hasPermission === false ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white p-6 text-center">
            <p>Please grant camera permissions to use the Barcode Scanner.</p>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} autoPlay playsInline muted 
              className="absolute inset-0 w-full h-full object-cover"
            />
            
            <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
              <div className="w-full text-center">
                <div className="inline-block bg-black/70 backdrop-blur-md text-white px-6 py-3 rounded-full font-medium tracking-wide shadow-lg border border-white/10">
                  {guidance}
                </div>
              </div>
              
              <div className="flex justify-center flex-grow items-center relative">
                {/* Visual Viewfinder SVG */}
                <svg className="w-3/4 max-w-sm drop-shadow-xl" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M25 10 L10 10 L10 25 M75 10 L90 10 L90 25 M75 90 L90 90 L90 75 M25 90 L10 90 L10 75" stroke="rgba(255,255,255,0.8)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(239,68,68,0.8)" strokeWidth="2" className="animate-[pulse_1.5s_infinite]" />
                </svg>
                {isScanning && (
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <ScanLine className="w-12 h-12 text-white animate-pulse" />
                   </div>
                )}
              </div>
              
              <div className="w-full pointer-events-auto flex justify-center pb-4">
                 <button onClick={() => navigate(-1)} className="p-4 bg-white/20 text-white rounded-full backdrop-blur-md hover:bg-white/30">
                    <X className="w-6 h-6" />
                 </button>
              </div>
            </div>
          </>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
