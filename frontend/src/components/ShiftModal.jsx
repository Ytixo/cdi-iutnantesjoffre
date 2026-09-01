import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, User, FileText, AlertTriangle, Check, Sparkles, Plus, Trash2, Users } from 'lucide-react';
import { calculateDuration, formatCurrency, formatHours, getTodayString, DAYS_FR } from '../utils/timeUtils';

const QUICK_SLOTS = [
  { start: '12:30', end: '13:30', label: '12h30 - 13h30 (Midi)' },
  { start: '12:00', end: '13:00', label: '12h00 - 13h00' },
  { start: '12:30', end: '14:00', label: '12h30 - 14h00 (1h30)' },
  { start: '13:00', end: '14:00', label: '13h00 - 14h00' },
  { start: '16:30', end: '17:30', label: '16h30 - 17h30 (Soir)' },
  { start: '17:00', end: '18:00', label: '17h00 - 18h00' }
];

export function ShiftModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialShift = null,
  monitors = [],
  activeUserMonitorId,
  existingShifts = []
}) {
  const isEditing = Boolean(initialShift && initialShift.id);

  // Form states
  const [monitorId, setMonitorId] = useState(activeUserMonitorId || 'moniteur-1');
  const [dates, setDates] = useState([getTodayString(1)]);
  const [startTime, setStartTime] = useState('12:30');
  const [endTime, setEndTime] = useState('13:30');
  const [note, setNote] = useState('Permanence accueil CDI');
  const [visitorsCount, setVisitorsCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Initialisation lors de l'ouverture
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (initialShift) {
        setMonitorId(initialShift.monitorId || activeUserMonitorId);
        setDates([initialShift.date]);
        setStartTime(initialShift.startTime || '12:30');
        setEndTime(initialShift.endTime || '13:30');
        setNote(initialShift.note !== undefined ? initialShift.note : 'Permanence accueil CDI');
        setVisitorsCount(Number(initialShift.visitorsCount || 0));
      } else {
        setMonitorId(activeUserMonitorId || (monitors[0] ? monitors[0].id : 'moniteur-1'));
        setDates([getTodayString(1)]); // Demain
        setStartTime('12:30');
        setEndTime('13:30');
        setNote('Permanence accueil CDI');
        setVisitorsCount(0);
      }
    }
  }, [isOpen, initialShift, activeUserMonitorId, monitors]);

  if (!isOpen) return null;

  const currentMonitor = monitors.find(m => m.id === monitorId) || monitors[0] || { name: 'Moniteur', hourlyRate: 9.55 };
  const duration = calculateDuration(startTime, endTime);
  const estimatedPayPerDay = duration * (currentMonitor.hourlyRate || 9.55);
  const totalEstimatedPay = estimatedPayPerDay * dates.length;
  const totalHours = duration * dates.length;

  const setQuickDates = (mode) => {
    if (mode === 'today') {
      setDates([getTodayString(0)]);
    } else if (mode === 'tomorrow') {
      setDates([getTodayString(1)]);
    } else if (mode === 'tomorrow-and-after') {
      setDates([getTodayString(1), getTodayString(2)]);
    } else if (mode === 'next-3-days') {
      setDates([getTodayString(1), getTodayString(2), getTodayString(3)]);
    }
  };

  // Détection de conflits
  const conflictWarnings = [];
  dates.forEach(d => {
    const overlapping = existingShifts.filter(s => {
      if (isEditing && s.id === initialShift.id) return false;
      return s.date === d && (startTime < s.endTime && s.startTime < endTime);
    });

    if (overlapping.length > 0) {
      overlapping.forEach(ov => {
        const ovMon = monitors.find(m => m.id === ov.monitorId);
        conflictWarnings.push({
          date: d,
          monitorName: ovMon ? ovMon.name : 'Autre moniteur',
          time: `${ov.startTime} - ${ov.endTime}`
        });
      });
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (dates.length === 0) {
      setErrorMsg('Veuillez sélectionner au moins une date.');
      return;
    }
    if (startTime >= endTime) {
      setErrorMsg("L'heure de fin doit être postérieure à l'heure de début.");
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      if (isEditing) {
        const result = await onSubmit({
          id: initialShift.id,
          monitorId,
          date: dates[0],
          startTime,
          endTime,
          note,
          visitorsCount: Number(visitorsCount) || 0
        });
        if (!result.success) {
          setErrorMsg(result.error || 'Erreur lors de la modification');
          setSubmitting(false);
          return;
        }
      } else {
        const shiftsToAdd = dates.map(d => ({
          monitorId,
          date: d,
          startTime,
          endTime,
          note,
          visitorsCount: Number(visitorsCount) || 0
        }));

        const result = await onSubmit(shiftsToAdd);
        if (!result.success) {
          setErrorMsg(result.error || "Erreur lors de l'ajout");
          setSubmitting(false);
          return;
        }
      }

      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" />
            <span>{isEditing ? 'Modification permanence' : 'Nouvelle permanence CDI'}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold">
            {isEditing ? 'Modifier mes heures & statistiques' : 'Enregistrer mes heures au CDI'}
          </h2>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Sélection du Moniteur */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Moniteur assigné
            </label>
            <div className="grid grid-cols-2 gap-3">
              {monitors.map(m => {
                const isSelected = m.id === monitorId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMonitorId(m.id)}
                    className={`flex items-center space-x-3 p-2.5 sm:p-3 rounded-2xl border-2 transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-2xl">{m.avatar || '👨‍🎓'}</span>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{m.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{m.hourlyRate || 9.55} €/h</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sélection des Dates & Raccourcis */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Date{dates.length > 1 ? 's sélectionnées' : ''}
              </label>
              {!isEditing && (
                <span className="text-xs text-blue-600 font-semibold">
                  {dates.length} jour{dates.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {!isEditing && (
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setQuickDates('today')}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                >
                  Aujourd'hui
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDates('tomorrow')}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  Demain
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDates('tomorrow-and-after')}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  Demain + Après-demain
                </button>
              </div>
            )}

            <div className="space-y-2">
              {dates.map((d, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={d}
                    onChange={(e) => {
                      const newDates = [...dates];
                      newDates[index] = e.target.value;
                      setDates(newDates);
                    }}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    required
                  />
                  {!isEditing && dates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setDates(dates.filter((_, i) => i !== index))}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {!isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    const lastDate = dates[dates.length - 1] || getTodayString();
                    const nextD = new Date(lastDate + 'T00:00:00');
                    nextD.setDate(nextD.getDate() + 1);
                    const nextStr = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}-${String(nextD.getDate()).padStart(2, '0')}`;
                    setDates([...dates, nextStr]);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 mt-1 p-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter un autre jour
                </button>
              )}
            </div>
          </div>

          {/* Horaires & Créneaux Rapides */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Horaires
            </label>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {QUICK_SLOTS.map((slot, idx) => {
                const isSelected = startTime === slot.start && endTime === slot.end;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setStartTime(slot.start);
                      setEndTime(slot.end);
                    }}
                    className={`px-2 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white font-bold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                    }`}
                  >
                    {slot.start} - {slot.end}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Heure de début</label>
                <input
                  type="time"
                  step="900"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-center"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Heure de fin</label>
                <input
                  type="time"
                  step="900"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-center"
                  required
                />
              </div>
            </div>
          </div>

          {/* Fréquentation & Nombre d'étudiants accueillis */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Nombre de personnes / entrées
              </label>
              <span className="text-xs font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                {visitorsCount} étudiant{visitorsCount > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Nombre de personnes venues au CDI pendant cette permanence
            </p>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="number"
                min="0"
                max="200"
                value={visitorsCount}
                onChange={(e) => setVisitorsCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-20 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-center text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setVisitorsCount(Math.max(0, visitorsCount - 1))}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => setVisitorsCount(visitorsCount + 1)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => setVisitorsCount(visitorsCount + 5)}
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => setVisitorsCount(visitorsCount + 10)}
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  +10
                </button>
              </div>
            </div>
          </div>

          {/* Note / Tâche */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Note / Activité
            </label>
            <input
              type="text"
              placeholder="Permanence accueil CDI"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {conflictWarnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Attention : Créneau déjà occupé</span>
              </div>
              <ul className="list-disc list-inside text-[11px] text-amber-700 space-y-0.5">
                {conflictWarnings.map((warn, i) => (
                  <li key={i}>
                    {warn.date} : {warn.monitorName} a déjà des heures ({warn.time})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Live Preview Box */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-3.5 sm:p-4 border border-blue-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Durée calculée :</p>
              <p className="text-sm sm:text-base font-bold text-slate-900">
                {formatHours(totalHours)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-500">Rémunération ({currentMonitor.hourlyRate || 9.55} €/h) :</p>
              <p className="text-base sm:text-lg font-extrabold text-emerald-600">
                {formatCurrency(totalEstimatedPay)}
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2">
            {isEditing ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Voulez-vous vraiment supprimer ce créneau ?')) {
                    onDelete(initialShift.id);
                    onClose();
                  }
                }}
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Supprimer
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting || duration <= 0}
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'Enregistrer' : `Valider (${formatHours(totalHours)})`}</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
