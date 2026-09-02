import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readDb, writeDb } from '../db.js';
import { normalizeName, hashPassword, verifyPassword } from '../utils/authUtils.js';
import { broadcastUpdate } from '../sse.js';

export const authRouter = express.Router();

/**
 * Helper : Masquer le mot de passe dans les réponses publiques
 */
function sanitizeUser(u) {
  const canManage = u.role === 'manager' || u.canManage === true || u.name === 'Noah' || u.id === 'moniteur-1';
  return {
    id: u.id,
    name: u.name,
    role: u.role || 'monitor',
    canManage,
    avatar: u.avatar || '👨‍🎓',
    color: u.color || '#2563EB',
    hourlyRate: u.hourlyRate !== undefined ? Number(u.hourlyRate) : 9.55,
    bgLight: u.bgLight,
    border: u.border,
    hasPassword: Boolean(u.passwordHash),
    createdAt: u.createdAt
  };
}

/**
 * POST /api/auth/check
 * Vérifie si le prénom existe et s'il s'agit d'une 1ère connexion
 */
authRouter.post('/check', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ success: false, error: 'Veuillez saisir un prénom.' });
  }

  const norm = normalizeName(name);
  if (!norm) {
    return res.status(400).json({ success: false, error: 'Prénom invalide.' });
  }

  const db = readDb();
  const user = (db.users || []).find(u => normalizeName(u.name) === norm);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: `Prénom « ${name.trim()} » non reconnu dans l'équipe. Veuillez contacter une manageuse (Virginie ou Christelle).`
    });
  }

  const isFirstLogin = !user.passwordHash;

  return res.json({
    success: true,
    user: sanitizeUser(user),
    isFirstLogin
  });
});

/**
 * POST /api/auth/setup-password
 * Première connexion : création du mot de passe
 */
authRouter.post('/setup-password', (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ success: false, error: 'Prénom et mot de passe requis.' });
  }

  if (password.length < 4) {
    return res.status(400).json({ success: false, error: 'Le mot de passe doit comporter au moins 4 caractères.' });
  }

  const norm = normalizeName(name);
  const db = readDb();
  const index = (db.users || []).findIndex(u => normalizeName(u.name) === norm);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });
  }

  const user = db.users[index];

  // Si le mot de passe existe déjà, on refuse la création
  if (user.passwordHash) {
    return res.status(400).json({
      success: false,
      error: 'Un mot de passe est déjà configuré pour ce compte. Veuillez vous connecter normalement.'
    });
  }

  // Enregistrer le mot de passe hashé
  user.passwordHash = hashPassword(password);
  user.updatedAt = new Date().toISOString();
  db.users[index] = user;

  writeDb(db);
  broadcastUpdate('USERS_UPDATED', { user: sanitizeUser(user) });

  return res.json({
    success: true,
    message: 'Mot de passe créé avec succès !',
    user: sanitizeUser(user)
  });
});

/**
 * POST /api/auth/login
 * Connexion standard (Prénom + Mot de passe)
 */
authRouter.post('/login', (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ success: false, error: 'Prénom et mot de passe requis.' });
  }

  const norm = normalizeName(name);
  const db = readDb();
  const user = (db.users || []).find(u => normalizeName(u.name) === norm);

  if (!user) {
    return res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });
  }

  if (!user.passwordHash) {
    return res.status(400).json({
      success: false,
      isFirstLogin: true,
      error: 'Première connexion détectée : vous devez d\'abord créer un mot de passe.'
    });
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ success: false, error: 'Mot de passe incorrect.' });
  }

  return res.json({
    success: true,
    user: sanitizeUser(user)
  });
});

/**
 * GET /api/auth/users
 * Récupérer la liste de tous les utilisateurs (pour les manageuses ou l'affichage de l'équipe)
 */
authRouter.get('/users', (req, res) => {
  const db = readDb();
  const users = (db.users || []).map(sanitizeUser);
  res.json({ success: true, users });
});

/**
 * POST /api/auth/users
 * Création d'un nouveau moniteur / utilisateur par une manageuse
 */
authRouter.post('/users', (req, res) => {
  const { name, role = 'monitor', hourlyRate = 9.55, color = '#2563EB', avatar = '👨‍🎓' } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Le prénom est obligatoire.' });
  }

  const norm = normalizeName(name);
  const db = readDb();

  const existing = (db.users || []).some(u => normalizeName(u.name) === norm);
  if (existing) {
    return res.status(400).json({ success: false, error: `Un utilisateur avec le prénom « ${name.trim()} » existe déjà.` });
  }

  const newId = `moniteur-${Date.now()}`;
  const newUser = {
    id: newId,
    name: name.trim(),
    normalizedName: norm,
    role: role === 'manager' ? 'manager' : 'monitor',
    avatar,
    color,
    hourlyRate: Number(hourlyRate) || 9.55,
    bgLight: '#EFF6FF',
    border: '#93C5FD',
    passwordHash: null, // Nécessite 1ère connexion
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);

  // Si c'est un moniteur, on l'ajoute aussi à la liste des moniteurs
  if (newUser.role === 'monitor') {
    db.monitors.push({
      id: newUser.id,
      name: newUser.name,
      color: newUser.color,
      bgLight: newUser.bgLight,
      border: newUser.border,
      hourlyRate: newUser.hourlyRate,
      avatar: newUser.avatar
    });
  }

  writeDb(db);
  broadcastUpdate('USERS_UPDATED', { users: db.users.map(sanitizeUser) });
  broadcastUpdate('MONITORS_UPDATED', { monitors: db.monitors });

  return res.status(201).json({
    success: true,
    user: sanitizeUser(newUser),
    message: `Le moniteur « ${newUser.name} » a été ajouté avec succès ! Il pourra créer son mot de passe lors de sa première connexion.`
  });
});

/**
 * PUT /api/auth/users/:id
 * Modification d'un utilisateur ou réinitialisation de son mot de passe
 */
authRouter.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, role, hourlyRate, color, avatar, resetPassword } = req.body;

  const db = readDb();
  const userIdx = (db.users || []).findIndex(u => u.id === id);

  if (userIdx === -1) {
    return res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });
  }

  const user = db.users[userIdx];

  if (name !== undefined) {
    user.name = name.trim();
    user.normalizedName = normalizeName(name);
  }
  if (role !== undefined) user.role = role;
  if (hourlyRate !== undefined) user.hourlyRate = Number(hourlyRate);
  if (color !== undefined) user.color = color;
  if (avatar !== undefined) user.avatar = avatar;

  // Réinitialisation du mot de passe : l'utilisateur devra en recréer un
  if (resetPassword) {
    user.passwordHash = null;
  }

  user.updatedAt = new Date().toISOString();
  db.users[userIdx] = user;

  // Synchroniser dans db.monitors
  const monIdx = (db.monitors || []).findIndex(m => m.id === id);
  if (monIdx !== -1) {
    if (user.role === 'monitor') {
      db.monitors[monIdx] = {
        ...db.monitors[monIdx],
        name: user.name,
        color: user.color,
        avatar: user.avatar,
        hourlyRate: user.hourlyRate
      };
    } else {
      // Retiré des moniteurs si devenu manageur pur
      db.monitors.splice(monIdx, 1);
    }
  } else if (user.role === 'monitor') {
    db.monitors.push({
      id: user.id,
      name: user.name,
      color: user.color,
      bgLight: '#EFF6FF',
      border: '#93C5FD',
      hourlyRate: user.hourlyRate,
      avatar: user.avatar
    });
  }

  writeDb(db);
  broadcastUpdate('USERS_UPDATED', { users: db.users.map(sanitizeUser) });
  broadcastUpdate('MONITORS_UPDATED', { monitors: db.monitors });

  return res.json({
    success: true,
    user: sanitizeUser(user),
    message: resetPassword ? 'Mot de passe réinitialisé. L\'utilisateur devra en créer un nouveau.' : 'Utilisateur mis à jour.'
  });
});

/**
 * DELETE /api/auth/users/:id
 * Suppression d'un utilisateur / moniteur (Manageuses uniquement)
 */
authRouter.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();

  const user = (db.users || []).find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });
  }

  // Protection : empêcher de supprimer s'il ne reste qu'une seule manageuse
  if (user.role === 'manager') {
    const managersCount = (db.users || []).filter(u => u.role === 'manager').length;
    if (managersCount <= 1) {
      return res.status(400).json({ success: false, error: 'Impossible de supprimer la dernière manageuse.' });
    }
  }

  db.users = db.users.filter(u => u.id !== id);
  db.monitors = db.monitors.filter(m => m.id !== id);

  writeDb(db);
  broadcastUpdate('USERS_UPDATED', { users: db.users.map(sanitizeUser) });
  broadcastUpdate('MONITORS_UPDATED', { monitors: db.monitors });

  return res.json({ success: true, message: `Utilisateur « ${user.name} » supprimé.` });
});
