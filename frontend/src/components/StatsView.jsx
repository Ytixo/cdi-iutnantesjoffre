import React, { useState } from 'react';
import { BarChart3, TrendingUp, Calendar, Clock, Euro, Users, Sparkles, Award, UserCheck, ChevronRight } from 'lucide-react';
import { formatCurrency, formatHours, MONTHS_FR, formatDateShort } from '../utils/timeUtils';
import { SalaryStatsCard } from './SalaryStatsCard';

export function StatsView({
  stats,
  monitors = [],
  selectedMonth,
  onUpdateMonitorRate,
  onOpenSettings
}) {
  const [activeStatsTab, setActiveStatsTab] = useState('all'); // 'all', 'attendance', 'salary'

  if (!stats) return null;

  const [yearStr, monthNumStr] = selectedMonth.split('-');
  const monthName = MONTHS_FR[parseInt(monthNumStr, 10) - 1];

  // Maximum de fréquentation pour l'échelle des graphiques
  const maxDailyVisitors = Math.max(1, ...(stats.dailyAttendance || []).map(d => d.visitors || 0));
  const maxDayVisitors = Math.max(1, ...(stats.dayDistribution || []).map(d => d.totalVisitors || 0));
  const maxDayHours = Math.max(1, ...(stats.dayDistribution || []).map(d => d.totalHours || 0));

  const monitor1 = stats.monitors?.[0];
  const monitor2 = stats.monitors?.[1];

  const totalVisitorsNoah = monitor1?.totalVisitors || 0;
  const totalVisitorsLucas = monitor2?.totalVisitors || 0;
  const totalCombinedVisitors = totalVisitorsNoah + totalVisitorsLucas;

  return (
    <div className="space-y-6">
      
      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs w-fit">
        <button
          onClick={() => setActiveStatsTab('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeStatsTab === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Vue d'ensemble
        </button>
        <button
          onClick={() => setActiveStatsTab('attendance')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeStatsTab === 'attendance'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Fréquentation Étudiants</span>
        </button>
        <button
          onClick={() => setActiveStatsTab('salary')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeStatsTab === 'salary'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Euro className="w-3.5 h-3.5" />
          <span>Salaires & Heures</span>
        </button>
      </div>

      {/* SECTION: FRÉQUENTATION & AFFLUENCE ÉTUDIANTS */}
      {(activeStatsTab === 'all' || activeStatsTab === 'attendance') && (
        <div className="space-y-6">
          
          {/* Top 3 Attendance KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Total Visiteurs */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-5 text-white shadow-md shadow-blue-500/15 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                  Total Fréquentation
                </span>
                <div className="p-2 bg-white/15 rounded-xl">
                  <Users className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="my-3">
                <p className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  {stats.totalMonthVisitors || 0}
                </p>
                <p className="text-xs text-blue-100 mt-1">
                  étudiants accueillis en {monthName}
                </p>
              </div>
              <div className="text-[11px] text-blue-200/90 pt-2 border-t border-white/10 flex items-center justify-between">
                <span>Sur {stats.dailyAttendance?.filter(d => d.visitors > 0).length || 0} permanences actives</span>
                <span className="font-bold">CDI IUT</span>
              </div>
            </div>

            {/* Moyenne par permanence */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Moyenne par permanence
                </span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="my-3">
                <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  {stats.avgVisitorsPerShift || 0}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  personnes en moyenne par créneau
                </p>
              </div>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span>Permanences midi (12h30 - 13h30)</span>
                <span className="font-bold text-emerald-600">Régulier</span>
              </div>
            </div>

            {/* Record d'affluence */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pic / Record d'affluence
                </span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <div className="my-3">
                {stats.peakDay ? (
                  <>
                    <p className="text-3xl sm:text-4xl font-extrabold text-amber-600 tracking-tight">
                      {stats.peakDay.count} <span className="text-sm font-semibold text-slate-500">étudiants</span>
                    </p>
                    <p className="text-xs text-slate-600 mt-1 font-semibold">
                      Le {formatDateShort(stats.peakDay.date)} ({stats.peakDay.monitorName})
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-slate-400 mt-2">Aucune donnée</p>
                    <p className="text-xs text-slate-400 mt-1">Saisissez vos permanences</p>
                  </>
                )}
              </div>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span>Meilleure affluence</span>
                <span className="font-bold text-amber-600">Record mensuel</span>
              </div>
            </div>

          </div>

          {/* Graphique 1: Évolution quotidienne de la fréquentation (Histogramme sur le mois) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Évolution de l'affluence jour par jour ({monthName} {yearStr})
                </h3>
                <p className="text-xs text-slate-500">Nombre d'étudiants accueillis à chaque jour du mois</p>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 w-fit">
                Max : {maxDailyVisitors} personnes
              </span>
            </div>

            {/* Daily Bars Chart */}
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[650px] flex items-end justify-between gap-1.5 h-44 pt-6 px-2 border-b border-slate-100">
                {(stats.dailyAttendance || []).map(dayData => {
                  const heightPercent = maxDailyVisitors > 0 ? (dayData.visitors / maxDailyVisitors) * 100 : 0;
                  const hasVisitors = dayData.visitors > 0;
                  const firstShift = dayData.shifts?.[0];
                  const monitor = monitors.find(m => m.id === firstShift?.monitorId);

                  return (
                    <div
                      key={dayData.day}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-10 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg shadow-lg transition-all z-20 whitespace-nowrap">
                        {formatDateShort(dayData.dateStr)} : {dayData.visitors} pers. {monitor ? `(${monitor.name})` : ''}
                      </div>

                      {/* Bar */}
                      <div
                        style={{
                          height: hasVisitors ? `${Math.max(12, heightPercent)}%` : '4px',
                          backgroundColor: monitor ? monitor.color : hasVisitors ? '#2563EB' : '#E2E8F0'
                        }}
                        className={`w-full max-w-[22px] rounded-t-lg transition-all duration-300 group-hover:brightness-110 flex items-start justify-center pt-0.5 ${
                          hasVisitors ? 'shadow-xs' : ''
                        }`}
                      >
                        {hasVisitors && (
                          <span className="text-[9px] font-extrabold text-white">
                            {dayData.visitors}
                          </span>
                        )}
                      </div>

                      {/* Day Number Label */}
                      <span className={`text-[10px] mt-2 font-semibold ${hasVisitors ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                        {dayData.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Graphique 2 & 3: Affluence par Jour de la semaine & Comparatif Moniteurs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Fréquentation par jour de la semaine */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Fréquentation par jour de la semaine
                  </h3>
                  <p className="text-xs text-slate-500">Quels sont les jours les plus fréquentés au CDI ?</p>
                </div>
              </div>

              <div className="space-y-3.5 pt-2">
                {(stats.dayDistribution || []).map(d => {
                  const percent = maxDayVisitors > 0 ? (d.totalVisitors / maxDayVisitors) * 100 : 0;

                  return (
                    <div key={d.day} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700">{d.day}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-900 font-bold">{d.totalVisitors} étudiants</span>
                          <span className="text-slate-400 text-[11px]">({d.avgVisitors} / créneau)</span>
                        </div>
                      </div>

                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            d.totalVisitors > 0 ? 'bg-indigo-600' : 'bg-slate-200'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Répartition de l'affluence entre Noah et Lucas */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  Étudiants accueillis par moniteur
                </h3>
                <p className="text-xs text-slate-500 mb-5">Volume d'étudiants reçus lors des permanences respectives</p>

                <div className="grid grid-cols-2 gap-4">
                  {monitors.map(m => {
                    const mStats = stats.monitors?.find(s => s.monitorId === m.id);
                    const vCount = mStats?.totalVisitors || 0;
                    const vAvg = mStats?.avgVisitors || 0;

                    return (
                      <div
                        key={m.id}
                        style={{ borderColor: `${m.color}30` }}
                        className="p-4 rounded-2xl border bg-slate-50/50 space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">{m.avatar || '👨‍🎓'}</span>
                          <span className="font-bold text-slate-900 text-sm">{m.name}</span>
                        </div>
                        <p className="text-2xl font-extrabold text-slate-900">
                          {vCount} <span className="text-xs font-semibold text-slate-500">étudiants</span>
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Moyenne : <strong className="text-slate-800">{vAvg}</strong> / créneau
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Parity bar for attendance */}
              {totalCombinedVisitors > 0 && monitor1 && monitor2 && (
                <div className="pt-5 border-t border-slate-100 mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                    <span style={{ color: monitor1.color }}>{monitor1.name} ({Math.round((totalVisitorsNoah / totalCombinedVisitors) * 100)}%)</span>
                    <span style={{ color: monitor2.color }}>{monitor2.name} ({Math.round((totalVisitorsLucas / totalCombinedVisitors) * 100)}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{
                        width: `${(totalVisitorsNoah / totalCombinedVisitors) * 100}%`,
                        backgroundColor: monitor1.color
                      }}
                      className="h-full transition-all duration-500"
                    />
                    <div
                      style={{
                        width: `${(totalVisitorsLucas / totalCombinedVisitors) * 100}%`,
                        backgroundColor: monitor2.color
                      }}
                      className="h-full transition-all duration-500"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* SECTION: SALAIRES & HEURES */}
      {(activeStatsTab === 'all' || activeStatsTab === 'salary') && (
        <div className="space-y-6 pt-2">
          
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Euro className="w-4 h-4 text-emerald-600" />
              Récapitulatif des Rémunérations & Heures Travaillées
            </h3>
            <span className="text-xs text-slate-500">Taux officiel : 9,55 €/h</span>
          </div>

          <SalaryStatsCard
            stats={stats}
            monitors={monitors}
            onUpdateMonitorRate={onUpdateMonitorRate}
            onOpenSettings={onOpenSettings}
          />

        </div>
      )}

    </div>
  );
}
