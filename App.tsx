
import React, { useState, useEffect, useRef } from 'react';
import { AppState, AppMode, AnalysisResult, GuidanceStep } from './types';
import CameraView from './components/CameraView';
import { analyzeSituation, verifyStep, playInstructionAudio } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.HOME);
  const [mode, setMode] = useState<AppMode>(AppMode.FIRST_AID);
  const [wideImage, setWideImage] = useState<string | null>(null);
  const [macroImage, setMacroImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [voiceDescription, setVoiceDescription] = useState<string | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState<{ success: boolean; feedback: string } | null>(null);

  // Long press for override logic
  const [overrideHeld, setOverrideHeld] = useState(false);
  const [overrideProgress, setOverrideProgress] = useState(0);
  const longPressTimer = useRef<number | null>(null);
  const progressInterval = useRef<number | null>(null);

  const startAssessment = (selectedMode: AppMode) => {
    setMode(selectedMode);
    setWideImage(null);
    setMacroImage(null);
    setVoiceDescription(null);
    setState(AppState.INITIAL_CAPTURE);
  };

  const handleCapture = async (data: string) => {
    setIsCapturing(false);
    if (state === AppState.INITIAL_CAPTURE) {
      if (!wideImage) {
        setWideImage(data);
      } else {
        setMacroImage(data);
        setState(AppState.CAPTURE_COMPLETE);
      }
    } else if (state === AppState.STEP_VALIDATION) {
      setIsBusy(true);
      const result = await verifyStep(analysis!.steps[currentStepIdx].instruction, data);
      setVerificationFeedback(result);
      setIsBusy(false);
    }
  };

  const triggerAnalysis = async () => {
    setState(AppState.ANALYZING);
    setIsBusy(true);
    try {
      const res = await analyzeSituation(mode, wideImage!, macroImage!, voiceDescription || undefined);
      setAnalysis(res);
      setState(AppState.ANALYSIS_COMPLETE);
    } catch (err) {
      console.error(err);
      setState(AppState.HOME);
    } finally {
      setIsBusy(false);
    }
  };

  const startGuidance = () => {
    setState(AppState.PREPARING_INSTRUCTIONS);
    setTimeout(() => {
      setState(AppState.GUIDANCE);
      setCurrentStepIdx(0);
      if (analysis?.steps[0]) {
        playInstructionAudio(analysis.steps[0].audioPrompt);
      }
    }, 400); 
  };

  const proceedNext = () => {
    if (currentStepIdx < analysis!.steps.length - 1) {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      setVerificationFeedback(null);
      setState(AppState.GUIDANCE);
      playInstructionAudio(analysis!.steps[nextIdx].audioPrompt);
    } else {
      setState(AppState.COMPLETED);
    }
  };

  // Human-in-the-loop Manual Override handlers
  const handleOverrideStart = () => {
    setOverrideHeld(true);
    setOverrideProgress(0);
    const startTime = Date.now();
    const duration = 1500; // 1.5 seconds hold

    progressInterval.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setOverrideProgress(progress);
      if (progress >= 100) {
        if (progressInterval.current) clearInterval(progressInterval.current);
        proceedNext();
        setOverrideHeld(false);
        setOverrideProgress(0);
      }
    }, 16);
  };

  const handleOverrideEnd = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    setOverrideHeld(false);
    setOverrideProgress(0);
  };

  const renderHeader = (title: string, showStep?: boolean) => (
    <header className="w-full bg-white border-b border-slate-100 p-4 sticky top-0 z-50 flex items-center justify-between">
      <button onClick={() => setState(AppState.HOME)} className="p-2 -ml-2 text-slate-900">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
      <div className="text-center">
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h1>
        {showStep && analysis && (
          <p className="text-xs text-slate-500 font-medium">Step {currentStepIdx + 1} of {analysis.steps.length}</p>
        )}
      </div>
      <div className="w-10" />
    </header>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center select-none font-sans overflow-x-hidden">
      
      <main className="w-full max-w-md flex-1 flex flex-col relative">
        
        {state === AppState.HOME && (
          <div className="p-6 pt-10 animate-fade-in flex flex-col items-center pb-40">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-4 shadow-sm border border-blue-100">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight text-center">MasterEverything</h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2 mb-10">AI-Powered Universal Instruction</p>

            <div className="w-full space-y-4">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Technical Domains</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { m: AppMode.ROBOTICS, icon: 'bolt', col: 'bg-indigo-600', t: 'Robotics & Electronics' },
                  { m: AppMode.MECHANICAL, icon: 'gear', col: 'bg-slate-800', t: 'Auto & Mechanical' },
                  { m: AppMode.CODING, icon: 'code', col: 'bg-blue-600', t: 'Software Engineering' },
                  { m: AppMode.TRADES, icon: 'hammer', col: 'bg-amber-600', t: 'Workshop & Trades' },
                ].map(item => (
                  <button 
                    key={item.t} 
                    onClick={() => startAssessment(item.m)}
                    className={`${item.col} text-white p-6 rounded-[24px] flex flex-col items-center justify-center gap-4 shadow-lg active:scale-[0.96] transition-all text-center h-44 border-b-4 border-black/20`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-black">
                       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                         {item.icon === 'bolt' && <path d="M13 10V3L4 14h7v7l9-11h-7z" />}
                         {item.icon === 'gear' && <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />}
                         {item.icon === 'code' && <path d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />}
                         {item.icon === 'hammer' && <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-5M9 15l3 3L22 7" />}
                       </svg>
                    </div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider leading-tight">{item.t}</h4>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 mt-8 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Emergency Mode</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <button 
                onClick={() => startAssessment(AppMode.FIRST_AID)}
                className="w-full bg-rose-500 text-white p-6 rounded-[28px] shadow-xl shadow-rose-100 flex items-center gap-5 active:scale-[0.98] transition-all border-b-4 border-rose-700"
              >
                <div className="bg-white/20 p-4 rounded-2xl">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"></path></svg>
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-extrabold leading-tight tracking-tight">Rapid First Aid</h3>
                  <p className="text-white/80 text-[13px] font-bold">Life-saving AR instructions</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {(state === AppState.INITIAL_CAPTURE || state === AppState.STEP_VALIDATION) && (
          <div className="flex-1 flex flex-col bg-white">
            {renderHeader(state === AppState.INITIAL_CAPTURE ? "Analysis Scan" : "Step Validation")}
            <CameraView onCapture={handleCapture} isCapturing={isCapturing} />
            <div className="p-8 text-center animate-slide-up flex flex-col items-center">
               <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {state === AppState.INITIAL_CAPTURE 
                    ? (!wideImage ? "Capture Scene Context" : "Capture Technical Detail")
                    : "Verify Task Completion"
                  }
               </h2>
               <p className="text-slate-400 text-sm mt-1 mb-8 font-medium">
                  {state === AppState.STEP_VALIDATION 
                    ? "Snap a photo of your work to proceed" 
                    : (!wideImage ? "Wide angle view of the device/system" : "High detail of specific component")}
               </p>
               <button 
                disabled={isBusy}
                onClick={() => setIsCapturing(true)}
                className={`w-24 h-24 bg-white border-8 border-slate-100 rounded-full shadow-inner active:scale-90 transition-transform flex items-center justify-center p-2 relative ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
               >
                 <div className={`w-full h-full rounded-full transition-colors ${state === AppState.STEP_VALIDATION ? 'bg-emerald-500' : 'bg-blue-600'}`} />
                 {isBusy && <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />}
               </button>
            </div>
          </div>
        )}

        {state === AppState.CAPTURE_COMPLETE && (
          <div className="flex-1 flex flex-col bg-white animate-fade-in">
            {renderHeader("Capture Ready")}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col">
              <div className="grid grid-cols-2 gap-4 mb-10">
                 <div className="flex flex-col items-center">
                    <div className="aspect-[3/4] w-full rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-50 mb-3 shadow-md">
                      <img src={`data:image/jpeg;base64,${wideImage}`} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Context</span>
                    <button onClick={() => { setWideImage(null); setState(AppState.INITIAL_CAPTURE); }} className="text-blue-600 text-[12px] font-black mt-1">Retake</button>
                 </div>
                 <div className="flex flex-col items-center">
                    <div className="aspect-[3/4] w-full rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-50 mb-3 shadow-md">
                      <img src={`data:image/jpeg;base64,${macroImage}`} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Detail</span>
                    <button onClick={() => { setMacroImage(null); setState(AppState.INITIAL_CAPTURE); }} className="text-blue-600 text-[12px] font-black mt-1">Retake</button>
                 </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center">
                 <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                   <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"></path></svg>
                 </div>
                 <h2 className="text-2xl font-black text-slate-900 tracking-tight">Technical Data Synced</h2>
                 <p className="text-slate-400 text-sm font-bold mt-2 px-8">Analysis engine is ready to deploy instructions for {mode}.</p>
              </div>

              <div className="mt-12">
                 <button onClick={triggerAnalysis} className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black text-xl shadow-xl shadow-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                   Analyze Situation
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                 </button>
              </div>
            </div>
          </div>
        )}

        {state === AppState.ANALYZING && (
          <div className="flex-1 flex flex-col items-center justify-center bg-white p-12">
             <div className="relative w-24 h-24 mb-10">
               <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
               <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
             </div>
             <h2 className="text-3xl font-black text-slate-900 tracking-tight">Deploying AI</h2>
             <p className="text-slate-400 text-sm mt-3 text-center font-bold tracking-tight px-8">Cross-referencing domain-specific schematics and technical protocols...</p>
          </div>
        )}

        {state === AppState.ANALYSIS_COMPLETE && analysis && (
          <div className="flex-1 flex flex-col bg-white animate-fade-in p-6">
            {renderHeader("Assessment Result")}
            <div className="flex-1 overflow-y-auto space-y-6 pt-6">
              <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{analysis.severity} SEVERITY DETECTED</span>
                </div>
                <h3 className="text-3xl font-black text-slate-900 leading-tight mb-4 tracking-tight">{analysis.category}</h3>
                <p className="text-slate-600 font-bold leading-relaxed">{analysis.reasoning}</p>
              </div>

              <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100 flex items-center gap-6">
                 <div className="text-blue-600">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                 </div>
                 <div>
                    <h4 className="font-black text-blue-900">Technical Protocol</h4>
                    <p className="text-blue-700 text-[13px] font-bold">Standard procedure loaded for {mode}.</p>
                 </div>
              </div>
            </div>
            
            <div className="pt-8">
              <button onClick={startGuidance} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xl shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4">
                Deploy Instructions
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}

        {state === AppState.PREPARING_INSTRUCTIONS && (
           <div className="flex-1 flex flex-col items-center justify-center bg-white p-12">
             <div className="w-20 h-20 mb-8 text-blue-600 animate-pulse">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
             </div>
             <h2 className="text-3xl font-black text-slate-900 tracking-tight">Loading Protocol</h2>
             <p className="text-slate-400 text-sm mt-3 text-center font-bold px-4">Calibrating AR overlays and verification thresholds...</p>
          </div>
        )}

        {state === AppState.GUIDANCE && analysis && (
          <div className="flex-1 flex flex-col bg-white overflow-hidden animate-fade-in">
            {renderHeader("Technical Procedure", true)}
            
            <div className="w-full h-1.5 bg-slate-100 flex relative overflow-hidden">
               <div className="h-full bg-blue-600 transition-all duration-700 ease-out" style={{ width: `${((currentStepIdx + 1) / analysis.steps.length) * 100}%` }} />
               {overrideHeld && (
                 <div className="absolute top-0 left-0 h-full bg-emerald-400 opacity-50 transition-all duration-75" style={{ width: `${overrideProgress}%` }} />
               )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-48">
              {/* Materials Card */}
              {analysis.steps[currentStepIdx].materials && (
                <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    </div>
                    <h4 className="text-xl font-black text-slate-800">Prerequisites</h4>
                  </div>
                  <div className="space-y-4">
                    {analysis.steps[currentStepIdx].materials?.map((m, i) => (
                      <div key={i} className="flex gap-4 items-start">
                        <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                        </div>
                        <div>
                          <p className="text-[15px] font-black text-slate-800 leading-tight">{m.name}</p>
                          {m.alternative && <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Alt: {m.alternative}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step Card */}
              <div>
                <div className="flex items-center gap-5 mb-6">
                   <div className="w-14 h-14 bg-slate-900 text-white rounded-[22px] flex items-center justify-center text-3xl font-black shrink-0 shadow-lg shadow-slate-200">
                      {currentStepIdx + 1}
                   </div>
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{analysis.steps[currentStepIdx].title}</h2>
                </div>
                
                <p className="text-[18px] text-slate-700 font-semibold leading-relaxed mb-8">
                  {analysis.steps[currentStepIdx].instruction}
                </p>

                {/* Technical Meta */}
                <div className="grid grid-cols-2 gap-4 mb-10">
                   <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Estimated Time</p>
                      <p className="text-blue-800 font-black">{analysis.steps[currentStepIdx].duration || '2-5 mins'}</p>
                   </div>
                   <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Status</p>
                      <p className="text-emerald-800 font-black">Active</p>
                   </div>
                </div>

                {/* Warnings Section */}
                {analysis.steps[currentStepIdx].warnings && analysis.steps[currentStepIdx].warnings!.length > 0 && (
                  <div className="space-y-3 mb-8">
                    <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <svg className="w-4 h-4 text-rose-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                       Caution Protocol
                    </h5>
                    {analysis.steps[currentStepIdx].warnings?.map((w, i) => (
                      <div key={i} className="bg-rose-50 border border-rose-100 p-5 rounded-2xl text-[14px] text-rose-800 font-bold leading-relaxed shadow-sm">
                        {w}
                      </div>
                    ))}
                  </div>
                )}

                {/* Checkpoints Section */}
                <div className="space-y-4">
                  <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" /></svg>
                     Validation Checkpoints
                  </h5>
                  {analysis.steps[currentStepIdx].checkpoints?.map((c, i) => (
                    <div key={i} className="bg-white border border-slate-100 p-5 rounded-2xl flex gap-4 text-[14px] text-slate-800 font-bold leading-relaxed shadow-sm">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 shrink-0" />
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Manual Override & Verification Buttons */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-6 bg-white border-t border-slate-100 flex flex-col gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
               <button 
                onPointerDown={handleOverrideStart}
                onPointerUp={handleOverrideEnd}
                onPointerLeave={handleOverrideEnd}
                className="w-full bg-slate-50 text-slate-400 py-3 rounded-xl font-bold text-xs uppercase tracking-widest relative overflow-hidden active:bg-slate-100 transition-all border border-slate-200"
               >
                 <div className="absolute top-0 left-0 h-full bg-emerald-500/10 transition-all duration-75" style={{ width: `${overrideProgress}%` }} />
                 <span className="relative z-10">Long Press to Override Auto-Verify</span>
               </button>
               
               <button 
                onClick={() => setState(AppState.STEP_VALIDATION)}
                className="w-full bg-emerald-500 text-white py-5 rounded-[22px] font-black text-lg shadow-xl shadow-emerald-100 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
               >
                 Snap to Verify Completion
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
               </button>
            </div>
          </div>
        )}

        {state === AppState.STEP_VALIDATION && verificationFeedback && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm p-6 animate-fade-in">
             <div className="w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl animate-slide-up border-t-8 border-emerald-500">
                <div className="flex items-center gap-4 mb-6">
                   <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${verificationFeedback.success ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                      {verificationFeedback.success ? (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      )}
                   </div>
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                     {verificationFeedback.success ? "Verification Success" : "Needs Adjustment"}
                   </h2>
                </div>
                <p className="text-slate-600 font-bold leading-relaxed mb-10">{verificationFeedback.feedback}</p>
                <div className="flex gap-4">
                   {!verificationFeedback.success && (
                     <button onClick={() => setVerificationFeedback(null)} className="flex-1 bg-slate-100 text-slate-800 py-5 rounded-[22px] font-black">Retry Capture</button>
                   )}
                   <button onClick={proceedNext} className="flex-1 bg-emerald-500 text-white py-5 rounded-[22px] font-black shadow-lg shadow-emerald-100 flex items-center justify-center gap-2">
                     Confirm & Proceed
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                   </button>
                </div>
             </div>
          </div>
        )}

        {state === AppState.ESCALATION && (
          <div className="p-8 flex flex-col flex-1 bg-white items-center justify-center text-center animate-slide-up">
            <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mb-8">
              <svg className="w-12 h-12 text-rose-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path></svg>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">Emergency Support Required</h2>
            <p className="text-slate-500 font-bold mb-12 px-6 leading-relaxed">Technical or medical emergency detected. Dialing local first responders immediately.</p>
            <a href="tel:911" className="w-full bg-rose-600 text-white py-8 rounded-[32px] font-black text-4xl shadow-2xl shadow-rose-200 active:scale-95 transition-all">
              Dial 911 Now
            </a>
            <button onClick={() => setState(AppState.HOME)} className="mt-12 text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Back to Dashboard</button>
          </div>
        )}

        {state === AppState.COMPLETED && (
           <div className="p-10 flex flex-col flex-1 bg-white items-center justify-center text-center animate-slide-up">
            <div className="w-32 h-32 bg-emerald-50 rounded-[50px] flex items-center justify-center mb-10 rotate-6 shadow-xl border border-emerald-100">
              <svg className="w-16 h-16 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Mission Success</h2>
            <p className="text-slate-400 font-black text-sm mb-16 uppercase tracking-[0.3em] border-y border-slate-100 py-3">Technical Outcome Verified</p>
            <button onClick={() => setState(AppState.HOME)} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-2xl shadow-2xl active:scale-95 transition-all">
              Finish Session
            </button>
          </div>
        )}

      </main>

      <style>{`
        @keyframes slide-up { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
