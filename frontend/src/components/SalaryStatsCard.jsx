import React, { useState } from 'react';
import { DollarSign, Clock, TrendingUp, Award, Edit3, Check, Users } from 'lucide-react';
import { formatCurrency, formatHours } from '../utils/timeUtils';

export function SalaryStatsCard({
  stats,
  monitors,
  onUpdateMonitorRate,
  onOpenSettings
}) {
  const [editingRateMonitorId, setEditingRateMonitorId] = useState(null);
  const [tempRate, setTempRate] = useState('');

  if (!stats) return null;

  const handleStartEditRate = (monitor) => {
    setEditingRateMonitorId(monitor.id);
    setTempRate(String(monitor.hourlyRate || 11.88));
  };

  const handleSaveRate = async (monitorId) => {
    const rateNum = parseFloat(tempRate);
    if (!isNaN(rateNum) && rateNum > 0) {
      await onUpdateMonitorRate(monitorId, rateNum);
    }
    setEditingRateMonitorId(null);
  };

  const monitor1 = stats.monitors?.[0];
  const monitor2 = stats.monitors?.[1];

  return (
    <div className="space-y-6 mb-6">
      
      {/* Cards per Monitor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {stats.monitors?.map(m => {
          const isEditingThisRate = editingRateMonitorId === m.monitorId;
          const monConfig = monitors.find(mon => mon.id === m.monitorId) || m;

          return (
            <div
              key={m.monitorId}
              style={{ borderColor: `${m.color}30` }}
              className="bg-white rounded-3xl p-6 border shadow-xs relative overflow-hidden flex flex-col justify-between transition-all hover:shadow-md"
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
                      <h3 className="text-lg font-bold text-slate-900">{m.name}</h3>
                      <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{m.shiftsCount} créneau{m.shiftsCount > 1 ? 'x' : ''} ce mois</span>
                      </div>
                    </div>
                  </div>

                  {/* Share % badge */}
                  <span
                    style={{ backgroundColor: `${m.color}15`, color: m.color }}
                    className="text-xs font-bold px-3 py-1 rounded-full"
                  >
                    {m.percentage}% du temps CDI
                  </span>
                </div>

                {/* Main Stats: Hours & Estimated Salary */}
                <div className="grid grid-cols-2 gap-3 my-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Heures Travaillées
                    </span>
                    <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
                      {m.formattedHours}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">
                      ({m.totalHours.toString().replace('.', ',')} h au total)
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Salaire Estimé
                    </span>
                    <p className="text-2xl font-extrabold text-emerald-600 mt-0.5">
                      {formatCurrency(m.estimatedSalary)}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">
                      brut calculé
                    </span>
                  </div>
                </div>
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
                      <button
                        onClick={() => handleStartEditRate(monConfig)}
                        className="text-slate-400 hover:text-blue-600 p-0.5"
                        title="Modifier le taux horaire"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
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
