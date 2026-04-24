import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, X } from 'lucide-react';
import { processLiveScan } from '../lib/gemini';

export default function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [guidance, setGuidance] = useState<string>("Initializing camera...");
  const [isScanning, setIsScanning] = useState(false);
  
  // Start camera stream
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
        setGuidance("Camera ready. Position over grocery shelf.");
      } catch (err) {
        console.error("Camera error:", err);
        setHasPermission(false);
        setGuidance("Camera access required for live scanning.");
      }
    }
    
    setupCamera();
    
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !hasPermission || isScanning) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    
    setIsScanning(true);
    setGuidance("Scanning via Flash...");
    
    try {
      const resultText = await processLiveScan(base64Image, 'image/jpeg');
      setGuidance(resultText || "No readable items found.");
    } catch (e) {
      setGuidance("Scan failed. Try adjusting position.");
    } finally {
      setIsScanning(false);
    }
  }, [hasPermission, isScanning]);

  return (
    <div className="flex flex-col h-[80vh]">
      {/* Hidden ARIA region for screen reader announcements ONLY */}
      <div aria-live="assertive" className="sr-only" role="alert">
        {guidance}
      </div>

      <div className="relative flex-grow bg-black rounded-3xl overflow-hidden shadow-lg border-4 border-black">
        {hasPermission === false ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white p-6 text-center">
            <p>Please grant camera permissions to use the Live Scanner.</p>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover"
            />
            
            {/* Visual Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
              <div className="w-full text-center">
                <div className="inline-block bg-black/60 backdrop-blur-md text-white px-6 py-3 rounded-full text-sm font-medium tracking-wide">
                  {guidance}
                </div>
              </div>
              
              <div className="flex justify-center flex-grow items-center">
                {/* Viewfinder brackets */}
                <div className="w-64 h-64 border-2 border-white/40 rounded-[28px] relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[rgb(var(--m3-primary-container))] rounded-tl-3xl"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[rgb(var(--m3-primary-container))] rounded-tr-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[rgb(var(--m3-primary-container))] rounded-bl-3xl"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[rgb(var(--m3-primary-container))] rounded-br-3xl"></div>
                  
                  {isScanning && (
                    <div className="absolute inset-0 bg-[rgb(var(--m3-primary-container))]/20 animate-pulse rounded-[24px]"></div>
                  )}
                </div>
              </div>

              <div className="w-full pointer-events-auto flex justify-center pb-4">
                <button 
                  onClick={captureFrame}
                  disabled={isScanning || !hasPermission}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
                    isScanning ? 'bg-gray-400' : 'bg-white text-black hover:bg-gray-100'
                  }`}
                  aria-label="Capture and scan frame"
                >
                  {isScanning ? <RefreshCw className="w-6 h-6 animate-spin text-white" /> : <Camera className="w-7 h-7" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Hidden canvas for extraction */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
