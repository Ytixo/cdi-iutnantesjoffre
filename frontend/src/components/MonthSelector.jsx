import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Clock, Euro, Users } from 'lucide-react';
import { MONTHS_FR, formatCurrency } from '../utils/timeUtils';

export function MonthSelector({
  selectedMonth,
  setSelectedMonth,
  selectedMonitorFilter,
  setSelectedMonitorFilter,
  monitors = [],
  stats
}) {
  const [yearStr, monthNumStr] = selectedMonth.split('-');
  const currentYear = parseInt(yearStr, 10);
  const currentMonthIndex = parseInt(monthNumStr, 10) - 1;

  const handlePrevMonth = () => {
    let newMonth = currentMonthIndex - 1;
    let newYear = currentYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    setSelectedMonth(`${newYear}-${String(newMonth + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    let newMonth = currentMonthIndex + 1;
    let newYear = currentYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setSelectedMonth(`${newYear}-${String(newMonth + 1).padStart(2, '0')}`);
  };

  const handleToday = () => {
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthName = MONTHS_FR[currentMonthIndex];

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs mb-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        
        {/* Month Navigation */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Mois précédent"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="flex items-center space-x-2 bg-slate-50 px-3.5 sm:px-4 py-2 rounded-xl border border-slate-200">
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
            <span className="font-bold text-slate-800 text-sm sm:text-base whitespace-nowrap">
              {monthName} {currentYear}
            </span>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Mois suivant"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            onClick={handleToday}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 px-2.5 sm:px-3 py-2 rounded-xl transition-colors border border-blue-200/60 whitespace-nowrap cursor-pointer"
          >
            Aujourd'hui
          </button>
        </div>

        {/* Filter by Monitor */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 lg:pb-0">
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1 hidden sm:flex whitespace-nowrap">
            <Filter className="w-3.5 h-3.5" /> Filtrer :
          </span>
          <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 text-xs font-medium w-full sm:w-auto shrink-0">
            <button
              onClick={() => setSelectedMonitorFilter('ALL')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                selectedMonitorFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous ({stats?.totalCdiHours || 0}h)
            </button>
            {monitors.map(m => {
              const mStats = stats?.monitors?.find(stat => stat.monitorId === m.id);
              const isSelected = selectedMonitorFilter === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMonitorFilter(m.id)}
                  className={`flex-1 sm:flex-none flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <span>{m.name}</span>
                  {mStats && <span className="text-[11px] text-slate-400 font-normal">({mStats.totalHours}h)</span>}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Mini KPI Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
          <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium truncate">
              <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate">Total Heures CDI</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-slate-900 mt-1">{stats.formattedTotalCdiHours || '0h00'}</p>
          </div>

          <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium truncate">
              <Euro className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="truncate">Budget Global</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-emerald-600 mt-1">{formatCurrency(stats.totalCdiBudget || 0)}</p>
          </div>

          {stats.monitors?.map(m => (
            <div key={m.monitorId} className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="truncate font-semibold">{m.name}</span>
                </span>
                <span className="text-slate-400 font-semibold">{m.percentage || 0}%</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <p className="text-base sm:text-lg font-bold text-slate-800">{m.formattedHours}</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-600">{formatCurrency(m.estimatedSalary)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
