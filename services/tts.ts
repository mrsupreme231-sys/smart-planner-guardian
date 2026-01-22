
import { GoogleGenAI, Modality } from "@google/genai";

let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const stopSpeech = () => {
  if (currentSource) {
    try {
      currentSource.stop();
    } catch (e) {}
    currentSource = null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

export const speakText = async (text: string): Promise<void> => {
  stopSpeech();
  
  return new Promise(async (resolve) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say clearly and professionally: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio data");

      const ctx = getAudioContext();
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }

      currentSource = ctx.createBufferSource();
      currentSource.buffer = buffer;
      currentSource.connect(ctx.destination);
      currentSource.onended = () => resolve();
      currentSource.start();
    } catch (error) {
      console.warn("Fallback to Browser TTS:", error);
      const msg = new SpeechSynthesisUtterance(text);
      msg.onend = () => resolve();
      window.speechSynthesis.speak(msg);
    }
  });
};
