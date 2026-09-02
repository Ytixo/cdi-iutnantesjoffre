import React, { useState, useEffect } from 'react';
import { X, Settings, Users, Euro, Check, Palette, Plus, Trash2, KeyRound, ShieldAlert, Sparkles, UserPlus, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Violet', hex: '#7C3AED' },
  { name: 'Gris Ardoise', hex: '#475569' },
  { name: 'Bleu Royal', hex: '#2563EB' },
  { name: 'Émeraude', hex: '#059669' },
  { name: 'Rose', hex: '#DB2777' },
  { name: 'Ambre / Orange', hex: '#D97706' },
  { name: 'Indigo', hex: '#4F46E5' },
  { name: 'Cyan', hex: '#0891B2' }
];

const PRESET_AVATARS = ['👨‍🎓', '👩‍🎓', '🧑‍🎓', '📚', '👓', '🧑‍💻', '👩‍🏫', '👨‍🏫', '⭐', '✨'];

export function SettingsModal({
  isOpen,
  onClose,
  currentUser,
  monitors = [],
  settings = {},
  onUpdateMonitor,
  onUpdateSettings,
  onAddMonitor,
  onDeleteMonitor,
  onResetPassword
}) {
  const canManageTeam = currentUser?.role === 'manager' || currentUser?.canManage === true || currentUser?.name === 'Noah';

  const [activeTab, setActiveTab] = useState(canManageTeam ? 'team' : 'general');
  const [cdiName, setCdiName] = useState(settings?.cdiName || 'CDI — IUT de Nantes');
  const [monitorsState, setMonitorsState] = useState([]);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Formulaire d'ajout de nouveau membre
  const [isAddingMonitor, setIsAddingMonitor] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('monitor');
  const [newHourlyRate, setNewHourlyRate] = useState(9.55);
  const [newColor, setNewColor] = useState('#2563EB');
  const [newAvatar, setNewAvatar] = useState('👨‍🎓');
  const [addingLoading, setAddingLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCdiName(settings?.cdiName || 'CDI — IUT de Nantes');
      setMonitorsState((monitors || []).map(m => ({ ...m })));
      setErrorMsg('');
      setIsAddingMonitor(false);
    }
  }, [isOpen, settings, monitors]);

  if (!isOpen) return null;

  const handleMonitorChange = (id, field, value) => {
    setMonitorsState(prev =>
      prev.map(m => m.id === id ? { ...m, [field]: value } : m)
    );
  };

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await onUpdateSettings({ cdiName });

      // Si manageur ou Noah, on sauvegarde aussi les modifications de profil moniteurs
      if (canManageTeam) {
        for (const m of monitorsState) {
          await onUpdateMonitor(m.id, {
            name: m.name,
            role: m.role,
            hourlyRate: parseFloat(m.hourlyRate) || 9.55,
            color: m.color,
            avatar: m.avatar
          });
        }
      } else {
        // Le moniteur peut modifier sa propre couleur et son avatar
        const myProfile = monitorsState.find(m => m.id === currentUser?.id);
        if (myProfile) {
          await onUpdateMonitor(myProfile.id, {
            color: myProfile.color,
            avatar: myProfile.avatar
          });
        }
      }

      setSuccessMsg('Réglages enregistrés avec succès !');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg(err.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMonitor = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      setErrorMsg('Veuillez entrer un prénom.');
      return;
    }

    setAddingLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (onAddMonitor) {
        const payload = {
          name: newName.trim(),
          role: newRole,
          hourlyRate: parseFloat(newHourlyRate) || 9.55,
          color: newColor,
          avatar: newAvatar
        };

        const res = await onAddMonitor(payload);

        if (res && res.success === false) {
          setErrorMsg(res.error || 'Erreur lors de la création');
        } else {
          const createdMon = res?.monitor || {
            id: `moniteur-${Date.now()}`,
            ...payload
          };

          // Ajouter immédiatement à la liste locale visible
          setMonitorsState(prev => {
            const filtered = prev.filter(m => m.id !== createdMon.id);
            return [...filtered, createdMon];
          });

          setSuccessMsg(`Le profil « ${newName.trim()} » a été ajouté ! Il apparaîtra directement sur l'écran de connexion.`);
          setNewName('');
          setNewRole('monitor');
          setIsAddingMonitor(false);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Erreur lors de l\'ajout.');
    } finally {
      setAddingLoading(false);
    }
  };

  const handleResetUserPassword = async (monitorId, monitorName) => {
    if (confirm(`Voulez-vous réinitialiser le mot de passe de « ${monitorName} » ? Il/Elle sera invité(e) à en créer un nouveau lors de sa prochaine connexion.`)) {
      try {
        if (onResetPassword) {
          await onResetPassword(monitorId);
          setSuccessMsg(`Mot de passe de « ${monitorName} » réinitialisé avec succès.`);
        }
      } catch (err) {
        setErrorMsg('Erreur lors de la réinitialisation.');
      }
    }
  };

  const handleDeleteUser = async (monitorId, monitorName) => {
    if (confirm(`Êtes-vous sûr(e) de vouloir supprimer définitivement « ${monitorName} » de l'équipe du CDI ?`)) {
      try {
        if (onDeleteMonitor) {
          const res = await onDeleteMonitor(monitorId);
          if (res && res.success === false) {
            setErrorMsg(res.error || 'Impossible de supprimer.');
          } else {
            setMonitorsState(prev => prev.filter(m => m.id !== monitorId));
            setSuccessMsg(`« ${monitorName} » a été supprimé(e) de l'équipe.`);
          }
        }
      } catch (err) {
        setErrorMsg('Erreur lors de la suppression.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4" />
            <span>Paramètres & Équipe</span>
          </div>
          
          <h2 className="text-lg sm:text-xl font-bold">
            {canManageTeam ? 'Gestion de l\'Équipe CDI & Réglages' : 'Préférences & CDI'}
          </h2>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 px-5 pt-4 pb-1 border-b border-slate-100 shrink-0">
          {canManageTeam && (
            <button
              onClick={() => setActiveTab('team')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'team'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-100/80'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Gestion de l'Équipe ({monitorsState.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100/80'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Paramètres Généraux</span>
          </button>
        </div>

        {/* Banners for success / error */}
        <div className="px-5 sm:px-6 pt-3 shrink-0">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* TAB 1: GESTION DE L'ÉQUIPE (Manageuses & Noah) */}
        {activeTab === 'team' && canManageTeam && (
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            
            {/* Action Bar : Bouton Ajouter un membre */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Membres de l'Équipe</h3>
                <p className="text-xs text-slate-500">Ajoutez, modifiez ou réinitialisez les accès des moniteurs et manageuses.</p>
              </div>

              {!isAddingMonitor && (
                <button
                  type="button"
                  onClick={() => setIsAddingMonitor(true)}
                  className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Ajouter un membre</span>
                </button>
              )}
            </div>

            {/* FORMULAIRE D'AJOUT D'UN NOUVEAU MEMBRE */}
            {isAddingMonitor && (
              <form onSubmit={handleCreateMonitor} className="p-4 rounded-2xl border-2 border-blue-200 bg-blue-50/40 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-blue-700 text-xs font-bold uppercase tracking-wider">
                    <UserPlus className="w-4 h-4" />
                    <span>Nouveau Membre</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingMonitor(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Prénom
                    </label>
                    <input
                      type="text"
                      placeholder="ex: Sarah, Julien..."
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      autoFocus
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Rôle
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="monitor">🎓 Moniteur</option>
                      <option value="manager">👑 Manageuse / Manageur</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Taux horaire (€/h)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newHourlyRate}
                      onChange={(e) => setNewHourlyRate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Avatar & Color selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Avatar
                    </label>
                    <div className="flex items-center space-x-1 bg-white p-1.5 rounded-xl border border-slate-200">
                      {PRESET_AVATARS.slice(0, 6).map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setNewAvatar(emoji)}
                          className={`text-lg p-1 rounded-lg transition-all cursor-pointer ${
                            newAvatar === emoji ? 'bg-blue-100 scale-125' : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Couleur planning
                    </label>
                    <div className="flex items-center space-x-1.5 bg-white p-2 rounded-xl border border-slate-200">
                      {PRESET_COLORS.slice(0, 6).map(c => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setNewColor(c.hex)}
                          style={{ backgroundColor: c.hex }}
                          className={`w-6 h-6 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                            newColor === c.hex ? 'ring-2 ring-slate-800 scale-110' : 'opacity-75 hover:opacity-100'
                          }`}
                        >
                          {newColor === c.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingMonitor(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={addingLoading || !newName.trim()}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{addingLoading ? 'Ajout...' : 'Créer et autoriser la 1ère connexion'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* LISTE DES MEMBRES ACTUELS */}
            <div className="space-y-4">
              {monitorsState.map((m, idx) => {
                const isManagerMember = m.role === 'manager';
                const roleBadge = isManagerMember ? '👑 Manageuse' : '🎓 Moniteur';

                return (
                  <div
                    key={m.id || idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Membre #{idx + 1}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isManagerMember
                            ? 'bg-pink-100 text-pink-700 border border-pink-200'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {roleBadge}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        {PRESET_AVATARS.slice(0, 5).map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleMonitorChange(m.id, 'avatar', emoji)}
                            className={`text-lg p-1 rounded-lg transition-transform cursor-pointer ${
                              m.avatar === emoji ? 'bg-white shadow-xs scale-125' : 'opacity-60 hover:opacity-100'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Prénom
                        </label>
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => handleMonitorChange(m.id, 'name', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Taux horaire (€ / heure)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            value={m.hourlyRate}
                            onChange={(e) => handleMonitorChange(m.id, 'hourlyRate', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 pr-8"
                            required
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            €/h
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Colors */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                        <Palette className="w-3 h-3 text-slate-400" /> Couleur associée au planning
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map(c => {
                          const isSelected = m.color === c.hex;
                          return (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => handleMonitorChange(m.id, 'color', c.hex)}
                              style={{ backgroundColor: c.hex }}
                              className={`w-6 h-6 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                                isSelected ? 'ring-2 ring-slate-800 scale-110' : 'opacity-70 hover:opacity-100'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions d'administration pour ce membre */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-xs">
                      <button
                        type="button"
                        onClick={() => handleResetUserPassword(m.id, m.name)}
                        className="text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Réinitialiser mot de passe</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteUser(m.id, m.name)}
                        className="text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handleSaveGeneral}
                disabled={saving}
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
              </button>
            </div>

          </div>
        )}

        {/* TAB 2: PARAMÈTRES GÉNÉRAUX */}
        {activeTab === 'general' && (
          <form onSubmit={handleSaveGeneral} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            
            {/* Notice pour les moniteurs sans droits d'administration */}
            {!canManageTeam && (
              <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl text-xs text-blue-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-900">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Compte Moniteur CDI ({currentUser?.name})</span>
                </div>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Vous avez accès au calendrier, à la saisie de vos heures et à toutes les statistiques. L'ajout ou la suppression de moniteurs est réservé aux manageurs (Virginie, Kristell & Noah).
                </p>
              </div>
            )}

            {/* Nom du CDI */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nom de l'établissement / CDI
              </label>
              <input
                type="text"
                value={cdiName}
                onChange={(e) => setCdiName(e.target.value)}
                disabled={!canManageTeam}
                className={`w-full border rounded-xl px-3.5 py-2 text-sm text-slate-800 font-semibold focus:outline-hidden ${
                  canManageTeam ? 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500 focus:bg-white' : 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-80'
                }`}
                required
              />
            </div>

            {/* Profil personnel du moniteur */}
            {!canManageTeam && (
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Mon Profil & Couleur
                </span>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Prénom :</span>
                    <p className="text-sm font-bold text-slate-900">{currentUser?.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Taux horaire :</span>
                    <p className="text-sm font-bold text-emerald-600">{currentUser?.hourlyRate || 9.55} €/h</p>
                  </div>
                </div>

                {/* Avatar change for self */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Choisir mon avatar
                  </label>
                  <div className="flex items-center space-x-1">
                    {PRESET_AVATARS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          const myProfile = monitorsState.find(m => m.id === currentUser?.id);
                          if (myProfile) handleMonitorChange(myProfile.id, 'avatar', emoji);
                        }}
                        className={`text-lg p-1 rounded-lg transition-transform cursor-pointer ${
                          monitorsState.find(m => m.id === currentUser?.id)?.avatar === emoji ? 'bg-white shadow-xs scale-125' : 'opacity-60 hover:opacity-100'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Enregistrement...' : 'Enregistrer les réglages'}</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
