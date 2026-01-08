
import React, { useRef, useEffect, useState } from 'react';

interface CameraViewProps {
  onCapture: (base64: string) => void;
  overlayType?: string;
  isCapturing?: boolean;
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture, overlayType, isCapturing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const initCamera = async () => {
    stopStream();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: facingMode,
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        }, 
        audio: false 
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      console.error("Camera access denied", err);
    }
  };

  useEffect(() => {
    initCamera();
    return () => stopStream();
  }, [facingMode]);

  useEffect(() => {
    if (isCapturing && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      onCapture(data);
    }
  }, [isCapturing]);

  const toggleCamera = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const renderAROverlay = () => {
    if (!overlayType) return null;

    return (
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="relative w-full h-full">
          {overlayType === 'arrow' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce">
              <svg className="w-24 h-24 text-blue-400 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          )}
          {overlayType === 'gear' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400/60">
              <svg className="w-40 h-40 animate-[spin_8s_linear_infinite]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69l.12.36a.75.75 0 010 .46l-.12.361c-1.49 4.467-5.705 7.69-10.675 7.69-4.973 0-9.19-3.223-10.678-7.69l-.12-.36a.75.75 0 010-.46l.12-.36zM12 5.25c-3.73 0-6.86 2.55-7.89 6 1.03 3.45 4.16 6 7.89 6s6.86-2.55 7.89-6c-1.03-3.45-4.16-6-7.89-6z" clipRule="evenodd"/></svg>
            </div>
          )}
          {overlayType === 'bolt' && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-amber-400 animate-pulse">
               <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
            </div>
          )}
          {overlayType === 'scan' && (
             <div className="absolute inset-x-8 top-1/4 bottom-1/4 border-4 border-blue-400 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(37,99,235,0.3)]">
                <div className="w-full h-1 bg-blue-500 shadow-[0_0_20px_#3b82f6] animate-[scan_2s_ease-in-out_infinite]" />
             </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full aspect-[9/16] bg-slate-900 sm:rounded-b-[48px] overflow-hidden shadow-2xl border-b-4 border-white/10">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />
      {renderAROverlay()}
      
      {/* Camera Flip Button */}
      <button 
        onClick={toggleCamera}
        className="absolute top-6 right-6 w-12 h-12 bg-black/30 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20 active:scale-90 transition-all z-10"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
      </button>

      {/* Corner Brackets */}
      <div className="absolute top-12 left-12 w-10 h-10 border-t-4 border-l-4 border-white/20 rounded-tl-2xl"></div>
      <div className="absolute top-12 right-12 w-10 h-10 border-t-4 border-r-4 border-white/20 rounded-tr-2xl"></div>
      <div className="absolute bottom-12 left-12 w-10 h-10 border-b-4 border-l-4 border-white/20 rounded-bl-2xl"></div>
      <div className="absolute bottom-12 right-12 w-10 h-10 border-b-4 border-r-4 border-white/20 rounded-br-2xl"></div>
      
      <div className="absolute inset-0 border border-white/5 pointer-events-none"></div>
    </div>
  );
};

export default CameraView;
