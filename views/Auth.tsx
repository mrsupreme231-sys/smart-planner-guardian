import React, { useState } from 'react';
import { registerUser, loginUser, loginWithPasscodeOnly, saveActiveSession } from '../services/storage';
import { WATERMARK_TEXT } from '../constants';
import { Mail, Lock, User as UserIcon, ArrowRight, KeyRound } from 'lucide-react';
import { AppState } from '../types';

interface AuthProps {
  onAuthenticated: (state: AppState) => void;
}

const LogoDM = ({ className = "w-32 h-32" }: { className?: string }) => (
  <div className={`${className} relative flex items-center justify-center group transition-transform active:scale-95 drop-shadow-2xl`}>
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <radialGradient id="logoBg" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="#168085" />
          <stop offset="100%" stopColor="#0b4c50" />
        </radialGradient>
        <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#65e9ed" />
          <stop offset="100%" stopColor="#36b1b6" />
        </linearGradient>
      </defs>
      {/* Outer Circle */}
      <circle cx="50" cy="50" r="48" fill="url(#logoBg)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      
      {/* Shield Outline */}
      <path 
        d="M50 25 L75 35 V55 C75 70 50 82 50 82 C50 82 25 70 25 55 V35 L50 25Z" 
        fill="none" 
        stroke="url(#shieldGrad)" 
        strokeWidth="3.5" 
        strokeLinejoin="round"
      />
      
      {/* Piggy Bank Silhouette (Simplified) */}
      <path 
        d="M40 45 Q35 45 35 50 Q35 55 40 55 H55 Q60 55 60 50 Q60 45 55 45 H40Z" 
        fill="rgba(101, 233, 237, 0.2)" 
      />
      
      {/* Rising Arrow Gold */}
      <path 
        d="M30 65 Q45 65 55 50 T75 30" 
        fill="none" 
        stroke="#fbd68a" 
        strokeWidth="4" 
        strokeLinecap="round"
      />
      <path d="M75 30 L65 30 M75 30 L75 40" fill="none" stroke="#fbd68a" strokeWidth="4" strokeLinecap="round" />
      
      {/* D&M Text */}
      <text 
        x="50" 
        y="75" 
        textAnchor="middle" 
        fill="#65e9ed" 
        fontSize="12" 
        fontWeight="900" 
        fontFamily="sans-serif"
        style={{ letterSpacing: '1px' }}
      >D&M</text>
    </svg>
    <div className="absolute inset-0 bg-white/5 rounded-full pointer-events-none"></div>
  </div>
);

const Auth: React.FC<AuthProps> = ({ onAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        if (isRecovering) {
          // Recovery flow: email + passcode
          if (!email || !passcode) {
            setError('Please enter both email and passcode for recovery.');
            return;
          }
          const state = await loginUser(email, passcode);
          if (state) {
            saveActiveSession(email);
            onAuthenticated(state);
          } else {
            setError('Recovery failed. Invalid credentials.');
          }
        } else {
          // Passcode-only login
          if (!passcode) {
            setError('Please enter your passcode.');
            return;
          }
          const state = await loginWithPasscodeOnly(passcode);
          if (state) {
            onAuthenticated(state);
          } else {
            setError('Access Denied. Incorrect Passcode.');
          }
        }
      } else {
        if (!name || !email || !passcode) {
          setError('Complete all fields to register.');
          return;
        }
        const success = await registerUser(email, passcode, name);
        if (success) {
          // After successful registration, create initial state instead of trying to login immediately
          // This avoids potential Firestore latency issues
          const initialState = {
            currentUser: { email, name, currency: 'USD', avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}` },
            goals: [],
            history: [],
            hasSeenOnboarding: false,
            customCategories: []
          };
          
          saveActiveSession(email);
          onAuthenticated(initialState);
        } else {
          setError('Email already exists in vault.');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] bg-slate-900 flex flex-col p-8 overflow-y-auto no-scrollbar">
      <div className="flex-1 flex flex-col justify-center items-center max-w-sm mx-auto w-full">
        
        {/* NEW D&M LOGO */}
        <LogoDM className="w-40 h-40 mb-8" />
        
        <h1 className="text-3xl font-black text-white mb-1 text-center uppercase tracking-tighter">Guardian Vault</h1>
        <p className="text-teal-400/70 text-center mb-10 text-xs font-black uppercase tracking-[0.2em]">D&M Smart Services</p>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {!isLogin && (
            <div className="relative animate-in slide-in-from-bottom-2 duration-300">
              <UserIcon className="absolute left-4 top-4 text-teal-300/50" size={20} />
              <input 
                type="text" 
                placeholder="Your Full Name" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 ring-teal-500/50"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          {(!isLogin || (isLogin && isRecovering)) && (
            <div className="relative animate-in slide-in-from-bottom-2 duration-400">
              <Mail className="absolute left-4 top-4 text-teal-300/50" size={20} />
              <input 
                type="email" 
                placeholder="Email Address" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 ring-teal-500/50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          <div className="relative">
            <Lock className="absolute left-4 top-4 text-teal-300/50" size={20} />
            <input 
              type="password" 
              placeholder="Enter Passcode" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 ring-teal-500/50 text-center tracking-[1em] text-2xl font-black"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              maxLength={10}
              disabled={isLoading}
            />
          </div>

          {isLogin && (
            <div className="flex items-center justify-center gap-3 py-2">
              <button 
                type="button"
                onClick={() => setIsRecovering(!isRecovering)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isRecovering ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'bg-white/5 text-slate-400'}`}
                disabled={isLoading}
              >
                <KeyRound size={12} />
                {isRecovering ? 'Switch to Passcode Only' : 'Recover Account'}
              </button>
            </div>
          )}

          {error && (
            <div className="bg-rose-500/20 border border-rose-500/30 p-3 rounded-xl text-center">
              <p className="text-rose-200 text-xs font-bold">{error}</p>
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-teal-500 text-white py-5 rounded-3xl font-black text-xl shadow-2xl shadow-teal-900/40 flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : (isLogin ? 'Grant Access' : 'Create Vault')}
            <ArrowRight size={24} />
          </button>
        </form>

        <div className="mt-10 flex flex-col items-center gap-6 w-full">
            <button 
              onClick={() => { setIsLogin(!isLogin); setIsRecovering(false); setError(''); }}
              className="text-slate-500 text-xs font-bold hover:text-white transition-colors underline underline-offset-4 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLogin ? "New user? Register Account" : "Registered? Login to Vault"}
            </button>
            <div className="flex items-center gap-2 opacity-10">
                <div className="w-8 h-px bg-white"></div>
                <p className="text-[8px] text-white font-bold tracking-[0.3em] uppercase">Master Authorization Active</p>
                <div className="w-8 h-px bg-white"></div>
            </div>
        </div>
      </div>

      <div className="mt-auto pt-8 text-center pb-6 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-teal-900 rounded-full flex items-center justify-center border border-teal-500 shadow-sm">
             <span className="text-teal-400 font-black text-[8px]">DM</span>
          </div>
          <p className="text-[9px] uppercase text-slate-500 tracking-widest font-black leading-none">{WATERMARK_TEXT}</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;