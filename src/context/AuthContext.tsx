import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, UserRole } from '../types/index';
import { api } from '../services/api';
import { isSupabaseConfigured, getSupabaseClient } from '../services/supabase';
import { supabaseDb } from '../services/supabaseDb';

export interface RegisterResult {
  user: UserProfile;
  requiresEmailConfirmation: boolean;
  message?: string;
}

interface AuthContextType {
  currentUser: UserProfile | null;
  allUsers: UserProfile[];
  isLoading: boolean;
  isSupabaseActive: boolean;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (val: boolean) => void;
  switchUser: (userId: string) => Promise<void>;
  registerUser: (data: Partial<UserProfile> & { password?: string }) => Promise<RegisterResult>;
  signInWithEmail: (email: string, password?: string) => Promise<UserProfile>;
  resetPasswordForEmail: (email: string) => Promise<{ success: boolean; message: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; message: string }>;
  resendConfirmationEmail: (email: string) => Promise<{ success: boolean; message: string }>;
  checkConfirmationStatus: (email?: string) => Promise<{ confirmed: boolean; user?: UserProfile | null }>;
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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      let sessionUser: UserProfile | null = null;

      if (isSupabaseConfigured) {
        const client = getSupabaseClient();
        if (client) {
          const { data: { session } } = await client.auth.getSession();
          if (session?.user) {
            sessionUser = await supabaseDb.getProfileById(session.user.id, session.user.email);
            
            if (!sessionUser && session.user.email) {
              const metaRole = (session.user.user_metadata?.role as UserRole) || 
                (session.user.email?.toLowerCase().includes('mentor') ? 'mentor' : 'student');
              const isMentorUser = metaRole === 'mentor';

              const fallbackProfile: UserProfile = {
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email.split('@')[0] || 'MentorNexus Member',
                role: metaRole,
                title: isMentorUser ? 'Industry Mentor' : metaRole === 'early_career' ? 'Early-Career Professional' : 'Student / Learner',
                organization: 'Independent',
                industry: 'Technology & AI',
                skills: ['Career Growth', 'Strategy', 'Technical Depth'],
                interests: ['Professional Development', 'Technology & AI'],
                mentoringAreas: isMentorUser ? ['Career Navigation', 'Technical Depth', 'Leadership'] : ['Career Guidance', 'Skill Development'],
                bio: isMentorUser 
                  ? 'Experienced mentor passionate about guiding early-career talent and sharing domain insights.'
                  : 'Motivated learner focused on professional growth, strategic career navigation, and tech depth.',
                location: 'Remote',
                avatar: isMentorUser 
                  ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80'
                  : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
                yearsOfExperience: isMentorUser ? 5 : 1,
                verificationStatus: 'verified',
                rating: 4.9,
                reviewCount: 12,
                createdAt: session.user.created_at || new Date().toISOString(),
              };

              const saved = await supabaseDb.upsertProfile(fallbackProfile).catch(() => null);
              sessionUser = saved || fallbackProfile;
            }
          }
        }
      }

      let resolvedCurrentUser: UserProfile | null = sessionUser;
      if (!resolvedCurrentUser && !isSupabaseConfigured) {
        resolvedCurrentUser = await api.getCurrentUser().catch(() => null);
      }

      const users = await api.getAllUsers().catch(() => []);
      setCurrentUser(resolvedCurrentUser);
      setAllUsers(users);
      if (resolvedCurrentUser?.id) {
        await api.switchUser(resolvedCurrentUser.id).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to load auth user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Check for password recovery URL hash or search params
    const checkUrlRecovery = () => {
      try {
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        const params = new URLSearchParams(hash.replace(/^#/, '') || search);
        const type = params.get('type');
        if (type === 'recovery' || hash.includes('type=recovery') || search.includes('type=recovery')) {
          setIsPasswordRecovery(true);
        }
      } catch (e) {
        console.warn('URL recovery parse error:', e);
      }
    };
    checkUrlRecovery();

    // If Supabase is configured, listen to auth state changes
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
            setIsPasswordRecovery(true);
            return;
          }

          if (session?.user) {
            try {
              let profile = await supabaseDb.getProfileById(session.user.id, session.user.email);
              
              if (!profile) {
                const metaRole = (session.user.user_metadata?.role as UserRole) || 
                  (session.user.email?.toLowerCase().includes('mentor') ? 'mentor' : 'student');
                const isMentorUser = metaRole === 'mentor';

                const fallbackProfile: UserProfile = {
                  id: session.user.id,
                  email: session.user.email || '',
                  name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'MentorNexus Member',
                  role: metaRole,
                  title: isMentorUser ? 'Industry Mentor' : metaRole === 'early_career' ? 'Early-Career Professional' : 'Student / Learner',
                  organization: 'Independent',
                  industry: 'Technology & AI',
                  skills: ['Career Growth', 'Strategy', 'Technical Depth'],
                  interests: ['Professional Development', 'Technology & AI'],
                  mentoringAreas: isMentorUser ? ['Career Navigation', 'Technical Depth', 'Leadership'] : ['Career Guidance', 'Skill Development'],
                  bio: isMentorUser 
                    ? 'Experienced mentor passionate about guiding early-career talent and sharing domain insights.'
                    : 'Motivated learner focused on professional growth, strategic career navigation, and tech depth.',
                  location: 'Remote',
                  avatar: isMentorUser 
                    ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80'
                    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
                  yearsOfExperience: isMentorUser ? 5 : 1,
                  verificationStatus: 'verified',
                  rating: 4.9,
                  reviewCount: 12,
                  createdAt: session.user.created_at || new Date().toISOString(),
                };

                const saved = await supabaseDb.upsertProfile(fallbackProfile).catch(() => null);
                profile = saved || fallbackProfile;
              }

              if (profile) {
                setCurrentUser(profile);
                await api.switchUser(profile.id).catch(() => {});
                await refreshUsers();
              }
            } catch (e) {
              console.warn('Could not sync profile on auth state change', e);
            }
          } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
            await api.switchUser('anonymous').catch(() => {});
          }
        });
        return () => subscription.unsubscribe();
      }
    }
  }, []);

  const switchUser = async (userId: string) => {
    try {
      const res = await api.switchUser(userId);
      setCurrentUser(res.user);
      await refreshUsers();
    } catch (error) {
      console.error('Failed to switch user:', error);
      throw error;
    }
  };

  const registerUser = async (data: Partial<UserProfile> & { password?: string }): Promise<RegisterResult> => {
    try {
      let requiresEmailConfirmation = false;
      
      // Enforce valid public signup roles: student, early_career, mentor (never admin)
      let sanitizedRole: UserRole = 'student';
      if (data.role === 'mentor') {
        sanitizedRole = 'mentor';
      } else if (data.role === 'early_career') {
        sanitizedRole = 'early_career';
      } else {
        sanitizedRole = 'student';
      }

      data.role = sanitizedRole;
      
      // If Supabase is configured, create the user in Supabase Auth
      if (isSupabaseConfigured && data.email && data.password) {
        const client = getSupabaseClient();
        if (client) {
          const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
          const { data: authData, error: authError } = await client.auth.signUp({
            email: data.email.trim().toLowerCase(),
            password: data.password,
            options: {
              data: {
                full_name: data.name,
                role: sanitizedRole,
                title: data.title || (sanitizedRole === 'mentor' ? 'Industry Mentor' : sanitizedRole === 'early_career' ? 'Early-Career Professional' : 'Student / Learner'),
              },
              emailRedirectTo: redirectUrl,
            }
          });

          if (authError) {
            console.error('Supabase auth sign up error:', authError.message);
            const msg = authError.message.toLowerCase();
            if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit') || (authError as any).status === 429) {
              const err = new Error('Supabase email rate limit exceeded. If you already signed up, your account is created — please try signing in directly with your password, or wait a short moment.');
              (err as any).isRateLimit = true;
              (err as any).email = data.email.trim().toLowerCase();
              throw err;
            }
            throw new Error(authError.message);
          }

          if (authData.user) {
            data.id = authData.user.id;

            // In Supabase with email confirmation enabled, session is null until confirmed
            const hasSession = !!authData.session;
            const isConfirmed = !!(authData.user.email_confirmed_at || authData.user.confirmed_at);
            
            if (!hasSession && !isConfirmed) {
              requiresEmailConfirmation = true;
            }
          }
        }
      }

      // Persist profile in backend/DB with appropriate verification status
      const profileToRegister: Partial<UserProfile> = {
        ...data,
        id: data.id,
        role: sanitizedRole,
        name: data.name || data.email?.split('@')[0] || 'MentorNexus Member',
        email: data.email ? data.email.trim().toLowerCase() : '',
        title: data.title || (sanitizedRole === 'mentor' ? 'Industry Mentor' : sanitizedRole === 'early_career' ? 'Early-Career Professional' : 'Student / Learner'),
        organization: data.organization || 'Independent',
        industry: data.industry || 'Technology & AI',
        bio: data.bio || (sanitizedRole === 'mentor' ? 'Experienced mentor passionate about guiding early-career talent.' : 'Motivated learner focused on professional growth.'),
        avatar: data.avatar || (sanitizedRole === 'mentor' ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'),
        yearsOfExperience: data.yearsOfExperience !== undefined ? data.yearsOfExperience : (sanitizedRole === 'mentor' ? 5 : 1),
        skills: data.skills || ['Career Growth', 'Strategy', 'Technical Depth'],
        interests: data.interests || ['Professional Development', 'Technology & AI'],
        mentoringAreas: data.mentoringAreas || (sanitizedRole === 'mentor' ? ['Career Navigation', 'Technical Depth', 'Leadership'] : ['Career Guidance']),
        verificationStatus: 'verified',
        rating: 4.9,
        reviewCount: 12,
      };

      // Direct client-side upsert to Supabase if ID is available
      if (isSupabaseConfigured && profileToRegister.id) {
        await supabaseDb.upsertProfile(profileToRegister).catch(err => {
          console.warn('Direct upsertProfile on signup notice:', err);
        });
      }

      const newUser = await api.registerUser(profileToRegister);

      if (requiresEmailConfirmation) {
        await refreshUsers();
        return {
          user: newUser,
          requiresEmailConfirmation: true,
          message: 'Account registered. Please check your email to confirm your account before signing in.',
        };
      } else {
        setCurrentUser(newUser);
        await api.switchUser(newUser.id).catch(() => {});
        await refreshUsers();
        return {
          user: newUser,
          requiresEmailConfirmation: false,
        };
      }
    } catch (error) {
      console.error('Failed to register user:', error);
      throw error;
    }
  };

  const resendConfirmationEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    if (!isSupabaseConfigured) {
      return {
        success: true,
        message: `A confirmation email has been sent to ${email}.`,
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase authentication client is not available.');
    }

    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await client.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes('rate limit') || 
        msg.includes('over_email_send_rate_limit') || 
        msg.includes('60 seconds') || 
        msg.includes('security purposes') ||
        error.status === 429
      ) {
        throw new Error('Email request rate limit reached. For security purposes, please wait a minute before requesting another confirmation email.');
      }
      throw new Error(error.message || 'Failed to resend confirmation email.');
    }

    return {
      success: true,
      message: `Confirmation email sent to ${email.trim()}. Please check your inbox and spam folder.`,
    };
  };

  const checkConfirmationStatus = async (email?: string): Promise<{ confirmed: boolean; user?: UserProfile | null }> => {
    if (!isSupabaseConfigured) {
      return { confirmed: true, user: currentUser };
    }

    const client = getSupabaseClient();
    if (!client) return { confirmed: false, user: null };

    try {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
        let profile = await supabaseDb.getProfileById(session.user.id, session.user.email || email);
        
        if (!profile && session.user.email) {
          const fallbackProfile: UserProfile = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email.split('@')[0] || 'MentorNexus Member',
            role: (session.user.user_metadata?.role as UserRole) || 'student',
            title: (session.user.user_metadata?.role === 'mentor') ? 'Industry Mentor' : 'Aspiring Professional',
            organization: 'Independent',
            industry: 'Technology & AI',
            skills: ['Career Growth', 'Strategy'],
            interests: ['Professional Development'],
            mentoringAreas: session.user.user_metadata?.role === 'mentor' ? ['Career Navigation', 'Technical Depth'] : ['Career Guidance'],
            bio: '',
            location: 'Remote',
            avatar: session.user.user_metadata?.role === 'mentor' 
              ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80'
              : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
            yearsOfExperience: session.user.user_metadata?.role === 'mentor' ? 5 : 1,
            verificationStatus: session.user.user_metadata?.role === 'mentor' ? 'pending' : 'verified',
            rating: 4.9,
            reviewCount: 12,
            createdAt: session.user.created_at || new Date().toISOString(),
          };

          const saved = await supabaseDb.upsertProfile(fallbackProfile).catch(() => null);
          profile = saved || fallbackProfile;
        }

        if (profile) {
          setCurrentUser(profile);
          await api.switchUser(profile.id).catch(() => {});
          await refreshUsers();
          return { confirmed: true, user: profile };
        }
      }
      return { confirmed: false, user: null };
    } catch (e) {
      console.warn('Check confirmation error:', e);
      return { confirmed: false, user: null };
    }
  };

  const signInWithEmail = async (email: string, password?: string): Promise<UserProfile> => {
    try {
      if (isSupabaseConfigured) {
        if (!password) {
          throw new Error('Please enter your password.');
        }
        const client = getSupabaseClient();
        if (!client) {
          throw new Error('Authentication client unavailable.');
        }

        const { data: authData, error: authError } = await client.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (authError) {
          const errorMsg = authError.message.toLowerCase();
          if (
            errorMsg.includes('email not confirmed') || 
            errorMsg.includes('not confirmed') || 
            errorMsg.includes('unconfirmed')
          ) {
            const err = new Error('Your email address has not been confirmed yet. Please check your inbox and click the verification link before signing in.');
            (err as any).isEmailNotConfirmed = true;
            (err as any).email = email.trim().toLowerCase();
            throw err;
          }

          throw new Error(authError.message || 'Invalid email or password.');
        }

        if (authData?.user) {
          let profile = await supabaseDb.getProfileById(authData.user.id, authData.user.email || email.trim().toLowerCase());
          
          if (!profile) {
            const metaRole = (authData.user.user_metadata?.role as UserRole) || 
              (email.toLowerCase().includes('mentor') ? 'mentor' : 'student');
            const isMentorUser = metaRole === 'mentor';

            const fallbackProfile: UserProfile = {
              id: authData.user.id,
              email: authData.user.email || email.trim().toLowerCase(),
              name: authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || email.split('@')[0] || 'MentorNexus Member',
              role: metaRole,
              title: isMentorUser ? 'Industry Mentor' : metaRole === 'early_career' ? 'Early-Career Professional' : 'Student / Learner',
              organization: 'Independent',
              industry: 'Technology & AI',
              skills: ['Career Growth', 'Strategy', 'Technical Depth'],
              interests: ['Professional Development', 'Technology & AI'],
              mentoringAreas: isMentorUser ? ['Career Navigation', 'Technical Depth', 'Leadership'] : ['Career Guidance', 'Skill Development'],
              bio: isMentorUser 
                ? 'Experienced mentor passionate about guiding early-career talent and sharing domain insights.'
                : 'Motivated learner focused on professional growth, strategic career navigation, and tech depth.',
              location: 'Remote',
              avatar: isMentorUser
                ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80'
                : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
              yearsOfExperience: isMentorUser ? 5 : 1,
              verificationStatus: 'verified',
              rating: 4.9,
              reviewCount: 12,
              createdAt: authData.user.created_at || new Date().toISOString(),
            };

            const saved = await supabaseDb.upsertProfile(fallbackProfile).catch(() => null);
            profile = saved || fallbackProfile;
          }

          if (profile) {
            setCurrentUser(profile);
            await api.switchUser(profile.id).catch(() => {});
            await refreshUsers();
            return profile;
          }
        }
        throw new Error('Could not load user profile from database.');
      }

      // Standalone fallback when Supabase is not configured in local development
      const users = await api.getAllUsers();
      const matched = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      if (matched) {
        const res = await api.switchUser(matched.id);
        setCurrentUser(res.user);
        await refreshUsers();
        return res.user;
      } else {
        throw new Error('Invalid email or password. Please check your credentials.');
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  };

  const resetPasswordForEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (!client) {
        throw new Error('Authentication client unavailable.');
      }

      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined;
      const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (
          msg.includes('rate limit') || 
          msg.includes('over_email_send_rate_limit') || 
          msg.includes('security purposes') ||
          error.status === 429
        ) {
          throw new Error('Email rate limit exceeded. For security purposes, please wait a minute before requesting another password reset email.');
        }
        throw new Error(error.message || 'Could not send password reset email. Please verify the address.');
      }

      return {
        success: true,
        message: `Password reset link sent to ${cleanEmail}. Please check your email inbox.`,
      };
    }

    // Standalone fallback
    const users = await api.getAllUsers().catch(() => []);
    const matched = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!matched) {
      throw new Error(`No registered account found with email ${cleanEmail}.`);
    }

    return {
      success: true,
      message: `Password reset link sent to ${cleanEmail}. Please check your email inbox.`,
    };
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; message: string }> => {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (!client) {
        throw new Error('Authentication client unavailable.');
      }

      const { data, error } = await client.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new Error(error.message || 'Failed to update password. Your reset link may be invalid or expired.');
      }

      // Explicitly sign out of the recovery session so the user signs in fresh
      await client.auth.signOut().catch(console.warn);
    }

    // Clear user and recovery state
    setCurrentUser(null);
    await api.switchUser('anonymous').catch(() => {});
    setIsPasswordRecovery(false);

    return {
      success: true,
      message: 'Your password has been successfully updated. Please sign in with your new password.',
    };
  };

  const logoutUser = async () => {
    try {
      if (isSupabaseConfigured) {
        const client = getSupabaseClient();
        if (client) {
          await client.auth.signOut().catch(console.warn);
        }
      }
      await api.switchUser('anonymous').catch(() => {});
      setCurrentUser(null);
      setIsPasswordRecovery(false);
    } catch (err) {
      console.error('Sign out error:', err);
      setCurrentUser(null);
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
        isPasswordRecovery,
        setIsPasswordRecovery,
        switchUser,
        registerUser,
        signInWithEmail,
        resetPasswordForEmail,
        updatePassword,
        resendConfirmationEmail,
        checkConfirmationStatus,
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


