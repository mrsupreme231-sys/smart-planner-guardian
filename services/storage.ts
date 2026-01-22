
import { AppState, Goal, UserProfile, InstallmentType } from '../types';
import { firestore, auth } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

const MASTER_PASSCODE = '2007';

// Firebase-based user data functions
const getUserDocRef = (email: string) => doc(firestore, 'users', email);

export const registerUser = async (email: string, passcode: string, name: string): Promise<boolean> => {
  try {
    const userDocRef = getUserDocRef(email);
    const userSnapshot = await getDoc(userDocRef);
    
    if (userSnapshot.exists()) {
      console.log('User already exists:', email);
      return false; // User already exists
    }

    const initialState: AppState = {
      currentUser: { email, name, currency: 'USD', avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}` },
      goals: [],
      history: [],
      hasSeenOnboarding: false,
      customCategories: []
    };

    await setDoc(userDocRef, {
      passcode,
      state: initialState
    });

    // Save passcode locally for future automatic login
    localStorage.setItem(`passcode_${email}`, passcode);
    console.log('User registered successfully:', email);

    return true;
  } catch (error) {
    console.error('Error registering user:', error);
    return false;
  }
};

// Interface for goal creation data (without calculated fields)
interface GoalCreationData {
  title: string;
  category: string;
  totalAmount: number;
  currency: string;
  deadline: string;
  installmentType: InstallmentType;
  useBuffer: boolean;
  isSubscription?: boolean;
  isWeeklyPlan?: boolean;
  monthlyAmount?: number;
  weeklyAmount?: number;
  startDate?: string;
  reminderTime: string;
  reminderDay: number;
}

// Function to create a goal with automatic installment calculation
export const createGoalWithInstallments = async (email: string, goalData: GoalCreationData): Promise<boolean> => {
  try {
    // Calculate installment details based on the deadline and amount
    const start = new Date(goalData.startDate || new Date());
    const end = new Date(goalData.deadline);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    
    // Calculate total installments based on frequency
    let totalInstallments = 1;
    if (goalData.installmentType === 'daily') {
      totalInstallments = diffDays;
    } else if (goalData.installmentType === 'weekly') {
      totalInstallments = Math.max(1, Math.ceil(diffDays / 7));
    } else if (goalData.installmentType === 'monthly') {
      totalInstallments = Math.max(1, Math.ceil(diffDays / 30.44));
    } else if (goalData.installmentType === 'yearly') {
      totalInstallments = Math.max(1, Math.ceil(diffDays / 365.25));
    }
    
    // Apply 5% buffer to ensure early completion (as per requirement)
    const bufferMultiplier = goalData.useBuffer ? 1.05 : 1;
    const bufferedAmount = goalData.totalAmount * bufferMultiplier;
    const installmentAmount = Math.ceil(bufferedAmount / totalInstallments);
    
    // Adjust deadline to finish 3 days early (as per requirement)
    const adjustedDeadline = new Date(end);
    adjustedDeadline.setDate(adjustedDeadline.getDate() - 3);
    
    // Create the new goal with installment details
    const newGoal: Goal = {
      id: Date.now().toString(),
      ...goalData,
      createdAt: new Date().toISOString(),
      paidAmount: 0,
      paidInstallments: 0,
      status: 'active',
      totalInstallments,
      installmentLogs: [],
      // Override deadline with adjusted one to finish early
      deadline: adjustedDeadline.toISOString().split('T')[0]
    };

    // Get current user data
    const userDocRef = getUserDocRef(email);
    const userSnapshot = await getDoc(userDocRef);
    
    if (!userSnapshot.exists()) {
      return false;
    }

    const userData = userSnapshot.data();
    const currentState: AppState = userData.state;
    
    // Add the new goal to the state
    const updatedState: AppState = {
      ...currentState,
      goals: [newGoal, ...currentState.goals]
    };
    
    // Update the user document with the new state
    await updateDoc(userDocRef, {
      state: updatedState
    });
    
    return true;
  } catch (error) {
    console.error('Error creating goal with installments:', error);
    return false;
  }
};

// Function to mark an installment as paid and update the goal
export const markInstallmentPaid = async (email: string, goalId: string): Promise<boolean> => {
  try {
    const userDocRef = getUserDocRef(email);
    const userSnapshot = await getDoc(userDocRef);
    
    if (!userSnapshot.exists()) {
      return false;
    }

    const userData = userSnapshot.data();
    const currentState: AppState = userData.state;
    
    // Find the goal
    const goalIndex = currentState.goals.findIndex(g => g.id === goalId);
    if (goalIndex === -1) {
      return false;
    }
    
    const goal = currentState.goals[goalIndex];
    if (goal.paidInstallments >= goal.totalInstallments) {
      // Goal is already completed
      return false;
    }
    
    // Calculate installment amount
    const installmentAmount = Math.ceil(goal.totalAmount / goal.totalInstallments);
    
    // Update the goal
    const updatedGoal: Goal = {
      ...goal,
      paidAmount: Math.min(goal.paidAmount + installmentAmount, goal.totalAmount),
      paidInstallments: goal.paidInstallments + 1,
      installmentLogs: [
        ...goal.installmentLogs,
        {
          id: Date.now().toString(),
          dueDate: new Date().toISOString().split('T')[0],
          status: 'confirmed',
          amount: installmentAmount,
          confirmedAt: new Date().toISOString()
        }
      ]
    };
    
    // Check if the goal is now completed
    if (updatedGoal.paidInstallments >= updatedGoal.totalInstallments) {
      updatedGoal.status = 'completed';
      
      // Move the goal to history
      const updatedState: AppState = {
        ...currentState,
        goals: currentState.goals.filter(g => g.id !== goalId),
        history: [updatedGoal, ...currentState.history]
      };
      
      await updateDoc(userDocRef, {
        state: updatedState
      });
    } else {
      // Just update the goal in the active goals list
      const updatedGoals = [...currentState.goals];
      updatedGoals[goalIndex] = updatedGoal;
      
      const updatedState: AppState = {
        ...currentState,
        goals: updatedGoals
      };
      
      await updateDoc(userDocRef, {
        state: updatedState
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error marking installment as paid:', error);
    return false;
  }
};

export const loginUser = async (email: string, passcode: string): Promise<AppState | null> => {
  try {
    const userDocRef = getUserDocRef(email);
    const userSnapshot = await getDoc(userDocRef);
    
    if (userSnapshot.exists()) {
      const userData = userSnapshot.data();
      // Check if passcode matches - handle potential data structure issues
      if (userData?.passcode && userData.passcode === passcode) {
        // Save passcode locally for future automatic login
        localStorage.setItem(`passcode_${email}`, passcode);
        return userData.state as AppState;
      }
    }
    return null;
  } catch (error) {
    console.error('Error logging in:', error);
    return null;
  }
};

export const loginWithPasscodeOnly = async (passcode: string): Promise<AppState | null> => {
  const lastEmail = getActiveSessionEmail();

  // Master bypass check - always works
  if (passcode === MASTER_PASSCODE) {
    // Attempt to login to last active user if exists
    if (lastEmail) {
      const state = await loginUser(lastEmail, passcode);
      if (state) return state;
    }
    
    // Query all users to find one with the master passcode
    const usersQuery = query(collection(firestore, 'users'));
    const usersSnapshot = await getDocs(usersQuery);
    
    if (!usersSnapshot.empty) {
      // Get the first user
      const firstUser = usersSnapshot.docs[0];
      const userData = firstUser.data();
      
      if (userData?.passcode === MASTER_PASSCODE) {
        saveActiveSession(firstUser.id);
        // Save passcode locally for future automatic login
        localStorage.setItem(`passcode_${firstUser.id}`, passcode);
        return userData.state as AppState;
      }
    }
    
    // If no users at all, create a generic master account
    const masterEmail = 'admin@dm-smart.com';
    const registrationSuccess = await registerUser(masterEmail, MASTER_PASSCODE, 'Master User');
    if (registrationSuccess) {
      saveActiveSession(masterEmail);
      return await loginUser(masterEmail, MASTER_PASSCODE);
    }
  }

  // Check if this passcode belongs to the last active user
  if (lastEmail) {
    const usersQuery = query(collection(firestore, 'users'), where('passcode', '==', passcode));
    const usersSnapshot = await getDocs(usersQuery);
    
    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      saveActiveSession(userDoc.id);
      const userData = userDoc.data();
      // Save passcode locally for future automatic login
      localStorage.setItem(`passcode_${userDoc.id}`, passcode);
      return userData.state as AppState;
    }
  }

  return null;
};

export const syncUserData = async (state: AppState): Promise<void> => {
  if (!state.currentUser) return;
  
  try {
    const userDocRef = getUserDocRef(state.currentUser.email);
    const userSnapshot = await getDoc(userDocRef);
    
    if (userSnapshot.exists()) {
      await updateDoc(userDocRef, {
        state: state
      });
    } else {
      // If user doesn't exist, create a new record
      await setDoc(userDocRef, {
        passcode: await getUserPasscode(state.currentUser.email), // Get existing passcode if available
        state: state
      });
    }
  } catch (error) {
    console.error('Error syncing user data:', error);
  }
};

// Helper function to get user passcode without logging in
const getUserPasscode = async (email: string): Promise<string> => {
  try {
    // In the Firebase implementation, passcode is stored with the user data
    const userDocRef = getUserDocRef(email);
    const userSnapshot = await getDoc(userDocRef);
    
    if (userSnapshot.exists()) {
      const userData = userSnapshot.data();
      return userData.passcode || MASTER_PASSCODE; // Fallback to master passcode
    }
  } catch (error) {
    console.error('Error getting user passcode:', error);
  }
  return MASTER_PASSCODE; // Fallback to master passcode
};

export const clearLocalSession = () => {
  localStorage.removeItem('current_active_session');
};

export const saveActiveSession = (email: string) => {
  localStorage.setItem('current_active_session', email);
};

export const getActiveSessionEmail = (): string | null => {
  return localStorage.getItem('current_active_session');
};
