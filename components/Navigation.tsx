
import React from 'react';
import { LayoutDashboard, ListTodo, History, Settings, Bot } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'activities', label: 'Goals', icon: ListTodo },
    { id: 'guardian', label: 'Guardian AI', icon: Bot },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-10 left-0 right-0 bg-white border-t border-slate-100 flex justify-around items-center py-3 z-40">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 transition-all ${
              isActive ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[9px] font-semibold">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default Navigation;
