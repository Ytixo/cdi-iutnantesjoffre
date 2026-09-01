import { getSupabase, isSupabaseConfigured } from './supabaseClient';

const LOCAL_STORAGE_KEY_DATA = 'cdi_local_data_v2';

const DEFAULT_FALLBACK_DATA = {
  monitors: [
    {
      id: 'moniteur-1',
      name: 'Noah',
      color: '#7C3AED',
      bgLight: '#EFF6FF',
      border: '#93C5FD',
      hourlyRate: 9.55,
      avatar: '👨‍🎓'
    },
    {
      id: 'moniteur-2',
      name: 'Lucas',
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
    },
    {
      id: 'shift-4',
      monitorId: 'moniteur-2',
      date: '2026-09-04',
      startTime: '12:30',
      endTime: '13:30',
      durationHours: 1,
      note: 'Permanence accueil CDI',
      visitorsCount: 22
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
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_FALLBACK_DATA;
  }
}

function saveLocalData(data) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_DATA, JSON.stringify(data));
  } catch (e) {
    console.error('Erreur sauvegarde locale:', e);
  }
}

// Helpers de conversion Supabase <-> Frontend
function mapShiftFromSupabase(row) {
  return {
    id: row.id,
    monitorId: row.monitor_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    durationHours: Number(row.duration_hours),
    note: row.note || 'Permanence accueil CDI',
    visitorsCount: Number(row.visitors_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMonitorFromSupabase(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    bgLight: row.bg_light,
    border: row.border,
    hourlyRate: Number(row.hourly_rate),
    avatar: row.avatar
  };
}

export const dataService = {
  // 1. Récupérer Moniteurs & Paramètres
  async getMonitorsAndSettings() {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const [monitorsRes, settingsRes] = await Promise.all([
          supabase.from('monitors').select('*').order('id', { ascending: true }),
          supabase.from('settings').select('*').eq('key', 'general').maybeSingle()
        ]);

        if (!monitorsRes.error && monitorsRes.data && monitorsRes.data.length > 0) {
          const monitors = monitorsRes.data.map(mapMonitorFromSupabase);
          const settings = settingsRes.data?.value || DEFAULT_FALLBACK_DATA.settings;
          return { monitors, settings, source: 'supabase' };
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
        return { monitors: data.monitors, settings: data.settings, source: 'api' };
      }
    } catch (e) {}

    // Fallback localStorage
    const local = getLocalData();
    return { monitors: local.monitors, settings: local.settings, source: 'local' };
  },

  // 2. Récupérer les créneaux pour un mois
  async getShifts(monthStr, monitorFilter = 'ALL') {
    const supabase = getSupabase();
    if (supabase) {
      try {
        let query = supabase.from('shifts').select('*').order('date', { ascending: true }).order('start_time', { ascending: true });
        if (monthStr) {
          const [y, m] = monthStr.split('-');
          const lastDay = new Date(Number(y), Number(m), 0).getDate();
          query = query.gte('date', `${monthStr}-01`).lte('date', `${monthStr}-${String(lastDay).padStart(2, '0')}`);
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

    // Essayer l'API Express si disponible
    try {
      const q = new URLSearchParams();
      if (monthStr) q.append('month', monthStr);
      if (monitorFilter !== 'ALL') q.append('monitorId', monitorFilter);
      const res = await fetch(`/api/shifts?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return { shifts: data.shifts, source: 'api' };
      }
    } catch (e) {}

    // Fallback localStorage
    const local = getLocalData();
    let shifts = local.shifts || [];
    if (monthStr) shifts = shifts.filter(s => s.date.startsWith(monthStr));
    if (monitorFilter !== 'ALL') shifts = shifts.filter(s => s.monitorId === monitorFilter);
    return { shifts, source: 'local' };
  },

  // 3. Ajouter un ou plusieurs créneaux
  async addShifts(shiftsToAdd) {
    const items = Array.isArray(shiftsToAdd) ? shiftsToAdd : [shiftsToAdd];
    const supabase = getSupabase();

    if (supabase) {
      try {
        const rows = items.map(item => ({
          monitor_id: item.monitorId,
          date: item.date,
          start_time: item.startTime,
          end_time: item.endTime,
          duration_hours: item.durationHours || 1.0,
          note: item.note || 'Permanence accueil CDI',
          visitors_count: Number(item.visitorsCount || 0)
        }));

        const { data, error } = await supabase.from('shifts').insert(rows).select();
        if (!error) {
          return { success: true, created: data.map(mapShiftFromSupabase) };
        } else {
          console.error('Erreur insertion Supabase:', error);
          throw new Error(error.message);
        }
      } catch (err) {
        console.error(err);
      }
    }

    // Essayer l'API Express
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftsToAdd)
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    // Fallback localStorage
    const local = getLocalData();
    const created = items.map(item => ({
      id: 'shift-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      monitorId: item.monitorId,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      durationHours: item.durationHours || 1.0,
      note: item.note || 'Permanence accueil CDI',
      visitorsCount: Number(item.visitorsCount || 0),
      createdAt: new Date().toISOString()
    }));

    local.shifts = [...(local.shifts || []), ...created];
    saveLocalData(local);
    return { success: true, created };
  },

  // 4. Modifier un créneau
  async updateShift(id, payload) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const updateData = {};
        if (payload.monitorId) updateData.monitor_id = payload.monitorId;
        if (payload.date) updateData.date = payload.date;
        if (payload.startTime) updateData.start_time = payload.startTime;
        if (payload.endTime) updateData.end_time = payload.endTime;
        if (payload.durationHours !== undefined) updateData.duration_hours = payload.durationHours;
        if (payload.note !== undefined) updateData.note = payload.note;
        if (payload.visitorsCount !== undefined) updateData.visitors_count = Number(payload.visitorsCount);
        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase.from('shifts').update(updateData).eq('id', id).select().maybeSingle();
        if (!error && data) {
          return { success: true, shift: mapShiftFromSupabase(data) };
        }
      } catch (err) {
        console.error(err);
      }
    }

    // API Express
    try {
      const res = await fetch(`/api/shifts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    // LocalStorage
    const local = getLocalData();
    const idx = (local.shifts || []).findIndex(s => s.id === id);
    if (idx !== -1) {
      local.shifts[idx] = { ...local.shifts[idx], ...payload, updatedAt: new Date().toISOString() };
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

  // 6. Mettre à jour un moniteur (taux, couleur, nom)
  async updateMonitor(id, monitorData) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const updateData = {};
        if (monitorData.name) updateData.name = monitorData.name;
        if (monitorData.color) updateData.color = monitorData.color;
        if (monitorData.hourlyRate !== undefined) updateData.hourly_rate = Number(monitorData.hourlyRate);
        if (monitorData.avatar) updateData.avatar = monitorData.avatar;
        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase.from('monitors').update(updateData).eq('id', id).select().maybeSingle();
        if (!error && data) {
          return { success: true, monitor: mapMonitorFromSupabase(data) };
        }
      } catch (err) {
        console.error(err);
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
      return { success: true, monitor: local.monitors[idx] };
    }
    return { success: false, error: 'Moniteur non trouvé' };
  },

  // 7. Mettre à jour les paramètres généraux
  async updateSettings(settingsData) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
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
  }
};
