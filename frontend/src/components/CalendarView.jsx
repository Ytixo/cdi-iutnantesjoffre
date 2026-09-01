import React, { useState } from 'react';
import { Plus, Clock, Users, AlertCircle, Edit, Trash2, Calendar as CalendarIcon, Sparkles, ChevronRight } from 'lucide-react';
import { getMonthMatrix, DAYS_SHORT_FR, DAYS_FR, formatHours, formatDateLong, formatDateShort, formatCurrency, isToday, getTodayString } from '../utils/timeUtils';

export function CalendarView({
  selectedMonth,
  shifts = [],
  monitors = [],
  onSelectShift,
  onAddShiftForDate,
  onOpenAttendance,
  conflicts = []
}) {
  const [calendarMode, setCalendarMode] = useState('month'); // 'month' or 'agenda'
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    // Par défaut, date d'aujourd'hui si dans le mois, sinon 1er jour du mois
    const today = getTodayString();
    if (today.startsWith(selectedMonth)) return today;
    return `${selectedMonth}-01`;
  });

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

  // Créneaux du jour sélectionné (sur mobile ou pour le panneau du bas)
  const selectedDayShifts = getShiftsForDate(selectedDateStr);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      
      {/* Top Header Controls */}
      <div className="p-3.5 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 sm:space-x-3">
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
              onClick={() => setCalendarMode('agenda')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                calendarMode === 'agenda'
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vue Liste
            </button>
          </div>

          {conflicts.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium px-2 sm:px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{conflicts.length} chevauchement{conflicts.length > 1 ? 's' : ''}</span>
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-xs">
          {monitors.map(m => (
            <div key={m.id} className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-xs shrink-0" style={{ backgroundColor: m.color }} />
              <span className="font-semibold text-slate-700 text-xs">{m.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* MODE 1: VUE MOIS RESPONSIVE */}
      {calendarMode === 'month' && (
        <div>
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70 text-center py-2 text-[11px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider">
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
                const isSelected = selectedDateStr === dayObj.dateStr;

                return (
                  <div
                    key={`${wIdx}-${dIdx}`}
                    onClick={() => {
                      if (dayObj.isCurrentMonth) {
                        setSelectedDateStr(dayObj.dateStr);
                      }
                    }}
                    className={`min-h-[55px] sm:min-h-[120px] md:min-h-[135px] p-1 sm:p-2 transition-all flex flex-col justify-between cursor-pointer group relative ${
                      !dayObj.isCurrentMonth
                        ? 'bg-slate-50/30 text-slate-300'
                        : isSelected
                        ? 'bg-blue-50/70 ring-2 ring-inset ring-blue-500 z-10'
                        : dayObj.isToday
                        ? 'bg-blue-50/30'
                        : 'bg-white hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Top day header in cell */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs sm:text-sm font-bold w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center ${
                          dayObj.isToday
                            ? 'bg-blue-600 text-white shadow-xs'
                            : isSelected && dayObj.isCurrentMonth
                            ? 'bg-blue-700 text-white font-extrabold'
                            : dayObj.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-300'
                        }`}
                      >
                        {dayObj.dayNumber}
                      </span>

                      {/* Desktop KPI badges (Hidden on mobile to avoid overflow) */}
                      <div className="hidden sm:flex items-center space-x-1">
                        {totalDayVisitors > 0 && dayObj.isCurrentMonth && (
                          <span
                            title={`${totalDayVisitors} personnes accueillies`}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddShiftForDate(dayObj.dateStr);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-800 p-0.5 hover:bg-blue-50 rounded-md transition-all cursor-pointer"
                            title={`Ajouter un créneau le ${dayObj.dayNumber}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Conflict Badge */}
                    {hasConflict && dayObj.isCurrentMonth && (
                      <div className="hidden sm:flex text-[10px] bg-amber-100/80 text-amber-800 px-1 py-0.5 rounded font-semibold items-center gap-1 my-0.5">
                        <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">Conflit</span>
                      </div>
                    )}

                    {/* MOBILE DISPLAY (< sm): Clean visual dots / pills */}
                    <div className="flex sm:hidden flex-wrap gap-1 mt-1 justify-center">
                      {dayShifts.map(shift => {
                        const monitor = monitors.find(m => m.id === shift.monitorId) || { color: '#2563EB' };
                        return (
                          <span
                            key={shift.id}
                            style={{ backgroundColor: monitor.color }}
                            className="w-2 h-2 rounded-full shadow-xs"
                            title={`${monitor.name}: ${shift.startTime}-${shift.endTime}`}
                          />
                        );
                      })}
                      {totalDayVisitors > 0 && (
                        <span className="text-[8px] font-extrabold text-blue-700 bg-blue-100 px-1 rounded-sm">
                          {totalDayVisitors}
                        </span>
                      )}
                    </div>

                    {/* DESKTOP DISPLAY (>= sm): Full rich cards */}
                    <div className="hidden sm:block space-y-1 my-1 flex-1 overflow-y-auto max-h-[90px]">
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
                            className="w-full text-left p-1 sm:p-1.5 rounded-lg border-l-3 transition-all hover:scale-[1.01] shadow-2xs group/item flex flex-col justify-between"
                          >
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectShift(shift);
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                                <span className="truncate flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: monitor.color }} />
                                  {monitor.name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                                  {formatHours(shift.durationHours)}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-600 font-medium flex items-center gap-1 mt-0.5 whitespace-nowrap">
                                <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                <span>{shift.startTime} - {shift.endTime}</span>
                              </div>
                            </div>

                            {/* Visitor counter badge in cell */}
                            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200/40">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onOpenAttendance) onOpenAttendance(shift, monitor);
                                }}
                                title="Modifier le nombre d'entrées"
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
                                <span className="text-[9px] text-slate-400 truncate max-w-[65px] italic">
                                  {shift.note}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Empty Day click */}
                    {dayShifts.length === 0 && dayObj.isCurrentMonth && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddShiftForDate(dayObj.dateStr);
                        }}
                        className="hidden sm:flex h-full items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Poser
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* AGENDA PANEL DU JOUR SÉLECTIONNÉ (Essentiel pour mobile et très pratique sur desktop) */}
          <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
                <h4 className="font-bold text-slate-900 text-sm sm:text-base capitalize">
                  {formatDateLong(selectedDateStr)}
                </h4>
              </div>

              <button
                onClick={() => onAddShiftForDate(selectedDateStr)}
                className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter ce jour</span>
              </button>
            </div>

            {selectedDayShifts.length === 0 ? (
              <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-white text-center text-xs text-slate-500">
                Aucune permanence programmée pour ce jour. Cliquez sur « Ajouter ce jour » pour poser vos heures.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedDayShifts.map(shift => {
                  const monitor = monitors.find(m => m.id === shift.monitorId) || { name: 'Moniteur', color: '#2563EB', hourlyRate: 9.55 };
                  const visitors = Number(shift.visitorsCount) || 0;
                  const pay = shift.durationHours * (monitor.hourlyRate || 9.55);

                  return (
                    <div
                      key={shift.id}
                      style={{ borderLeftColor: monitor.color }}
                      className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 border-l-4 shadow-xs flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2.5">
                          <span className="text-2xl">{monitor.avatar || '👨‍🎓'}</span>
                          <div>
                            <span className="font-bold text-slate-900 text-sm sm:text-base">
                              {monitor.name}
                            </span>
                            <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-semibold mt-0.5">
                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                              <span>{shift.startTime} - {shift.endTime}</span>
                              <span className="text-slate-400">({formatHours(shift.durationHours)})</span>
                            </div>
                          </div>
                        </div>

                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                          {formatCurrency(pay)}
                        </span>
                      </div>

                      {shift.note && (
                        <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-xl">
                          {shift.note}
                        </p>
                      )}

                      {/* Actions bar for mobile */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        {/* Visitor counter */}
                        <button
                          onClick={() => onOpenAttendance(shift, monitor)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all ${
                            visitors > 0
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{visitors > 0 ? `${visitors} personnes` : '+ Entrées étudiants'}</span>
                        </button>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => onSelectShift(shift)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: VUE LISTE / AGENDA */}
      {calendarMode === 'agenda' && (
        <div className="p-4 sm:p-6 space-y-3">
          {shifts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Aucun créneau enregistré ce mois-ci.
            </div>
          ) : (
            shifts.map(shift => {
              const monitor = monitors.find(m => m.id === shift.monitorId) || { name: 'Moniteur', color: '#2563EB', hourlyRate: 9.55 };
              const visitors = Number(shift.visitorsCount) || 0;
              const pay = shift.durationHours * (monitor.hourlyRate || 9.55);

              return (
                <div
                  key={shift.id}
                  style={{ borderLeftColor: monitor.color }}
                  className="bg-slate-50/60 hover:bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 border-l-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl sm:text-2xl">{monitor.avatar || '👨‍🎓'}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm sm:text-base">{monitor.name}</span>
                        <span className="text-xs text-slate-500">({formatDateShort(shift.date)})</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-slate-600 mt-0.5">
                        <span className="font-bold">{shift.startTime} - {shift.endTime}</span>
                        <span>•</span>
                        <span>{formatHours(shift.durationHours)}</span>
                        <span>•</span>
                        <span className="text-emerald-600 font-bold">{formatCurrency(pay)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-2">
                    <button
                      onClick={() => onOpenAttendance(shift, monitor)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all ${
                        visitors > 0
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-blue-50'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{visitors > 0 ? `${visitors} pers.` : '+ Stats'}</span>
                    </button>

                    <button
                      onClick={() => onSelectShift(shift)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-colors cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

    </div>
  );
}
