import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'cdi_data.json');

// Assurer l'existence du dossier data
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_DATA = {
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
  shifts: []
};

// Initialiser le fichier si absent
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8');
}

export function readDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Erreur de lecture de la base de données:', error);
    return DEFAULT_DATA;
  }
}

export function writeDb(data) {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
    return true;
  } catch (error) {
    console.error('Erreur d\'écriture de la base de données:', error);
    return false;
  }
}
