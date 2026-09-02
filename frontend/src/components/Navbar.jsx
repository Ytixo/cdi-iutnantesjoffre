import React from 'react';
import { BookOpen, PlusCircle, Settings, Calendar, Table, BarChart3, LogOut, ShieldCheck, UserCheck } from 'lucide-react';

export function Navbar({
  currentUser,
  onLogout,
  activeTab,
  setActiveTab,
  onOpenAddModal,
  onOpenSettingsModal,
  isSynced,
  dataSource = 'local',
  settings,
  conflictsCount = 0
}) {
  const canManage = currentUser?.role === 'manager' || currentUser?.canManage || currentUser?.name === 'Noah';
  const isManager = currentUser?.role === 'manager';

  const getStatusInfo = () => {
    if (dataSource === 'supabase') {
      return {
        label: isSynced ? 'En direct' : 'Reconnexion...',
        color: isSynced ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse',
        dot: isSynced ? 'bg-emerald-500 animate-ping-slow' : 'bg-amber-500',
        title: 'Connecté & synchronisé avec Supabase Cloud en temps réel'
      };
    }
    if (dataSource === 'api') {
      return {
        label: 'Serveur local',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
        title: 'Connecté au serveur local'
      };
    }
    return {
      label: 'Prêt',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      title: 'Données enregistrées dans votre navigateur'
    };
  };

  const status = getStatusInfo();

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* Brand: IUT Nantes & CDI */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <div className="flex items-center space-x-1.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-blue-600/20 shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight whitespace-nowrap">
                  CDI
                </span>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60 whitespace-nowrap hidden sm:inline-block">
                  IUT de Nantes
                </span>
                
                {/* Live Sync Status Pill */}
                <span 
                  title={status.title}
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap border ${status.color}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  <span className="hidden lg:inline">{status.label}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 whitespace-nowrap hidden xl:block">
                Planning moniteurs & calcul de paie
              </p>
            </div>
          </div>

          {/* Center Tabs Navigation */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 shrink-0">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendrier</span>
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Relevé</span>
              <span className="hidden xl:inline">d'heures</span>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'stats'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Salaires & Stats</span>
            </button>
          </nav>

          {/* Right Actions & User Profile */}
          <div className="flex items-center space-x-2 shrink-0">
            
            {/* Quick Add Button */}
            <button
              onClick={onOpenAddModal}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs shadow-blue-500/30 transition-all cursor-pointer whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Ajouter des heures</span>
              <span className="sm:hidden">Ajouter</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettingsModal}
              title={canManage ? "Gestion de l'équipe et paramètres" : "Paramètres du CDI"}
              className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors border border-slate-200/80 shrink-0 cursor-pointer"
            >
              <Settings className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            {/* User Profile Badge & Logout */}
            {currentUser && (
              <div className="flex items-center space-x-1.5 pl-1 sm:pl-2 border-l border-slate-200">
                <div 
                  onClick={onOpenSettingsModal}
                  title={`Connecté en tant que ${currentUser.name} (${isManager ? 'Manageuse' : 'Moniteur'})`}
                  className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 py-1 px-2 rounded-xl cursor-pointer transition-colors"
                >
                  <span className="text-base sm:text-lg">{currentUser.avatar || '👨‍🎓'}</span>
                  <div className="flex flex-col text-left hidden sm:block">
                    <span className="text-xs font-bold text-slate-800 leading-tight">
                      {currentUser.name}
                    </span>
                    <span className={`text-[10px] font-extrabold leading-tight ${
                      isManager ? 'text-pink-600' : 'text-blue-600'
                    }`}>
                      {isManager ? '👑 Manageuse' : '🎓 Moniteur'}
                    </span>
                  </div>
                </div>

                {/* Logout button */}
                <button
                  onClick={onLogout}
                  title="Se déconnecter"
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center space-x-1.5 py-1 px-3 rounded-lg text-xs font-bold ${
              activeTab === 'calendar' ? 'bg-blue-50 text-blue-600' : 'text-slate-500'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Calendrier</span>
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center space-x-1.5 py-1 px-3 rounded-lg text-xs font-bold ${
              activeTab === 'table' ? 'bg-blue-50 text-blue-600' : 'text-slate-500'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Relevé</span>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center space-x-1.5 py-1 px-3 rounded-lg text-xs font-bold ${
              activeTab === 'stats' ? 'bg-blue-50 text-blue-600' : 'text-slate-500'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Salaires</span>
          </button>
        </div>

      </div>
    </header>
  );
}
