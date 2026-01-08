
import { GoogleGenAI, Type } from "@google/genai";
import { AppMode, AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = 'gemini-3-flash-preview';

export const analyzeSituation = async (
  mode: AppMode, 
  wideBase64: string, 
  macroBase64: string,
  voiceText?: string
): Promise<AnalysisResult> => {
  const prompt = `Act as an expert ${mode} assistant. Rapidly analyze these two images.
  1. Identify the specific technical issue or state.
  2. Severity: LOW, MEDIUM, or HIGH.
  3. Reasoning: Concise visual identification of components or status.
  4. List exactly 3-4 detailed technical steps.
  5. Each step MUST have 1 'warning' and 2 'checkpoints'.
  6. Include a 'materials' list for the first step.
  
  Speed is priority. Format as JSON.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [
      { parts: [{ text: prompt }] },
      { parts: [{ inlineData: { data: wideBase64, mimeType: 'image/jpeg' } }] },
      { parts: [{ inlineData: { data: macroBase64, mimeType: 'image/jpeg' } }] }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          reasoning: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
          uncertainties: { type: Type.ARRAY, items: { type: Type.STRING } },
          isSafeToProceed: { type: Type.BOOLEAN },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.NUMBER },
                title: { type: Type.STRING },
                instruction: { type: Type.STRING },
                duration: { type: Type.STRING },
                materials: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      alternative: { type: Type.STRING }
                    }
                  }
                },
                warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
                checkpoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                audioPrompt: { type: Type.STRING },
                arOverlayType: { type: Type.STRING },
              },
              required: ['id', 'title', 'instruction', 'audioPrompt', 'arOverlayType']
            }
          }
        },
        required: ['category', 'confidence', 'reasoning', 'severity', 'isSafeToProceed', 'steps']
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}') as AnalysisResult;
  } catch (e) {
    throw new Error("Failed to parse AI response");
  }
};

export const verifyStep = async (
  instruction: string,
  base64Image: string
): Promise<{ success: boolean; feedback: string }> => {
  const prompt = `Analyze if the user successfully completed this step: "${instruction}".
  Look at the provided photo. Is the task done correctly?
  Return JSON: { "success": boolean, "feedback": "Brief feedback or correction" }`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [
      { parts: [{ text: prompt }] },
      { parts: [{ inlineData: { data: base64Image, mimeType: 'image/jpeg' } }] }
    ],
    config: { responseMimeType: "application/json" }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { success: true, feedback: "Unable to verify, but proceeding safely." };
  }
};

export const playInstructionAudio = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const binary = atob(base64Audio);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
    }
  } catch (err) {
    console.warn("Audio generation failed:", err);
  }
};
