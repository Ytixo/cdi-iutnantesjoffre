-- ==============================================================================
-- SCHEMA SUPABASE : PLANNING CDI IUT DE NANTES & AUTHENTIFICATION
-- Exécutez ce script dans l'éditeur SQL de votre projet Supabase (SQL Editor)
-- ==============================================================================

-- 1. Table des Utilisateurs & Authentification
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'monitor', -- 'manager' ou 'monitor'
  avatar TEXT DEFAULT '👨‍🎓',
  color TEXT DEFAULT '#2563EB',
  hourly_rate NUMERIC DEFAULT 9.55,
  password_hash TEXT, -- NULL lors de la 1ère connexion
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table des Profils Moniteurs (Planning & Taux)
CREATE TABLE IF NOT EXISTS public.monitors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  bg_light TEXT,
  border TEXT,
  hourly_rate NUMERIC NOT NULL DEFAULT 9.55,
  avatar TEXT DEFAULT '👨‍🎓',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Table des Créneaux & Permanences CDI
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration_hours NUMERIC NOT NULL DEFAULT 1.0,
  note TEXT DEFAULT 'Permanence accueil CDI',
  visitors_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Table des Réglages Généraux
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Données Initiales : Comptes de Base
-- Virginie (Manageuse), Kristell (Manageuse), Noah (Moniteur avec permissions), Lucas (Moniteur)
INSERT INTO public.users (id, name, normalized_name, role, avatar, color, hourly_rate, password_hash)
VALUES
  ('user-virginie', 'Virginie', 'virginie', 'manager', '👩‍🏫', '#DB2777', 9.55, NULL),
  ('user-kristell', 'Kristell', 'kristell', 'manager', '👩‍🏫', '#D97706', 9.55, NULL),
  ('moniteur-1', 'Noah', 'noah', 'monitor', '👨‍🎓', '#7C3AED', 9.55, NULL),
  ('moniteur-2', 'Lucas', 'lucas', 'monitor', '👨‍🎓', '#475569', 9.55, NULL)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  normalized_name = EXCLUDED.normalized_name,
  role = EXCLUDED.role,
  avatar = EXCLUDED.avatar,
  color = EXCLUDED.color;

-- Moniteurs de permanence (Noah et Lucas)
INSERT INTO public.monitors (id, name, color, bg_light, border, hourly_rate, avatar)
VALUES
  ('moniteur-1', 'Noah', '#7C3AED', '#EFF6FF', '#93C5FD', 9.55, '👨‍🎓'),
  ('moniteur-2', 'Lucas', '#475569', '#ECFDF5', '#6EE7B7', 9.55, '👨‍🎓')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  color = EXCLUDED.color,
  hourly_rate = EXCLUDED.hourly_rate,
  avatar = EXCLUDED.avatar;

INSERT INTO public.settings (key, value)
VALUES
  ('general', '{"cdiName": "CDI — IUT de Nantes", "currency": "€", "defaultStartTime": "12:30", "defaultEndTime": "13:30", "allowOverlaps": false}')
ON CONFLICT (key) DO NOTHING;

-- Exemples de permanences initiales
INSERT INTO public.shifts (monitor_id, date, start_time, end_time, duration_hours, note, visitors_count)
VALUES
  ('moniteur-1', '2026-09-01', '12:30', '13:30', 1.0, 'Permanence accueil CDI', 18),
  ('moniteur-1', '2026-09-02', '12:30', '13:30', 1.0, 'Permanence accueil CDI', 24),
  ('moniteur-2', '2026-09-03', '12:30', '13:30', 1.0, 'Permanence accueil CDI', 15)
ON CONFLICT DO NOTHING;

-- 6. Désactivation de RLS pour accès direct par l'application (clé publique anon)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

-- 7. Activer le temps réel (Realtime) sur les 4 tables
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users, public.monitors, public.shifts, public.settings;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;
