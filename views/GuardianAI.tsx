
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Bot, Send, User, WifiOff, Sparkles, Volume2, Play } from 'lucide-react';
import { AppState } from '../types';
import { speakText, stopSpeech } from '../services/tts';

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

interface GuardianAIProps {
  appState: AppState;
}

const GuardianAI: React.FC<GuardianAIProps> = ({ appState }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: "Hello! I am your Financial Guardian AI. I track your installments closely. If you miss a payment, I am here to encourage and help you adjust your plan.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isPlayingAudio, setIsPlayingAudio] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSpeakMessage = async (text: string, index: number) => {
    if (isPlayingAudio === index) {
      stopSpeech();
      setIsPlayingAudio(null);
      return;
    }
    setIsPlayingAudio(index);
    await speakText(text);
    setIsPlayingAudio(null);
  };

  const getOfflineResponse = (query: string): string => {
    const q = query.toLowerCase();
    if (q.includes('developer') || q.includes('who made') || q.includes('contact')) {
      return "This application was developed by D & M Smart Services. You can contact the developer at +231 772014558 or +231 778613786. Email: adavidlsirleaf2005@gmail.com";
    }
    if (q.includes('missed') || q.includes('failed') || q.includes('encourage')) {
      return "I see you've missed some installments. Don't be discouraged! Consistency is key. You can try setting a 'Wait' next time to give yourself more time, or use the 5% buffer to catch up early.";
    }
    return "I'm currently in 'Vault Mode' (offline). I can help with basic questions about goals, installments, and buffers.";
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (isOffline) {
      setTimeout(() => {
        const offlineReply: Message = {
          role: 'model',
          text: getOfflineResponse(input),
          timestamp: new Date()
        };
        setMessages(prev => [...prev, offlineReply]);
        setIsLoading(false);
      }, 600);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      const activeGoalsCount = appState.goals.length;
      const historyCount = appState.history.length;
      
      // Calculate missed payments for context
      const totalMissed = appState.goals.reduce((acc, g) => acc + g.installmentLogs.filter(l => l.status === 'failed').length, 0);

      const systemInstruction = `
        You are the 'Financial Guardian AI' for the Smart Planner & Financial Guardian app.
        Current Context:
        - User Name: ${appState.currentUser?.name}
        - Active Goals: ${activeGoalsCount}
        - Total Missed Installments: ${totalMissed}
        
        Behavior Guidelines:
        1. If totalMissed > 0, provide specific encouragement to help the user get back on track.
        2. Explain the "Wait" feature which adds 2 hours to a due payment.
        3. Remind them about the "5% Buffer" as a safety net.
        4. Mention Developer Info if asked: Cell +231 772014558/778613786, Email: adavidlsirleaf2005@gmail.com.
        
        Tone: Encouraging, non-judgmental, guardian-like, and financial-wise.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: messages.concat(userMessage).map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
        config: { systemInstruction, temperature: 0.7 }
      });

      const modelReply: Message = {
        role: 'model',
        text: response.text || "I'm having trouble thinking. Try again?",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, modelReply]);
    } catch (error) {
      const errorReply: Message = {
        role: 'model',
        text: getOfflineResponse(input),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorReply]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative pb-32">
      <div className="bg-indigo-600 p-6 text-white shrink-0 shadow-lg relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md"><Bot size={28} /></div>
          <div>
            <h2 className="text-xl font-bold">Guardian AI</h2>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-orange-400' : 'bg-emerald-400'}`}></span>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{isOffline ? 'Vault Mode' : 'Online'}</span>
            </div>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-indigo-600 shadow-sm border border-slate-100'}`}>
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`relative p-4 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white shadow-md rounded-tr-none' : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-tl-none'}`}>
                {m.text}
                <div className="flex items-center justify-between mt-3 gap-4">
                  <p className={`text-[9px] opacity-50 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {m.role === 'model' && (
                    <button onClick={() => handleSpeakMessage(m.text, i)} className={`p-1.5 rounded-full transition-colors ${isPlayingAudio === i ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>
                      {isPlayingAudio === i ? <Volume2 size={12} className="animate-pulse" /> : <Play size={12} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-300"></span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-100 fixed bottom-28 left-0 right-0 max-w-md mx-auto z-40">
        <div className="relative flex items-center gap-2">
          <input 
            type="text" placeholder="Ask about missed payments or goals..."
            className="flex-1 bg-slate-50 border-none rounded-2xl py-4 pl-5 pr-12 text-sm focus:ring-2 ring-indigo-500 transition-all outline-none"
            value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} disabled={!input.trim() || isLoading} className="absolute right-2 bg-indigo-600 text-white p-2.5 rounded-xl active:scale-90 transition-transform">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuardianAI;
