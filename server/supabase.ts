import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

function normalizeServerSupabaseConfig(rawUrl?: string, rawKey?: string) {
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

const rawEnvUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const rawEnvKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const { url: supabaseUrl, key: supabaseAnonKey, isConfigured } = normalizeServerSupabaseConfig(rawEnvUrl, rawEnvKey);

export const isServerSupabaseConfigured = isConfigured;

let serverSupabaseInstance: SupabaseClient | null = null;

export const getServerSupabaseClient = (): SupabaseClient | null => {
  if (!isServerSupabaseConfigured) return null;
  if (!serverSupabaseInstance) {
    serverSupabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return serverSupabaseInstance;
};

export const serverSupabase = isServerSupabaseConfigured ? getServerSupabaseClient() : null;
