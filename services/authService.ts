import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

// User roles
export type UserRole = 'admin' | 'employee' | 'student' | 'guest';

// User profile interface
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  createdBy?: string;
  photoURL?: string;
  jobTitle?: string;
}

// Current user state
let currentUser: User | null = null;
let currentUserProfile: UserProfile | null = null;

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email: string, password: string): Promise<UserProfile> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getUserProfile(userCredential.user.uid);

    if (!profile) {
      console.log('[Auth Debug] No profile found for email user, checking roster/creating guest');
      // Pass 'guest' as default, but createUserProfile will internally check the roster to potentially upgrade to 'employee'
      return await createUserProfile(userCredential.user, 'guest');
    }

    currentUser = userCredential.user;
    currentUserProfile = profile;
    return profile;
  } catch (error: any) {
    console.error('Sign in error:', error);
    if (error.code === 'auth/user-not-found') {
      throw new Error('Користувача не знайдено');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Невірний пароль');
    } else if (error.code === 'auth/invalid-credential') {
      throw new Error('Невірні дані для входу');
    }
    throw error;
  }
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async (): Promise<UserProfile> => {
  try {
    const userCredential = await signInWithPopup(auth, googleProvider);
    console.log('[Auth Debug] Google sign-in successful, UID:', userCredential.user.uid);
    console.log('[Auth Debug] Google user email:', userCredential.user.email);

    let profile = await getUserProfile(userCredential.user.uid);
    console.log('[Auth Debug] Profile from Firestore:', profile);

    if (!profile) {
      console.log('[Auth Debug] No profile found, checking roster/creating guest');
      // Pass 'guest' as default, but createUserProfile will internally check the roster to potentially upgrade to 'employee'
      profile = await createUserProfile(userCredential.user, 'guest');
    } else {
      console.log('[Auth Debug] Found existing profile with role:', profile.role);
    }

    currentUser = userCredential.user;
    currentUserProfile = profile;
    return profile;
  } catch (error: any) {
    console.error('Google sign in error:', error);
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Вхід скасовано');
    }
    throw error;
  }
};

/**
 * Sign out current user
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
    currentUser = null;
    currentUserProfile = null;
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    console.log('[Auth Debug] getUserProfile called with userId:', userId);
    const userDoc = await getDoc(doc(db, 'users', userId));
    console.log('[Auth Debug] Document exists:', userDoc.exists());

    if (userDoc.exists()) {
      const data = userDoc.data();
      console.log('[Auth Debug] Raw Firestore data:', JSON.stringify(data, null, 2));
      console.log('[Auth Debug] Role from Firestore:', data.role);

      return {
        id: userDoc.id,
        email: data.email,
        name: data.name,
        role: data.role as UserRole,
        jobTitle: data.jobTitle,
        createdAt: data.createdAt?.toDate() || new Date(),
        createdBy: data.createdBy,
        photoURL: data.photoURL
      };
    }
    console.log('[Auth Debug] No document found for userId:', userId);
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

/**
 * Create user profile in Firestore
 * Checks 'employees' collection to see if the email matches a roster entry.
 * If so, overrides role to 'employee' and sets jobTitle.
 */
export const createUserProfile = async (user: User, role: UserRole, name?: string): Promise<UserProfile> => {
  let finalRole = role;
  let jobTitle: string | undefined;

  // Check if this email exists in 'employees' roster
  if (user.email) {
    try {
      const employeesRef = collection(db, 'employees');
      const q = query(employeesRef, where('email', '==', user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        console.log('[Auth Debug] Found matching employee in roster! Promoting to Employee role.');
        const employeeData = querySnapshot.docs[0].data();
        finalRole = 'employee';
        jobTitle = employeeData.role; // usage of 'role' in employees collection essentially means 'jobTitle'
      }
    } catch (e) {
      console.error('[Auth Debug] Error checking employees roster:', e);
    }
  }

  const profileData: any = {
    email: user.email || '',
    name: name || user.displayName || user.email?.split('@')[0] || 'User',
    role: finalRole,
    createdAt: serverTimestamp(),
    photoURL: user.photoURL || undefined
  };

  if (jobTitle) {
    profileData.jobTitle = jobTitle;
  }

  const profile: Omit<UserProfile, 'id' | 'createdAt'> & { createdAt: any } = profileData;

  await setDoc(doc(db, 'users', user.uid), profile);

  const newProfile = {
    ...profile,
    id: user.uid,
    createdAt: new Date(),
    role: finalRole as UserRole // Ensure strict typing
  };

  currentUser = user;
  currentUserProfile = newProfile; // Update local state immediately
  return newProfile;
};

/**
 * Create new employee (Admin only)
 */
export const createEmployee = async (
  email: string,
  password: string,
  name: string,
  role: 'employee' | 'student' = 'employee'
): Promise<UserProfile> => {
  if (!currentUserProfile || currentUserProfile.role !== 'admin') {
    throw new Error('Тільки адміністратор може створювати нових співробітників');
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    const profile: Omit<UserProfile, 'id' | 'createdAt'> & { createdAt: any } = {
      email,
      name,
      role,
      createdAt: serverTimestamp(),
      createdBy: currentUserProfile.id
    };

    await setDoc(doc(db, 'users', userCredential.user.uid), profile);

    return {
      ...profile,
      id: userCredential.user.uid,
      createdAt: new Date()
    };
  } catch (error: any) {
    console.error('Create employee error:', error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Ця електронна пошта вже використовується');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Пароль занадто слабкий (мінімум 6 символів)');
    }
    throw error;
  }
};

/**
 * Update user role (Admin only)
 */
export const updateUserRole = async (userId: string, newRole: UserRole): Promise<void> => {
  if (!currentUserProfile || currentUserProfile.role !== 'admin') {
    throw new Error('Тільки адміністратор може змінювати ролі');
  }
  await updateDoc(doc(db, 'users', userId), { role: newRole });
};

/**
 * Get all users (Admin only)
 */
export const getAllUsers = async (): Promise<UserProfile[]> => {
  if (!currentUserProfile || currentUserProfile.role !== 'admin') {
    throw new Error('Тільки адміністратор може переглядати всіх користувачів');
  }

  const usersSnapshot = await getDocs(collection(db, 'users'));
  return usersSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      email: data.email,
      name: data.name,
      role: data.role as UserRole,
      createdAt: data.createdAt?.toDate() || new Date(),
      createdBy: data.createdBy,
      photoURL: data.photoURL
    };
  });
};

/**
 * Subscribe to auth state changes
 */
export const subscribeToAuthState = (callback: (user: UserProfile | null) => void) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      const profile = await getUserProfile(user.uid);
      currentUserProfile = profile;
      callback(profile);
    } else {
      currentUser = null;
      currentUserProfile = null;
      callback(null);
    }
  });
};

/**
 * Get current user profile
 */
export const getCurrentUserProfile = (): UserProfile | null => currentUserProfile;

/**
 * Get current Firebase user
 */
export const getCurrentUser = (): User | null => currentUser;

/**
 * Role check helpers
 */
export const isAdmin = (): boolean => currentUserProfile?.role === 'admin';
export const isEmployee = (): boolean => currentUserProfile?.role === 'employee';
export const isStudent = (): boolean => currentUserProfile?.role === 'student';
export const isGuest = (): boolean => currentUserProfile?.role === 'guest' || currentUserProfile === null;

export const authService = {
  signInWithEmail,
  signInWithGoogle,
  signOut,
  getUserProfile,
  createEmployee,
  updateUserRole,
  getAllUsers,
  subscribeToAuthState,
  getCurrentUserProfile,
  getCurrentUser,
  isAdmin,
  isEmployee,
  isStudent,
  isGuest
};