import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, testFirestoreConnection } from '../lib/firebase';
import { signInWithGoogle, signOutUser, syncUserProfile, getUserProfile } from '../services/authService';
import { UserProfile } from '../types';
import { useNotification } from './NotificationContext';

interface AuthContextValue {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  dbConnected: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dbConnected, setDbConnected] = useState<boolean>(true);
  const { showToast } = useNotification();

  useEffect(() => {
    // Probe Firestore connectivity on boot
    testFirestoreConnection().then(({ connected }) => {
      setDbConnected(connected);
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
          } else {
            const synced = await syncUserProfile(user);
            setUserProfile(synced);
          }
        } catch (error) {
          console.error('Failed to sync user profile:', error);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const user = await signInWithGoogle();
      showToast(`Welcome back, ${user.displayName || 'Staff'}!`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Authentication failed. Please try again.', 'error');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOutUser();
      showToast('Signed out successfully.', 'info');
    } catch (error: any) {
      showToast(error.message || 'Failed to sign out.', 'error');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        dbConnected,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
