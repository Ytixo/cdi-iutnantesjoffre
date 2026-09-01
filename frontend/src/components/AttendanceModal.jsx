import React, { useState, useEffect } from 'react';
import { X, Users, Check, Plus, Minus, Sparkles } from 'lucide-react';
import { formatDateLong } from '../utils/timeUtils';

export function AttendanceModal({
  isOpen,
  onClose,
  shift,
  monitor,
  onSave
}) {
  const [count, setCount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shift) {
      setCount(Number(shift.visitorsCount || 0));
    }
  }, [shift, isOpen]);

  if (!isOpen || !shift) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(shift.id, count);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-1.5 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Statistiques de Fréquentation</span>
          </div>
          <h3 className="font-bold text-base">
            Nombre de personnes accueillies
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            {formatDateLong(shift.date)} ({shift.startTime} - {shift.endTime})
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total étudiants / visiteurs
            </span>
            
            <div className="flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={() => setCount(Math.max(0, count - 1))}
                className="w-11 h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center active:scale-95 transition-all text-lg cursor-pointer"
              >
                -1
              </button>

              <input
                type="number"
                min="0"
                max="300"
                value={count}
                onChange={(e) => setCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-24 h-14 text-center font-extrabold text-3xl text-slate-900 bg-slate-50 border-2 border-blue-500/80 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                autoFocus
              />

              <button
                type="button"
                onClick={() => setCount(count + 1)}
                className="w-11 h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center active:scale-95 transition-all text-lg cursor-pointer"
              >
                +1
              </button>
            </div>

            {/* Quick shortcuts */}
            <div className="flex items-center justify-center gap-1.5 pt-2">
              {[5, 10, 15, 20, 25, 30].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCount(val)}
                  className={`text-xs px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                    count === val 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Enregistrer ({count} pers.)</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
