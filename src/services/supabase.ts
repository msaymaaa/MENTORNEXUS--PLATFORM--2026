/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function normalizeSupabaseConfig(rawUrl?: string, rawKey?: string) {
  let url = (rawUrl || '').trim();
  let key = (rawKey || '').trim();

  // If Key contains http(s):// and URL does not, they were inverted in environment settings
  if (
    (key.startsWith('https://') || key.startsWith('http://')) &&
    (!url.startsWith('https://') && !url.startsWith('http://'))
  ) {
    const temp = url;
    url = key;
    key = temp;
  }

  // Strip trailing /rest/v1 or trailing slashes so Supabase SDK builds correct endpoints
  url = url.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');

  const isConfigured = Boolean(
    url && 
    key && 
    (url.startsWith('https://') || url.startsWith('http://')) &&
    !url.includes('placeholder')
  );

  return { url, key, isConfigured };
}

const rawEnvUrl: string = 
  (import.meta as any).env?.VITE_SUPABASE_URL || 
  (import.meta as any).env?.SUPABASE_URL || 
  '';

const rawEnvKey: string = 
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
  (import.meta as any).env?.SUPABASE_ANON_KEY || 
  '';

const { url: supabaseUrl, key: supabaseAnonKey, isConfigured } = normalizeSupabaseConfig(rawEnvUrl, rawEnvKey);

export const isSupabaseConfigured = isConfigured;
export const configuredSupabaseUrl = supabaseUrl;

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured) return null;
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      }
    });
  }
  return supabaseInstance;
};

export const supabase = isSupabaseConfigured ? getSupabaseClient() : null;


