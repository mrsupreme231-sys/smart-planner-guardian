
import React, { useState, useEffect } from 'react';
import { Goal, InstallmentType, DEFAULT_GOAL_CATEGORIES, Category } from '../types';
import { Plus, X, ListChecks, History, Globe, Clock, Calendar, Sparkles, ChevronRight, ArrowRight, Tag, PlusCircle } from 'lucide-react';
import { CURRENT_YEAR } from '../constants';
import { createGoalWithInstallments, loginUser, markInstallmentPaid } from '../services/storage';

interface ActivitiesProps {
  goals: Goal[];
  customCategories: Category[];
  onAdd: (goal: Goal) => void;
  onUpdate: (goal: Goal, isFinished?: boolean) => void;
  onAddCategory: (cat: Category) => void;
  defaultCurrency: string;
}

const Activities: React.FC<ActivitiesProps> = ({ goals, customCategories, onAdd, onUpdate, onAddCategory, defaultCurrency }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('✨');

  const allCategories = [...DEFAULT_GOAL_CATEGORIES, ...customCategories];
  const activeGoals = goals.filter(g => g.status === 'active');

  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    title: '',
    category: 'savings',
    totalAmount: 0,
    currency: defaultCurrency,
    deadline: `${CURRENT_YEAR}-12-31`,
    installmentType: 'daily',
    useBuffer: true,
    isSubscription: false,
    isWeeklyPlan: false,
    monthlyAmount: 0,
    weeklyAmount: 0,
    startDate: new Date().toISOString().split('T')[0],
    reminderTime: '18:00',
    reminderDay: 1,
  });

  const calculateInstallmentData = () => {
    const start = new Date(newGoal.startDate || new Date());
    const end = new Date(newGoal.deadline || new Date());
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    
    let totalPeriods = 1;
    let periodAmount = 0;

    if (newGoal.isWeeklyPlan) {
      totalPeriods = Math.max(1, Math.ceil(diffDays / 7));
      periodAmount = newGoal.weeklyAmount || 0;
    } else if (newGoal.isSubscription) {
      totalPeriods = Math.max(1, Math.ceil(diffDays / 30.44));
      periodAmount = newGoal.monthlyAmount || 0;
    } else {
      if (newGoal.installmentType === 'daily') totalPeriods = diffDays;
      if (newGoal.installmentType === 'weekly') totalPeriods = Math.max(1, Math.ceil(diffDays / 7));
      if (newGoal.installmentType === 'monthly') totalPeriods = Math.max(1, Math.ceil(diffDays / 30.44));
      if (newGoal.installmentType === 'yearly') totalPeriods = Math.max(1, Math.ceil(diffDays / 365.25)); // Approximate year
      
      const target = newGoal.totalAmount || 0;
      const bufferMultiplier = newGoal.useBuffer ? 1.05 : 1;
      periodAmount = Math.ceil((target * bufferMultiplier) / Math.max(1, totalPeriods));
    }

    const totalCalculated = periodAmount * totalPeriods;
    return { totalPeriods, periodAmount, totalCalculated };
  };

  const { totalPeriods, periodAmount, totalCalculated } = calculateInstallmentData();

  const handleSave = async () => {
    if (!newGoal.title) return;
    const { totalPeriods, totalCalculated, periodAmount } = calculateInstallmentData();
    
    // For Fixed goals, we use the raw total input. For others, the calculated one.
    const finalTotal = (newGoal.isWeeklyPlan || newGoal.isSubscription) 
      ? totalCalculated 
      : (newGoal.totalAmount || 0);

    // Calculate deadline with buffer (finish 3 days before actual deadline)
    let adjustedDeadline = new Date(newGoal.deadline || new Date());
    if (newGoal.useBuffer) {
      adjustedDeadline.setDate(adjustedDeadline.getDate() - 3);
    }
    const deadlineStr = adjustedDeadline.toISOString().split('T')[0];

    // Create goal object without id initially
    const goalWithoutId = {
      title: newGoal.title!,
      category: newGoal.category || 'savings',
      totalAmount: finalTotal,
      currency: newGoal.currency || defaultCurrency,
      deadline: deadlineStr,
      installmentType: newGoal.installmentType as InstallmentType,
      useBuffer: !!newGoal.useBuffer,
      isSubscription: newGoal.isSubscription,
      isWeeklyPlan: newGoal.isWeeklyPlan,
      monthlyAmount: newGoal.monthlyAmount,
      weeklyAmount: newGoal.weeklyAmount,
      startDate: newGoal.startDate,
      reminderTime: newGoal.reminderTime || '18:00',
      reminderDay: newGoal.reminderDay || 0,
    };

    // Use the new function to create the goal with proper installment calculation
    const email = localStorage.getItem('current_active_session') || '';
    if (email) {
      const success = await createGoalWithInstallments(email, goalWithoutId);
      if (success) {
        // Fetch the updated state to get the new goal
        const userData = await loginUser(email, "");
        if (userData) {
          // Get the newly added goal
          const newGoalAdded = userData.goals[0]; // Assuming it's the first one since it was added recently
          onAdd(newGoalAdded);
        }
      }
    }

    setIsAdding(false);
    setNewGoal({
      title: '',
      category: 'savings',
      totalAmount: 0,
      currency: defaultCurrency,
      deadline: `${CURRENT_YEAR}-12-31`,
      installmentType: 'daily',
      useBuffer: true,
      isSubscription: false,
      isWeeklyPlan: false,
      monthlyAmount: 0,
      weeklyAmount: 0,
      startDate: new Date().toISOString().split('T')[0],
      reminderTime: '18:00',
      reminderDay: 1,
    });
  };

  const handleCreateCategory = () => {
    if (!newCatLabel) return;
    onAddCategory({
      id: `custom-${Date.now()}`,
      label: newCatLabel,
      icon: newCatIcon
    });
    setNewCatLabel('');
    setIsAddingCategory(false);
  };

  const handlePay = async (goal: Goal, amount: number) => {
    // Get user email from local storage
    const email = localStorage.getItem('current_active_session') || '';
    if (email) {
      // Use the new function to mark installment as paid
      const success = await markInstallmentPaid(email, goal.id);
      if (success) {
        // Fetch the updated state to get the updated goal
        const userData = await loginUser(email, "");
        if (userData) {
          // Find the updated or completed goal
          const updatedGoal = userData.goals.find(g => g.id === goal.id) || 
                              userData.history.find(g => g.id === goal.id);
          
          if (updatedGoal) {
            // Determine if the goal is finished based on status
            const isFinished = updatedGoal.status === 'completed';
            onUpdate(updatedGoal, isFinished);
          }
        }
      }
    }
    setSelectedGoal(null);
  };

  return (
    <div className="p-6 space-y-6 pb-40">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Mission Control</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Plans: {activeGoals.length}</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="bg-indigo-600 text-white p-3.5 rounded-2xl shadow-xl active:scale-90 transition-all">
          <Plus size={24} />
        </button>
      </div>

      <div className="space-y-4">
        {activeGoals.map((goal) => {
          const installmentVal = Math.ceil(goal.totalAmount / goal.totalInstallments);
          const remainingPayments = goal.totalInstallments - goal.paidInstallments;
          const progress = Math.round((goal.paidInstallments / goal.totalInstallments) * 100);
          const categoryObj = allCategories.find(c => c.id === goal.category);

          return (
            <div key={goal.id} onClick={() => setSelectedGoal(goal)} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm relative overflow-hidden active:bg-slate-50 transition-all active:scale-[0.98]">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-indigo-100/50">{categoryObj?.icon || '✨'}</div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg leading-tight uppercase tracking-tight">{goal.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">{goal.installmentType}</span>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Until {new Date(goal.deadline).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-indigo-600 font-black text-xl">{goal.currency}{installmentVal}</span>
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Per {goal.installmentType.replace('ly', '')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Timeline</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-slate-900">{goal.paidInstallments}</span>
                        <span className="text-xs font-black text-slate-300">/</span>
                        <span className="text-lg font-black text-slate-400">{goal.totalInstallments}</span>
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">{goal.installmentType}s</span>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{remainingPayments} REMAINING</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Goal: {goal.currency}{goal.totalAmount.toLocaleString()}</p>
                   </div>
                </div>
                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner p-1">
                  <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[160] bg-slate-900/70 backdrop-blur-xl flex items-end sm:items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl max-h-[95vh] overflow-y-auto no-scrollbar pb-24 relative">
            <div className="flex justify-between items-center mb-10 sticky top-0 bg-white z-10 py-2">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Mission Setup</h3>
              <button onClick={() => setIsAdding(false)} className="bg-slate-100 p-2.5 rounded-full text-slate-400"><X size={24}/></button>
            </div>
            
            <div className="space-y-8">
              {/* Plan Type Selector */}
              <div className="flex bg-slate-100 p-1.5 rounded-[24px]">
                {['Fixed', 'Weekly', 'Monthly', 'Year'].map(type => (
                  <button 
                    key={type}
                    onClick={() => setNewGoal({
                      ...newGoal, 
                      isSubscription: type === 'Monthly', 
                      isWeeklyPlan: type === 'Weekly',
                      installmentType: type === 'Year' ? 'yearly' : (type === 'Weekly' ? 'weekly' : (type === 'Monthly' ? 'monthly' : 'daily'))
                    })}
                    className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest rounded-[18px] transition-all ${
                      (type === 'Fixed' && !newGoal.isSubscription && !newGoal.isWeeklyPlan) ||
                      (type === 'Weekly' && newGoal.isWeeklyPlan) ||
                      (type === 'Monthly' && newGoal.isSubscription) ||
                      (type === 'Year' && newGoal.installmentType === 'yearly')
                      ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Category Selection */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Tag size={12} /> Mission Category</label>
                   <button onClick={() => setIsAddingCategory(true)} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1"><PlusCircle size={12}/> New Category</button>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-1">
                  {allCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setNewGoal({...newGoal, category: cat.id})}
                      className={`flex flex-col items-center gap-2 min-w-[70px] p-3 rounded-2xl transition-all border-2 ${
                        newGoal.category === cat.id ? 'border-indigo-600 bg-indigo-50/50' : 'border-transparent bg-slate-50'
                      }`}
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="text-[8px] font-black uppercase text-slate-500 whitespace-nowrap">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Goal Title</label>
                   <input type="text" placeholder="e.g. New Laptop" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-slate-800 outline-none shadow-inner" value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Starting Date</label>
                    <input type="date" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-slate-800 outline-none shadow-inner" value={newGoal.startDate} onChange={e => setNewGoal({...newGoal, startDate: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ending Date</label>
                    <input type="date" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-slate-800 outline-none shadow-inner" value={newGoal.deadline} onChange={e => setNewGoal({...newGoal, deadline: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      {newGoal.isWeeklyPlan ? 'Weekly Payment' : (newGoal.isSubscription ? 'Monthly Payment' : (newGoal.installmentType === 'yearly' ? 'Yearly Payment' : 'Total Goal Amount'))}
                    </label>
                    <input 
                        type="number" 
                        className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-slate-800 outline-none shadow-inner" 
                        value={newGoal.isWeeklyPlan ? newGoal.weeklyAmount : (newGoal.isSubscription ? newGoal.monthlyAmount : (newGoal.installmentType === 'yearly' ? newGoal.totalAmount : newGoal.totalAmount))} 
                        onChange={e => {
                            const val = Number(e.target.value);
                            if (newGoal.isWeeklyPlan) setNewGoal({...newGoal, weeklyAmount: val});
                            else if (newGoal.isSubscription) setNewGoal({...newGoal, monthlyAmount: val});
                            else setNewGoal({...newGoal, totalAmount: val});
                        }} 
                    />
                  </div>
                  {!newGoal.isWeeklyPlan && !newGoal.isSubscription && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Payment Frequency</label>
                        <select className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-slate-800 outline-none shadow-inner appearance-none" value={newGoal.installmentType} onChange={e => setNewGoal({...newGoal, installmentType: e.target.value as InstallmentType})}>
                           <option value="daily">Daily</option>
                           <option value="weekly">Weekly</option>
                           <option value="monthly">Monthly</option>
                           <option value="yearly">Yearly</option>
                        </select>
                    </div>
                  )}
                </div>

                <div className="bg-indigo-600 text-white p-6 rounded-[32px] shadow-2xl relative overflow-hidden">
                   <div className="relative z-10">
                      <h4 className="text-xs font-black uppercase tracking-widest mb-4 opacity-70">Mission Projection</h4>
                      <div className="flex justify-between items-center mb-6">
                         <div>
                            <p className="text-3xl font-black">{totalPeriods}</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">Total {newGoal.isWeeklyPlan ? 'Weeks' : (newGoal.isSubscription ? 'Months' : (newGoal.installmentType === 'yearly' ? 'Years' : (newGoal.installmentType + 's')))}</p>
                         </div>
                         <ArrowRight size={20} className="opacity-30" />
                         <div className="text-right">
                            <p className="text-3xl font-black">{newGoal.currency}{(newGoal.isWeeklyPlan || newGoal.isSubscription) ? totalCalculated.toLocaleString() : (newGoal.totalAmount || 0).toLocaleString()}</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">Total Mission Value</p>
                         </div>
                      </div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-center opacity-40">System will deduct {newGoal.currency}{periodAmount} per {newGoal.installmentType.replace('ly', '')}</p>
                   </div>
                </div>
              </div>

              <button onClick={handleSave} className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-lg shadow-2xl active:scale-95 transition-all uppercase tracking-widest border-b-8 border-indigo-800">
                Initialize Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddingCategory && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-8">
                 <h4 className="text-xl font-black uppercase tracking-tighter">New Category</h4>
                 <button onClick={() => setIsAddingCategory(false)} className="bg-slate-50 p-2 rounded-full"><X size={20}/></button>
              </div>
              <div className="space-y-6">
                 <div className="grid grid-cols-4 gap-3">
                    {['💰', '🍕', '🚗', '🎮', '💡', '💎', '🎨', '👔'].map(emoji => (
                       <button key={emoji} onClick={() => setNewCatIcon(emoji)} className={`text-2xl p-3 rounded-2xl ${newCatIcon === emoji ? 'bg-indigo-600' : 'bg-slate-50'}`}>{emoji}</button>
                    ))}
                 </div>
                 <input type="text" placeholder="Category Name" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-slate-800 outline-none shadow-inner" value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} />
                 <button onClick={handleCreateCategory} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase tracking-widest">Create Category</button>
              </div>
           </div>
        </div>
      )}

      {selectedGoal && (
        <div className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-xl flex items-end sm:items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl">
            <div className="flex justify-between items-start mb-10">
              <div className="flex items-center gap-5">
                 <div className="text-4xl">{allCategories.find(c => c.id === selectedGoal.category)?.icon || '✨'}</div>
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedGoal.title}</h3>
                    <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">{selectedGoal.paidInstallments} of {selectedGoal.totalInstallments} Completed</p>
                 </div>
              </div>
              <button onClick={() => setSelectedGoal(null)} className="bg-slate-100 p-2.5 rounded-full"><X size={24}/></button>
            </div>
            
            <div className="space-y-6">
              <button onClick={() => handlePay(selectedGoal, Math.ceil(selectedGoal.totalAmount / selectedGoal.totalInstallments))} className="w-full bg-indigo-600 p-8 rounded-[32px] text-white shadow-2xl active:scale-95 text-center border-b-8 border-indigo-900">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">Confirm Payment #{selectedGoal.paidInstallments + 1}</p>
                <p className="text-3xl font-black">{selectedGoal.currency}{Math.ceil(selectedGoal.totalAmount / selectedGoal.totalInstallments)}</p>
              </button>

              <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex justify-between items-center shadow-inner">
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Mission Value</p>
                   <p className="text-xl font-black text-slate-800">{selectedGoal.currency}{selectedGoal.totalAmount.toLocaleString()}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Remaining Installments</p>
                   <p className="text-xl font-black text-indigo-600">{selectedGoal.totalInstallments - selectedGoal.paidInstallments}</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Activities;
