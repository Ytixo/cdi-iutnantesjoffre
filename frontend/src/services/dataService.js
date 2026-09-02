import { getSupabase } from './supabaseClient';
import { authService, DEFAULT_BASE_USERS } from './authService';

const DEFAULT_SETTINGS = {
  cdiName: 'CDI — IUT de Nantes',
  defaultStartTime: '12:30',
  defaultEndTime: '13:30',
  allowOverlaps: false,
  currency: '€'
};

const DEFAULT_MONITORS = [
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
];

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
    color: row.color || '#2563EB',
    bgLight: row.bg_light || '#EFF6FF',
    border: row.border || '#93C5FD',
    hourlyRate: Number(row.hourly_rate) || 9.55,
    avatar: row.avatar || '👨‍🎓'
  };
}

export const dataService = {
  // 1. Récupérer Moniteurs & Paramètres depuis Supabase
  async getMonitorsAndSettings() {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const [monitorsRes, settingsRes] = await Promise.all([
          supabase.from('monitors').select('*').order('id', { ascending: true }),
          supabase.from('settings').select('*').eq('key', 'general').maybeSingle()
        ]);

        if (!monitorsRes.error && monitorsRes.data && monitorsRes.data.length > 0) {
          const monitors = monitorsRes.data
            .filter(m => !['user-virginie', 'user-kristell'].includes(m.id))
            .map(mapMonitorFromSupabase);
          const settings = settingsRes.data?.value || DEFAULT_SETTINGS;
          return { monitors, settings, source: 'supabase' };
        } else if (!monitorsRes.error && (!monitorsRes.data || monitorsRes.data.length === 0)) {
          // Auto-seed table monitors dans Supabase
          for (const m of DEFAULT_MONITORS) {
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
          return { monitors: DEFAULT_MONITORS, settings: DEFAULT_SETTINGS, source: 'supabase' };
        }
      } catch (err) {
        console.error('Erreur Supabase getMonitorsAndSettings:', err);
      }
    }

    return { monitors: DEFAULT_MONITORS, settings: DEFAULT_SETTINGS, source: 'supabase' };
  },

  // 2. Récupérer les créneaux depuis Supabase
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
        console.error('Erreur Supabase getShifts:', err);
      }
    }

    return { shifts: [], source: 'supabase' };
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
        return { success: false, error: error?.message };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
    return { success: false, error: 'Supabase non connecté' };
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
        return { success: false, error: error?.message };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
    return { success: false, error: 'Supabase non connecté' };
  },

  // 5. Supprimer un créneau
  async deleteShift(id) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error } = await supabase.from('shifts').delete().eq('id', id);
        if (!error) return { success: true };
        return { success: false, error: error?.message };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
    return { success: true };
  },

  // 6. Mettre à jour un membre
  async updateMonitor(id, monitorData) {
    return await authService.updateUser(id, monitorData);
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
        return { success: false, error: error?.message };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
    return { success: true, settings: settingsData };
  },

  // 8. Ajouter un moniteur ou une manageuse
  async addMonitor(memberData) {
    const res = await authService.createUser(memberData);
    if (res.success && res.user) {
      return { success: true, member: res.user, message: res.message };
    }
    return res;
  },

  // 9. Supprimer un membre
  async deleteMonitor(id) {
    return await authService.deleteUser(id);
  },

  // 10. Réinitialiser le mot de passe
  async resetPassword(id) {
    return await authService.resetPassword(id);
  }
};
