
import { Goal, InstallmentStatus } from '../types';

export interface GuardianAlert {
  id: string;
  goalId: string;
  title: string;
  message: string;
  type: 'reminder' | 'due' | 'encouragement';
  timestamp: number;
  buttons?: { label: string; action: InstallmentStatus | 'dismiss' }[];
}

export const checkInstallmentStatus = (goals: Goal[]): GuardianAlert[] => {
  const alerts: GuardianAlert[] = [];
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentTimeInMins = currentHour * 60 + currentMin;
  const currentDay = now.getDay();
  const todayStr = now.toISOString().split('T')[0];

  goals.forEach(goal => {
    if (goal.status !== 'active') return;

    // Check if payment is due today
    const isDueToday = 
      goal.installmentType === 'daily' || 
      (goal.installmentType === 'weekly' && goal.reminderDay === currentDay) ||
      (goal.installmentType === 'monthly' && now.getDate() === 1) || // Simplification for monthly
      (goal.installmentType === 'yearly' && now.getDate() === 1 && now.getMonth() === 0); // Beginning of year

    if (!isDueToday) return;

    const [targetHour, targetMin] = goal.reminderTime.split(':').map(Number);
    const targetTimeInMins = targetHour * 60 + targetMin;

    // 1. Generate strictly 5 Pre-Reminders
    // Reminders start 5 hours before the due time (1 per hour)
    const reminderStartMins = targetTimeInMins - 300; 
    
    for (let i = 1; i <= 5; i++) {
      const scheduledReminderMins = reminderStartMins + (i * 60);
      if (currentTimeInMins === scheduledReminderMins && scheduledReminderMins < targetTimeInMins) {
        alerts.push({
          id: `rem-${goal.id}-${i}-${Date.now()}`,
          goalId: goal.id,
          title: "Guardian Alert",
          message: `Reminder ${i}/5: Your ${goal.installmentType} installment for "${goal.title}" is due in ${5-i} hours.`,
          type: 'reminder',
          timestamp: Date.now(),
          buttons: [{ label: 'I am ready', action: 'dismiss' }]
        });
      }
    }

    // 2. The Final Due Alert
    if (currentTimeInMins === targetTimeInMins) {
      const hasLogToday = goal.installmentLogs.some(log => log.dueDate.startsWith(todayStr));
      
      if (!hasLogToday) {
        // Calculate remaining installments and amounts
        const remainingInstallments = goal.totalInstallments - goal.paidInstallments;
        const remainingAmount = goal.totalAmount - goal.paidAmount;
        const installmentAmount = Math.ceil(remainingAmount / remainingInstallments);
        
        alerts.push({
          id: `due-${goal.id}-${Date.now()}`,
          goalId: goal.id,
          title: "Guardian Payment Due",
          message: `Your ${goal.installmentType} plan for "${goal.title}" requires confirmation now. Pay ${goal.currency}${installmentAmount} to stay on track.`,
          type: 'due',
          timestamp: Date.now(),
          buttons: [
            { label: 'Confirm', action: 'confirmed' },
            { label: 'Wait (2hr)', action: 'waited' },
            { label: 'Fail', action: 'failed' }
          ]
        });
      }
    }
  });

  return alerts;
};

// Function to handle missed payments and recalculate installments
export const handleMissedPayments = (goals: Goal[]): { updatedGoals: Goal[], alerts: GuardianAlert[] } => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const alerts: GuardianAlert[] = [];
  
  const updatedGoals = goals.map(goal => {
    if (goal.status !== 'active') return goal;
    
    const wasRequired = goal.installmentType === 'daily' || 
      (goal.installmentType === 'weekly' && goal.reminderDay === yesterday.getDay()) ||
      (goal.installmentType === 'yearly' && yesterday.getDate() === 1 && yesterday.getMonth() === 0); // Beginning of year
    
    if (wasRequired) {
      const hadAction = goal.installmentLogs.some(log => log.dueDate === yesterdayStr);
      if (!hadAction) {
        // Add a failed log entry for the missed payment
        const newLog = {
          id: `missed-${Date.now()}`,
          dueDate: yesterdayStr,
          status: 'failed' as const,
          amount: 0
        };
        
        // Calculate remaining days and redistribute the missed amount
        const deadlineDate = new Date(goal.deadline);
        const remainingDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (remainingDays > 0) {
          // Recalculate the installment amount based on remaining amounts
          const unpaidAmount = goal.totalAmount - goal.paidAmount;
          const remainingInstallments = goal.totalInstallments - goal.paidInstallments;
          
          if (remainingInstallments > 0) {
            const newInstallmentAmount = Math.ceil(unpaidAmount / remainingInstallments);
            
            // Create alert for missed payment
            alerts.push({
              id: `missed-${goal.id}-${Date.now()}`,
              goalId: goal.id,
              title: "Missed Payment",
              message: `You missed an installment for ${goal.title}. We've redistributed the remaining amount. Pay ${goal.currency}${newInstallmentAmount} per installment to catch up.`,
              type: 'reminder',
              timestamp: Date.now(),
              buttons: [{ label: 'Acknowledge', action: 'dismiss' }]
            });
          }
        }
        
        return {
          ...goal,
          installmentLogs: [...goal.installmentLogs, newLog]
        };
      }
    }
    return goal;
  });
  
  return { updatedGoals, alerts };
};
