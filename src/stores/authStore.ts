import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase/client';

export type UserRole = 'customer' | 'supplier' | 'driver' | 'admin';

export interface UserProfile {
  id: string;
  phone_number: string;
  full_name: string | null;
  role: UserRole;
  is_onboarding_completed: boolean;
  profile_photo_url: string | null;
  preferred_address: string | null;
  city: string | null;
  pincode: string | null;
}

interface AuthState {
  // Session State
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isInitialized: boolean;
  isLoading: boolean;
  authError: string | null;

  // Phone OTP Flow State
  pendingPhone: string | null; // E.164 formatted (+91...)
  rawPhoneDigits: string;
  cooldownSeconds: number;
  lastOtpSentAt: number | null;

  // Actions
  initialize: () => Promise<void>;
  setPhoneDigits: (digits: string) => void;
  sendOtp: (phoneDigits: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (token: string) => Promise<{ success: boolean; isOnboarded?: boolean; error?: string }>;
  resendOtp: () => Promise<{ success: boolean; error?: string }>;
  decrementCooldown: () => void;
  fetchProfile: (userId: string) => Promise<UserProfile | null>;
  completeOnboarding: (data: {
    fullName: string;
    preferredAddress: string;
    city: string;
    pincode: string;
  }) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isInitialized: false,
  isLoading: false,
  authError: null,
  pendingPhone: null,
  rawPhoneDigits: '',
  cooldownSeconds: 0,
  lastOtpSentAt: null,

  setPhoneDigits: (digits: string) => {
    set({ rawPhoneDigits: digits, authError: null });
  },

  clearError: () => {
    set({ authError: null });
  },

  decrementCooldown: () => {
    const { cooldownSeconds } = get();
    if (cooldownSeconds > 0) {
      set({ cooldownSeconds: cooldownSeconds - 1 });
    }
  },

  initialize: async () => {
    try {
      set({ isLoading: true });

      // 1. Get existing session from persistent storage
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn('[AuthStore] Session retrieval notice:', error.message);
      }

      if (session?.user) {
        const profile = await get().fetchProfile(session.user.id);
        set({
          session,
          user: session.user,
          profile,
          isInitialized: true,
          isLoading: false,
        });
      } else {
        set({
          session: null,
          user: null,
          profile: null,
          isInitialized: true,
          isLoading: false,
        });
      }

      // 2. Subscribe to auth state changes
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (newSession?.user) {
          const profile = await get().fetchProfile(newSession.user.id);
          set({ session: newSession, user: newSession.user, profile });
        } else if (event === 'SIGNED_OUT') {
          set({ session: null, user: null, profile: null });
        }
      });
    } catch (err: any) {
      console.warn('[AuthStore] Init exception:', err);
      set({ isInitialized: true, isLoading: false });
    }
  },

  fetchProfile: async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[AuthStore] Profile fetch warning:', error.message);
      }

      if (data) {
        return data as UserProfile;
      }

      // If profile record doesn't exist yet, construct an initial uncompleted profile
      const user = get().user;
      return {
        id: userId,
        phone_number: user?.phone || get().pendingPhone || '',
        full_name: null,
        role: 'customer',
        is_onboarding_completed: false,
        profile_photo_url: null,
        preferred_address: null,
        city: 'Bengaluru',
        pincode: null,
      };
    } catch (err) {
      console.warn('[AuthStore] Profile fetch error:', err);
      return null;
    }
  },

  sendOtp: async (phoneDigits: string) => {
    const cleaned = phoneDigits.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      const err = 'Please enter a valid 10-digit mobile number';
      set({ authError: err });
      return { success: false, error: err };
    }

    const formattedPhone = `+91${cleaned}`;

    // Rate-limiting check
    const { lastOtpSentAt, cooldownSeconds } = get();
    if (cooldownSeconds > 0) {
      const err = `Please wait ${cooldownSeconds} seconds before requesting a new OTP`;
      set({ authError: err });
      return { success: false, error: err };
    }

    set({ isLoading: true, authError: null });

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          channel: 'sms',
        },
      });

      if (error) {
        set({ isLoading: false, authError: error.message });
        return { success: false, error: error.message };
      }

      set({
        pendingPhone: formattedPhone,
        cooldownSeconds: 30, // 30-second resend cooldown
        lastOtpSentAt: Date.now(),
        isLoading: false,
      });

      return { success: true };
    } catch (err: any) {
      const message = err?.message || 'Network error sending OTP. Please check your connection.';
      set({ isLoading: false, authError: message });
      return { success: false, error: message };
    }
  },

  verifyOtp: async (token: string) => {
    const { pendingPhone } = get();
    if (!pendingPhone) {
      const err = 'Phone number missing. Please restart login.';
      set({ authError: err });
      return { success: false, error: err };
    }

    const cleanToken = token.trim();
    if (cleanToken.length !== 6) {
      const err = 'Please enter the complete 6-digit verification code';
      set({ authError: err });
      return { success: false, error: err };
    }

    set({ isLoading: true, authError: null });

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: pendingPhone,
        token: cleanToken,
        type: 'sms',
      });

      if (error) {
        set({ isLoading: false, authError: error.message });
        return { success: false, error: error.message };
      }

      if (data.session && data.user) {
        const profile = await get().fetchProfile(data.user.id);
        const isOnboarded = profile?.is_onboarding_completed ?? false;

        set({
          session: data.session,
          user: data.user,
          profile,
          isLoading: false,
          pendingPhone: null,
          cooldownSeconds: 0,
        });

        return { success: true, isOnboarded };
      }

      set({ isLoading: false, authError: 'Verification response incomplete' });
      return { success: false, error: 'Verification response incomplete' };
    } catch (err: any) {
      const message = err?.message || 'Invalid or expired OTP code. Please try again.';
      set({ isLoading: false, authError: message });
      return { success: false, error: message };
    }
  },

  resendOtp: async () => {
    const { pendingPhone, rawPhoneDigits } = get();
    const digits = pendingPhone ? pendingPhone.replace('+91', '') : rawPhoneDigits;
    return get().sendOtp(digits);
  },

  completeOnboarding: async (data) => {
    const { user } = get();
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session' };
    }

    set({ isLoading: true });

    try {
      const updatePayload: Partial<UserProfile> = {
        full_name: data.fullName,
        preferred_address: data.preferredAddress,
        city: data.city,
        pincode: data.pincode,
        is_onboarding_completed: true,
      };

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          phone_number: user.phone || '',
          ...updatePayload,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        set({ isLoading: false, authError: error.message });
        return { success: false, error: error.message };
      }

      const updatedProfile = await get().fetchProfile(user.id);
      set({ profile: updatedProfile, isLoading: false });

      return { success: true };
    } catch (err: any) {
      const message = err?.message || 'Failed to update profile';
      set({ isLoading: false, authError: message });
      return { success: false, error: message };
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true });
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[AuthStore] Sign out error:', err);
    } finally {
      set({
        session: null,
        user: null,
        profile: null,
        pendingPhone: null,
        rawPhoneDigits: '',
        isLoading: false,
        authError: null,
      });
    }
  },
}));
