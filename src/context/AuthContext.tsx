import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, UserRole } from '../types/index';
import { api } from '../services/api';
import { isSupabaseConfigured, getSupabaseClient } from '../services/supabase';

interface AuthContextType {
  currentUser: UserProfile | null;
  allUsers: UserProfile[];
  isLoading: boolean;
  isSupabaseActive: boolean;
  switchUser: (userId: string) => Promise<void>;
  registerUser: (data: Partial<UserProfile> & { password?: string }) => Promise<UserProfile>;
  signInWithEmail: (email: string, password?: string) => Promise<UserProfile>;
  logoutUser: () => Promise<void>;
  updateCurrentUserProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  refreshUsers: () => Promise<void>;
  isRole: (role: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseActive] = useState<boolean>(isSupabaseConfigured);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [user, users] = await Promise.all([
        api.getCurrentUser().catch(() => null),
        api.getAllUsers().catch(() => [])
      ]);
      setCurrentUser(user);
      setAllUsers(users);
    } catch (error) {
      console.error('Failed to load auth user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // If Supabase is configured, listen to auth state changes
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            try {
              const users = await api.getAllUsers();
              const matched = users.find(u => u.id === session.user.id || u.email.toLowerCase() === session.user.email?.toLowerCase());
              if (matched) {
                setCurrentUser(matched);
              }
            } catch (e) {
              console.warn('Could not sync profile on auth state change', e);
            }
          }
        });
        return () => subscription.unsubscribe();
      }
    }
  }, []);

  const switchUser = async (userId: string) => {
    try {
      setIsLoading(true);
      const res = await api.switchUser(userId);
      setCurrentUser(res.user);
      await refreshUsers();
    } catch (error) {
      console.error('Failed to switch user:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const registerUser = async (data: Partial<UserProfile> & { password?: string }) => {
    try {
      setIsLoading(true);
      
      // If Supabase is configured, create the user in Supabase Auth first
      if (isSupabaseConfigured && data.email && data.password) {
        const client = getSupabaseClient();
        if (client) {
          const { data: authData, error: authError } = await client.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              data: {
                full_name: data.name,
                role: data.role,
              }
            }
          });
          if (authError) {
            console.warn('Supabase auth sign up warning:', authError.message);
          }
          if (authData.user) {
            data.id = authData.user.id;
          }
        }
      }

      const newUser = await api.registerUser(data);
      setCurrentUser(newUser);
      await refreshUsers();
      return newUser;
    } catch (error) {
      console.error('Failed to register user:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password?: string) => {
    try {
      setIsLoading(true);

      // If Supabase is configured, sign in with Supabase Auth
      if (isSupabaseConfigured && password) {
        const client = getSupabaseClient();
        if (client) {
          const { error: authError } = await client.auth.signInWithPassword({
            email,
            password,
          });
          if (authError) {
            console.warn('Supabase sign in notice:', authError.message);
          }
        }
      }

      // Find user profile or switch to it
      const users = await api.getAllUsers();
      const matched = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      if (matched) {
        const res = await api.switchUser(matched.id);
        setCurrentUser(res.user);
        await refreshUsers();
        return res.user;
      } else {
        throw new Error('No user profile registered with this email address.');
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logoutUser = async () => {
    try {
      setIsLoading(true);
      if (isSupabaseConfigured) {
        const client = getSupabaseClient();
        if (client) {
          await client.auth.signOut().catch(console.warn);
        }
      }
      // Clear server session or switch to null
      await api.switchUser('anonymous').catch(() => {});
      setCurrentUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCurrentUserProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) throw new Error('No user logged in');
    const updated = await api.updateProfile(currentUser.id, updates);
    setCurrentUser(updated);
    await refreshUsers();
    return updated;
  };

  const refreshUsers = async () => {
    try {
      const users = await api.getAllUsers();
      setAllUsers(users);
      if (currentUser) {
        const freshUser = users.find(u => u.id === currentUser.id);
        if (freshUser) setCurrentUser(freshUser);
      }
    } catch (err) {
      console.error('Error refreshing users list:', err);
    }
  };

  const isRole = (role: UserRole | UserRole[]) => {
    if (!currentUser) return false;
    if (Array.isArray(role)) {
      return role.includes(currentUser.role);
    }
    return currentUser.role === role;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers,
        isLoading,
        isSupabaseActive,
        switchUser,
        registerUser,
        signInWithEmail,
        logoutUser,
        updateCurrentUserProfile,
        refreshUsers,
        isRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
