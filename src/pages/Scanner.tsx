import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, Mic, MicOff, Video, VideoOff, PhoneOff, RefreshCw, X, History } from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { AudioStreamPlayer, AudioStreamRecorder } from '../lib/audio';

export default function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  const [transcripts, setTranscripts] = useState<{role: string, text: string}[]>([]);
  
  const sessionRef = useRef<any>(null);
  const playerRef = useRef<AudioStreamPlayer | null>(null);
  const recorderRef = useRef<AudioStreamRecorder | null>(null);
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
      } catch (err) {
        console.error("Camera error:", err);
        setHasPermission(false);
      }
    }
    setupCamera();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const stopSession = useCallback(() => {
    setIsSessionActive(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (recorderRef.current) recorderRef.current.stop();
    if (playerRef.current) playerRef.current.stop();
    // Assuming native WebSocket logic within the connect Promise is closed or garbage collected
    sessionRef.current = null;
  }, []);

  const startSession = async () => {
    try {
      setIsSessionActive(true);
      setTranscripts([{ role: 'system', text: "Connecting to Akshara Live..." }]);
      
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || (process as any).env.GEMINI_API_KEY });
      playerRef.current = new AudioStreamPlayer();
      recorderRef.current = new AudioStreamRecorder();

      await recorderRef.current.start((base64) => {
        if (isMicOn && sessionRef.current) {
          sessionRef.current.then((session: any) => {
            try {
              session.sendRealtimeInput([{ mimeType: 'audio/pcm;rate=16000', data: base64 }]);
            } catch(e) { } // Ignore send errors when closing
          });
        }
      });

      sessionRef.current = ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } },
            systemInstruction: "You are Akshara, an empathetic and helpful AI assistant for SparkByte. Answer warmly, decode biochemical names and evaluate health risks of items you see. Call the user buddy or friend."
        },
        callbacks: {
          onopen: () => {
             setTranscripts(prev => [...prev, { role: 'system', text: "Connected! Show a product and say hello." }]);
             // Start sending video frames
             captureAndSendFrame();
          },
          onmessage: (msg: LiveServerMessage) => {
            // Play Audio
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && playerRef.current) {
               playerRef.current.playBase64Pcm(audioData);
            }
            
            // Interrupt if needed
            if (msg.serverContent?.interrupted && playerRef.current) {
               playerRef.current.stop();
               playerRef.current = new AudioStreamPlayer();
            }

            // Output Transcription
            const outputText = msg.serverContent?.modelTurn?.parts?.find(p => p.text)?.text;
            if (outputText) {
               setTranscripts(prev => [...prev, { role: 'ai', text: outputText }]);
            }
          },
          onerror: (e) => {
             console.error(e);
             setTranscripts(prev => [...prev, { role: 'system', text: "Connection error happened." }]);
             stopSession();
          },
          onclose: () => {
             stopSession();
          }
        }
      });
    } catch(e) {
      setTranscripts(prev => [...prev, { role: 'system', text: "Failed to connect." }]);
      setIsSessionActive(false);
    }
  };

  const captureAndSendFrame = () => {
    if (!isSessionActive) return;
    
    if (isVideoOn && videoRef.current && canvasRef.current && sessionRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = Math.min(640, video.videoWidth);
            canvas.height = Math.min(480, video.videoHeight);
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Throttle quality slightly for websocket
            const base64Image = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
            
            sessionRef.current.then((session: any) => {
                try {
                  session.sendRealtimeInput([{ mimeType: 'image/jpeg', data: base64Image }]);
                } catch(e) { } 
            });
        }
    }
    // send ~1 frame every second
    setTimeout(() => {
        if(isSessionActive) {
            animationFrameRef.current = requestAnimationFrame(captureAndSendFrame);
        }
    }, 1000);
  };

  // Keep transcripts limited to last 6 items for overlay
  const recentTranscripts = transcripts.slice(-6);

  return (
    <div className="flex flex-col h-[85vh] relative animate-in fade-in duration-500 rounded-3xl overflow-hidden shadow-2xl border-4 border-black bg-black">
      {/* Video Background */}
      <video 
        ref={videoRef} autoPlay playsInline muted 
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${!isVideoOn ? 'opacity-0' : 'opacity-100'}`}
      />
      {!isVideoOn && <div className="absolute inset-0 bg-gray-900 flex items-center justify-center text-gray-500">Video is paused</div>}

      {/* Transcript Overlay */}
      <div className="absolute top-0 left-0 right-0 max-h-[40vh] overflow-y-auto p-4 flex flex-col gap-2 pointer-events-none z-10 bg-gradient-to-b from-black/80 to-transparent pb-12">
         {recentTranscripts.map((t, idx) => (
             <div key={idx} className={`text-sm px-3 py-2 rounded-2xl max-w-[85%] ${
                 t.role === 'ai' ? 'bg-[rgb(var(--m3-primary))]/90 text-white self-start' : 
                 t.role === 'user' ? 'bg-white/90 text-black self-end ml-auto' : 
                 'bg-gray-800/80 text-gray-300 self-center text-xs'
             }`}>
                 {t.role === 'ai' && <b className="block text-xs opacity-75 mb-0.5">Akshara</b>}
                 {t.text}
             </div>
         ))}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center z-10 bg-gradient-to-t from-black/80 to-transparent pt-12">
        
        {/* Voice Waveform Mockup */}
        {isSessionActive && (
          <div className="flex gap-1 items-center justify-center mb-6 h-8">
             <div className="w-2 h-4 bg-[rgb(var(--m3-primary-container))] rounded animate-[bounce_1s_infinite] delay-100"></div>
             <div className="w-2 h-8 bg-[rgb(var(--m3-primary-container))] rounded animate-[bounce_1s_infinite] delay-200"></div>
             <div className="w-2 h-5 bg-[rgb(var(--m3-primary-container))] rounded animate-[bounce_1s_infinite] delay-300"></div>
             <div className="w-2 h-6 bg-[rgb(var(--m3-primary-container))] rounded animate-[bounce_1s_infinite] delay-75"></div>
          </div>
        )}

        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`p-4 rounded-full backdrop-blur-md transition-all ${isVideoOn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-red-500/80 text-white'}`}
          >
            {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>
          
          {isSessionActive ? (
             <button 
                onClick={stopSession}
                className="p-5 rounded-full bg-red-600 text-white shadow-[0_0_24px_rgba(220,38,38,0.5)] transform scale-110"
             >
                <PhoneOff className="w-8 h-8" />
             </button>
          ) : (
             <button 
                onClick={startSession}
                className="p-5 rounded-full bg-[rgb(var(--m3-primary))] text-[rgb(var(--m3-on-primary))] shadow-[0_0_24px_rgba(var(--m3-primary-rgb),0.5)] transform scale-110"
             >
                <Mic className="w-8 h-8" />
             </button>
          )}

          <button 
            onClick={() => setIsMicOn(!isMicOn)}
            className={`p-4 rounded-full backdrop-blur-md transition-all ${isMicOn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-red-500/80 text-white'}`}
          >
            {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

