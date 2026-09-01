import express from 'express';
import { readDb } from '../db.js';

export const statsRouter = express.Router();

function formatHoursMinutes(decimalHours) {
  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h${minutes < 10 ? '0' : ''}${minutes}`;
}

// GET /api/stats?month=YYYY-MM
statsRouter.get('/', (req, res) => {
  const db = readDb();
  const shifts = db.shifts || [];
  const monitors = db.monitors || [];
  
  // Si le mois n'est pas spécifié, on prend le mois en cours
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const targetMonth = req.query.month || currentMonthStr;

  // Filtrer les créneaux pour le mois demandé
  const monthShifts = shifts.filter(s => s.date.startsWith(targetMonth));

  // Statistiques par moniteur pour le mois
  const monitorStats = monitors.map(monitor => {
    const monitorShifts = monthShifts.filter(s => s.monitorId === monitor.id);
    const totalHours = Number(monitorShifts.reduce((acc, s) => acc + (s.durationHours || 0), 0).toFixed(2));
    const rate = monitor.hourlyRate || 11.88;
    const estimatedSalary = Number((totalHours * rate).toFixed(2));

    return {
      monitorId: monitor.id,
      name: monitor.name,
      color: monitor.color,
      avatar: monitor.avatar,
      hourlyRate: rate,
      totalHours,
      formattedHours: formatHoursMinutes(totalHours),
      shiftsCount: monitorShifts.length,
      estimatedSalary,
      shifts: monitorShifts
    };
  });

  const totalCdiHours = Number(monitorStats.reduce((acc, m) => acc + m.totalHours, 0).toFixed(2));
  const totalCdiBudget = Number(monitorStats.reduce((acc, m) => acc + m.estimatedSalary, 0).toFixed(2));

  // Calcul du pourcentage de répartition
  const monitorStatsWithShare = monitorStats.map(m => ({
    ...m,
    percentage: totalCdiHours > 0 ? Number(((m.totalHours / totalCdiHours) * 100).toFixed(1)) : 0
  }));

  // Répartition par jour de la semaine (Lundi à Vendredi/Samedi)
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const dayDistribution = dayNames.map((name, index) => {
    const dayShifts = monthShifts.filter(s => new Date(s.date).getDay() === index);
    const m1Hours = dayShifts.filter(s => s.monitorId === monitors[0]?.id).reduce((a, b) => a + (b.durationHours || 0), 0);
    const m2Hours = dayShifts.filter(s => s.monitorId === monitors[1]?.id).reduce((a, b) => a + (b.durationHours || 0), 0);
    return {
      day: name,
      dayIndex: index,
      totalHours: Number((m1Hours + m2Hours).toFixed(2)),
      [monitors[0]?.id || 'm1']: Number(m1Hours.toFixed(2)),
      [monitors[1]?.id || 'm2']: Number(m2Hours.toFixed(2))
    };
  }).filter(d => d.dayIndex >= 1 && d.dayIndex <= 6); // On garde Lundi à Samedi

  // Historique des 6 derniers mois
  const history = [];
  const targetDate = new Date(`${targetMonth}-01T00:00:00`);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(targetDate.getFullYear(), targetDate.getMonth() - i, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mShifts = shifts.filter(s => s.date.startsWith(mStr));
    const m1H = mShifts.filter(s => s.monitorId === monitors[0]?.id).reduce((a, b) => a + (b.durationHours || 0), 0);
    const m2H = mShifts.filter(s => s.monitorId === monitors[1]?.id).reduce((a, b) => a + (b.durationHours || 0), 0);
    
    // Libellé en français (ex: "Sept. 2026")
    const monthLabel = d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    history.push({
      month: mStr,
      label: monthLabel,
      totalHours: Number((m1H + m2H).toFixed(2)),
      [monitors[0]?.name || 'Moniteur 1']: Number(m1H.toFixed(2)),
      [monitors[1]?.name || 'Moniteur 2']: Number(m2H.toFixed(2))
    });
  }

  res.json({
    month: targetMonth,
    monitors: monitorStatsWithShare,
    totalCdiHours,
    formattedTotalCdiHours: formatHoursMinutes(totalCdiHours),
    totalCdiBudget,
    dayDistribution,
    history
  });
});
