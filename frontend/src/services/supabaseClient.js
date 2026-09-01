import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'cdi_supabase_url';
const STORAGE_KEY_ANON = 'cdi_supabase_anon_key';

let cachedClient = null;

export function getSupabaseCredentials() {
  const url = localStorage.getItem(STORAGE_KEY_URL) || import.meta.env.VITE_SUPABASE_URL || '';
  const key = localStorage.getItem(STORAGE_KEY_ANON) || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url: url.trim(), key: key.trim() };
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

export function saveSupabaseCredentials(url, key) {
  if (url) {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_URL);
  }

  if (key) {
    localStorage.setItem(STORAGE_KEY_ANON, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_ANON);
  }

  cachedClient = null; // Réinitialiser l'instance
  return getSupabase();
}

export async function testSupabaseConnection(url, key) {
  try {
    if (!url || !key) return { success: false, error: 'URL et Clé Anonyme requises' };
    const tempClient = createClient(url.trim(), key.trim());
    const { data, error } = await tempClient.from('monitors').select('id').limit(1);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
