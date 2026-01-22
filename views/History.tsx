
import React from 'react';
import { Goal, DEFAULT_GOAL_CATEGORIES, Category } from '../types';
import { CheckCircle2, AlertCircle, Trash2, History as HistoryIcon } from 'lucide-react';

interface HistoryProps {
  goals: Goal[];
  history: Goal[];
  customCategories: Category[];
  currency: string;
}

const History: React.FC<HistoryProps> = ({ goals, history, customCategories, currency }) => {
  const allCategories = [...DEFAULT_GOAL_CATEGORIES, ...customCategories];

  const sessionCompleted = goals.filter(g => g.status === 'completed');
  const sessionFailed = goals.filter(g => g.status === 'failed');

  const allHistory = [...history, ...sessionCompleted, ...sessionFailed];
  const uniqueHistory = allHistory.filter((goal, index, self) =>
    index === self.findIndex((g) => g.id === goal.id)
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const completed = uniqueHistory.filter(g => g.status === 'completed');
  const failed = uniqueHistory.filter(g => g.status === 'failed');

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex items-center gap-2">
        <HistoryIcon className="text-indigo-600" />
        <h2 className="text-2xl font-bold text-slate-900">Archives</h2>
      </div>

      <p className="text-xs text-slate-400 -mt-6">Your full historical record is synced and persistent, even if active data is cleared.</p>

      {/* Completed Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-emerald-600">
          <CheckCircle2 size={20} />
          <h3 className="font-bold">Completed Goals</h3>
          <span className="ml-auto bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{completed.length}</span>
        </div>
        <div className="space-y-3">
          {completed.length > 0 ? completed.map(goal => {
            const cat = allCategories.find(c => c.id === goal.category);
            return (
              <div key={goal.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-bold text-emerald-500 uppercase">{cat?.icon || '✨'} {cat?.label || 'Other'}</p>
                  <p className="text-sm font-bold text-slate-800">{goal.title}</p>
                  <p className="text-[10px] text-slate-400">Target: {goal.currency} {goal.totalAmount.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase">Success</p>
                  <p className="text-[10px] text-slate-300">{new Date(goal.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            );
          }) : (
            <p className="text-center text-slate-400 text-xs py-4 italic">No completed goals in your archives.</p>
          )}
        </div>
      </div>

      {/* Failed Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-rose-600">
          <AlertCircle size={20} />
          <h3 className="font-bold">Failed Goals</h3>
          <span className="ml-auto bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{failed.length}</span>
        </div>
        <div className="space-y-3">
           {failed.length > 0 ? failed.map(goal => {
            const cat = allCategories.find(c => c.id === goal.category);
            return (
              <div key={goal.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between opacity-70">
                <div>
                  <p className="text-[8px] font-bold text-rose-500 uppercase">{cat?.icon || '✨'} {cat?.label || 'Other'}</p>
                  <p className="text-sm font-bold text-slate-800">{goal.title}</p>
                  <p className="text-[10px] text-slate-400">Paid: {goal.currency} {goal.paidAmount.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-rose-600 uppercase">Missed</p>
                  <p className="text-[10px] text-slate-300">{new Date(goal.deadline).toLocaleDateString()}</p>
                </div>
              </div>
            );
          }) : (
            <p className="text-center text-slate-400 text-xs py-4 italic">No failed goals found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
