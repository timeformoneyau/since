import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

// Test builds only (EXPO_PUBLIC_E2E=1, set by CI for the Maestro flows): use an
// in-memory backend so flows need no real account or network. Never set for
// EAS/phone builds, so this branch is not taken there.
export const supabase: SupabaseClient =
  process.env.EXPO_PUBLIC_E2E === '1'
    ? (require('./fakeSupabase').createFakeSupabase() as unknown as SupabaseClient)
    : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      });
