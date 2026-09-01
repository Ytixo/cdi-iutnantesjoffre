import express from 'express';
import { readDb, writeDb } from '../db.js';
import { broadcastUpdate } from '../sse.js';

export const monitorsRouter = express.Router();

// GET /api/monitors (récupérer les profils et paramètres)
monitorsRouter.get('/', (req, res) => {
  const db = readDb();
  res.json({
    monitors: db.monitors || [],
    settings: db.settings || {}
  });
});

// PUT /api/monitors/:id (mettre à jour un moniteur : nom, taux horaire, couleur, avatar)
monitorsRouter.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, hourlyRate, color, bgLight, border, avatar } = req.body;
  const db = readDb();

  const index = db.monitors.findIndex(m => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Moniteur non trouvé' });
  }

  const updatedMonitor = {
    ...db.monitors[index],
    ...(name !== undefined && { name }),
    ...(hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) }),
    ...(color !== undefined && { color }),
    ...(bgLight !== undefined && { bgLight }),
    ...(border !== undefined && { border }),
    ...(avatar !== undefined && { avatar })
  };

  db.monitors[index] = updatedMonitor;
  writeDb(db);
  broadcastUpdate('MONITORS_UPDATED', { monitor: updatedMonitor });

  res.json({ success: true, monitor: updatedMonitor });
});

// PUT /api/monitors/settings/general (mettre à jour les paramètres généraux)
monitorsRouter.put('/settings/general', (req, res) => {
  const { cdiName, defaultStartTime, defaultEndTime, allowOverlaps, currency } = req.body;
  const db = readDb();

  db.settings = {
    ...db.settings,
    ...(cdiName !== undefined && { cdiName }),
    ...(defaultStartTime !== undefined && { defaultStartTime }),
    ...(defaultEndTime !== undefined && { defaultEndTime }),
    ...(allowOverlaps !== undefined && { allowOverlaps }),
    ...(currency !== undefined && { currency })
  };

  writeDb(db);
  broadcastUpdate('SETTINGS_UPDATED', { settings: db.settings });

  res.json({ success: true, settings: db.settings });
});
