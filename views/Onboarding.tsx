
import React, { useState, useEffect } from 'react';
import { speakText, stopSpeech } from '../services/tts';
import { WATERMARK_TEXT } from '../constants';
import { Volume2, Loader2 } from 'lucide-react';
import Lottie from 'lottie-react';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const slides = [
    {
      title: "Welcome to Smart Planner",
      desc: "I am your Financial Guardian. Together, we will manage your goals with precision and security.",
      color: "bg-[#0b4c50]",
      illustration: "🛡️",
      audio: "Welcome to your smart planner. I am your Financial Guardian. Let's manage your goals together."
    },
    {
      title: "The 5% Buffer Strategy",
      desc: "Our unique logic adds a 5% safety buffer to your installments, ensuring you hit your targets stress-free and early.",
      color: "bg-emerald-800",
      illustration: "📈",
      audio: "Our unique strategy adds a five percent safety buffer to your installments, ensuring you hit your targets early."
    },
    {
      title: "Categorized Success",
      desc: "Organize your life into categories like Savings, Tech, and Travel. Track every cent with visual clarity.",
      color: "bg-teal-700",
      illustration: "🗂️",
      audio: "Organize your life into categories like Savings, Tech, and Travel. Track every cent with clarity."
    },
    {
      title: "Secure Cloud Sync",
      desc: "Your data is backed up to our secure vault. Even if your phone is lost, your dreams remain safe and retrievable.",
      color: "bg-slate-900",
      illustration: "☁️",
      audio: "Your data is backed up to our secure vault. Your dreams are safe and retrievable even if you lose your phone."
    }
  ];

  const playSlideAudio = async (index: number) => {
    setIsAudioPlaying(true);
    await speakText(slides[index].audio);
    setIsAudioPlaying(false);
  };

  const handleNext = async () => {
    if (isAudioPlaying) return;

    if (!hasStarted) {
      setHasStarted(true);
      playSlideAudio(0);
    } else if (step < slides.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      playSlideAudio(nextStep);
    } else {
      stopSpeech();
      onComplete();
    }
  };

  useEffect(() => {
    // Play welcome message when component mounts
    if (!hasStarted) {
      speakText("Welcome. Let's manage your 2026 goals together.");
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[300] bg-[#0b4c50] flex flex-col items-center justify-center text-white px-8">
      {/* Branding Logo */}
      <div className="absolute top-12 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top duration-700">
        <div className="w-20 h-20 bg-[#0b4c50] rounded-full flex items-center justify-center border-4 border-teal-400 shadow-2xl relative overflow-hidden">
           <span className="text-teal-400 font-black text-2xl drop-shadow-lg">D&M</span>
           <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent"></div>
        </div>
        <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] leading-none mb-0.5 text-teal-400">The Governor</p>
            <p className="text-[8px] font-bold uppercase tracking-widest opacity-60">Smart Planning Services</p>
        </div>
      </div>

      {/* Lottie Animation */}
      <div className="w-64 h-64 mb-12">
        <Lottie 
          animationData={require('../public/welcome-animation.json')} 
          loop={true}
          autoplay={true}
        />
      </div>
      
      <div className="text-center animate-in fade-in slide-in-from-bottom duration-700">
        <h1 className="text-3xl font-black mb-6 tracking-tight uppercase leading-tight">Welcome to Smart Planner</h1>
        <p className="text-lg opacity-90 mb-12 leading-relaxed max-w-sm font-medium">
          I am your Financial Guardian. Together, we will manage your goals with precision and security.
        </p>

        <button
          onClick={handleNext}
          disabled={isAudioPlaying}
          className={`w-full max-w-xs py-5 rounded-[32px] font-black text-xl shadow-2xl active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-3 ${
            isAudioPlaying 
            ? 'bg-white/20 text-white cursor-not-allowed border-2 border-white/30' 
            : 'bg-teal-400 text-[#0b4c50]'
          }`}
        >
          {isAudioPlaying ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              Listening...
            </>
          ) : (
            "Begin Journey"
          )}
        </button>
        
        {isAudioPlaying && (
          <p className="mt-6 text-[10px] font-black uppercase tracking-widest animate-pulse flex items-center justify-center gap-2">
            <Volume2 size={12} /> Guardian Voice Over Active
          </p>
        )}
      </div>

      <div className="absolute bottom-12 px-4 text-center w-full flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#0b4c50] rounded-full flex items-center justify-center border border-teal-400 shadow-sm">
               <span className="text-teal-400 font-black text-[10px]">DM</span>
            </div>
            <p className="text-[9px] uppercase opacity-60 tracking-[0.1em] font-black">Created by: D & M Smart Services</p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
