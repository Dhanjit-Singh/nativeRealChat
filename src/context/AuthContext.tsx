import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';

type AuthContextType = {
    isLoggedIn: boolean;
    user: any;
    login: (userData: any) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
    const segments = useSegments();

    const login = async (userData: any) => {
        try {
            await AsyncStorage.setItem('user', JSON.stringify(userData));
            await AsyncStorage.setItem('isLoggedIn', 'true');
            setUser(userData);
            setIsLoggedIn(true);
        } catch (error) {
            console.error('Login error:', error);
        }
    };

    const logout = async () => {
        try {
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('isLoggedIn');
            setUser(null);
            setIsLoggedIn(false);
            router.replace('/signin');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const checkAuth = async () => {
        try {
            const userString = await AsyncStorage.getItem('user');
            const isLoggedInFlag = await AsyncStorage.getItem('isLoggedIn');

            if (userString && isLoggedInFlag === 'true') {
                const userData = JSON.parse(userString);
                setUser(userData);
                setIsLoggedIn(true);
            } else {
                setIsLoggedIn(false);
                setUser(null);
            }
        } catch (error) {
            console.error('Check auth error:', error);
            setIsLoggedIn(false);
            setUser(null);
        }
    };

    // Check auth on mount
    useEffect(() => {
        checkAuth();
    }, []);

    // Handle routing based on auth state
    useEffect(() => {
        const inAuthGroup = segments[0] === 'signin' || segments[0] === 'signup' || segments[0] === 'index';

        if (!isLoggedIn && !inAuthGroup) {
            router.replace('/signin');
        } else if (isLoggedIn && inAuthGroup && segments[0] !== 'home') {
            router.replace('/home');
        }
    }, [isLoggedIn, segments]);

    return (
        <AuthContext.Provider value={{ isLoggedIn, user, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};