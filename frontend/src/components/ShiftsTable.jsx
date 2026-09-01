import React, { useState } from 'react';
import { Download, FileSpreadsheet, Printer, Search, Plus, Trash2, Edit, Users, Clock } from 'lucide-react';
import { formatDateShort, formatHours, formatCurrency, DAYS_FR, exportToCSV, exportToPDF } from '../utils/timeUtils';

export function ShiftsTable({
  shifts = [],
  monitors = [],
  stats,
  selectedMonth,
  settings,
  onSelectShift,
  onDeleteShift,
  onOpenAddModal,
  onOpenAttendance,
  conflicts = []
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonitorId, setFilterMonitorId] = useState('ALL');

  const filteredShifts = shifts.filter(shift => {
    const monitor = monitors.find(m => m.id === shift.monitorId);
    const matchesMonitor = filterMonitorId === 'ALL' || shift.monitorId === filterMonitorId;
    const matchesSearch =
      shift.date.includes(searchTerm) ||
      (shift.note && shift.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (monitor && monitor.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesMonitor && matchesSearch;
  });

  const totalFilteredHours = filteredShifts.reduce((acc, s) => acc + (s.durationHours || 0), 0);
  const totalFilteredVisitors = filteredShifts.reduce((acc, s) => acc + (Number(s.visitorsCount) || 0), 0);
  const totalFilteredPay = filteredShifts.reduce((acc, s) => {
    const mon = monitors.find(m => m.id === s.monitorId);
    return acc + (s.durationHours * (mon?.hourlyRate || 9.55));
  }, 0);

  const handleExportCSV = () => {
    exportToCSV(filteredShifts, monitors, selectedMonth);
  };

  const handleExportPDF = () => {
    exportToPDF(filteredShifts, monitors, stats, selectedMonth, settings);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher (date, note, moniteur)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white w-56 sm:w-64"
            />
          </div>

          <select
            value={filterMonitorId}
            onChange={(e) => setFilterMonitorId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Tous les moniteurs</option>
            {monitors.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
            title="Exporter en PDF officiel"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
            title="Exporter en CSV / Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
            title="Imprimer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Imprimer</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau créneau</span>
          </button>
        </div>

      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-3.5 pl-5">Date & Jour</th>
              <th className="p-3.5">Moniteur</th>
              <th className="p-3.5">Créneau Horaire</th>
              <th className="p-3.5">Durée</th>
              <th className="p-3.5">Taux (€/h)</th>
              <th className="p-3.5">Rémunération</th>
              <th className="p-3.5">Fréquentation</th>
              <th className="p-3.5">Note</th>
              <th className="p-3.5 pr-5 text-right no-print">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {filteredShifts.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">
                  Aucun créneau enregistré pour ce mois.
                </td>
              </tr>
            ) : (
              filteredShifts.map(shift => {
                const monitor = monitors.find(m => m.id === shift.monitorId) || { name: 'Inconnu', color: '#64748B', hourlyRate: 9.55 };
                const shiftPay = shift.durationHours * (monitor.hourlyRate || 9.55);
                const d = new Date(shift.date + 'T00:00:00');
                const dayName = DAYS_FR[d.getDay()];
                const visitors = Number(shift.visitorsCount) || 0;

                return (
                  <tr key={shift.id} className="hover:bg-slate-50/80 transition-colors group">
                    
                    <td className="p-3.5 pl-5 font-semibold text-slate-900">
                      <div>{formatDateShort(shift.date)}</div>
                      <span className="text-[11px] font-normal text-slate-400">{dayName}</span>
                    </td>

                    <td className="p-3.5">
                      <span
                        style={{
                          backgroundColor: `${monitor.color}15`,
                          color: monitor.color,
                          borderColor: `${monitor.color}40`
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs border"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: monitor.color }} />
                        {monitor.name}
                      </span>
                    </td>

                    <td className="p-3.5 font-bold text-slate-800">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{shift.startTime} - {shift.endTime}</span>
                      </div>
                    </td>

                    <td className="p-3.5 font-semibold text-slate-700">
                      {formatHours(shift.durationHours)}
                    </td>

                    <td className="p-3.5 text-slate-500 font-medium">
                      {(monitor.hourlyRate || 9.55).toFixed(2)} €/h
                    </td>

                    <td className="p-3.5 font-bold text-emerald-600">
                      {formatCurrency(shiftPay)}
                    </td>

                    {/* Visitors Count Badge */}
                    <td className="p-3.5">
                      <button
                        onClick={() => onOpenAttendance(shift, monitor)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          visitors > 0
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                        title="Modifier le nombre de visiteurs"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{visitors > 0 ? `${visitors} pers.` : '+ Saisir'}</span>
                      </button>
                    </td>

                    <td className="p-3.5 text-slate-500 italic max-w-xs truncate">
                      {shift.note || <span className="text-slate-300">-</span>}
                    </td>

                    <td className="p-3.5 pr-5 text-right no-print">
                      <div className="flex items-center justify-end space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onSelectShift(shift)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Voulez-vous supprimer ce créneau ?')) {
                              onDeleteShift(shift.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>

          {filteredShifts.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200 text-xs sm:text-sm">
                <td className="p-3.5 pl-5" colSpan={3}>
                  Total ({filteredShifts.length} créneau{filteredShifts.length > 1 ? 'x' : ''})
                </td>
                <td className="p-3.5 text-blue-700 font-extrabold">
                  {formatHours(totalFilteredHours)}
                </td>
                <td className="p-3.5"></td>
                <td className="p-3.5 text-emerald-700 font-extrabold">
                  {formatCurrency(totalFilteredPay)}
                </td>
                <td className="p-3.5 text-blue-700 font-extrabold">
                  {totalFilteredVisitors} pers.
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
