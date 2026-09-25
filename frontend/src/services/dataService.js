import { getSupabase } from './supabaseClient';
import { authService, DEFAULT_BASE_USERS } from './authService';
import { calculateDuration } from '../utils/timeUtils';

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

function isUUID(str) {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function mapShiftFromSupabase(row) {
  if (!row) return null;
  const duration = (row.start_time && row.end_time)
    ? calculateDuration(row.start_time, row.end_time)
    : (Number(row.duration_hours) || 0);

  return {
    id: String(row.id),
    monitorId: row.monitor_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    durationHours: duration,
    note: row.note || 'Permanence accueil CDI',
    visitorsCount: Number(row.visitors_count) || 0,
    createdAt: row.created_at
  };
}

function mapShiftToSupabase(shift) {
  const duration = (shift.startTime && shift.endTime)
    ? calculateDuration(shift.startTime, shift.endTime)
    : (Number(shift.durationHours) || 1);

  const payload = {
    monitor_id: shift.monitorId,
    date: shift.date,
    start_time: shift.startTime,
    end_time: shift.endTime,
    duration_hours: duration,
    note: shift.note || 'Permanence accueil CDI',
    visitors_count: Number(shift.visitorsCount) || 0,
    updated_at: new Date().toISOString()
  };

  if (isUUID(shift.id)) {
    payload.id = shift.id;
  }

  return payload;
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

function mapAsfFromSupabase(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    monitorId: row.monitor_id,
    month: row.month,
    asfHours: Number(row.asf_hours) || 0,
    hourlyRate: Number(row.hourly_rate) || 9.55,
    asfSalary: Number(row.asf_salary) || 0,
    status: row.status || 'declared',
    declaredBy: row.declared_by || 'Manageuse',
    declaredAt: row.declared_at,
    notes: row.notes || '',
    createdAt: row.created_at
  };
}

function mapAsfToSupabase(rec) {
  return {
    id: rec.id || `asf-${rec.monitorId}-${rec.month}`,
    monitor_id: rec.monitorId,
    month: rec.month,
    asf_hours: Number(rec.asfHours) || 0,
    hourly_rate: Number(rec.hourlyRate) || 9.55,
    asf_salary: Number(rec.asfSalary) || 0,
    status: rec.status || 'declared',
    declared_by: rec.declaredBy || 'Manageuse',
    declared_at: rec.declaredAt || new Date().toISOString(),
    notes: rec.notes || '',
    updated_at: new Date().toISOString()
  };
}

const LOCAL_STORAGE_KEY_ASF = 'cdi_asf_records';

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
        let query = supabase
          .from('shifts')
          .select('*')
          .order('date', { ascending: true })
          .order('start_time', { ascending: true });

        if (monitorFilter && monitorFilter !== 'ALL') {
          query = query.eq('monitor_id', monitorFilter);
        }

        const { data, error } = await query;
        if (!error && data) {
          let mapped = data.map(mapShiftFromSupabase);
          if (monthStr) {
            mapped = mapped.filter(s => s && s.date && s.date.startsWith(monthStr));
          }
          return { shifts: mapped, source: 'supabase' };
        } else if (error) {
          console.error('Erreur Supabase getShifts:', error);
        }
      } catch (err) {
        console.error('Exception Supabase getShifts:', err);
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
        console.error('Erreur Supabase addShifts:', error);
        return { success: false, error: error?.message };
      } catch (err) {
        console.error('Exception Supabase addShifts:', err);
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
        if (updatedFields.durationHours !== undefined) {
          payload.duration_hours = Number(updatedFields.durationHours);
        } else if (updatedFields.startTime && updatedFields.endTime) {
          payload.duration_hours = calculateDuration(updatedFields.startTime, updatedFields.endTime);
        }
        if (updatedFields.note !== undefined) payload.note = updatedFields.note;
        if (updatedFields.visitorsCount !== undefined) payload.visitors_count = Number(updatedFields.visitorsCount);
        payload.updated_at = new Date().toISOString();

        const { data, error } = await supabase.from('shifts').update(payload).eq('id', id).select().maybeSingle();
        if (!error && data) {
          return { success: true, shift: mapShiftFromSupabase(data) };
        }
        console.error('Erreur Supabase updateShift:', error);
        return { success: false, error: error?.message };
      } catch (err) {
        console.error('Exception Supabase updateShift:', err);
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
        console.error('Erreur Supabase deleteShift:', error);
        return { success: false, error: error?.message };
      } catch (err) {
        console.error('Exception Supabase deleteShift:', err);
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
  },

  // 11. Récupérer les déclarations ASF (Attestation de Service Fait / RH)
  async getAsfRecords(monthStr) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        let query = supabase
          .from('asf_records')
          .select('*')
          .order('month', { ascending: false });

        if (monthStr) {
          query = query.eq('month', monthStr);
        }

        const { data, error } = await query;
        if (!error && data) {
          const records = data.map(mapAsfFromSupabase);
          return { asfRecords: records, source: 'supabase' };
        }
      } catch (err) {
        console.error('Exception Supabase getAsfRecords:', err);
      }
    }

    // Fallback API backend locale Express
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (isLocalhost) {
      try {
        const url = monthStr ? `/api/asf?month=${monthStr}` : '/api/asf';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.asfRecords)) {
            return { asfRecords: data.asfRecords, source: 'api' };
          }
        }
      } catch (err) {
        console.error('Exception API getAsfRecords:', err);
      }
    }

    // Fallback LocalStorage
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_ASF);
      let list = raw ? JSON.parse(raw) : [];
      if (monthStr) {
        list = list.filter(r => r.month === monthStr);
      }
      return { asfRecords: list, source: 'local' };
    } catch (e) {
      return { asfRecords: [], source: 'local' };
    }
  },

  // 12. Enregistrer / Modifier une déclaration ASF
  async saveAsfRecord(record) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const row = mapAsfToSupabase(record);
        const { data, error } = await supabase
          .from('asf_records')
          .upsert(row, { onConflict: 'monitor_id,month' })
          .select()
          .maybeSingle();

        if (!error && data) {
          return { success: true, asfRecord: mapAsfFromSupabase(data) };
        }
        console.error('Erreur Supabase saveAsfRecord:', error);
      } catch (err) {
        console.error('Exception Supabase saveAsfRecord:', err);
      }
    }

    // Fallback API backend locale Express
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (isLocalhost) {
      try {
        const res = await fetch('/api/asf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.asfRecord) {
            return { success: true, asfRecord: data.asfRecord };
          }
        }
      } catch (err) {
        console.error('Exception API saveAsfRecord:', err);
      }
    }

    // Fallback LocalStorage
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_ASF);
      let list = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex(r => r.monitorId === record.monitorId && r.month === record.month);
      const asfSalary = Number((Number(record.asfHours || 0) * Number(record.hourlyRate || 9.55)).toFixed(2));
      const updated = {
        id: record.id || `asf-${record.monitorId}-${record.month}`,
        monitorId: record.monitorId,
        month: record.month,
        asfHours: Number(record.asfHours) || 0,
        hourlyRate: Number(record.hourlyRate) || 9.55,
        asfSalary,
        status: record.status || 'declared',
        declaredBy: record.declaredBy || 'Manageuse',
        declaredAt: record.declaredAt || new Date().toISOString(),
        notes: record.notes || '',
        updatedAt: new Date().toISOString()
      };

      if (idx !== -1) {
        list[idx] = updated;
      } else {
        list.push(updated);
      }
      localStorage.setItem(LOCAL_STORAGE_KEY_ASF, JSON.stringify(list));
      return { success: true, asfRecord: updated };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // 13. Supprimer une déclaration ASF
  async deleteAsfRecord(id) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('asf_records').delete().eq('id', id);
      } catch (e) {}
    }

    try {
      await fetch(`/api/asf/${id}`, { method: 'DELETE' });
    } catch (e) {}

    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_ASF);
      if (raw) {
        let list = JSON.parse(raw);
        list = list.filter(r => r.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEY_ASF, JSON.stringify(list));
      }
    } catch (e) {}

    return { success: true };
  }
};
