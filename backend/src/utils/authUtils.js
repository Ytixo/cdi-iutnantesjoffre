import crypto from 'crypto';

const AUTH_SALT = 'cdi_iut_nantes_salt_2026';

/**
 * Normalise un prénom pour comparaison souple :
 * - suppression des accents (Noé -> noe, Élise -> elise)
 * - mise en minuscules
 * - suppression des espaces avant/après et caractères non alphanumériques
 */
export function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les diacritiques/accents
    .replace(/[^a-z0-9]/g, '');     // Supprime espaces, tirets, etc.
}

/**
 * Hache un mot de passe avec SHA-256 et salt fixe
 */
export function hashPassword(password, salt = AUTH_SALT) {
  if (!password) return null;
  return crypto.createHash('sha256').update(password + ':' + salt).digest('hex');
}

/**
 * Vérifie un mot de passe contre son empreinte hachée
 */
export function verifyPassword(password, hash, salt = AUTH_SALT) {
  if (!password || !hash) return false;
  return hashPassword(password, salt) === hash;
}
