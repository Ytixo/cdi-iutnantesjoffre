import React, { useState, useEffect } from 'react';
import { X, FileCheck, Euro, Clock, AlertCircle, CheckCircle, ShieldCheck, Sparkles, Send, Trash2 } from 'lucide-react';
import { formatCurrency, formatHours } from '../utils/timeUtils';

export function AsfModal({
  isOpen,
  onClose,
  monitors = [],
  stats,
  selectedMonth,
  initialMonitorId,
  asfRecords = [],
  currentUser,
  onSaveAsf,
  onDeleteAsf
}) {
  const [targetMonitorId, setTargetMonitorId] = useState('');
  const [asfHours, setAsfHours] = useState('');
  const [status, setStatus] = useState('declared');
  const [declaredBy, setDeclaredBy] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Initialisation à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      const defaultId = initialMonitorId || (monitors.length > 0 ? monitors[0].id : '');
      setTargetMonitorId(defaultId);
      loadMonitorAsfData(defaultId);
    }
  }, [isOpen, initialMonitorId, monitors, selectedMonth, asfRecords, stats]);

  // Charger les données ASF ou planning pour un moniteur donné
  const loadMonitorAsfData = (monId) => {
    if (!monId) return;

    // Chercher si une déclaration existe déjà pour ce moniteur et ce mois
    const existing = (asfRecords || []).find(r => r.monitorId === monId && r.month === selectedMonth);
    const monStat = stats?.monitors?.find(m => m.monitorId === monId);

    if (existing) {
      setAsfHours(String(existing.asfHours));
      setStatus(existing.status || 'declared');
      setDeclaredBy(existing.declaredBy || currentUser?.name || 'Manageuse');
      setNotes(existing.notes || '');
    } else {
      // Pré-remplir avec les heures réelles du planning du mois
      const planningHours = monStat?.totalHours || 0;
      setAsfHours(String(planningHours));
      setStatus('declared');
      setDeclaredBy(currentUser?.name || 'Manageuse');
      setNotes('');
    }
  };

  if (!isOpen) return null;

  const currentMonitor = monitors.find(m => m.id === targetMonitorId) || monitors[0];
  const monStat = stats?.monitors?.find(m => m.monitorId === targetMonitorId);
  const existingAsf = (asfRecords || []).find(r => r.monitorId === targetMonitorId && r.month === selectedMonth);

  const planningHours = monStat?.totalHours || 0;
  const rate = currentMonitor?.hourlyRate || 9.55;
  const parsedAsfHours = parseFloat(asfHours) || 0;
  const calculatedAsfSalary = Number((parsedAsfHours * rate).toFixed(2));
  const planningSalary = Number((planningHours * rate).toFixed(2));
  const hoursDelta = Number((parsedAsfHours - planningHours).toFixed(2));
  const salaryDelta = Number((calculatedAsfSalary - planningSalary).toFixed(2));

  const handleCopyPlanningHours = () => {
    setAsfHours(String(planningHours));
  };

  const handleMonitorChange = (e) => {
    const newId = e.target.value;
    setTargetMonitorId(newId);
    loadMonitorAsfData(newId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isNaN(parsedAsfHours) || parsedAsfHours < 0) {
      setErrorMsg('Veuillez saisir un nombre d\'heures valide (positif ou nul).');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        id: existingAsf?.id,
        monitorId: targetMonitorId,
        month: selectedMonth,
        asfHours: parsedAsfHours,
        hourlyRate: rate,
        asfSalary: calculatedAsfSalary,
        status,
        declaredBy: declaredBy.trim() || currentUser?.name || 'Manageuse',
        notes: notes.trim()
      };

      await onSaveAsf(payload);
      setSuccessMsg(`Déclaration ASF enregistrée avec succès pour ${currentMonitor?.name} !`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg(err.message || 'Erreur lors de la sauvegarde de la déclaration ASF.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingAsf?.id) return;
    if (confirm(`Voulez-vous supprimer la déclaration ASF de ${currentMonitor?.name} pour le mois ${selectedMonth} ?`)) {
      try {
        setSaving(true);
        if (onDeleteAsf) {
          await onDeleteAsf(existingAsf.id);
        }
        setSuccessMsg('Déclaration ASF supprimée.');
        setTimeout(() => onClose(), 600);
      } catch (err) {
        setErrorMsg('Erreur lors de la suppression.');
      } finally {
        setSaving(false);
      }
    }
  };

  const [yearStr, monthNumStr] = selectedMonth.split('-');
  const monthLabel = `${monthNumStr}/${yearStr}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-2 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <FileCheck className="w-4 h-4" />
            <span>Déclaration RH Officielle</span>
          </div>
          
          <h2 className="text-lg sm:text-xl font-bold">
            Attestation de Service Fait (ASF)
          </h2>
          <p className="text-xs text-blue-200/80 mt-1">
            Déclaration des heures réelles de travail transmises au service RH — Mois : <span className="font-bold text-white">{monthLabel}</span>
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Choix du moniteur */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Moniteur concerné
            </label>
            <div className="grid grid-cols-2 gap-2">
              {monitors.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setTargetMonitorId(m.id);
                    loadMonitorAsfData(m.id);
                  }}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    targetMonitorId === m.id
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xl">{m.avatar || '👨‍🎓'}</span>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-900 truncate">{m.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{(m.hourlyRate || 9.55).toFixed(2)} €/h</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Comparatif Planning vs ASF */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                Heures constatées sur le planning :
              </span>
              <span className="font-extrabold text-slate-800">
                {formatHours(planningHours)} ({planningHours}h)
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Euro className="w-3.5 h-3.5 text-emerald-500" />
                Salaire estimé planning :
              </span>
              <span className="font-extrabold text-slate-800">
                {formatCurrency(planningSalary)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyPlanningHours}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1 cursor-pointer hover:underline"
            >
              <Sparkles className="w-3 h-3 text-blue-500" />
              <span>Copier les heures du planning ({planningHours}h)</span>
            </button>
          </div>

          {/* Saisie des Vraies Heures ASF */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Vraies Heures déclarées aux RH (ASF) *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.25"
                min="0"
                value={asfHours}
                onChange={(e) => setAsfHours(e.target.value)}
                required
                className="w-full bg-white border-2 border-blue-500/80 rounded-2xl px-4 py-2.5 text-base font-extrabold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                placeholder="ex: 18.5"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                heures
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Total officiel validé par la manageuse et transmis sur le bordereau RH.
            </p>
          </div>

          {/* Vrai Salaire Calculé & Delta */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                Vrai Salaire Brut Déclaré RH
              </span>
              <p className="text-xl font-extrabold text-emerald-700">
                {formatCurrency(calculatedAsfSalary)}
              </p>
              <span className="text-[10px] text-emerald-600">
                Calculé sur {parsedAsfHours}h à {rate.toFixed(2)} €/h
              </span>
            </div>

            {hoursDelta !== 0 && (
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Écart Planning</span>
                <p className={`text-xs font-extrabold ${hoursDelta > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {hoursDelta > 0 ? `+${hoursDelta} h` : `${hoursDelta} h`}
                </p>
                <p className={`text-[10px] font-bold ${salaryDelta > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {salaryDelta > 0 ? `+${formatCurrency(salaryDelta)}` : formatCurrency(salaryDelta)}
                </p>
              </div>
            )}
          </div>

          {/* Statut & Déclarant */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Statut de la Déclaration
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="declared">🟢 Transmis aux RH (Déclaré)</option>
                <option value="draft">🟡 Brouillon / En attente</option>
                <option value="validated">🔵 Validé / Mis en paiement RH</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Manageuse déclarative
              </label>
              <input
                type="text"
                value={declaredBy}
                onChange={(e) => setDeclaredBy(e.target.value)}
                placeholder="Virginie ou Kristell"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Observations */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Observations / Justificatifs RH (optionnel)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex: Régularisation permanence du 04/09 comprise..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div>
              {existingAsf && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Supprimer la déclaration</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-4 sm:px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-xs shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{saving ? 'Enregistrement...' : 'Valider & Déclarer aux RH'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
