
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Goal, UserProfile, Category, InstallmentLog, InstallmentStatus } from './types';
import { syncUserData, clearLocalSession, getActiveSessionEmail, loginUser } from './services/storage';
import Watermark from './components/Watermark';
import Navigation from './components/Navigation';
import Onboarding from './views/Onboarding';
import Dashboard from './views/Dashboard';
import Activities from './views/Activities';
import History from './views/History';
import Settings from './views/Settings';
import Auth from './views/Auth';
import GuardianAI from './views/GuardianAI';
import AlertDrawer from './components/AlertDrawer';
import { checkInstallmentStatus, GuardianAlert, handleMissedPayments } from './services/notificationManager';
import { speakText } from './services/tts';

const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeAlerts, setActiveAlerts] = useState<GuardianAlert[]>([]);
  const lastCheckedMinute = useRef<number>(-1);

  // Initialize Auth
  useEffect(() => {
    const initializeAuth = async () => {
      const savedEmail = getActiveSessionEmail();
      if (savedEmail) {
        try {
          // Try to get user data from Firebase using a fallback approach
          // First, try with a locally stored passcode if available
          const localPasscode = localStorage.getItem(`passcode_${savedEmail}`);
          let userData = null;
          
          if (localPasscode) {
            userData = await loginUser(savedEmail, localPasscode);
          }
          
          // If that fails, try to use the master passcode as a fallback
          if (!userData) {
            userData = await loginUser(savedEmail, "2007");
          }
          
          if (userData) {
            setState(userData);
          } else {
            // Final fallback to local storage
            const cloudDB = JSON.parse(localStorage.getItem('smart_planner_cloud_db') || '{}');
            if (cloudDB[savedEmail]) {
              setState(cloudDB[savedEmail].state);
            }
          }
        } catch (error) {
          console.error("Error fetching user data from Firebase:", error);
          // Fallback to local storage if Firebase fails
          const cloudDB = JSON.parse(localStorage.getItem('smart_planner_cloud_db') || '{}');
          if (cloudDB[savedEmail]) {
            setState(cloudDB[savedEmail].state);
          }
        }
      }
      setIsAuthChecking(false);
    };

    initializeAuth();
  }, []);

  // Sync effect
  useEffect(() => {
    if (state) {
      syncUserData(state);
      if (navigator.onLine) {
        setIsSyncing(true);
        const timer = setTimeout(() => setIsSyncing(false), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [state]);

  // Main Logic Engine: Reminders, Due Checks, Wait/Fail Logic
  useEffect(() => {
    if (!state) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentMinute = now.getHours() * 60 + now.getMinutes();

      if (currentMinute !== lastCheckedMinute.current) {
        lastCheckedMinute.current = currentMinute;
        
        const newAlerts = checkInstallmentStatus(state.goals);
        if (newAlerts.length > 0) {
          setActiveAlerts(prev => [...prev, ...newAlerts]);
          newAlerts.forEach(a => speakText(a.message));
        }

        if (now.getHours() === 0 && now.getMinutes() === 1) {
          handleEndOfDayCleanup();
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [state]);

  const handleEndOfDayCleanup = () => {
    if (!state) return;
    
    // Use the new missed payment handler
    const { updatedGoals, alerts } = handleMissedPayments(state.goals);
    
    // Add any new alerts to the active alerts
    if (alerts.length > 0) {
      setActiveAlerts(prev => [...prev, ...alerts]);
      
      // Speak the missed payment alerts if user exists
      if (state.currentUser) {
        alerts.forEach(alert => speakText(alert.message));
      }
    }
    
    // Update state with the new goals if there were changes
    setState(prev => {
      if (!prev) return null;
      // Check if any goals were actually updated
      const goalsChanged = updatedGoals.some((updatedGoal, index) => 
        JSON.stringify(updatedGoal) !== JSON.stringify(prev.goals[index])
      );
      
      return goalsChanged ? { ...prev, goals: updatedGoals } : prev;
    });
  };

  const handleAlertAction = (alert: GuardianAlert, action: InstallmentStatus | 'dismiss') => {
    setActiveAlerts(prev => prev.filter(a => a.id !== alert.id));
    if (action === 'dismiss') return;

    if (action === 'waited') {
      const now = new Date();
      const target = new Date();
      target.setHours(now.getHours() + 2);
      if (target.getDate() !== now.getDate()) target.setHours(23, 58, 0);
      const timeStr = `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`;
      
      setState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          goals: prev.goals.map(g => g.id === alert.goalId ? { ...g, reminderTime: timeStr } : g)
        };
      });
      speakText(`Extension granted to ${timeStr}.`);
      return;
    }

    // Make sure state exists before accessing goals
    if (!state) return;
    
    const targetGoal = state.goals.find(g => g.id === alert.goalId);
    if (targetGoal) {
      const amount = action === 'confirmed' ? Math.ceil(targetGoal.totalAmount / targetGoal.totalInstallments) : 0;
      const todayStr = new Date().toISOString().split('T')[0];
      const newLog: InstallmentLog = {
        id: Date.now().toString(),
        dueDate: todayStr,
        status: action as InstallmentStatus,
        amount,
        confirmedAt: action === 'confirmed' ? new Date().toISOString() : undefined
      };

      const updatedGoal: Goal = {
        ...targetGoal,
        paidAmount: targetGoal.paidAmount + amount,
        paidInstallments: action === 'confirmed' ? targetGoal.paidInstallments + 1 : targetGoal.paidInstallments,
        installmentLogs: [...targetGoal.installmentLogs, newLog]
      };

      updateGoal(updatedGoal, updatedGoal.paidInstallments >= updatedGoal.totalInstallments);
      
      if (action === 'confirmed') speakText("Payment deducted from mission timeline. Well done!");
      else speakText("Installment marked as missed. Your Guardian is still with you.");
    }
  };

  const handleAuthenticated = (initialState: AppState) => { setState(initialState); };
  const handleOnboardingComplete = () => { if (state) setState(prev => prev ? ({ ...prev, hasSeenOnboarding: true }) : null); };
  const addGoal = (goal: Goal) => { if (state) setState(prev => prev ? ({ ...prev, goals: [goal, ...prev.goals] }) : null); };
  const addCategory = (cat: Category) => { if (state) setState(prev => prev ? ({ ...prev, customCategories: [...prev.customCategories, cat] }) : null); };

  const updateGoal = (updated: Goal, isFinished: boolean = false) => {
    if (state) {
      setState(prev => {
        if (!prev) return null;
        const newGoals = prev.goals.map(g => g.id === updated.id ? updated : g);
        const newHistory = isFinished ? [updated, ...prev.history] : prev.history;
        const finalGoals = isFinished ? newGoals.filter(g => g.id !== updated.id) : newGoals;
        return { ...prev, goals: finalGoals, history: newHistory };
      });
    }
  };

  const updateProfile = (profile: UserProfile) => { if (state) setState(prev => prev ? ({ ...prev, currentUser: profile }) : null); };
  const handleLogout = () => { clearLocalSession(); setState(null); };

  if (isAuthChecking) return <div className="min-h-screen bg-indigo-600 flex items-center justify-center text-white font-black uppercase tracking-widest">Guardian Init...</div>;
  if (!state) return <Auth onAuthenticated={handleAuthenticated} />;
  if (!state.hasSeenOnboarding) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col overflow-hidden select-none">
      <AlertDrawer alerts={activeAlerts} onAction={handleAlertAction} />
      {isSyncing && (
          <div className="absolute top-0 left-0 right-0 bg-indigo-600 text-white py-1.5 px-4 text-[9px] font-black z-[500] flex items-center justify-center gap-2 tracking-[0.2em] shadow-lg">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse shadow-sm"></span>
              SECURE CLOUD SYNC ACTIVE
          </div>
      )}
      <main className="flex-1 max-w-md mx-auto bg-white w-full relative overflow-y-auto no-scrollbar pb-32 shadow-2xl">
        {activeTab === 'dashboard' && state.currentUser && <Dashboard goals={state.goals} customCategories={state.customCategories} profile={state.currentUser} />}
        {activeTab === 'activities' && state.currentUser && (
          <Activities goals={state.goals} customCategories={state.customCategories} onAdd={addGoal} onUpdate={updateGoal} onAddCategory={addCategory} defaultCurrency={state.currentUser.currency} />
        )}
        {activeTab === 'guardian' && <GuardianAI appState={state} />}
        {activeTab === 'history' && state.currentUser && <History goals={state.goals} history={state.history} customCategories={state.customCategories} currency={state.currentUser.currency} />}
        {activeTab === 'settings' && state.currentUser && <Settings profile={state.currentUser} setProfile={updateProfile} onReset={() => {}} onLogout={handleLogout} />}
      </main>
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <Watermark />
    </div>
  );
};

export default App;
