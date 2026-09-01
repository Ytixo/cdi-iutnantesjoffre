import React from 'react';
import { AlertTriangle, Clock, Calendar, Users, X } from 'lucide-react';
import { formatDateShort } from '../utils/timeUtils';

export function ConflictAlert({ conflicts = [], monitors = [], onSelectShift }) {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200/90 rounded-3xl p-5 mb-6 shadow-xs animate-in fade-in slide-in-from-top-2">
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-amber-900 text-sm">
              {conflicts.length} chevauchement{conflicts.length > 1 ? 's' : ''} d'horaires détecté{conflicts.length > 1 ? 's' : ''}
            </h4>
          </div>
          <p className="text-xs text-amber-700 mt-0.5 mb-3">
            Des créneaux horaires sont posés sur les mêmes plages de temps :
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {conflicts.map((conf, idx) => {
              const m1 = monitors.find(m => m.id === conf.shift1.monitorId);
              const m2 = monitors.find(m => m.id === conf.shift2.monitorId);

              return (
                <div
                  key={idx}
                  className="bg-white/80 border border-amber-200 rounded-2xl p-3 text-xs space-y-2"
                >
                  <div className="font-semibold text-slate-800 flex items-center justify-between">
                    <span>📅 {formatDateShort(conf.shift1.date)}</span>
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                      {conf.type === 'SAME_MONITOR_OVERLAP' ? 'Même moniteur' : '2 moniteurs en même temps'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectShift(conf.shift1)}
                      className="flex-1 text-left p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                    >
                      <span className="font-bold text-slate-900 block truncate">
                        {m1?.name || 'Moniteur 1'}
                      </span>
                      <span className="text-[11px] text-slate-600">
                        {conf.shift1.startTime} - {conf.shift1.endTime}
                      </span>
                    </button>

                    <span className="text-slate-400 font-bold">vs</span>

                    <button
                      onClick={() => onSelectShift(conf.shift2)}
                      className="flex-1 text-left p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                    >
                      <span className="font-bold text-slate-900 block truncate">
                        {m2?.name || 'Moniteur 2'}
                      </span>
                      <span className="text-[11px] text-slate-600">
                        {conf.shift2.startTime} - {conf.shift2.endTime}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
