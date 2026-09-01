import React, { useState, useEffect } from 'react';
import { X, Settings, Users, Euro, Check, Palette, Cloud, Database, ExternalLink, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { getSupabaseCredentials, saveSupabaseCredentials, testSupabaseConnection } from '../services/supabaseClient';

const PRESET_COLORS = [
  { name: 'Violet', hex: '#7C3AED' },
  { name: 'Gris Ardoise', hex: '#475569' },
  { name: 'Bleu Royal', hex: '#2563EB' },
  { name: 'Émeraude', hex: '#059669' },
  { name: 'Rose', hex: '#DB2777' },
  { name: 'Ambre / Orange', hex: '#D97706' },
  { name: 'Indigo', hex: '#4F46E5' },
  { name: 'Cyan', hex: '#0891B2' }
];

const PRESET_AVATARS = ['👨‍🎓', '👩‍🎓', '🧑‍🎓', '📚', '👓', '🧑‍💻', '👩‍🏫', '👨‍🏫', '⭐', '✨'];

export function SettingsModal({
  isOpen,
  onClose,
  monitors = [],
  settings = {},
  onUpdateMonitor,
  onUpdateSettings
}) {
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'supabase', 'github'
  const [cdiName, setCdiName] = useState(settings?.cdiName || 'CDI — IUT de Nantes');
  const [monitorsState, setMonitorsState] = useState([]);
  
  // Supabase states
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); // { success: boolean, message: string }
  const [copiedSql, setCopiedSql] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCdiName(settings?.cdiName || 'CDI — IUT de Nantes');
      setMonitorsState(monitors.map(m => ({ ...m })));
      const creds = getSupabaseCredentials();
      setSupabaseUrl(creds.url);
      setSupabaseKey(creds.key);
      setConnectionStatus(null);
    }
  }, [isOpen, settings, monitors]);

  if (!isOpen) return null;

  const handleMonitorChange = (id, field, value) => {
    setMonitorsState(prev =>
      prev.map(m => m.id === id ? { ...m, [field]: value } : m)
    );
  };

  const handleTestSupabase = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    const result = await testSupabaseConnection(supabaseUrl, supabaseKey);
    setTestingConnection(false);
    if (result.success) {
      setConnectionStatus({ success: true, message: 'Connexion à Supabase réussie !' });
    } else {
      setConnectionStatus({ success: false, message: `Échec : ${result.error || 'Vérifiez vos identifiants'}` });
    }
  };

  const handleCopySql = () => {
    const sqlScript = `-- CDI IUT DE NANTES - TABLES SUPABASE
CREATE TABLE IF NOT EXISTS public.monitors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    bg_light TEXT,
    border TEXT,
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 9.55,
    avatar TEXT DEFAULT '👨‍🎓',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitor_id TEXT NOT NULL REFERENCES public.monitors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration_hours NUMERIC(5, 2) NOT NULL,
    note TEXT DEFAULT 'Permanence accueil CDI',
    visitors_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read monitors" ON public.monitors FOR SELECT USING (true);
CREATE POLICY "Allow public write monitors" ON public.monitors FOR ALL USING (true);
CREATE POLICY "Allow public read shifts" ON public.shifts FOR SELECT USING (true);
CREATE POLICY "Allow public write shifts" ON public.shifts FOR ALL USING (true);
CREATE POLICY "Allow public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow public write settings" ON public.settings FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.monitors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;

INSERT INTO public.monitors (id, name, color, hourly_rate, avatar)
VALUES 
    ('moniteur-1', 'Noah', '#7C3AED', 9.55, '👨‍🎓'),
    ('moniteur-2', 'Lucas', '#475569', 9.55, '👨‍🎓')
ON CONFLICT (id) DO NOTHING;`;

    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Sauvegarder Supabase credentials
      saveSupabaseCredentials(supabaseUrl, supabaseKey);

      // Sauvegarder les paramètres généraux
      await onUpdateSettings({ cdiName });

      // Sauvegarder chaque moniteur
      for (const m of monitorsState) {
        await onUpdateMonitor(m.id, {
          name: m.name,
          hourlyRate: parseFloat(m.hourlyRate) || 9.55,
          color: m.color,
          avatar: m.avatar
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4" />
            <span>Paramètres & Configuration</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold">Réglages du CDI & Cloud</h2>

          {/* Sub Navigation */}
          <div className="flex items-center space-x-1 mt-4 bg-white/10 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'general' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              Général & Moniteurs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('supabase')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'supabase' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Base Supabase Cloud</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('github')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'github' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              Hébergement GitHub
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* TAB 1: GÉNÉRAL & MONITEURS */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nom du CDI / Établissement
                </label>
                <input
                  type="text"
                  value={cdiName}
                  onChange={(e) => setCdiName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white font-semibold"
                  required
                />
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Profils des Moniteurs & Taux Horaires
                </label>

                {monitorsState.map((m, idx) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Moniteur #{idx + 1}
                      </span>
                      <div className="flex items-center space-x-1">
                        {PRESET_AVATARS.slice(0, 5).map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleMonitorChange(m.id, 'avatar', emoji)}
                            className={`text-lg p-1 rounded-lg transition-transform cursor-pointer ${
                              m.avatar === emoji ? 'bg-white shadow-xs scale-125' : 'opacity-60 hover:opacity-100'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Prénom du moniteur
                        </label>
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => handleMonitorChange(m.id, 'name', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Taux horaire (€ / heure)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            value={m.hourlyRate}
                            onChange={(e) => handleMonitorChange(m.id, 'hourlyRate', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 pr-8"
                            required
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            €/h
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                        <Palette className="w-3 h-3 text-slate-400" /> Couleur associée au planning
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map(c => {
                          const isSelected = m.color === c.hex;
                          return (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => handleMonitorChange(m.id, 'color', c.hex)}
                              style={{ backgroundColor: c.hex }}
                              className={`w-6 h-6 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                                isSelected ? 'ring-3 ring-offset-2 ring-slate-800 scale-110 shadow-xs' : 'opacity-80 hover:opacity-100'
                              }`}
                              title={c.name}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SUPABASE CLOUD (BASE DE DONNÉES EN LIGNE TEMPS RÉEL) */}
          {activeTab === 'supabase' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1.5">
                <div className="flex items-center space-x-1.5 font-bold">
                  <Database className="w-4 h-4 text-blue-700" />
                  <span>Base de données Cloud Supabase (Temps Réel)</span>
                </div>
                <p className="text-blue-700 text-[11px] leading-relaxed">
                  Supabase permet à Noah et Lucas d'avoir leurs heures et statistiques synchronisées en direct sur PC et smartphone sans avoir besoin d'héberger un serveur.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Project URL Supabase
                </label>
                <input
                  type="text"
                  placeholder="https://votre-projet.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  API Key Anonyme (anon / public)
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestSupabase}
                  disabled={testingConnection || !supabaseUrl || !supabaseKey}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  {testingConnection ? 'Vérification...' : 'Tester la connexion'}
                </button>

                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSql ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Script SQL copié !' : 'Copier script SQL Supabase'}</span>
                </button>
              </div>

              {connectionStatus && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
                  connectionStatus.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {connectionStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                  <span>{connectionStatus.message}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GUIDE GITHUB PAGES */}
          {activeTab === 'github' && (
            <div className="space-y-4 text-xs text-slate-700">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  🚀 Déploiement Gratuit sur GitHub Pages
                </h4>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Le fichier de workflow automatique GitHub Actions (`.github/workflows/deploy.yml`) est déjà configuré dans le projet.
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 text-[11px] pt-2">
                  <li>Créez un dépôt sur <strong>GitHub</strong> et poussez vos fichiers.</li>
                  <li>Dans votre dépôt GitHub, allez dans <strong>Settings → Pages</strong>.</li>
                  <li>Sous <strong>Build and deployment</strong>, sélectionnez <strong>Source: GitHub Actions</strong>.</li>
                  <li>Votre site sera immédiatement disponible sur : <code>https://votre-pseudo.github.io/CDI/</code></li>
                </ol>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Enregistrer les paramètres</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
