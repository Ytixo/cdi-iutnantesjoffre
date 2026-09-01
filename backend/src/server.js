import express from 'express';
import cors from 'cors';
import { shiftsRouter } from './routes/shifts.js';
import { monitorsRouter } from './routes/monitors.js';
import { statsRouter } from './routes/stats.js';
import { sseHandler } from './sse.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes API
app.use('/api/shifts', shiftsRouter);
app.use('/api/monitors', monitorsRouter);
app.use('/api/stats', statsRouter);

// Endpoint Server-Sent Events (SSE) pour le temps réel
app.get('/api/events', sseHandler);

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur Backend CDI démarré sur http://localhost:${PORT}`);
  console.log(`📡 Événements SSE prêts sur http://localhost:${PORT}/api/events`);
});
