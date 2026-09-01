import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Jours et mois en français
export const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export const DAYS_SHORT_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
export const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function formatHours(decimalHours = 0) {
  const totalMinutes = Math.round(decimalHours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h${m < 10 ? '0' : ''}${m}`;
}

export function formatCurrency(amount = 0, currency = '€') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatDateLong(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const dayName = DAYS_FR[d.getDay()];
  const day = d.getDate();
  const month = MONTHS_FR[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName} ${day} ${month} ${year}`;
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [h1, m1] = startTime.split(':').map(Number);
  const [h2, m2] = endTime.split(':').map(Number);
  const minutes = (h2 * 60 + m2) - (h1 * 60 + m1);
  return Math.max(0, Number((minutes / 60).toFixed(2)));
}

export function getMonthMatrix(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);

  let startDay = firstDay.getDay() - 1;
  if (startDay === -1) startDay = 6;

  const matrix = [];
  let currentWeek = [];

  const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const prevDate = new Date(year, monthIndex - 1, dayNum);
    const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    currentWeek.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: isToday(dateStr)
    });
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    currentWeek.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: isToday(dateStr)
    });

    if (currentWeek.length === 7) {
      matrix.push(currentWeek);
      currentWeek = [];
    }
  }

  let nextDay = 1;
  while (currentWeek.length > 0 && currentWeek.length < 7) {
    const nextDate = new Date(year, monthIndex + 1, nextDay);
    const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
    currentWeek.push({
      dateStr,
      dayNumber: nextDay,
      isCurrentMonth: false,
      isToday: isToday(dateStr)
    });
    nextDay++;
  }
  if (currentWeek.length > 0) {
    matrix.push(currentWeek);
  }

  return matrix;
}

export function isToday(dateStr) {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return dateStr === todayStr;
}

export function getTodayString(offsetDays = 0) {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function exportToCSV(shifts, monitors, monthStr) {
  const headers = ['Date', 'Jour', 'Moniteur', 'Heure Début', 'Heure Fin', 'Durée (h)', 'Taux (€/h)', 'Montant (€)', 'Visiteurs / Entrées', 'Note'];
  
  const rows = shifts.map(shift => {
    const monitor = monitors.find(m => m.id === shift.monitorId) || { name: 'Inconnu', hourlyRate: 9.55 };
    const d = new Date(shift.date + 'T00:00:00');
    const dayName = DAYS_FR[d.getDay()];
    const amount = (shift.durationHours * (monitor.hourlyRate || 9.55)).toFixed(2);
    
    return [
      formatDateShort(shift.date),
      dayName,
      `"${monitor.name}"`,
      shift.startTime,
      shift.endTime,
      shift.durationHours.toString().replace('.', ','),
      (monitor.hourlyRate || 9.55).toString().replace('.', ','),
      amount.replace('.', ','),
      shift.visitorsCount || 0,
      `"${(shift.note || '').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `releve_heures_cdi_${monthStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPDF(shifts, monitors, stats, monthStr, settings) {
  const doc = new jsPDF();
  const [year, monthNum] = monthStr.split('-');
  const monthName = MONTHS_FR[parseInt(monthNum, 10) - 1];

  // En-tête officiel IUT
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138); // Bleu IUT Nantes
  doc.text(settings?.cdiName || 'CDI — IUT de Nantes', 14, 18);

  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(`Relevé d'activité & rémunérations — Période : ${monthName} ${year}`, 14, 25);
  doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, 14, 31);

  // Synthèse rémunérations & Fréquentation
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 36, 182, 38, 3, 3, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Synthèse mensuelle (Heures, Salaires & Fréquentation)', 20, 43);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let yPos = 51;
  (stats?.monitors || []).forEach((m, idx) => {
    const x = idx === 0 ? 20 : 105;
    doc.text(`• ${m.name} : ${m.formattedHours} (${m.totalHours}h) à ${m.hourlyRate.toFixed(2)}€/h = ${m.estimatedSalary.toFixed(2)} €  (${m.totalVisitors || 0} entrées)`, x, yPos);
  });

  doc.setFont('helvetica', 'bold');
  doc.text(`Total Heures : ${stats?.formattedTotalCdiHours || '0h00'}  —  Budget : ${stats?.totalCdiBudget?.toFixed(2) || '0.00'} €  —  Total Étudiants accueillis : ${stats?.totalMonthVisitors || 0} (${stats?.avgVisitorsPerShift || 0}/créneau)`, 20, 65);

  // Tableau détaillé des créneaux
  const tableData = shifts.map(shift => {
    const monitor = monitors.find(m => m.id === shift.monitorId) || { name: 'Inconnu', hourlyRate: 9.55 };
    const d = new Date(shift.date + 'T00:00:00');
    const dayName = DAYS_SHORT_FR[d.getDay()];
    const amount = (shift.durationHours * (monitor.hourlyRate || 9.55)).toFixed(2) + ' €';

    return [
      `${formatDateShort(shift.date)} (${dayName})`,
      monitor.name,
      `${shift.startTime} - ${shift.endTime}`,
      formatHours(shift.durationHours),
      `${monitor.hourlyRate.toFixed(2)} €/h`,
      amount,
      shift.visitorsCount ? `${shift.visitorsCount} pers.` : '-',
      shift.note || '-'
    ];
  });

  doc.autoTable({
    startY: 78,
    head: [['Date & Jour', 'Moniteur', 'Créneau', 'Durée', 'Taux', 'Salaire', 'Visiteurs', 'Observations']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.8
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // Signatures
  const finalY = doc.lastAutoTable.finalY + 12;
  if (finalY < 265) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('Signature du responsable CDI / IUT :', 20, finalY);
    doc.text('Signature des moniteurs :', 120, finalY);
    doc.line(20, finalY + 16, 80, finalY + 16);
    doc.line(120, finalY + 16, 180, finalY + 16);
  }

  doc.save(`releve_heures_cdi_iut_nantes_${monthStr}.pdf`);
}
