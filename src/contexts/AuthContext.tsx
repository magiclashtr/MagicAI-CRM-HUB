import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
    UserProfile,
    UserRole,
    subscribeToAuthState,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    isAdmin,
    isEmployee,
    isStudent,
    isGuest
} from '../../services/authService';

interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    error: string | null;
    signIn: (email: string, password: string) => Promise<void>;
    signInGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    isAdmin: boolean;
    isEmployee: boolean;
    isStudent: boolean;
    isGuest: boolean;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToAuthState((profile) => {
            setUser(profile);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            setError(null);
            setLoading(true);
            await signInWithEmail(email, password);
        } catch (err: any) {
            setError(err.message || 'Помилка входу');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const signInGoogle = async () => {
        try {
            setError(null);
            setLoading(true);
            await signInWithGoogle();
        } catch (err: any) {
            setError(err.message || 'Помилка входу через Google');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            setError(null);
            await signOut();
        } catch (err: any) {
            setError(err.message || 'Помилка виходу');
            throw err;
        }
    };

    const clearError = () => setError(null);

    const value: AuthContextType = {
        user,
        loading,
        error,
        signIn,
        signInGoogle,
        logout,
        isAdmin: isAdmin(),
        isEmployee: isEmployee(),
        isStudent: isStudent(),
        isGuest: isGuest(),
        clearError
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
