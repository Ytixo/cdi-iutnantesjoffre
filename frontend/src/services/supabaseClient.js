import { createClient } from '@supabase/supabase-js';

let cachedClient = null;

export function getSupabaseCredentials() {
  const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  return { url, key };
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key && url.startsWith('http'));
}

export function getSupabase() {
  if (cachedClient) return cachedClient;

  const { url, key } = getSupabaseCredentials();
  if (url && key && url.startsWith('http')) {
    try {
      cachedClient = createClient(url, key, {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
      return cachedClient;
    } catch (err) {
      console.error('Erreur initialisation client Supabase:', err);
      return null;
    }
  }
  return null;
}
