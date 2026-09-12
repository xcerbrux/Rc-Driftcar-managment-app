import { signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleAuthProvider } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { UserProfile } from '../types';

export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    await syncUserProfile(result.user);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in cancelled. The Google authentication popup was closed.');
    }
    if (error.code === 'auth/cancelled-popup-request') {
      throw new Error('Only one sign-in popup can be active at a time.');
    }
    console.error('Google Sign-In Error:', error);
    throw new Error(error.message || 'Failed to authenticate with Google.');
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Sign-Out Error:', error);
    throw new Error('Failed to sign out cleanly.');
  }
}

export async function syncUserProfile(user: User): Promise<UserProfile> {
  const userDocRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userDocRef);
    const now = new Date().toISOString();

    if (!snap.exists()) {
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Staff Member',
        photoURL: user.photoURL || null,
        role: 'admin', // First provisioned user defaults to admin role
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(userDocRef, newProfile);
      return newProfile;
    } else {
      const existing = snap.data() as UserProfile;
      // Sync display name/photo if updated in Google
      if (user.displayName !== existing.displayName || user.photoURL !== existing.photoURL) {
        const updated = {
          displayName: user.displayName || existing.displayName,
          photoURL: user.photoURL || existing.photoURL,
          updatedAt: now,
        };
        await setDoc(userDocRef, updated, { merge: true });
        return { ...existing, ...updated };
      }
      return existing;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDocRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}
