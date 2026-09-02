import { normalizeName, hashPassword } from '../utils/authUtils';
import { getSupabase } from './supabaseClient';

const LOCAL_STORAGE_KEY_USERS = 'cdi_auth_users_v3';
const LOCAL_STORAGE_KEY_SESSION = 'cdi_auth_session_v3';

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
    role: 'monitor', // Rôle moniteur
    canManage: true, // Avec les permissions d'administration
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

function getLocalUsers() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(DEFAULT_BASE_USERS));
      return DEFAULT_BASE_USERS;
    }
    let users = JSON.parse(raw);
    let changed = false;

    // Mise à jour de Kristell et Noah si nécessaire
    users = users.map(u => {
      if (normalizeName(u.name) === 'christelle') {
        changed = true;
        return { ...u, name: 'Kristell', normalizedName: 'kristell' };
      }
      if (normalizeName(u.name) === 'noah') {
        if (u.role !== 'monitor' || !u.canManage) {
          changed = true;
          return { ...u, role: 'monitor', canManage: true };
        }
      }
      return u;
    });

    // S'assurer que les 4 comptes de base sont présents
    DEFAULT_BASE_USERS.forEach(baseUser => {
      const norm = normalizeName(baseUser.name);
      const exists = users.some(u => normalizeName(u.name) === norm);
      if (!exists) {
        users.push(baseUser);
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(users));
    }

    return users;
  } catch (e) {
    return DEFAULT_BASE_USERS;
  }
}

function saveLocalUsers(users) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(users));
  } catch (e) {
    console.error('Erreur sauvegarde utilisateurs locaux:', e);
  }
}

function mapUserFromSupabase(row) {
  if (!row) return null;
  const canManage = row.role === 'manager' || row.can_manage === true || row.name === 'Noah' || row.id === 'moniteur-1';
  return {
    id: row.id,
    name: row.name,
    role: row.role || 'monitor',
    canManage,
    avatar: row.avatar || '👨‍🎓',
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
    avatar: u.avatar || '👨‍🎓',
    color: u.color || '#2563EB',
    hourlyRate: u.hourlyRate !== undefined ? Number(u.hourlyRate) : 9.55,
    hasPassword: Boolean(u.passwordHash || u.hasPassword),
    createdAt: u.createdAt
  };
}

export const authService = {
  // Session actuelle
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

  // 1. Récupérer la liste des utilisateurs (pour les accès rapides)
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
          // Auto-seed Supabase si vide
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
        console.warn('Erreur Supabase getUsers, fallback:', e);
      }
    }

    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        return data.users || [];
      }
    } catch (e) {}

    const users = getLocalUsers();
    return users.map(sanitizeUser);
  },

  // 2. Vérifier un utilisateur
  async checkUser(name) {
    if (!name) return { success: false, error: 'Veuillez sélectionner ou saisir un prénom.' };

    const norm = normalizeName(name);

    // Supabase
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
        console.warn('Erreur Supabase checkUser:', err);
      }
    }

    // API Express
    try {
      const res = await fetch('/api/auth/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) return await res.json();
      if (res.status === 404 || res.status === 400) {
        const errData = await res.json();
        return { success: false, error: errData.error || 'Prénom non reconnu.' };
      }
    } catch (e) {}

    // Fallback LocalStorage
    const users = getLocalUsers();
    const user = users.find(u => normalizeName(u.name) === norm);

    if (!user) {
      return {
        success: false,
        error: `Prénom « ${name.trim()} » non reconnu dans l'équipe.`
      };
    }

    const isFirstLogin = !user.passwordHash;
    return {
      success: true,
      user: sanitizeUser(user),
      isFirstLogin
    };
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

    // Supabase
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
        }
      } catch (err) {
        console.error('Erreur Supabase setupPassword:', err);
      }
    }

    // API Express
    try {
      const res = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          this.setCurrentUser(data.user);
        }
        return data;
      }
      const err = await res.json();
      return { success: false, error: err.error || 'Erreur lors de la création du mot de passe.' };
    } catch (e) {}

    // Fallback LocalStorage
    const users = getLocalUsers();
    const index = users.findIndex(u => normalizeName(u.name) === norm);
    if (index === -1) return { success: false, error: 'Utilisateur non trouvé.' };

    users[index] = {
      ...users[index],
      passwordHash: hashedPassword,
      updatedAt: new Date().toISOString()
    };
    saveLocalUsers(users);

    const sanitized = sanitizeUser(users[index]);
    this.setCurrentUser(sanitized);

    return {
      success: true,
      user: sanitized,
      message: 'Mot de passe créé avec succès !'
    };
  },

  // 4. Connexion standard
  async login(name, password) {
    if (!name || !password) {
      return { success: false, error: 'Prénom et mot de passe requis.' };
    }

    const norm = normalizeName(name);
    const hashedPassword = await hashPassword(password);

    // Supabase
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

    // API Express
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          this.setCurrentUser(data.user);
        }
        return data;
      }
      const err = await res.json();
      return { success: false, isFirstLogin: err.isFirstLogin, error: err.error || 'Connexion échouée.' };
    } catch (e) {}

    // Fallback LocalStorage
    const users = getLocalUsers();
    const user = users.find(u => normalizeName(u.name) === norm);
    if (!user) return { success: false, error: 'Utilisateur non trouvé.' };

    if (!user.passwordHash) {
      return {
        success: false,
        isFirstLogin: true,
        error: 'Première connexion détectée : vous devez créer un mot de passe.'
      };
    }

    if (user.passwordHash !== hashedPassword) {
      return { success: false, error: 'Mot de passe incorrect.' };
    }

    const sanitized = sanitizeUser(user);
    this.setCurrentUser(sanitized);
    return { success: true, user: sanitized };
  },

  // 5. Créer un nouveau moniteur/utilisateur (Manageuses & Noah)
  async createUser(userData) {
    const norm = normalizeName(userData.name);
    const newId = `moniteur-${Date.now()}`;

    // Supabase
    const supabase = getSupabase();
    if (supabase) {
      try {
        const userRow = {
          id: newId,
          name: userData.name.trim(),
          normalized_name: norm,
          role: userData.role === 'manager' ? 'manager' : 'monitor',
          avatar: userData.avatar || '👨‍🎓',
          color: userData.color || '#2563EB',
          hourly_rate: Number(userData.hourlyRate) || 9.55,
          password_hash: null,
          created_at: new Date().toISOString()
        };

        const { data, error } = await supabase.from('users').insert(userRow).select().maybeSingle();
        if (!error && data) {
          // Ajouter aussi aux monitors pour le planning
          await supabase.from('monitors').insert({
            id: userRow.id,
            name: userRow.name,
            color: userRow.color,
            hourly_rate: userRow.hourly_rate,
            avatar: userRow.avatar
          });

          return {
            success: true,
            user: sanitizeUser(mapUserFromSupabase(data)),
            message: `Le profil « ${userData.name.trim()} » a été ajouté avec succès !`
          };
        } else if (error) {
          console.error('Erreur insertion user Supabase:', error);
        }
      } catch (err) {
        console.error('Erreur Supabase createUser:', err);
      }
    }

    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    // LocalStorage fallback
    const users = getLocalUsers();
    if (users.some(u => normalizeName(u.name) === norm)) {
      return { success: false, error: `Un profil avec le prénom « ${userData.name.trim()} » existe déjà.` };
    }

    const newUser = {
      id: newId,
      name: userData.name.trim(),
      role: userData.role === 'manager' ? 'manager' : 'monitor',
      avatar: userData.avatar || '👨‍🎓',
      color: userData.color || '#2563EB',
      hourlyRate: Number(userData.hourlyRate) || 9.55,
      passwordHash: null,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveLocalUsers(users);

    // Synchroniser avec les données locales de moniteurs
    try {
      const rawLocal = localStorage.getItem('cdi_local_data_v2');
      if (rawLocal) {
        const localData = JSON.parse(rawLocal);
        localData.monitors = localData.monitors || [];
        if (!localData.monitors.some(m => normalizeName(m.name) === norm)) {
          localData.monitors.push({
            id: newUser.id,
            name: newUser.name,
            role: newUser.role,
            color: newUser.color,
            bgLight: '#EFF6FF',
            border: '#93C5FD',
            hourlyRate: newUser.hourlyRate,
            avatar: newUser.avatar
          });
          localStorage.setItem('cdi_local_data_v2', JSON.stringify(localData));
        }
      }
    } catch (e) {}

    return {
      success: true,
      user: sanitizeUser(newUser),
      message: `Le profil pour « ${newUser.name} » a été créé avec succès.`
    };
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
          // Mettre à jour aussi dans monitors
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

    try {
      const res = await fetch(`/api/auth/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    const users = getLocalUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return { success: false, error: 'Utilisateur non trouvé.' };

    users[idx] = {
      ...users[idx],
      ...(userData.name && { name: userData.name.trim() }),
      ...(userData.role && { role: userData.role }),
      ...(userData.hourlyRate !== undefined && { hourlyRate: Number(userData.hourlyRate) }),
      ...(userData.color && { color: userData.color }),
      ...(userData.avatar && { avatar: userData.avatar }),
      ...(userData.resetPassword && { passwordHash: null }),
      updatedAt: new Date().toISOString()
    };

    saveLocalUsers(users);

    // Sync avec cdi_local_data_v2
    try {
      const rawLocal = localStorage.getItem('cdi_local_data_v2');
      if (rawLocal) {
        const localData = JSON.parse(rawLocal);
        const mIdx = (localData.monitors || []).findIndex(m => m.id === id);
        if (mIdx !== -1) {
          localData.monitors[mIdx] = {
            ...localData.monitors[mIdx],
            ...(userData.name && { name: userData.name.trim() }),
            ...(userData.color && { color: userData.color }),
            ...(userData.avatar && { avatar: userData.avatar }),
            ...(userData.hourlyRate !== undefined && { hourlyRate: Number(userData.hourlyRate) })
          };
          localStorage.setItem('cdi_local_data_v2', JSON.stringify(localData));
        }
      }
    } catch (e) {}

    return { success: true, user: sanitizeUser(users[idx]) };
  },

  // 7. Supprimer un utilisateur (Manageuses & Noah)
  async deleteUser(id) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await Promise.all([
          supabase.from('users').delete().eq('id', id),
          supabase.from('monitors').delete().eq('id', id)
        ]);
        return { success: true };
      } catch (err) {
        console.error('Erreur Supabase deleteUser:', err);
      }
    }

    try {
      const res = await fetch(`/api/auth/users/${id}`, { method: 'DELETE' });
      if (res.ok) return await res.json();
    } catch (e) {}

    let users = getLocalUsers();
    users = users.filter(u => u.id !== id);
    saveLocalUsers(users);

    // Sync avec cdi_local_data_v2
    try {
      const rawLocal = localStorage.getItem('cdi_local_data_v2');
      if (rawLocal) {
        const localData = JSON.parse(rawLocal);
        localData.monitors = (localData.monitors || []).filter(m => m.id !== id);
        localStorage.setItem('cdi_local_data_v2', JSON.stringify(localData));
      }
    } catch (e) {}

    return { success: true };
  },

  // 8. Réinitialiser le mot de passe
  async resetPassword(id) {
    return await this.updateUser(id, { resetPassword: true });
  }
};
