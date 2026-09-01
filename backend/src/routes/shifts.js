import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readDb, writeDb } from '../db.js';
import { broadcastUpdate } from '../sse.js';

export const shiftsRouter = express.Router();

// Helper pour calculer la durée en heures décimales (ex: 12:30 -> 13:30 = 1.0h, 12:30 -> 13:15 = 0.75h)
function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [h1, m1] = startTime.split(':').map(Number);
  const [h2, m2] = endTime.split(':').map(Number);
  const minutes = (h2 * 60 + m2) - (h1 * 60 + m1);
  return Math.max(0, Number((minutes / 60).toFixed(2)));
}

// Détection des conflits / chevauchements
function findConflicts(shifts) {
  const conflicts = [];
  
  for (let i = 0; i < shifts.length; i++) {
    for (let j = i + 1; j < shifts.length; j++) {
      const s1 = shifts[i];
      const s2 = shifts[j];

      // Même jour et chevauchement temporel
      if (s1.date === s2.date) {
        if (s1.startTime < s2.endTime && s2.startTime < s1.endTime) {
          conflicts.push({
            shift1: s1,
            shift2: s2,
            type: s1.monitorId === s2.monitorId ? 'SAME_MONITOR_OVERLAP' : 'CONCURRENT_SHIFTS',
            message: s1.monitorId === s2.monitorId 
              ? `Chevauchement pour le même moniteur le ${s1.date}` 
              : `Deux moniteurs présents simultanément le ${s1.date} (${s1.startTime}-${s1.endTime} / ${s2.startTime}-${s2.endTime})`
          });
        }
      }
    }
  }

  return conflicts;
}

// GET /api/shifts (avec filtres optionnels : month=YYYY-MM, monitorId)
shiftsRouter.get('/', (req, res) => {
  const db = readDb();
  let shifts = db.shifts || [];
  const { month, monitorId, startDate, endDate } = req.query;

  if (month) {
    shifts = shifts.filter(s => s.date.startsWith(month));
  }
  if (monitorId) {
    shifts = shifts.filter(s => s.monitorId === monitorId);
  }
  if (startDate && endDate) {
    shifts = shifts.filter(s => s.date >= startDate && s.date <= endDate);
  }

  // Trier chronologiquement (date puis heure de début)
  shifts.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const conflicts = findConflicts(shifts);

  res.json({
    shifts,
    conflicts,
    count: shifts.length
  });
});

// POST /api/shifts (créer un ou plusieurs créneaux, ex: demain et après-demain)
shiftsRouter.post('/', (req, res) => {
  const db = readDb();
  const payload = req.body; // Peut être un objet ou un tableau d'objets

  const shiftsToAdd = Array.isArray(payload) ? payload : [payload];
  const createdShifts = [];

  for (const item of shiftsToAdd) {
    if (!item.date || !item.startTime || !item.endTime || !item.monitorId) {
      return res.status(400).json({ error: 'Champs requis manquants (date, startTime, endTime, monitorId)' });
    }

    if (item.startTime >= item.endTime) {
      return res.status(400).json({ error: "L'heure de fin doit être postérieure à l'heure de début." });
    }

    const duration = calculateDuration(item.startTime, item.endTime);

    const newShift = {
      id: uuidv4(),
      monitorId: item.monitorId,
      date: item.date, // Format YYYY-MM-DD
      startTime: item.startTime, // Format HH:mm
      endTime: item.endTime, // Format HH:mm
      durationHours: duration,
      note: item.note !== undefined && item.note !== '' ? item.note : 'Permanence accueil CDI',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.shifts.push(newShift);
    createdShifts.push(newShift);
  }

  writeDb(db);
  broadcastUpdate('SHIFTS_UPDATED', { created: createdShifts });

  res.status(201).json({
    success: true,
    created: createdShifts
  });
});

// PUT /api/shifts/:id (modifier un créneau)
shiftsRouter.put('/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const index = db.shifts.findIndex(s => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Créneau non trouvé' });
  }

  const { date, startTime, endTime, monitorId, note } = req.body;

  if (startTime && endTime && startTime >= endTime) {
    return res.status(400).json({ error: "L'heure de fin doit être postérieure à l'heure de début." });
  }

  const updatedShift = {
    ...db.shifts[index],
    ...(date && { date }),
    ...(startTime && { startTime }),
    ...(endTime && { endTime }),
    ...(monitorId && { monitorId }),
    ...(note !== undefined && { note }),
    durationHours: calculateDuration(startTime || db.shifts[index].startTime, endTime || db.shifts[index].endTime),
    updatedAt: new Date().toISOString()
  };

  db.shifts[index] = updatedShift;
  writeDb(db);
  broadcastUpdate('SHIFTS_UPDATED', { updated: updatedShift });

  res.json({ success: true, shift: updatedShift });
});

// DELETE /api/shifts/:id (supprimer un créneau)
shiftsRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const initialLength = db.shifts.length;
  db.shifts = db.shifts.filter(s => s.id !== id);

  if (db.shifts.length === initialLength) {
    return res.status(404).json({ error: 'Créneau non trouvé' });
  }

  writeDb(db);
  broadcastUpdate('SHIFTS_UPDATED', { deletedId: id });

  res.json({ success: true, message: 'Créneau supprimé' });
});

// DELETE /api/shifts/batch/delete (supprimer plusieurs créneaux)
shiftsRouter.post('/batch-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Tableau d\'identifiants requis' });
  }

  const db = readDb();
  db.shifts = db.shifts.filter(s => !ids.includes(s.id));
  writeDb(db);
  broadcastUpdate('SHIFTS_UPDATED', { deletedIds: ids });

  res.json({ success: true, deletedCount: ids.length });
});
