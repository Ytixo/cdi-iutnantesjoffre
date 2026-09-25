import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readDb, writeDb } from '../db.js';
import { broadcastUpdate } from '../sse.js';

export const asfRouter = express.Router();

// GET /api/asf (liste des déclarations ASF avec filtres optionnels : month, monitorId)
asfRouter.get('/', (req, res) => {
  const db = readDb();
  let records = db.asfRecords || [];
  const { month, monitorId } = req.query;

  if (month) {
    records = records.filter(r => r.month === month);
  }
  if (monitorId) {
    records = records.filter(r => r.monitorId === monitorId);
  }

  res.json({
    asfRecords: records,
    count: records.length
  });
});

// POST /api/asf (enregistrer ou modifier une déclaration ASF par une manageuse)
asfRouter.post('/', (req, res) => {
  const db = readDb();
  const { id, monitorId, month, asfHours, hourlyRate, status, declaredBy, notes } = req.body;

  if (!monitorId || !month || asfHours === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Champs requis manquants (monitorId, month, asfHours)'
    });
  }

  const hours = Number(asfHours);
  if (isNaN(hours) || hours < 0) {
    return res.status(400).json({
      success: false,
      error: 'Le nombre d\'heures ASF doit être un nombre positif ou nul.'
    });
  }

  if (!db.asfRecords) {
    db.asfRecords = [];
  }

  // Trouver le taux horaire du moniteur si non fourni
  let rate = hourlyRate !== undefined ? Number(hourlyRate) : null;
  if (!rate) {
    const mon = (db.monitors || []).find(m => m.id === monitorId) ||
                (db.users || []).find(u => u.id === monitorId);
    rate = mon?.hourlyRate ? Number(mon.hourlyRate) : 9.55;
  }

  const asfSalary = Number((hours * rate).toFixed(2));

  // Chercher si un enregistrement existe déjà pour ce moniteur et ce mois
  let recordIndex = -1;
  if (id) {
    recordIndex = db.asfRecords.findIndex(r => r.id === id);
  } else {
    recordIndex = db.asfRecords.findIndex(r => r.monitorId === monitorId && r.month === month);
  }

  const nowIso = new Date().toISOString();

  let savedRecord = null;
  if (recordIndex !== -1) {
    // Mise à jour
    savedRecord = {
      ...db.asfRecords[recordIndex],
      asfHours: hours,
      hourlyRate: rate,
      asfSalary,
      status: status || db.asfRecords[recordIndex].status || 'declared',
      declaredBy: declaredBy || db.asfRecords[recordIndex].declaredBy || 'Manageuse',
      declaredAt: nowIso,
      notes: notes !== undefined ? notes : (db.asfRecords[recordIndex].notes || ''),
      updatedAt: nowIso
    };
    db.asfRecords[recordIndex] = savedRecord;
  } else {
    // Création
    savedRecord = {
      id: id || uuidv4(),
      monitorId,
      month,
      asfHours: hours,
      hourlyRate: rate,
      asfSalary,
      status: status || 'declared', // 'declared' (Transmis RH), 'draft' (Brouillon), 'validated' (Validé RH)
      declaredBy: declaredBy || 'Manageuse',
      declaredAt: nowIso,
      notes: notes || '',
      createdAt: nowIso,
      updatedAt: nowIso
    };
    db.asfRecords.push(savedRecord);
  }

  writeDb(db);
  broadcastUpdate('ASF_UPDATED', { asfRecord: savedRecord, asfRecords: db.asfRecords });

  return res.json({
    success: true,
    asfRecord: savedRecord
  });
});

// DELETE /api/asf/:id (supprimer une déclaration ASF)
asfRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();

  if (!db.asfRecords) db.asfRecords = [];

  const initialCount = db.asfRecords.length;
  db.asfRecords = db.asfRecords.filter(r => r.id !== id);

  if (db.asfRecords.length === initialCount) {
    return res.status(404).json({ success: false, error: 'Déclaration ASF introuvable.' });
  }

  writeDb(db);
  broadcastUpdate('ASF_UPDATED', { deletedId: id, asfRecords: db.asfRecords });

  return res.json({
    success: true,
    message: 'Déclaration ASF supprimée.'
  });
});
