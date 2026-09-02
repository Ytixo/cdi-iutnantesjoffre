import { normalizeName, hashPassword } from '../utils/authUtils';
import { getSupabase } from './supabaseClient';

const LOCAL_STORAGE_KEY_SESSION = 'cdi_auth_session';

export const DEFAULT_BASE_USERS = [
  {
    id: 'user-virginie',
    name: 'Virginie',
    role: 'manager',
    canManage: true,
    avatar: '👩‍🏫',
    color: '#DB2777',
    hourlyRate: 9.55,
    passwordHash: null,
    createdAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'user-kristell',
    name: 'Kristell',
    role: 'manager',
    canManage: true,
    avatar: '👩‍🏫',
    color: '#D97706',
    hourlyRate: 9.55,
    passwordHash: null,
    createdAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'moniteur-1',
    name: 'Noah',
    role: 'monitor',
    canManage: true,
    avatar: '👨‍🎓',
    color: '#7C3AED',
    bgLight: '#EFF6FF',
    border: '#93C5FD',
    hourlyRate: 9.55,
    passwordHash: null,
    createdAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'moniteur-2',
    name: 'Lucas',
    role: 'monitor',
    canManage: false,
    avatar: '👨‍🎓',
    color: '#475569',
    bgLight: '#ECFDF5',
    border: '#6EE7B7',
    hourlyRate: 9.55,
    passwordHash: null,
    createdAt: '2026-09-01T00:00:00.000Z'
  }
];

function mapUserFromSupabase(row) {
  if (!row) return null;
  const canManage = row.role === 'manager' || row.can_manage === true || row.name === 'Noah' || row.id === 'moniteur-1';
  return {
    id: row.id,
    name: row.name,
    role: row.role || 'monitor',
    canManage,
    avatar: row.avatar || (row.role === 'manager' ? '👩‍🏫' : '👨‍🎓'),
    color: row.color || '#2563EB',
    hourlyRate: row.hourly_rate !== undefined ? Number(row.hourly_rate) : 9.55,
    hasPassword: Boolean(row.password_hash),
    passwordHash: row.password_hash,
    createdAt: row.created_at
  };
}

function sanitizeUser(u) {
  if (!u) return null;
  const canManage = u.role === 'manager' || u.canManage === true || u.name === 'Noah' || u.id === 'moniteur-1';
  return {
    id: u.id,
    name: u.name,
    role: u.role || 'monitor',
    canManage,
    avatar: u.avatar || (u.role === 'manager' ? '👩‍🏫' : '👨‍🎓'),
    color: u.color || '#2563EB',
    hourlyRate: u.hourlyRate !== undefined ? Number(u.hourlyRate) : 9.55,
    hasPassword: Boolean(u.passwordHash || u.hasPassword),
    createdAt: u.createdAt
  };
}

export const authService = {
  // Session utilisateur
  getCurrentUser() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_SESSION);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user) {
    if (!user) {
      localStorage.removeItem(LOCAL_STORAGE_KEY_SESSION);
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEY_SESSION, JSON.stringify(sanitizeUser(user)));
    }
  },

  logout() {
    localStorage.removeItem(LOCAL_STORAGE_KEY_SESSION);
  },

  // 1. Récupérer la liste des utilisateurs depuis Supabase
  async getUsers() {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map(mapUserFromSupabase).map(sanitizeUser);
        } else if (!error && (!data || data.length === 0)) {
          // Auto-seed Supabase si la table est vide
          for (const u of DEFAULT_BASE_USERS) {
            await supabase.from('users').insert({
              id: u.id,
              name: u.name,
              normalized_name: normalizeName(u.name),
              role: u.role,
              avatar: u.avatar,
              color: u.color,
              hourly_rate: u.hourlyRate
            });
          }
          return DEFAULT_BASE_USERS.map(sanitizeUser);
        }
      } catch (e) {
        console.error('Erreur Supabase getUsers:', e);
      }
    }

    return DEFAULT_BASE_USERS.map(sanitizeUser);
  },

  // 2. Vérifier un utilisateur (1ère connexion vs mot de passe existant)
  async checkUser(name) {
    if (!name) return { success: false, error: 'Veuillez sélectionner un profil.' };

    const norm = normalizeName(name);
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('normalized_name', norm)
          .maybeSingle();

        if (!error && data) {
          const user = mapUserFromSupabase(data);
          return {
            success: true,
            user: sanitizeUser(user),
            isFirstLogin: !data.password_hash
          };
        }
      } catch (err) {
        console.error('Erreur Supabase checkUser:', err);
      }
    }

    const fallback = DEFAULT_BASE_USERS.find(u => normalizeName(u.name) === norm);
    if (fallback) {
      return { success: true, user: sanitizeUser(fallback), isFirstLogin: true };
    }

    return { success: false, error: `Profil « ${name} » non trouvé.` };
  },

  // 3. Première connexion : création du mot de passe
  async setupPassword(name, password) {
    if (!name || !password) {
      return { success: false, error: 'Prénom et mot de passe requis.' };
    }
    if (password.length < 4) {
      return { success: false, error: 'Le mot de passe doit comporter au moins 4 caractères.' };
    }

    const norm = normalizeName(name);
    const hashedPassword = await hashPassword(password);
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .update({ password_hash: hashedPassword, updated_at: new Date().toISOString() })
          .eq('normalized_name', norm)
          .select()
          .maybeSingle();

        if (!error && data) {
          const user = mapUserFromSupabase(data);
          const sanitized = sanitizeUser(user);
          this.setCurrentUser(sanitized);
          return { success: true, user: sanitized, message: 'Mot de passe créé avec succès !' };
        } else if (error) {
          console.error('Erreur update password Supabase:', error);
        }
      } catch (err) {
        console.error('Erreur Supabase setupPassword:', err);
      }
    }

    return { success: false, error: 'Impossible d\'enregistrer le mot de passe sur Supabase.' };
  },

  // 4. Connexion standard avec mot de passe
  async login(name, password) {
    if (!name || !password) {
      return { success: false, error: 'Prénom et mot de passe requis.' };
    }

    const norm = normalizeName(name);
    const hashedPassword = await hashPassword(password);
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('normalized_name', norm)
          .maybeSingle();

        if (!error && data) {
          if (!data.password_hash) {
            return {
              success: false,
              isFirstLogin: true,
              error: 'Première connexion détectée : vous devez créer un mot de passe.'
            };
          }
          if (data.password_hash !== hashedPassword) {
            return { success: false, error: 'Mot de passe incorrect.' };
          }

          const sanitized = sanitizeUser(mapUserFromSupabase(data));
          this.setCurrentUser(sanitized);
          return { success: true, user: sanitized };
        }
      } catch (err) {
        console.error('Erreur Supabase login:', err);
      }
    }

    return { success: false, error: 'Connexion échouée sur Supabase.' };
  },

  // 5. Créer un nouveau membre (Manageuses & Noah)
  async createUser(userData) {
    const norm = normalizeName(userData.name);
    const isManagerRole = userData.role === 'manager';
    const newId = isManagerRole ? `user-${Date.now()}` : `moniteur-${Date.now()}`;
    const supabase = getSupabase();

    if (supabase) {
      try {
        const userRow = {
          id: newId,
          name: userData.name.trim(),
          normalized_name: norm,
          role: isManagerRole ? 'manager' : 'monitor',
          avatar: userData.avatar || (isManagerRole ? '👩‍🏫' : '👨‍🎓'),
          color: userData.color || '#2563EB',
          hourly_rate: Number(userData.hourlyRate) || 9.55,
          password_hash: null,
          created_at: new Date().toISOString()
        };

        const { data, error } = await supabase.from('users').insert(userRow).select().maybeSingle();

        if (!error && data) {
          // Si c'est un moniteur, on l'ajoute aussi à la table monitors
          if (!isManagerRole) {
            await supabase.from('monitors').insert({
              id: userRow.id,
              name: userRow.name,
              color: userRow.color,
              bg_light: '#EFF6FF',
              border: '#93C5FD',
              hourly_rate: userRow.hourly_rate,
              avatar: userRow.avatar
            });
          }

          return {
            success: true,
            user: sanitizeUser(mapUserFromSupabase(data)),
            message: `Le profil « ${userData.name.trim()} » a été ajouté avec succès !`
          };
        } else if (error) {
          return { success: false, error: error.message };
        }
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    return { success: false, error: 'Supabase non connecté.' };
  },

  // 6. Modifier un utilisateur
  async updateUser(id, userData) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const updateData = {};
        if (userData.name) {
          updateData.name = userData.name.trim();
          updateData.normalized_name = normalizeName(userData.name);
        }
        if (userData.role) updateData.role = userData.role;
        if (userData.hourlyRate !== undefined) updateData.hourly_rate = Number(userData.hourlyRate);
        if (userData.color) updateData.color = userData.color;
        if (userData.avatar) updateData.avatar = userData.avatar;
        if (userData.resetPassword) updateData.password_hash = null;
        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase.from('users').update(updateData).eq('id', id).select().maybeSingle();

        if (!error && data) {
          // Mettre à jour aussi dans monitors si présent
          await supabase.from('monitors').update({
            ...(userData.name && { name: userData.name.trim() }),
            ...(userData.color && { color: userData.color }),
            ...(userData.avatar && { avatar: userData.avatar }),
            ...(userData.hourlyRate !== undefined && { hourly_rate: Number(userData.hourlyRate) })
          }).eq('id', id);

          return { success: true, user: sanitizeUser(mapUserFromSupabase(data)) };
        }
      } catch (err) {
        console.error('Erreur Supabase updateUser:', err);
      }
    }

    return { success: false, error: 'Erreur mise à jour utilisateur.' };
  },

  // 7. Supprimer un utilisateur (Manageuses & Noah)
  async deleteUser(id) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await Promise.all([
          supabase.from('users').delete().eq('id', id),
          supabase.from('monitors').delete().eq('id', id),
          supabase.from('shifts').delete().eq('monitor_id', id)
        ]);
        return { success: true };
      } catch (err) {
        console.error('Erreur Supabase deleteUser:', err);
        return { success: false, error: err.message };
      }
    }
    return { success: true };
  },

  // 8. Réinitialiser le mot de passe
  async resetPassword(id) {
    return await this.updateUser(id, { resetPassword: true });
  }
};
