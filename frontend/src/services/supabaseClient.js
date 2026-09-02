import { createClient } from '@supabase/supabase-js';

let cachedClient = null;

export function getSupabaseCredentials() {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  const localUrl = (localStorage.getItem('cdi_supabase_url') || '').trim();
  const localKey = (localStorage.getItem('cdi_supabase_anon_key') || '').trim();

  const url = localUrl || envUrl;
  const key = localKey || envKey;

  return { url, key, isFromEnv: Boolean(!localUrl && envUrl) };
}

export function saveSupabaseCredentials(url, key) {
  if (url && key) {
    localStorage.setItem('cdi_supabase_url', url.trim());
    localStorage.setItem('cdi_supabase_anon_key', key.trim());
  } else {
    localStorage.removeItem('cdi_supabase_url');
    localStorage.removeItem('cdi_supabase_anon_key');
  }
  cachedClient = null; // Réinitialiser le client en cache
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

export async function testSupabaseConnection(url, key) {
  if (!url || !key || !url.startsWith('http')) {
    return { success: false, error: 'URL ou Clé Anon Supabase invalide.' };
  }

  try {
    const testClient = createClient(url, key);
    const { data, error } = await testClient.from('settings').select('*').limit(1);
    if (error) {
      // Si la table settings n'existe pas encore mais les identifiants sont bons
      if (error.code === '42P01') {
        return { success: true, message: 'Connexion Supabase réussie (pensez à exécuter le script SQL supabase_schema.sql).' };
      }
      return { success: false, error: error.message };
    }
    return { success: true, message: 'Connexion à Supabase Cloud établie avec succès !' };
  } catch (err) {
    return { success: false, error: err.message || 'Impossible de se connecter à Supabase.' };
  }
}
