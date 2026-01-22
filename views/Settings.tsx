
import React, { useRef } from 'react';
import { UserProfile } from '../types';
import { User, Bell, Globe, ShieldCheck, LogOut, ChevronRight, Cloud, RefreshCw, Camera } from 'lucide-react';

interface SettingsProps {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  onReset: () => void;
  onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ profile, setProfile, onReset, onLogout }) => {
  const currencies = ['USD', 'EUR', 'GBP', 'LRD', 'NGN'];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({
          ...profile,
          avatar: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 space-y-8 pb-32">
      <h2 className="text-2xl font-bold text-slate-900">Settings</h2>

      {/* Profile Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-4">
        <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
          <img src={profile.avatar} alt="User" className="w-24 h-24 rounded-3xl object-cover shadow-lg border-4 border-indigo-50" />
          <div className="absolute inset-0 bg-black/30 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
            <Camera size={24} />
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
          />
        </div>
        
        <div className="flex-1">
          <p className="text-xs font-bold text-slate-400 uppercase">Secure Account</p>
          <h3 className="text-xl font-bold text-slate-900">{profile.name}</h3>
          <p className="text-sm text-indigo-600 font-bold">{profile.email}</p>
        </div>
        
        <button onClick={onLogout} className="mt-2 w-full py-3 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-95">
          <LogOut size={18}/>
          <span className="uppercase">Secure Logout</span>
        </button>
      </div>

      {/* App Settings */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase px-2">Preference</h4>
        
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
           <div className="p-4 flex items-center gap-4 border-b border-slate-50">
             <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Globe size={20}/></div>
             <div className="flex-1">
               <p className="text-sm font-bold text-slate-800">Default Currency</p>
               <p className="text-[10px] text-slate-400">Current: {profile.currency}</p>
             </div>
             <select 
               className="bg-slate-50 border-none rounded-lg text-xs font-bold p-2 outline-none"
               value={profile.currency}
               onChange={e => setProfile({...profile, currency: e.target.value})}
             >
               {currencies.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
           </div>

           <div className="p-4 flex items-center gap-4 border-b border-slate-50">
             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Bell size={20}/></div>
             <div className="flex-1">
               <p className="text-sm font-bold text-slate-800">Smart Notifications</p>
               <p className="text-[10px] text-slate-400">Reminders for installments</p>
             </div>
             <div className="w-10 h-5 bg-indigo-600 rounded-full relative">
               <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full"></div>
             </div>
           </div>

           <div className="p-4 flex items-center gap-4">
             <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Cloud size={20}/></div>
             <div className="flex-1">
               <p className="text-sm font-bold text-slate-800">Auto-Sync Sync</p>
               <p className="text-[10px] text-slate-400">Connected to Guardian Cloud</p>
             </div>
             <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase">Active</span>
           </div>
        </div>
      </div>

      {/* Security */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase px-2">Data Management</h4>
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
           <button className="w-full p-4 flex items-center gap-4 border-b border-slate-50 text-left">
             <div className="p-2 bg-slate-50 text-slate-600 rounded-xl"><ShieldCheck size={20}/></div>
             <span className="text-sm font-bold text-slate-800">Change Passcode</span>
             <ChevronRight size={16} className="ml-auto text-slate-300" />
           </button>
           <button 
            onClick={onReset}
            className="w-full p-4 flex items-center gap-4 text-left text-rose-600"
           >
             <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><RefreshCw size={20}/></div>
             <span className="text-sm font-bold">Clear Active Session</span>
             <p className="text-[8px] text-rose-400 ml-auto w-24 text-right">Keeps history but wipes active goals</p>
           </button>
        </div>
      </div>

      <div className="text-center pt-4">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Version 2.0.0 Secure Cloud</p>
      </div>
    </div>
  );
};

export default Settings;
