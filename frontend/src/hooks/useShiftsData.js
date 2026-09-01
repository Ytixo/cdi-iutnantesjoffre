import { useState, useEffect, useCallback, useMemo } from 'react';
import { dataService } from '../services/dataService';
import { getSupabase, isSupabaseConfigured } from '../services/supabaseClient';
import { calculateDuration, DAYS_FR, formatHours } from '../utils/timeUtils';

export function useShiftsData() {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedMonitorFilter, setSelectedMonitorFilter] = useState('ALL');
  const [activeUserMonitorId, setActiveUserMonitorId] = useState('moniteur-1');

  const [monitors, setMonitors] = useState([]);
  const [settings, setSettings] = useState({});
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const [dataSource, setDataSource] = useState('local'); // 'supabase', 'api', 'local'

  // Charger les moniteurs et paramètres
  const fetchMonitorsAndSettings = useCallback(async () => {
    try {
      const { monitors: mList, settings: sData, source } = await dataService.getMonitorsAndSettings();
      setMonitors(mList || []);
      setSettings(sData || {});
      setDataSource(source);
      if (mList && mList.length > 0 && !activeUserMonitorId) {
        setActiveUserMonitorId(mList[0].id);
      }
    } catch (err) {
      console.error('Erreur fetchMonitorsAndSettings:', err);
    }
  }, [activeUserMonitorId]);

  // Charger les créneaux pour le mois sélectionné
  const fetchShifts = useCallback(async () => {
    try {
      const { shifts: sList, source } = await dataService.getShifts(selectedMonth, selectedMonitorFilter);
      setShifts(sList || []);
      setDataSource(source);
    } catch (err) {
      console.error('Erreur fetchShifts:', err);
    }
  }, [selectedMonth, selectedMonitorFilter]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMonitorsAndSettings(), fetchShifts()]);
    setLoading(false);
  }, [fetchMonitorsAndSettings, fetchShifts]);

  // Détection des conflits / chevauchements
  const conflicts = useMemo(() => {
    const list = [];
    for (let i = 0; i < shifts.length; i++) {
      for (let j = i + 1; j < shifts.length; j++) {
        const s1 = shifts[i];
        const s2 = shifts[j];
        if (s1.date === s2.date) {
          if (s1.startTime < s2.endTime && s2.startTime < s1.endTime) {
            list.push({
              shift1: s1,
              shift2: s2,
              type: s1.monitorId === s2.monitorId ? 'SAME_MONITOR_OVERLAP' : 'CONCURRENT_SHIFTS'
            });
          }
        }
      }
    }
    return list;
  }, [shifts]);

  // Calcul des statistiques salaires, heures et fréquentation
  const stats = useMemo(() => {
    if (!monitors.length) return null;

    const monthShifts = shifts.filter(s => s.date.startsWith(selectedMonth));

    // Stats par moniteur
    const monitorStats = monitors.map(m => {
      const mShifts = monthShifts.filter(s => s.monitorId === m.id);
      const totalHours = Number(mShifts.reduce((acc, s) => acc + (s.durationHours || 0), 0).toFixed(2));
      const rate = m.hourlyRate || 9.55;
      const estimatedSalary = Number((totalHours * rate).toFixed(2));
      const totalVisitors = mShifts.reduce((acc, s) => acc + (Number(s.visitorsCount) || 0), 0);
      const avgVisitors = mShifts.length > 0 ? Number((totalVisitors / mShifts.length).toFixed(1)) : 0;

      return {
        monitorId: m.id,
        name: m.name,
        color: m.color,
        avatar: m.avatar,
        hourlyRate: rate,
        totalHours,
        formattedHours: formatHours(totalHours),
        shiftsCount: mShifts.length,
        estimatedSalary,
        totalVisitors,
        avgVisitors,
        shifts: mShifts
      };
    });

    const totalCdiHours = Number(monitorStats.reduce((acc, m) => acc + m.totalHours, 0).toFixed(2));
    const totalCdiBudget = Number(monitorStats.reduce((acc, m) => acc + m.estimatedSalary, 0).toFixed(2));
    const totalMonthVisitors = monthShifts.reduce((acc, s) => acc + (Number(s.visitorsCount) || 0), 0);
    const avgVisitorsPerShift = monthShifts.length > 0 ? Number((totalMonthVisitors / monthShifts.length).toFixed(1)) : 0;

    // Jour de pic de fréquentation
    let peakDay = null;
    monthShifts.forEach(s => {
      const v = Number(s.visitorsCount) || 0;
      if (v > 0 && (!peakDay || v > peakDay.count)) {
        const mon = monitors.find(m => m.id === s.monitorId);
        peakDay = {
          date: s.date,
          count: v,
          monitorName: mon?.name || 'Moniteur',
          time: `${s.startTime}-${s.endTime}`
        };
      }
    });

    const monitorStatsWithShare = monitorStats.map(m => ({
      ...m,
      percentage: totalCdiHours > 0 ? Number(((m.totalHours / totalCdiHours) * 100).toFixed(1)) : 0
    }));

    // Répartition de la fréquentation et des heures par jour de la semaine (Lundi à Vendredi/Samedi)
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayDistribution = dayNames.map((name, index) => {
      const dayShifts = monthShifts.filter(s => new Date(s.date + 'T00:00:00').getDay() === index);
      const m1Hours = dayShifts.filter(s => s.monitorId === monitors[0]?.id).reduce((a, b) => a + (b.durationHours || 0), 0);
      const m2Hours = dayShifts.filter(s => s.monitorId === monitors[1]?.id).reduce((a, b) => a + (b.durationHours || 0), 0);
      const dayVisitors = dayShifts.reduce((acc, s) => acc + (Number(s.visitorsCount) || 0), 0);
      const avgDayVisitors = dayShifts.length > 0 ? Number((dayVisitors / dayShifts.length).toFixed(1)) : 0;

      return {
        day: name,
        dayIndex: index,
        totalHours: Number((m1Hours + m2Hours).toFixed(2)),
        totalVisitors: dayVisitors,
        avgVisitors: avgDayVisitors,
        shiftsCount: dayShifts.length,
        [monitors[0]?.id || 'm1']: Number(m1Hours.toFixed(2)),
        [monitors[1]?.id || 'm2']: Number(m2Hours.toFixed(2))
      };
    }).filter(d => d.dayIndex >= 1 && d.dayIndex <= 6);

    // Évolution quotidienne de l'affluence dans le mois (pour histogramme)
    const [y, m] = selectedMonth.split('-');
    const daysInMonth = new Date(Number(y), Number(m), 0).getDate();
    const dailyAttendance = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      const dShifts = monthShifts.filter(s => s.date === dateStr);
      const dayVisitors = dShifts.reduce((acc, s) => acc + (Number(s.visitorsCount) || 0), 0);
      const dayHours = dShifts.reduce((acc, s) => acc + (s.durationHours || 0), 0);
      
      dailyAttendance.push({
        day,
        dateStr,
        visitors: dayVisitors,
        hours: dayHours,
        shifts: dShifts
      });
    }

    return {
      month: selectedMonth,
      monitors: monitorStatsWithShare,
      totalCdiHours,
      formattedTotalCdiHours: formatHours(totalCdiHours),
      totalCdiBudget,
      totalMonthVisitors,
      avgVisitorsPerShift,
      peakDay,
      dayDistribution,
      dailyAttendance
    };
  }, [monitors, shifts, selectedMonth]);

  // Initialisation et Temps Réel (Supabase ou SSE)
  useEffect(() => {
    refreshAll();

    const supabase = getSupabase();
    if (supabase) {
      setIsSynced(true);
      const channel = supabase
        .channel('cdi_realtime_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
          fetchShifts();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'monitors' }, () => {
          fetchMonitorsAndSettings();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
          fetchMonitorsAndSettings();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Fallback SSE si Express est actif
      try {
        const eventSource = new EventSource('/api/events');
        eventSource.onopen = () => setIsSynced(true);
        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'SHIFTS_UPDATED') fetchShifts();
            if (payload.type === 'MONITORS_UPDATED' || payload.type === 'SETTINGS_UPDATED') fetchMonitorsAndSettings();
          } catch (e) {}
        };
        eventSource.onerror = () => setIsSynced(false);
        return () => eventSource.close();
      } catch (e) {
        setIsSynced(true);
      }
    }
  }, [selectedMonth, selectedMonitorFilter]);

  // Actions CRUD
  const addShifts = async (shiftsPayload) => {
    const res = await dataService.addShifts(shiftsPayload);
    await refreshAll();
    return res;
  };

  const updateShift = async (id, updatePayload) => {
    const res = await dataService.updateShift(id, updatePayload);
    await refreshAll();
    return res;
  };

  const deleteShift = async (id) => {
    const res = await dataService.deleteShift(id);
    await refreshAll();
    return res;
  };

  const updateMonitor = async (id, monitorData) => {
    const res = await dataService.updateMonitor(id, monitorData);
    await refreshAll();
    return res;
  };

  const updateSettings = async (settingsData) => {
    const res = await dataService.updateSettings(settingsData);
    await refreshAll();
    return res;
  };

  // Mettre à jour rapidement la fréquentation d'un créneau
  const updateVisitorsCount = async (shiftId, count) => {
    return await updateShift(shiftId, { visitorsCount: Number(count) });
  };

  return {
    monitors,
    settings,
    shifts,
    conflicts,
    stats,
    loading,
    isSynced,
    dataSource,
    selectedMonth,
    setSelectedMonth,
    selectedMonitorFilter,
    setSelectedMonitorFilter,
    activeUserMonitorId,
    setActiveUserMonitorId,
    addShifts,
    updateShift,
    deleteShift,
    updateMonitor,
    updateSettings,
    updateVisitorsCount,
    refreshAll
  };
}
