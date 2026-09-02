import React, { useState, useEffect } from 'react';
import { BookOpen, Lock, ArrowRight, ArrowLeft, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2, Sparkles, Users, Loader2 } from 'lucide-react';
import { authService, DEFAULT_BASE_USERS } from '../services/authService';

export function LoginView({ onLoginSuccess }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [step, setStep] = useState('select'); // 'select', 'setup_password', 'password'
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Charger la liste des utilisateurs depuis Supabase / API / Local
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const list = await authService.getUsers();
      if (list && list.length > 0) {
        setUsers(list);
      } else {
        setUsers(DEFAULT_BASE_USERS);
      }
    } catch (e) {
      setUsers(DEFAULT_BASE_USERS);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 1. Clic sur un profil (accès rapide)
  const handleSelectUser = async (user) => {
    setError('');
    setPassword('');
    setConfirmPassword('');
    setSelectedUser(user);

    try {
      const res = await authService.checkUser(user.name);
      if (res.success && res.user) {
        setSelectedUser(res.user);
        if (res.isFirstLogin) {
          setStep('setup_password');
        } else {
          setStep('password');
        }
      } else {
        // Fallback si pas de résultat check
        if (!user.hasPassword) {
          setStep('setup_password');
        } else {
          setStep('password');
        }
      }
    } catch (err) {
      setStep('password');
    }
  };

  // 2. Première connexion : création du mot de passe
  const handleSetupPassword = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Veuillez renseigner un mot de passe.');
      return;
    }
    if (password.length < 4) {
      setError('Le mot de passe doit comporter au moins 4 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await authService.setupPassword(selectedUser.name, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'Erreur lors de la création du mot de passe.');
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Connexion avec mot de passe existant
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Veuillez saisir votre mot de passe.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await authService.login(selectedUser.name, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        if (res.isFirstLogin) {
          setStep('setup_password');
          setError('Première connexion détectée. Veuillez créer votre mot de passe.');
        } else {
          setError(res.error || 'Mot de passe incorrect.');
        }
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToSelect = () => {
    setStep('select');
    setSelectedUser(null);
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-800">
      
      {/* Background ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100/90 overflow-hidden p-6 sm:p-8 space-y-6">
          
          {/* Logo & Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 text-white shadow-lg shadow-blue-600/30 mb-2">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              CDI — IUT de Nantes
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Planning des permanences, paies & fréquentation
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-semibold flex items-start space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ÉTAPE 1 : ACCÈS RAPIDES EXCLUSIFS (SELECTION DU PROFIL) */}
          {step === 'select' && (
            <div className="space-y-4">
              <div className="text-center">
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Sélectionnez votre profil</span>
                </label>
              </div>

              {loadingUsers ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="text-xs">Chargement des profils...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {users.map(u => {
                    const isManager = u.role === 'manager';
                    const roleLabel = isManager ? '👑 Manageuse' : '🎓 Moniteur';

                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectUser(u)}
                        style={{ borderColor: `${u.color}35` }}
                        className="flex items-center space-x-3.5 p-3.5 rounded-2xl border-2 hover:border-blue-600 hover:shadow-md bg-slate-50/70 hover:bg-white text-left transition-all active:scale-[0.98] cursor-pointer group"
                      >
                        <div
                          style={{ backgroundColor: `${u.color}20` }}
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs shrink-0 group-hover:scale-105 transition-transform"
                        >
                          {u.avatar || '👨‍🎓'}
                        </div>
                        
                        <div className="overflow-hidden flex-1">
                          <p className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {u.name}
                          </p>
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                            isManager
                              ? 'bg-pink-100 text-pink-700 border border-pink-200'
                              : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {roleLabel}
                          </span>
                        </div>

                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ÉTAPE 2A : Première connexion -> Définition du mot de passe */}
          {step === 'setup_password' && selectedUser && (
            <form onSubmit={handleSetupPassword} className="space-y-4 animate-in fade-in">
              
              {/* Profil sélectionné */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{selectedUser.avatar || '👨‍🎓'}</div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{selectedUser.name}</h3>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedUser.role === 'manager' 
                        ? 'bg-pink-100 text-pink-700 border border-pink-200' 
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                      {selectedUser.role === 'manager' ? '👑 Manageuse' : '🎓 Moniteur'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBackToSelect}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Changer</span>
                </button>
              </div>

              {/* Message Première Connexion */}
              <div className="bg-amber-50/80 border border-amber-200/80 p-3 rounded-2xl text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1 text-amber-950">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Première connexion au CDI !
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Bienvenue {selectedUser.name}. Choisissez votre mot de passe personnel pour sécuriser votre accès.
                </p>
              </div>

              {/* Champs mot de passe */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Créer un mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 4 caractères"
                      autoFocus
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-10 py-2.5 text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Retapez le mot de passe"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting || !password || password !== confirmPassword}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.99] text-white text-sm font-bold rounded-2xl shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Enregistrement...' : 'Enregistrer mon mot de passe et me connecter'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleBackToSelect}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ← Retour aux profils
                </button>
              </div>

            </form>
          )}

          {/* ÉTAPE 2B : Connexion standard avec mot de passe */}
          {step === 'password' && selectedUser && (
            <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in">
              
              {/* Profil sélectionné */}
              <div className="bg-gradient-to-r from-slate-50 to-blue-50/60 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{selectedUser.avatar || '👨‍🎓'}</div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{selectedUser.name}</h3>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedUser.role === 'manager' 
                        ? 'bg-pink-100 text-pink-700 border border-pink-200' 
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                      {selectedUser.role === 'manager' ? '👑 Manageuse' : '🎓 Moniteur'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBackToSelect}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Changer</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Entrez votre mot de passe"
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-10 py-3 text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting || !password}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 active:scale-[0.99] text-white text-sm font-bold rounded-2xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{submitting ? 'Connexion...' : 'Se connecter'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleBackToSelect}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ← Retour aux profils
                </button>
              </div>

            </form>
          )}

        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-4">
          IUT de Nantes • Campus Joffre • Espace CDI
        </p>
      </div>

    </div>
  );
}
