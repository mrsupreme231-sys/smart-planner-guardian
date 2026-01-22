
import React from 'react';
import { GuardianAlert } from '../services/notificationManager';
import { ShieldAlert, Bell, X, Check, Clock, AlertTriangle } from 'lucide-react';
import { InstallmentStatus } from '../types';

interface AlertDrawerProps {
  alerts: GuardianAlert[];
  onAction: (alert: GuardianAlert, action: InstallmentStatus | 'dismiss') => void;
}

const AlertDrawer: React.FC<AlertDrawerProps> = ({ alerts, onAction }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[400] space-y-3 pointer-events-none">
      {alerts.map((alert) => (
        <div 
          key={alert.id}
          className="bg-white/95 backdrop-blur-xl border border-indigo-100 rounded-3xl p-5 shadow-2xl pointer-events-auto animate-in slide-in-from-top duration-500"
        >
          <div className="flex gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              alert.type === 'due' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
            }`}>
              {alert.type === 'due' ? <ShieldAlert size={24} /> : <Bell size={24} />}
            </div>
            <div className="flex-1">
              <h4 className="font-black text-slate-900 leading-tight">{alert.title}</h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{alert.message}</p>
            </div>
            <button 
              onClick={() => onAction(alert, 'dismiss')}
              className="text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {alert.buttons && (
            <div className="flex gap-2 mt-4">
              {alert.buttons.map((btn, idx) => {
                let Icon = Check;
                let colorClass = "bg-indigo-600 text-white";
                
                if (btn.action === 'waited') { Icon = Clock; colorClass = "bg-slate-100 text-slate-600"; }
                if (btn.action === 'failed') { Icon = AlertTriangle; colorClass = "bg-rose-50 text-rose-600 border border-rose-100"; }
                if (btn.action === 'dismiss') { Icon = X; colorClass = "bg-slate-50 text-slate-400"; }

                return (
                  <button
                    key={idx}
                    onClick={() => onAction(alert, btn.action as any)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-transform active:scale-95 ${colorClass}`}
                  >
                    <Icon size={12} />
                    {btn.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AlertDrawer;
