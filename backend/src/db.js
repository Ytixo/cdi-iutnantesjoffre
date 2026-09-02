import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeName } from './utils/authUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'cdi_data.json');

// Assurer l'existence du dossier data
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const INITIAL_USERS = [
  {
    id: 'user-virginie',
    name: 'Virginie',
    normalizedName: 'virginie',
    role: 'manager',
    canManage: true,
    avatar: '👩‍🏫',
    color: '#DB2777',
    hourlyRate: 9.55,
    passwordHash: null,
    createdAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'user-kristell',
    name: 'Kristell',
    normalizedName: 'kristell',
    role: 'manager',
    canManage: true,
    avatar: '👩‍🏫',
    color: '#D97706',
    hourlyRate: 9.55,
    passwordHash: null,
    createdAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'moniteur-1',
    name: 'Noah',
    normalizedName: 'noah',
    role: 'monitor',
    canManage: true,
    avatar: '👨‍🎓',
    color: '#7C3AED',
    bgLight: '#EFF6FF',
    border: '#93C5FD',
    hourlyRate: 9.55,
    passwordHash: null,
    createdAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'moniteur-2',
    name: 'Lucas',
    normalizedName: 'lucas',
    role: 'monitor',
    canManage: false,
    avatar: '👨‍🎓',
    color: '#475569',
    bgLight: '#ECFDF5',
    border: '#6EE7B7',
    hourlyRate: 9.55,
    passwordHash: null,
    createdAt: '2026-09-01T00:00:00.000Z'
  }
];

export const INITIAL_MONITORS = [
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

const DEFAULT_DATA = {
  users: INITIAL_USERS,
  monitors: INITIAL_MONITORS,
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
    const data = JSON.parse(raw);
    let changed = false;

    // Migration automatique : si users absent ou incomplet
    if (!data.users || !Array.isArray(data.users) || data.users.length === 0) {
      data.users = [...INITIAL_USERS];
      changed = true;
    } else {
      // S'assurer de la mise à jour pour Kristell et Noah
      data.users = data.users.map(u => {
        if (normalizeName(u.name) === 'christelle') {
          changed = true;
          return { ...u, name: 'Kristell', normalizedName: 'kristell' };
        }
        if (normalizeName(u.name) === 'noah') {
          if (u.role !== 'monitor' || !u.canManage) {
            changed = true;
            return { ...u, role: 'monitor', canManage: true };
          }
        }
        return u;
      });

      // S'assurer que les 4 comptes de base existent
      INITIAL_USERS.forEach(baseUser => {
        const norm = normalizeName(baseUser.name);
        const exists = data.users.some(u => normalizeName(u.name) === norm);
        if (!exists) {
          data.users.push(baseUser);
          changed = true;
        }
      });
    }

    if (!data.monitors || !Array.isArray(data.monitors) || data.monitors.length === 0) {
      data.monitors = [...INITIAL_MONITORS];
      changed = true;
    } else {
      // Retirer les manageuses de la liste des moniteurs de permanence
      const filteredMonitors = data.monitors.filter(m => m.role !== 'manager' && !['user-virginie', 'user-kristell'].includes(m.id));
      if (filteredMonitors.length !== data.monitors.length) {
        data.monitors = filteredMonitors;
        changed = true;
      }

      // S'assurer que Noah et Lucas sont bien dans monitors
      INITIAL_MONITORS.forEach(baseMon => {
        const norm = normalizeName(baseMon.name);
        const exists = data.monitors.some(m => normalizeName(m.name) === norm);
        if (!exists) {
          data.monitors.push(baseMon);
          changed = true;
        }
      });
    }

    // S'assurer que tous les users ont un normalizedName
    data.users.forEach(u => {
      if (!u.normalizedName) {
        u.normalizedName = normalizeName(u.name);
        changed = true;
      }
    });

    if (changed) {
      writeDb(data);
    }

    return data;
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
