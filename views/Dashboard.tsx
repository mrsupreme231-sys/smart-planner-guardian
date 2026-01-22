
import React, { useState } from 'react';
import { Goal, UserProfile, DEFAULT_GOAL_CATEGORIES, Category } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TrendingUp, Wallet, Calendar, CheckCircle2, Filter } from 'lucide-react';

interface DashboardProps {
  goals: Goal[];
  customCategories: Category[];
  profile: UserProfile;
}

const Dashboard: React.FC<DashboardProps> = ({ goals, customCategories, profile }) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  const allCategories = [...DEFAULT_GOAL_CATEGORIES, ...customCategories];
  const activeGoals = goals.filter(g => g.status === 'active');
  const filteredGoals = filterCategory === 'all' ? activeGoals : activeGoals.filter(g => g.category === filterCategory);

  // Helper function to get the next installment date for a goal
  const getNextInstallmentDate = (goal: Goal): Date => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (goal.installmentType === 'daily') {
      // For daily goals, the next installment is today
      return today;
    } else if (goal.installmentType === 'weekly') {
      // For weekly goals, find the next occurrence of the reminder day
      const currentDayOfWeek = today.getDay();
      const targetDayOfWeek = goal.reminderDay;
      
      if (currentDayOfWeek === targetDayOfWeek) {
        // If today is the reminder day, return today
        return today;
      } else if (currentDayOfWeek < targetDayOfWeek) {
        // If the target day is later in the week, return that day
        const daysToAdd = targetDayOfWeek - currentDayOfWeek;
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + daysToAdd);
        return nextDate;
      } else {
        // If the target day already passed this week, return next week's target day
        const daysToAdd = 7 - (currentDayOfWeek - targetDayOfWeek);
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + daysToAdd);
        return nextDate;
      }
    } else if (goal.installmentType === 'monthly') {
      // For monthly goals, return the first day of the current month or next month
      const nextDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return nextDate;
    }
    
    // Default fallback
    return today;
  };

  // Stats need to be aggregated. Since they are different currencies, we just show a summary of the count
  // or use the profile's primary currency if they are mixed (simple version: show profile currency for total if it matches, or count)
  const totalTarget = activeGoals.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalPaid = activeGoals.reduce((acc, curr) => acc + curr.paidAmount, 0);
  const progressPercent = totalTarget > 0 ? Math.round((totalPaid / totalTarget) * 100) : 0;

  const chartData = [
    { name: 'Paid', value: totalPaid || 0 },
    { name: 'Remaining', value: Math.max(0, totalTarget - totalPaid) || 1 },
  ];

  const COLORS = ['#4f46e5', '#e2e8f0'];

  const dailyTodos = filteredGoals.slice(0, 5).map(goal => {
      const deadline = new Date(goal.deadline);
      const diff = deadline.getTime() - new Date().getTime();
      const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return {
          id: goal.id,
          task: `Deposit for ${goal.title}`,
          due: daysLeft <= 0 ? 'Overdue!' : `${daysLeft} days left`,
          category: goal.category,
          isSubscription: goal.isSubscription,
          currency: goal.currency
      };
  });

  return (
    <div className="p-6 space-y-8 pb-32">
      {/* Next Installment Due Banner */}
      {activeGoals.length > 0 && (() => {
        // Find the next installment due
        const nextGoal = activeGoals.reduce((earliest, goal) => {
          const nextInstallmentDate = getNextInstallmentDate(goal);
          if (!earliest) return { goal, date: nextInstallmentDate };
          
          const earliestDate = getNextInstallmentDate(earliest.goal);
          if (nextInstallmentDate < earliestDate) {
            return { goal, date: nextInstallmentDate };
          }
          return earliest;
        }, null as { goal: Goal; date: Date } | null);

        if (nextGoal) {
          const { goal } = nextGoal;
          const installmentAmount = Math.ceil(goal.totalAmount / goal.totalInstallments);
          const daysUntilDue = Math.ceil((nextGoal.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          return (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Next Installment Due</p>
                  <h3 className="text-2xl font-bold mt-1">{goal.title}</h3>
                  <p className="text-emerald-50 text-base font-bold mt-2">{profile.currency} {installmentAmount} Today</p>
                </div>
                <div className="text-right">
                  <div className="bg-white/20 rounded-full px-3 py-1 text-xs font-bold">
                    {daysUntilDue > 0 ? `${daysUntilDue} days left` : 'Due today!'}
                  </div>
                  <p className="text-emerald-100 text-xs mt-2">{goal.installmentType.charAt(0).toUpperCase() + goal.installmentType.slice(1)}</p>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Hello, {profile.name}!</h2>
          <p className="text-slate-500 text-sm">Welcome back to your Planner 🛡️</p>
        </div>
        <img src={profile.avatar} alt="Avatar" className="w-12 h-12 rounded-2xl border-2 border-indigo-100 shadow-sm object-cover" />
      </div>

      {/* Stats Card */}
      <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-indigo-100 text-sm font-medium">Total Active Savings</p>
          <h3 className="text-3xl font-bold mt-1">
            {profile.currency} {totalPaid.toLocaleString()}
          </h3>
          <p className="text-[10px] text-indigo-200 mt-1">* Aggregated in primary currency</p>
          <div className="mt-6 flex items-center justify-between">
            <div className="flex -space-x-2">
              {activeGoals.slice(0, 3).map((g, i) => (
                <div key={g.id} className="w-8 h-8 rounded-full bg-white/20 border-2 border-indigo-600 flex items-center justify-center text-[10px] font-bold">
                  {allCategories.find(c => c.id === g.category)?.icon || '✨'}
                </div>
              ))}
              {activeGoals.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-indigo-800 border-2 border-indigo-600 flex items-center justify-center text-[10px] font-bold">
                  +{activeGoals.length - 3}
                </div>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">{progressPercent}% Achieved</span>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
      </div>

      {/* Category Filter */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate-400">
           <Filter size={14} />
           <span className="text-[10px] font-bold uppercase tracking-widest">Filter by Category</span>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          <button 
            onClick={() => setFilterCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterCategory === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-100'}`}
          >
            All Goals
          </button>
          {allCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterCategory === cat.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-100'}`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Progress Section */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-indigo-600">
            <TrendingUp size={18} />
            <span className="text-xs font-bold">Efficiency</span>
          </div>
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={25}
                  outerRadius={35}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-emerald-600">
            <Wallet size={18} />
            <span className="text-xs font-bold">Total Target</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{profile.currency} {totalTarget.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 font-medium">Across {activeGoals.length} Active Goals</p>
        </div>
      </div>

      {/* Daily Tasks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-900">Guardian Checklist</h4>
        </div>
        <div className="space-y-3">
          {dailyTodos.length > 0 ? dailyTodos.map((todo) => (
            <div key={todo.id} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl relative">
                <CheckCircle2 size={20} />
                {todo.isSubscription && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white"></div>}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-bold uppercase text-indigo-400 tracking-tighter">{todo.category}</span>
                  <p className="text-sm font-bold text-slate-800">{todo.task}</p>
                </div>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Calendar size={10} /> {todo.due}
                </p>
              </div>
            </div>
          )) : (
              <p className="text-center text-slate-400 text-sm py-4">All goals are up to date! 🛡️</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
