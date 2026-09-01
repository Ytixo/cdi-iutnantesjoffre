import React, { useState } from 'react';
import { useShiftsData } from './hooks/useShiftsData';
import { Navbar } from './components/Navbar';
import { MonthSelector } from './components/MonthSelector';
import { CalendarView } from './components/CalendarView';
import { ShiftsTable } from './components/ShiftsTable';
import { StatsView } from './components/StatsView';
import { SalaryStatsCard } from './components/SalaryStatsCard';
import { ShiftModal } from './components/ShiftModal';
import { SettingsModal } from './components/SettingsModal';
import { AttendanceModal } from './components/AttendanceModal';
import { ConflictAlert } from './components/ConflictAlert';
import { Loader2 } from 'lucide-react';

export function App() {
  const {
    monitors,
    settings,
    shifts,
    conflicts,
    stats,
    loading,
    isSynced,
    dataSource,
    selectedMonth,
    setSelectedMonth,
    selectedMonitorFilter,
    setSelectedMonitorFilter,
    activeUserMonitorId,
    setActiveUserMonitorId,
    addShifts,
    updateShift,
    deleteShift,
    updateMonitor,
    updateSettings,
    updateVisitorsCount
  } = useShiftsData();

  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar', 'table', 'stats'
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [attendanceTarget, setAttendanceTarget] = useState({ shift: null, monitor: null });

  // Ouvrir la modale d'édition de créneau
  const handleSelectShift = (shift) => {
    setEditingShift(shift);
    setIsShiftModalOpen(true);
  };

  // Ouvrir la modale d'ajout pour une date précise
  const handleAddShiftForDate = (dateStr, startTime = '12:30', endTime = '13:30') => {
    setEditingShift({
      date: dateStr,
      startTime,
      endTime,
      monitorId: activeUserMonitorId,
      note: 'Permanence accueil CDI',
      visitorsCount: 0
    });
    setIsShiftModalOpen(true);
  };

  // Ouvrir la modale rapide de fréquentation
  const handleOpenAttendance = (shift, monitor) => {
    setAttendanceTarget({ shift, monitor });
    setIsAttendanceModalOpen(true);
  };

  // Soumission de créneau
  const handleShiftSubmit = async (payload) => {
    if (editingShift && editingShift.id) {
      return await updateShift(editingShift.id, payload);
    } else {
      return await addShifts(payload);
    }
  };

  const handleUpdateMonitorRate = async (monitorId, rate) => {
    return await updateMonitor(monitorId, { hourlyRate: rate });
  };

  return (
    <div className="min-h-screen bg-slate-100/60 flex flex-col">
      
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => {
          setEditingShift(null);
          setIsShiftModalOpen(true);
        }}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        monitors={monitors}
        activeUserMonitorId={activeUserMonitorId}
        setActiveUserMonitorId={setActiveUserMonitorId}
        isSynced={isSynced}
        settings={settings}
        conflictsCount={conflicts.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* Month Selector & Quick KPI Bar */}
        <MonthSelector
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedMonitorFilter={selectedMonitorFilter}
          setSelectedMonitorFilter={setSelectedMonitorFilter}
          monitors={monitors}
          stats={stats}
        />

        {/* Conflicts Alert Banner */}
        <ConflictAlert
          conflicts={conflicts}
          monitors={monitors}
          onSelectShift={handleSelectShift}
        />

        {/* Content Tabs */}
        {loading && !stats ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium">Chargement du planning du CDI...</p>
          </div>
        ) : (
          <div>
            {/* TAB: CALENDRIER */}
            {activeTab === 'calendar' && (
              <div className="space-y-6">
                <SalaryStatsCard
                  stats={stats}
                  monitors={monitors}
                  onUpdateMonitorRate={handleUpdateMonitorRate}
                  onOpenSettings={() => setIsSettingsModalOpen(true)}
                />
                <CalendarView
                  selectedMonth={selectedMonth}
                  shifts={shifts}
                  monitors={monitors}
                  onSelectShift={handleSelectShift}
                  onAddShiftForDate={handleAddShiftForDate}
                  onOpenAttendance={handleOpenAttendance}
                  conflicts={conflicts}
                />
              </div>
            )}

            {/* TAB: RELEVÉ & LISTE */}
            {activeTab === 'table' && (
              <ShiftsTable
                shifts={shifts}
                monitors={monitors}
                stats={stats}
                selectedMonth={selectedMonth}
                settings={settings}
                onSelectShift={handleSelectShift}
                onDeleteShift={deleteShift}
                onOpenAddModal={() => {
                  setEditingShift(null);
                  setIsShiftModalOpen(true);
                }}
                onOpenAttendance={handleOpenAttendance}
                conflicts={conflicts}
              />
            )}

            {/* TAB: SALAIRES & STATS */}
            {activeTab === 'stats' && (
              <StatsView
                stats={stats}
                monitors={monitors}
                selectedMonth={selectedMonth}
                onUpdateMonitorRate={handleUpdateMonitorRate}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
              />
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-400 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} {settings?.cdiName || 'CDI — IUT de Nantes'} — Gestion des heures, salaires et fréquentation</p>
          <span className="text-[11px] text-slate-400">
            Source : {dataSource === 'supabase' ? '🟢 Supabase Cloud (Temps Réel)' : dataSource === 'api' ? '🔵 Serveur Local' : '🟣 Stockage Navigateur'}
          </span>
        </div>
      </footer>

      {/* Shift Modal */}
      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => {
          setIsShiftModalOpen(false);
          setEditingShift(null);
        }}
        onSubmit={handleShiftSubmit}
        onDelete={deleteShift}
        initialShift={editingShift}
        monitors={monitors}
        activeUserMonitorId={activeUserMonitorId}
        existingShifts={shifts}
      />

      {/* Quick Attendance Modal */}
      <AttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => {
          setIsAttendanceModalOpen(false);
          setAttendanceTarget({ shift: null, monitor: null });
        }}
        shift={attendanceTarget.shift}
        monitor={attendanceTarget.monitor}
        onSave={updateVisitorsCount}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        monitors={monitors}
        settings={settings}
        onUpdateMonitor={updateMonitor}
        onUpdateSettings={updateSettings}
      />

    </div>
  );
}
export default App;
