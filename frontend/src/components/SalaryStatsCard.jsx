import React, { useState } from 'react';
import { Clock, Edit3, Check, FileCheck, AlertCircle, CheckCircle2, Send, Sparkles } from 'lucide-react';
import { formatCurrency, formatHours } from '../utils/timeUtils';

export function SalaryStatsCard({
  stats,
  monitors,
  currentUser,
  onUpdateMonitorRate,
  onOpenSettings,
  onOpenAsfModal
}) {
  const [editingRateMonitorId, setEditingRateMonitorId] = useState(null);
  const [tempRate, setTempRate] = useState('');

  if (!stats) return null;

  const isManager = currentUser?.role === 'manager' || currentUser?.isManager;

  const handleStartEditRate = (monitor) => {
    if (!isManager) return;
    setEditingRateMonitorId(monitor.id);
    setTempRate(String(monitor.hourlyRate || 9.55));
  };

  const handleSaveRate = async (monitorId) => {
    const rateNum = parseFloat(tempRate);
    if (!isNaN(rateNum) && rateNum > 0) {
      await onUpdateMonitorRate(monitorId, rateNum);
    }
    setEditingRateMonitorId(null);
  };

  return (
    <div className="space-y-6 mb-6">
      
      {/* Cards per Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {stats.monitors?.map(m => {
          const isEditingThisRate = editingRateMonitorId === m.monitorId;
          const monConfig = monitors.find(mon => mon.id === m.monitorId) || m;
          const hasAsf = m.hasAsf;

          return (
            <div
              key={m.monitorId}
              style={{ borderColor: `${m.color}30` }}
              className="bg-white rounded-3xl p-5 sm:p-6 border shadow-xs relative overflow-hidden flex flex-col justify-between transition-all hover:shadow-md"
            >
              {/* Colored top ambient bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: m.color }}
              />

              <div>
                {/* Header with avatar & name */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs"
                      style={{ backgroundColor: `${m.color}15` }}
                    >
                      {m.avatar || '🎓'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">{m.name}</h3>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                          Moniteur CDI
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{m.shiftsCount} créneau{m.shiftsCount > 1 ? 'x' : ''} au planning ce mois</span>
                      </div>
                    </div>
                  </div>

                  {/* Share % badge */}
                  <span
                    style={{ backgroundColor: `${m.color}15`, color: m.color }}
                    className="text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap"
                  >
                    {m.percentage}% du temps CDI
                  </span>
                </div>

                {/* Double Section : Salaire Planning vs Vrai Salaire RH (ASF) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
                  
                  {/* 1. Planning constaté */}
                  <div className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200/70">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        📅 Planning Constaté
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {m.shiftsCount} créneaux
                      </span>
                    </div>

                    <div className="mt-2">
                      <p className="text-xs font-bold text-slate-700">
                        {m.formattedHours}
                        <span className="text-[11px] font-normal text-slate-400 ml-1">
                          ({m.totalHours} h)
                        </span>
                      </p>
                      <p className="text-xl font-extrabold text-slate-800 mt-1">
                        {formatCurrency(m.estimatedSalary)}
                      </p>
                      <span className="text-[10px] text-slate-500 font-medium">
                        salaire prévisionnel
                      </span>
                    </div>
                  </div>

                  {/* 2. Vrai Salaire Déclaré RH (ASF) */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    hasAsf
                      ? 'bg-gradient-to-br from-emerald-50/90 to-teal-50/80 border-emerald-200 shadow-xs'
                      : 'bg-amber-50/70 border-amber-200/80'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                        hasAsf ? 'text-emerald-800' : 'text-amber-800'
                      }`}>
                        🏢 Déclaré aux RH (ASF)
                      </span>
                      {hasAsf ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Officiel</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>En attente</span>
                        </span>
                      )}
                    </div>

                    <div className="mt-2">
                      <p className={`text-xs font-extrabold ${hasAsf ? 'text-emerald-900' : 'text-slate-700'}`}>
                        {m.formattedAsfHours}
                        <span className={`text-[11px] font-normal ml-1 ${hasAsf ? 'text-emerald-700' : 'text-slate-400'}`}>
                          ({m.asfHours} h validées)
                        </span>
                      </p>
                      <p className={`text-2xl font-extrabold mt-0.5 ${
                        hasAsf ? 'text-emerald-600' : 'text-slate-800'
                      }`}>
                        {formatCurrency(m.asfSalary)}
                      </p>
                      <span className={`text-[10px] font-bold ${
                        hasAsf ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {hasAsf ? 'vrai salaire brut déclaré' : 'estimé (en attente saisie ASF)'}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Bannière d'état ASF & Écart éventuel */}
                <div className="mb-4">
                  {hasAsf ? (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-1.5 text-slate-600">
                        <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Transmis aux RH par <span className="font-bold text-slate-800">{m.asfDeclaredBy || 'Manageuse'}</span>
                          {m.asfNotes && <span className="italic text-slate-500"> — « {m.asfNotes} »</span>}
                        </span>
                      </div>

                      {m.hoursDelta !== 0 && (
                        <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                          m.hoursDelta > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          Écart : {m.hoursDelta > 0 ? `+${m.hoursDelta}` : m.hoursDelta}h ({m.salaryDelta > 0 ? `+${formatCurrency(m.salaryDelta)}` : formatCurrency(m.salaryDelta)})
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-200/60 flex items-center justify-between text-xs text-amber-800">
                      <span className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        L'Attestation de Service Fait (ASF) pour ce mois n'a pas encore été saisie.
                      </span>
                    </div>
                  )}
                </div>

                {/* Action ASF pour les Manageuses */}
                {isManager && onOpenAsfModal && (
                  <div className="mb-3">
                    <button
                      onClick={() => onOpenAsfModal(m.monitorId)}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl border border-blue-200/80 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99] text-xs"
                    >
                      <FileCheck className="w-4 h-4 text-blue-600" />
                      <span>{hasAsf ? 'Modifier l\'ASF (Vraies heures déclarées aux RH)' : 'Saisir l\'ASF (Déclarer les vraies heures aux RH)'}</span>
                    </button>
                  </div>
                )}

              </div>

              {/* Bottom: Hourly rate edit */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-slate-600">
                  <span>Taux horaire :</span>
                  {isEditingThisRate ? (
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        step="0.01"
                        value={tempRate}
                        onChange={(e) => setTempRate(e.target.value)}
                        className="w-16 px-2 py-0.5 bg-white border border-blue-500 rounded-md font-bold text-slate-800 text-xs text-center"
                        autoFocus
                      />
                      <span className="text-slate-500 font-bold">€/h</span>
                      <button
                        onClick={() => handleSaveRate(m.monitorId)}
                        className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                        title="Sauvegarder"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      {m.hourlyRate.toFixed(2)} €/h
                      {isManager && (
                        <button
                          onClick={() => handleStartEditRate(monConfig)}
                          className="text-slate-400 hover:text-blue-600 p-0.5"
                          title="Modifier le taux horaire"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-400">
                  Moyenne : {m.shiftsCount > 0 ? (m.totalHours / m.shiftsCount).toFixed(1) : 0}h / créneau
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

