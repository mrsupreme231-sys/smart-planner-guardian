
import React from 'react';
import { WATERMARK_TEXT } from '../constants';

const Watermark: React.FC = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md py-3 border-t border-slate-100 z-[200] flex items-center justify-center gap-3 px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {/* Governor D&M Branded Logo Small */}
      <div className="w-6 h-6 bg-[#0b4c50] rounded-full flex items-center justify-center border border-teal-400 shadow-sm shrink-0 relative overflow-hidden">
        <span className="text-teal-400 font-black text-[8px] leading-none z-10">DM</span>
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent"></div>
      </div>
      
      <p className="text-[10px] text-center text-slate-600 font-black tracking-tight uppercase leading-none">
        {WATERMARK_TEXT}
      </p>
    </div>
  );
};

export default Watermark;
