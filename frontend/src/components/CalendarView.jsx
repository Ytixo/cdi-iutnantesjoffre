import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, User, AlertCircle, Users } from 'lucide-react';
import { getMonthMatrix, DAYS_SHORT_FR, DAYS_FR, formatHours, formatDateShort, formatCurrency, isToday } from '../utils/timeUtils';

export function CalendarView({
  selectedMonth,
  shifts = [],
  monitors = [],
  onSelectShift,
  onAddShiftForDate,
  onOpenAttendance,
  conflicts = []
}) {
  const [calendarMode, setCalendarMode] = useState('month');

  const [yearStr, monthNumStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthNumStr, 10) - 1;

  const monthMatrix = getMonthMatrix(year, monthIndex);

  const getShiftsForDate = (dateStr) => {
    return shifts.filter(s => s.date === dateStr);
  };

  const hasConflictOnDate = (dateStr) => {
    return conflicts.some(c => c.shift1.date === dateStr || c.shift2.date === dateStr);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      
      {/* Header Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 text-xs font-semibold">
            <button
              onClick={() => setCalendarMode('month')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                calendarMode === 'month'
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vue Mois
            </button>
            <button
              onClick={() => setCalendarMode('week')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                calendarMode === 'week'
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vue Semaine
            </button>
          </div>

          {conflicts.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              {conflicts.length} chevauchement{conflicts.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-xs">
          {monitors.map(m => (
            <div key={m.id} className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full shadow-xs" style={{ backgroundColor: m.color }} />
              <span className="font-semibold text-slate-700">{m.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mode VUE MOIS */}
      {calendarMode === 'month' && (
        <div>
          {/* Days header */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70 text-center py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d, i) => (
              <div key={i} className={i >= 5 ? 'text-slate-400' : ''}>
                {d}
              </div>
            ))}
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {monthMatrix.map((week, wIdx) =>
              week.map((dayObj, dIdx) => {
                const dayShifts = getShiftsForDate(dayObj.dateStr);
                const hasConflict = hasConflictOnDate(dayObj.dateStr);
                const totalDayHours = dayShifts.reduce((acc, s) => acc + (s.durationHours || 0), 0);
                const totalDayVisitors = dayShifts.reduce((acc, s) => acc + (Number(s.visitorsCount) || 0), 0);

                return (
                  <div
                    key={`${wIdx}-${dIdx}`}
                    className={`min-h-[110px] sm:min-h-[135px] p-1.5 sm:p-2.5 transition-colors flex flex-col justify-between group relative ${
                      !dayObj.isCurrentMonth
                        ? 'bg-slate-50/40 text-slate-300'
                        : dayObj.isToday
                        ? 'bg-blue-50/40'
                        : 'bg-white hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Top day header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs sm:text-sm font-bold w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center ${
                          dayObj.isToday
                            ? 'bg-blue-600 text-white shadow-xs'
                            : dayObj.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-300'
                        }`}
                      >
                        {dayObj.dayNumber}
                      </span>

                      {/* Day summary badges */}
                      <div className="flex items-center space-x-1">
                        {totalDayVisitors > 0 && dayObj.isCurrentMonth && (
                          <span
                            title={`${totalDayVisitors} personnes accueillies ce jour`}
                            className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                          >
                            <Users className="w-2.5 h-2.5" />
                            {totalDayVisitors}
                          </span>
                        )}
                        {totalDayHours > 0 && dayObj.isCurrentMonth && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            {formatHours(totalDayHours)}
                          </span>
                        )}
                        {dayObj.isCurrentMonth && (
                          <button
                            onClick={() => onAddShiftForDate(dayObj.dateStr)}
                            className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                            title={`Ajouter un créneau le ${dayObj.dayNumber}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Conflict Badge */}
                    {hasConflict && dayObj.isCurrentMonth && (
                      <div className="text-[10px] bg-amber-100/80 text-amber-800 px-1 py-0.5 rounded font-semibold flex items-center gap-1 my-0.5">
                        <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">Chevauchement</span>
                      </div>
                    )}

                    {/* Shifts list in day cell */}
                    <div className="space-y-1 my-1 flex-1 overflow-y-auto max-h-[90px]">
                      {dayShifts.map(shift => {
                        const monitor = monitors.find(m => m.id === shift.monitorId) || { name: 'Moniteur', color: '#2563EB' };
                        const visitors = Number(shift.visitorsCount) || 0;

                        return (
                          <div
                            key={shift.id}
                            style={{
                              borderLeftColor: monitor.color,
                              backgroundColor: `${monitor.color}15`
                            }}
                            className="w-full text-left p-1 sm:p-1.5 rounded-lg border-l-3 transition-all hover:scale-[1.02] shadow-2xs group/item flex flex-col justify-between"
                          >
                            <div
                              onClick={() => onSelectShift(shift)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                                <span className="truncate flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: monitor.color }} />
                                  {monitor.name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  {formatHours(shift.durationHours)}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-600 font-medium flex items-center gap-1 mt-0.5">
                                <Clock className="w-2.5 h-2.5 text-slate-400" />
                                <span>{shift.startTime} - {shift.endTime}</span>
                              </div>
                            </div>

                            {/* Visitor counter badge with 1-click update */}
                            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200/40">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onOpenAttendance) onOpenAttendance(shift, monitor);
                                }}
                                title="Cliquer pour modifier le nombre d'entrées"
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-all ${
                                  visitors > 0 
                                    ? 'bg-blue-600 text-white shadow-2xs hover:bg-blue-700' 
                                    : 'bg-slate-200/80 hover:bg-blue-100 text-slate-600 hover:text-blue-700'
                                }`}
                              >
                                <Users className="w-2.5 h-2.5" />
                                <span>{visitors > 0 ? `${visitors} pers.` : '+ Stats'}</span>
                              </button>

                              {shift.note && (
                                <span className="text-[9px] text-slate-400 truncate max-w-[70px] italic">
                                  {shift.note}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Empty Day click */}
                    {dayShifts.length === 0 && dayObj.isCurrentMonth && (
                      <div
                        onClick={() => onAddShiftForDate(dayObj.dateStr)}
                        className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Poser créneau
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Mode VUE SEMAINE */}
      {calendarMode === 'week' && (
        <div className="p-6 text-center text-slate-500 text-sm">
          <p className="font-semibold text-slate-800">Planning de la semaine</p>
          <p className="text-xs text-slate-400 mt-1">Utilisez la vue mois pour une vue d'ensemble rapide ou la saisie directe des heures.</p>
        </div>
      )}

    </div>
  );
}
