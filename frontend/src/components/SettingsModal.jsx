import React, { useState, useEffect } from 'react';
import { X, Settings, Users, Euro, Check, Palette } from 'lucide-react';

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
  const [cdiName, setCdiName] = useState(settings?.cdiName || 'CDI — IUT de Nantes');
  const [monitorsState, setMonitorsState] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCdiName(settings?.cdiName || 'CDI — IUT de Nantes');
      setMonitorsState(monitors.map(m => ({ ...m })));
    }
  }, [isOpen, settings, monitors]);

  if (!isOpen) return null;

  const handleMonitorChange = (id, field, value) => {
    setMonitorsState(prev =>
      prev.map(m => m.id === id ? { ...m, [field]: value } : m)
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
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
            <span>Paramètres de l'application</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold">Réglages du CDI & Moniteurs</h2>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Nom du CDI */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nom de l'établissement / CDI
            </label>
            <input
              type="text"
              value={cdiName}
              onChange={(e) => setCdiName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white font-semibold"
              required
            />
          </div>

          {/* Profils des Moniteurs */}
          <div className="space-y-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Profils & Rémunérations des Moniteurs
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
