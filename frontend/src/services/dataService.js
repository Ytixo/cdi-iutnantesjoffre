import { getSupabase, isSupabaseConfigured } from './supabaseClient';
import { normalizeName } from '../utils/authUtils';

const LOCAL_STORAGE_KEY_DATA = 'cdi_local_data_v2';
const LOCAL_STORAGE_KEY_USERS = 'cdi_auth_users_v3';

// Seuls les moniteurs étudiants qui effectuent des permanences sont dans monitors
const DEFAULT_FALLBACK_DATA = {
  monitors: [
    {
      id: 'moniteur-1',
      name: 'Noah',
      role: 'monitor',
      color: '#7C3AED',
      bgLight: '#EFF6FF',
      border: '#93C5FD',
      hourlyRate: 9.55,
      avatar: '👨‍🎓'
    },
    {
      id: 'moniteur-2',
      name: 'Lucas',
      role: 'monitor',
      color: '#475569',
      bgLight: '#ECFDF5',
      border: '#6EE7B7',
      hourlyRate: 9.55,
      avatar: '👨‍🎓'
    }
  ],
  settings: {
    cdiName: 'CDI — IUT de Nantes',
    defaultStartTime: '12:30',
    defaultEndTime: '13:30',
    allowOverlaps: false,
    currency: '€'
  },
  shifts: [
    {
      id: 'shift-1',
      monitorId: 'moniteur-1',
      date: '2026-09-01',
      startTime: '12:30',
      endTime: '13:30',
      durationHours: 1,
      note: 'Permanence accueil CDI',
      visitorsCount: 18
    },
    {
      id: 'shift-2',
      monitorId: 'moniteur-1',
      date: '2026-09-02',
      startTime: '12:30',
      endTime: '13:30',
      durationHours: 1,
      note: 'Permanence accueil CDI',
      visitorsCount: 24
    },
    {
      id: 'shift-3',
      monitorId: 'moniteur-2',
      date: '2026-09-03',
      startTime: '12:30',
      endTime: '13:30',
      durationHours: 1,
      note: 'Permanence accueil CDI',
      visitorsCount: 15
    }
  ]
};

function getLocalData() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_DATA);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY_DATA, JSON.stringify(DEFAULT_FALLBACK_DATA));
      return DEFAULT_FALLBACK_DATA;
    }
    const data = JSON.parse(raw);
    let changed = false;

    // Retirer les manageuses (Virginie & Kristell) de la liste des moniteurs pour ne laisser que les vrais moniteurs de permanence
    if (data.monitors) {
      const filtered = data.monitors.filter(m => m.role !== 'manager' && !['user-virginie', 'user-kristell'].includes(m.id));
      if (filtered.length !== data.monitors.length) {
        data.monitors = filtered;
        changed = true;
      }
    }

    // S'assurer que Noah et Lucas sont bien présents
    DEFAULT_FALLBACK_DATA.monitors.forEach(baseMon => {
      const norm = normalizeName(baseMon.name);
      const exists = (data.monitors || []).some(m => normalizeName(m.name) === norm);
      if (!exists) {
        data.monitors = data.monitors || [];
        data.monitors.push(baseMon);
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem(LOCAL_STORAGE_KEY_DATA, JSON.stringify(data));
    }

    return data;
  } catch (e) {
    return DEFAULT_FALLBACK_DATA;
  }
}

function saveLocalData(data) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_DATA, JSON.stringify(data));
  } catch (e) {
    console.error('Erreur sauvegarde données locales:', e);
  }
}

function mapShiftFromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    monitorId: row.monitor_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    durationHours: Number(row.duration_hours),
    note: row.note,
    visitorsCount: Number(row.visitors_count) || 0,
    createdAt: row.created_at
  };
}

function mapShiftToSupabase(shift) {
  return {
    ...(shift.id && !shift.id.startsWith('shift-') ? { id: shift.id } : {}),
    monitor_id: shift.monitorId,
    date: shift.date,
    start_time: shift.startTime,
    end_time: shift.endTime,
    duration_hours: Number(shift.durationHours),
    note: shift.note || 'Permanence accueil CDI',
    visitors_count: Number(shift.visitorsCount) || 0,
    updated_at: new Date().toISOString()
  };
}

function mapMonitorFromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    role: row.role || 'monitor',
    color: row.color,
    bgLight: row.bg_light || '#EFF6FF',
    border: row.border || '#93C5FD',
    hourlyRate: Number(row.hourly_rate) || 9.55,
    avatar: row.avatar || '👨‍🎓'
  };
}

export const dataService = {
  // 1. Récupérer Moniteurs (permanences) & Paramètres
  async getMonitorsAndSettings() {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const [monitorsRes, settingsRes] = await Promise.all([
          supabase.from('monitors').select('*').order('id', { ascending: true }),
          supabase.from('settings').select('*').eq('key', 'general').maybeSingle()
        ]);

        if (!monitorsRes.error && monitorsRes.data && monitorsRes.data.length > 0) {
          // Filtrer pour ne garder que les moniteurs de permanence
          const monitors = monitorsRes.data
            .filter(m => !['user-virginie', 'user-kristell'].includes(m.id))
            .map(mapMonitorFromSupabase);
          const settings = settingsRes.data?.value || DEFAULT_FALLBACK_DATA.settings;
          return { monitors, settings, source: 'supabase' };
        } else if (!monitorsRes.error && (!monitorsRes.data || monitorsRes.data.length === 0)) {
          for (const m of DEFAULT_FALLBACK_DATA.monitors) {
            await supabase.from('monitors').insert({
              id: m.id,
              name: m.name,
              color: m.color,
              bg_light: m.bgLight,
              border: m.border,
              hourly_rate: m.hourlyRate,
              avatar: m.avatar
            });
          }
          return { monitors: DEFAULT_FALLBACK_DATA.monitors, settings: DEFAULT_FALLBACK_DATA.settings, source: 'supabase' };
        }
      } catch (err) {
        console.warn('Erreur Supabase getMonitorsAndSettings, fallback local:', err);
      }
    }

    // Essayer l'API Express si disponible
    try {
      const res = await fetch('/api/monitors');
      if (res.ok) {
        const data = await res.json();
        const monList = (data.monitors || []).filter(m => !['user-virginie', 'user-kristell'].includes(m.id));
        return { monitors: monList, settings: data.settings, source: 'api' };
      }
    } catch (e) {}

    // Fallback localStorage
    const local = getLocalData();
    return { monitors: local.monitors, settings: local.settings, source: 'local' };
  },

  // 2. Récupérer les créneaux
  async getShifts(monthStr, monitorFilter = 'ALL') {
    const supabase = getSupabase();
    if (supabase) {
      try {
        let query = supabase.from('shifts').select('*').order('date', { ascending: true }).order('start_time', { ascending: true });

        if (monthStr) {
          query = query.gte('date', `${monthStr}-01`).lte('date', `${monthStr}-31`);
        }
        if (monitorFilter && monitorFilter !== 'ALL') {
          query = query.eq('monitor_id', monitorFilter);
        }

        const { data, error } = await query;
        if (!error && data) {
          return { shifts: data.map(mapShiftFromSupabase), source: 'supabase' };
        }
      } catch (err) {
        console.warn('Erreur Supabase getShifts, fallback local:', err);
      }
    }

    try {
      const url = new URL('/api/shifts', window.location.origin);
      if (monthStr) url.searchParams.set('month', monthStr);
      if (monitorFilter && monitorFilter !== 'ALL') url.searchParams.set('monitorId', monitorFilter);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        return { shifts: data.shifts, source: 'api' };
      }
    } catch (e) {}

    const local = getLocalData();
    let list = local.shifts || [];
    if (monthStr) {
      list = list.filter(s => s.date.startsWith(monthStr));
    }
    if (monitorFilter && monitorFilter !== 'ALL') {
      list = list.filter(s => s.monitorId === monitorFilter);
    }
    return { shifts: list, source: 'local' };
  },

  // 3. Ajouter un ou plusieurs créneaux
  async addShifts(newShifts) {
    const shiftsArray = Array.isArray(newShifts) ? newShifts : [newShifts];
    const supabase = getSupabase();
    if (supabase) {
      try {
        const rows = shiftsArray.map(mapShiftToSupabase);
        const { data, error } = await supabase.from('shifts').insert(rows).select();
        if (!error && data) {
          return { success: true, shifts: data.map(mapShiftFromSupabase) };
        }
      } catch (err) {
        console.error('Erreur Supabase addShifts:', err);
      }
    }

    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftsArray)
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    const local = getLocalData();
    const createdList = shiftsArray.map(s => ({
      ...s,
      id: s.id || `shift-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      visitorsCount: Number(s.visitorsCount) || 0
    }));

    local.shifts = [...(local.shifts || []), ...createdList];
    saveLocalData(local);
    return { success: true, shifts: createdList };
  },

  // 4. Modifier un créneau
  async updateShift(id, updatedFields) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const payload = {};
        if (updatedFields.monitorId) payload.monitor_id = updatedFields.monitorId;
        if (updatedFields.date) payload.date = updatedFields.date;
        if (updatedFields.startTime) payload.start_time = updatedFields.startTime;
        if (updatedFields.endTime) payload.end_time = updatedFields.endTime;
        if (updatedFields.durationHours !== undefined) payload.duration_hours = Number(updatedFields.durationHours);
        if (updatedFields.note !== undefined) payload.note = updatedFields.note;
        if (updatedFields.visitorsCount !== undefined) payload.visitors_count = Number(updatedFields.visitorsCount);
        payload.updated_at = new Date().toISOString();

        const { data, error } = await supabase.from('shifts').update(payload).eq('id', id).select().maybeSingle();
        if (!error && data) {
          return { success: true, shift: mapShiftFromSupabase(data) };
        }
      } catch (err) {
        console.error(err);
      }
    }

    try {
      const res = await fetch(`/api/shifts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    const local = getLocalData();
    const idx = (local.shifts || []).findIndex(s => s.id === id);
    if (idx !== -1) {
      local.shifts[idx] = { ...local.shifts[idx], ...updatedFields };
      saveLocalData(local);
      return { success: true, shift: local.shifts[idx] };
    }
    return { success: false, error: 'Créneau non trouvé' };
  },

  // 5. Supprimer un créneau
  async deleteShift(id) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error } = await supabase.from('shifts').delete().eq('id', id);
        if (!error) return { success: true };
      } catch (err) {
        console.error(err);
      }
    }

    try {
      const res = await fetch(`/api/shifts/${id}`, { method: 'DELETE' });
      if (res.ok) return await res.json();
    } catch (e) {}

    const local = getLocalData();
    local.shifts = (local.shifts || []).filter(s => s.id !== id);
    saveLocalData(local);
    return { success: true };
  },

  // 6. Mettre à jour un membre
  async updateMonitor(id, monitorData) {
    const norm = monitorData.name ? normalizeName(monitorData.name) : undefined;
    const supabase = getSupabase();
    if (supabase) {
      try {
        const updateData = {};
        if (monitorData.name) updateData.name = monitorData.name.trim();
        if (monitorData.color) updateData.color = monitorData.color;
        if (monitorData.hourlyRate !== undefined) updateData.hourly_rate = Number(monitorData.hourlyRate);
        if (monitorData.avatar) updateData.avatar = monitorData.avatar;
        updateData.updated_at = new Date().toISOString();

        await Promise.all([
          supabase.from('monitors').update(updateData).eq('id', id),
          supabase.from('users').update({
            ...(monitorData.name && { name: monitorData.name.trim(), normalized_name: norm }),
            ...(monitorData.color && { color: monitorData.color }),
            ...(monitorData.avatar && { avatar: monitorData.avatar }),
            ...(monitorData.hourlyRate !== undefined && { hourly_rate: Number(monitorData.hourlyRate) })
          }).eq('id', id)
        ]);

        return { success: true, monitor: monitorData };
      } catch (err) {
        console.error('Erreur Supabase updateMonitor:', err);
      }
    }

    try {
      const res = await fetch(`/api/monitors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(monitorData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    const local = getLocalData();
    const idx = (local.monitors || []).findIndex(m => m.id === id);
    if (idx !== -1) {
      local.monitors[idx] = { ...local.monitors[idx], ...monitorData };
      saveLocalData(local);
    }

    // Sync auth users
    try {
      const rawUsers = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);
      if (rawUsers) {
        const usersList = JSON.parse(rawUsers);
        const uIdx = usersList.findIndex(u => u.id === id);
        if (uIdx !== -1) {
          usersList[uIdx] = { ...usersList[uIdx], ...monitorData };
          localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(usersList));
        }
      }
    } catch (e) {}

    return { success: true, monitor: monitorData };
  },

  // 7. Mettre à jour les paramètres généraux
  async updateSettings(settingsData) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('settings')
          .upsert({ key: 'general', value: settingsData, updated_at: new Date().toISOString() })
          .select()
          .maybeSingle();

        if (!error) return { success: true, settings: settingsData };
      } catch (err) {
        console.error(err);
      }
    }

    try {
      const res = await fetch('/api/monitors/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    const local = getLocalData();
    local.settings = { ...local.settings, ...settingsData };
    saveLocalData(local);
    return { success: true, settings: local.settings };
  },

  // 8. Ajouter un moniteur ou une manageuse (Manageuses & Noah)
  async addMonitor(memberData) {
    const isManagerRole = memberData.role === 'manager';
    const newId = isManagerRole ? `user-${Date.now()}` : `moniteur-${Date.now()}`;
    const norm = normalizeName(memberData.name);

    const supabase = getSupabase();
    if (supabase) {
      try {
        const userRow = {
          id: newId,
          name: memberData.name.trim(),
          normalized_name: norm,
          role: isManagerRole ? 'manager' : 'monitor',
          avatar: memberData.avatar || (isManagerRole ? '👩‍🏫' : '👨‍🎓'),
          color: memberData.color || '#2563EB',
          hourly_rate: Number(memberData.hourlyRate) || 9.55,
          password_hash: null,
          created_at: new Date().toISOString()
        };

        await supabase.from('users').insert(userRow);

        // N'ajouter dans la table monitors que si c'est un moniteur
        if (!isManagerRole) {
          const monitorRow = {
            id: newId,
            name: memberData.name.trim(),
            color: memberData.color || '#2563EB',
            bg_light: '#EFF6FF',
            border: '#93C5FD',
            hourly_rate: Number(memberData.hourlyRate) || 9.55,
            avatar: memberData.avatar || '👨‍🎓'
          };
          await supabase.from('monitors').insert(monitorRow);
        }

        return {
          success: true,
          member: userRow,
          message: `Le profil « ${memberData.name.trim()} » a été ajouté avec succès !`
        };
      } catch (err) {
        console.error('Erreur Supabase addMonitor:', err);
      }
    }

    // API Express
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData)
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, member: data.user, message: data.message };
      }
      const err = await res.json();
      return { success: false, error: err.error || 'Erreur lors de l\'ajout' };
    } catch (e) {}

    // Fallback LocalStorage
    const newMember = {
      id: newId,
      name: memberData.name.trim(),
      role: isManagerRole ? 'manager' : 'monitor',
      canManage: isManagerRole,
      color: memberData.color || '#2563EB',
      bgLight: isManagerRole ? '#FDF2F8' : '#EFF6FF',
      border: isManagerRole ? '#F472B6' : '#93C5FD',
      hourlyRate: Number(memberData.hourlyRate) || 9.55,
      avatar: memberData.avatar || (isManagerRole ? '👩‍🏫' : '👨‍🎓'),
      passwordHash: null,
      createdAt: new Date().toISOString()
    };

    // Si c'est un moniteur, on l'ajoute à cdi_local_data_v2 (planning)
    if (!isManagerRole) {
      const local = getLocalData();
      local.monitors = [...(local.monitors || []), newMember];
      saveLocalData(local);
    }

    // Ajouter à cdi_auth_users_v3 (comptes & login)
    try {
      const rawUsers = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);
      const usersList = rawUsers ? JSON.parse(rawUsers) : [];
      if (!usersList.some(u => normalizeName(u.name) === norm)) {
        usersList.push(newMember);
        localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(usersList));
      }
    } catch (e) {}

    return { success: true, member: newMember, message: `Le profil pour « ${newMember.name} » a été créé avec succès.` };
  },

  // 9. Supprimer un membre
  async deleteMonitor(id) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await Promise.all([
          supabase.from('monitors').delete().eq('id', id),
          supabase.from('users').delete().eq('id', id)
        ]);
        return { success: true };
      } catch (err) {
        console.error('Erreur Supabase deleteMonitor:', err);
      }
    }

    try {
      const res = await fetch(`/api/auth/users/${id}`, { method: 'DELETE' });
      if (res.ok) return await res.json();
    } catch (e) {}

    const local = getLocalData();
    local.monitors = (local.monitors || []).filter(m => m.id !== id);
    saveLocalData(local);

    // Sync auth users
    try {
      const rawUsers = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);
      if (rawUsers) {
        let usersList = JSON.parse(rawUsers);
        usersList = usersList.filter(u => u.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(usersList));
      }
    } catch (e) {}

    return { success: true };
  },

  // 10. Réinitialiser le mot de passe d'un utilisateur
  async resetPassword(id) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('users').update({ password_hash: null, updated_at: new Date().toISOString() }).eq('id', id);
        return { success: true };
      } catch (err) {
        console.error('Erreur Supabase resetPassword:', err);
      }
    }

    try {
      const res = await fetch(`/api/auth/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetPassword: true })
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    try {
      const rawUsers = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);
      if (rawUsers) {
        const usersList = JSON.parse(rawUsers);
        const idx = usersList.findIndex(u => u.id === id);
        if (idx !== -1) {
          usersList[idx].passwordHash = null;
          localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(usersList));
        }
      }
    } catch (e) {}

    return { success: true };
  }
};
