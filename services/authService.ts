import { auth } from './firebase';
import * as _auth from "firebase/auth";

// NOTE: This service provides the necessary functions for a full authentication system.
// The main application currently uses a mock user and does not yet call these functions.

// FIX: Access auth functions via namespace and cast to any to resolve TS errors
const authLib = _auth as any;

export const authService = {
  /**
   * Signs in a user with email and password.
   */
  signIn: (email: string, password: string) => {
    return authLib.signInWithEmailAndPassword(auth, email, password);
  },

  /**
   * Creates a new user with email and password.
   */
  signUp: (email: string, password: string) => {
    return authLib.createUserWithEmailAndPassword(auth, email, password);
  },

  /**
   * Signs out the current user.
   */
  signOut: () => {
    return authLib.signOut(auth);
  },

  /**
   * Subscribes to authentication state changes, providing the Firebase user object.
   * @param callback The function to call when the auth state changes.
   * @returns An unsubscribe function from Firebase.
   */
  onAuthStateChanged: (callback: (user: any | null) => void) => {
    return authLib.onAuthStateChanged(auth, callback);
  },
};