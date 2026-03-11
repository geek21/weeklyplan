
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { WeeklyPlan, DayName } from '../types';
import { DAYS, SUBJECT_COLORS } from '../constants';
import { getFullGradeWeekData, getSettings } from './storage';

// Helper to convert hex to rgb
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
};

// Helper to get color with fallback
const getSubjectColorHex = (subject: string) => {
  return SUBJECT_COLORS[subject] || '#4b5563'; // Fallback to gray-600
};

// --- Font Loading Logic ---
// Fetch Amiri font from Google Fonts (Regular)
const loadArabicFont = async (doc: jsPDF) => {
  try {
    // Amiri Regular
    const response = await fetch('https://fonts.gstatic.com/s/amiri/v26/J7aRnpd8CGxBHpUrtLMA7w.ttf');
    if (!response.ok) throw new Error('Failed to load font');
    const buffer = await response.arrayBuffer();
    const fontFileName = 'Amiri-Regular.ttf';
    
    // Convert buffer to binary string for jsPDF
    const fontBase64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    doc.addFileToVFS(fontFileName, fontBase64);
    doc.addFont(fontFileName, 'Amiri', 'normal');
    doc.setFont('Amiri');
    return true;
  } catch (e) {
    console.warn("Could not load Arabic font, falling back to default.", e);
    return false;
  }
};

// --- Modern Header Drawer ---
const drawHeader = (doc: jsPDF, plan: WeeklyPlan | null, title: string, subTitle: string, colorHex: string) => {
  const settings = getSettings();
  const colorRgb = hexToRgb(colorHex);
  const pageWidth = doc.internal.pageSize.width;

  // 1. Colored Top Bar
  doc.setFillColor(colorRgb[0], colorRgb[1], colorRgb[2]);
  doc.rect(0, 0, pageWidth, 25, 'F'); // 25mm height bar

  // 2. School Info (Left/Right based on language? For PDF we keep Logo Left usually, or Center)
  // Let's place Logo in a white circle or box if it exists
  if (settings.schoolLogo) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(10, 5, 20, 20, 3, 3, 'F');
    try {
      doc.addImage(settings.schoolLogo, 'PNG', 11, 6, 18, 18);
    } catch (e) {
      // ignore
    }
  }

  // 3. Title (White Text on Color Bar)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('Amiri', 'normal'); // Use Arabic font for title too
  doc.text(settings.schoolName || "School Weekly Planner", 40, 12);
  
  doc.setFontSize(10);
  doc.setTextColor(240, 240, 240);
  doc.text("Weekly Planning System", 40, 18);

  // 4. Document Title (Below Bar)
  doc.setTextColor(colorRgb[0], colorRgb[1], colorRgb[2]);
  doc.setFontSize(22);
  doc.text(title, pageWidth - 15, 38, { align: 'right' }); // Right align for visual balance

  // 5. Info Box (Grade, Week, Date)
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(14, 30, pageWidth - 28, 12, 2, 2, 'FD');
  
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(11);
  doc.text(subTitle, pageWidth / 2, 38, { align: 'center' });
};

// --- Signatures Footer ---
const drawSignatures = (doc: jsPDF, yPos: number) => {
  const pageWidth = doc.internal.pageSize.width;
  doc.setDrawColor(100, 100, 100);
  
  // Teacher Sig
  doc.line(30, yPos, 80, yPos);
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text("Teacher's Signature", 55, yPos + 5, { align: 'center' });

  // Coordinator Sig
  doc.line(pageWidth - 80, yPos, pageWidth - 30, yPos);
  doc.text("Principal / Coordinator", pageWidth - 55, yPos + 5, { align: 'center' });

  // Timestamp
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPos + 15, { align: 'center' });
};


// PDF Export (Single Subject)
export const exportToPDF = async (plan: WeeklyPlan) => {
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for single subject often better, or Portrait? Let's stick to Landscape as per old code, or switch to Portrait for "Modern"?
  // The user asked for "Master" to be Portrait. Single subject usually fits better on Landscape if columns are wide.
  // Let's keep Single Subject Landscape for now to fit the 6 columns comfortably.

  await loadArabicFont(doc);

  const subTitle = `Grade: ${plan.grade}   |   Week: ${plan.weekNum}   |   Date: ${plan.startDate} to ${plan.endDate}`;
  const colorHex = getSubjectColorHex(plan.subject);
  
  drawHeader(doc, plan, `${plan.subject} Plan`, subTitle, colorHex);

  const tableHead = [['Day', 'Subject', 'Classwork', 'Homework', 'Items Required', 'Tests/Quizzes', 'Events']];
  const tableBody = DAYS.map((day: DayName) => {
    const entry = plan.days[day];
    return [
      day,
      plan.subject,
      entry.classwork,
      entry.homework,
      entry.items,
      entry.tests,
      entry.events
    ];
  });

  const colorRgb = hexToRgb(colorHex);

  // @ts-ignore
  autoTable(doc, {
    startY: 50,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: { 
      fillColor: colorRgb, 
      textColor: 255, 
      fontSize: 11, 
      halign: 'center',
      font: 'Amiri' // Use Arabic Font in Header
    },
    styles: { 
      font: 'Amiri', // Use Arabic Font in Body
      fontSize: 10, 
      cellPadding: 4, 
      overflow: 'linebreak',
      valign: 'middle'
    },
    columnStyles: {
      0: { fontStyle: 'bold', width: 25 },
      2: { width: 60 },
      3: { width: 50 },
    },
    didParseCell: function(data: any) {
        // Force Right Align for everything to support Arabic better, or check logic
        // If the text contains Arabic, align Right.
        const isArabic = /[\u0600-\u06FF]/.test(data.cell.raw);
        if (isArabic) {
            data.cell.styles.halign = 'right';
        }
    }
  });

  // @ts-ignore
  drawSignatures(doc, doc.lastAutoTable.finalY + 30);

  doc.save(`${plan.subject}_Week${plan.weekNum}_${plan.grade}.pdf`);
};

// Master PDF Export (Portrait, Multi-Subject)
export const exportGradeMasterPDF = async (grade: string, week: number) => {
  const plans = getFullGradeWeekData(grade, week);
  const settings = getSettings();
  const doc = new jsPDF('p', 'mm', 'a4'); // Portrait

  await loadArabicFont(doc);

  // --- Cover Page ---
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Background Pattern (Subtle)
  doc.setFillColor(245, 247, 250);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative Border
  doc.setDrawColor(getSubjectColorHex('Arabic')); // Use primary-ish color
  doc.setLineWidth(1);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Logo on Cover
  if (settings.schoolLogo) {
    try {
      doc.addImage(settings.schoolLogo, 'PNG', pageWidth/2 - 25, 40, 50, 50);
    } catch (e) {}
  }

  // Cover Text
  doc.setFont('Amiri', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(30);
  doc.text("MASTER WEEKLY PLAN", pageWidth/2, 110, { align: 'center' });
  
  if (settings.schoolName) {
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100);
    doc.text(settings.schoolName, pageWidth/2, 120, { align: 'center' });
  }

  doc.setFontSize(20);
  doc.setTextColor(60, 60, 60);
  doc.text(`${grade}`, pageWidth/2, 150, { align: 'center' });
  doc.text(`Week ${week}`, pageWidth/2, 162, { align: 'center' });
  
  const dateStr = plans[0]?.startDate ? `${plans[0].startDate} to ${plans[0].endDate}` : "";
  doc.setFontSize(14);
  doc.text(dateStr, pageWidth/2, 172, { align: 'center' });

  // Add new page for content
  doc.addPage();

  // --- Content Pages ---
  let finalY = 20;

  // Draw Header on first content page
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(`${grade} - Week ${week} Summary`, pageWidth - 15, 10, { align: 'right' });

  for (const plan of plans) {
    const colorHex = getSubjectColorHex(plan.subject);
    const colorRgb = hexToRgb(colorHex);

    // Check space
    if (finalY > 230) {
      doc.addPage();
      finalY = 20;
    }

    // Section Header (Subject)
    doc.setFillColor(colorRgb[0], colorRgb[1], colorRgb[2]);
    doc.roundedRect(14, finalY, pageWidth - 28, 8, 1, 1, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('Amiri', 'normal');
    doc.text(plan.subject.toUpperCase(), 14 + 5, finalY + 5.5);

    // Table
    const tableHead = [['Day', 'Classwork', 'Homework', 'Items', 'Tests', 'Events']];
    const tableBody = DAYS.map((day: DayName) => {
      const entry = plan.days[day];
      return [
        day,
        entry.classwork,
        entry.homework,
        entry.items,
        entry.tests,
        entry.events
      ];
    });

    // @ts-ignore
    autoTable(doc, {
      startY: finalY + 10,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { 
        fillColor: colorRgb, 
        textColor: 255, 
        fontSize: 9, 
        halign: 'center',
        font: 'Amiri'
      },
      styles: { 
        font: 'Amiri',
        fontSize: 8, 
        cellPadding: 2, 
        overflow: 'linebreak',
        valign: 'middle',
        lineColor: [220, 220, 220]
      },
      columnStyles: {
        0: { fontStyle: 'bold', width: 18 }, // Day
        1: { width: 45 }, // CW
        2: { width: 45 }, // HW
        3: { width: 25 }, // Items
        4: { width: 25 }, // Tests
        5: { width: 25 }, // Events
      },
      margin: { left: 14, right: 14 },
      didParseCell: function(data: any) {
        const isArabic = /[\u0600-\u06FF]/.test(data.cell.raw);
        if (isArabic) {
            data.cell.styles.halign = 'right';
        }
      }
    });

    // @ts-ignore
    finalY = doc.lastAutoTable.finalY + 15;
  }

  // Final Signatures on last page
  if (finalY > 240) doc.addPage();
  drawSignatures(doc, doc.internal.pageSize.height - 30);

  doc.save(`Master_Grade_${grade}_Week_${week}.pdf`);
};

// Excel Export (Single Subject)
export const exportToExcel = (plan: WeeklyPlan) => {
  const wb = XLSX.utils.book_new();
  const ws = createSheetForPlan(plan);
  XLSX.utils.book_append_sheet(wb, ws, "Weekly Plan");
  XLSX.writeFile(wb, `${plan.subject}_Week${plan.weekNum}_${plan.grade}.xlsx`);
};

// Master Excel Export (All Subjects in one file, separate sheets)
export const exportGradeMasterExcel = (grade: string, week: number) => {
  const plans = getFullGradeWeekData(grade, week);
  const wb = XLSX.utils.book_new();

  plans.forEach(plan => {
    const ws = createSheetForPlan(plan);
    // Sheet names limited to 31 chars
    const sheetName = plan.subject.length > 31 ? plan.subject.substring(0, 31) : plan.subject;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, `Master_Grade_${grade}_Week_${week}.xlsx`);
};

// Helper to create excel sheet data
const createSheetForPlan = (plan: WeeklyPlan) => {
  const data = [
    [`Weekly Plan - ${plan.subject}`, "", "", "", "", "", ""],
    [`Grade: ${plan.grade}`, `Week: ${plan.weekNum}`, `Date: ${plan.startDate} - ${plan.endDate}`, "", "", "", ""],
    [],
    ['Day', 'Subject', 'Classwork', 'Homework', 'Items Required', 'Tests/Quizzes', 'Events'],
    ...DAYS.map(day => [
      day,
      plan.subject,
      plan.days[day].classwork,
      plan.days[day].homework,
      plan.days[day].items,
      plan.days[day].tests,
      plan.days[day].events
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Basic column width
  const wscols = [
    {wch: 12}, {wch: 15}, {wch: 40}, {wch: 30}, {wch: 20}, {wch: 20}, {wch: 20}
  ];
  ws['!cols'] = wscols;
  
  return ws;
};
