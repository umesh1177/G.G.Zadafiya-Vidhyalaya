const path = require('path');
const os = require('os');
const fs = require('fs');
const xlsx = require('xlsx');

/**
 * Generates and saves an Excel workbook for Exam / LT Marks to the system's Desktop folder.
 * Filename format: `subject name+date+standard+type.xlsx`
 * Also returns base64 string so frontend can automatically trigger a download.
 */
function exportMarksToDesktopExcel({
  examTitle = 'Exam Marks',
  subject = 'Physics',
  standard = 'STD_11',
  division = 'ALL',
  examType = 'JEE',
  examDate = null,
  assistantName = 'Assistant Faculty',
  rows = [],
  isMulti = false,
  marksPerSubject = 100,
  thirdLabel = 'Maths',
}) {
  try {
    // 1. Create or verify Desktop folder
    const desktopFolder = path.join(os.homedir(), 'Desktop', 'Exam Marks');
    let desktopSaved = false;
    let savedFilePath = '';

    try {
      if (!fs.existsSync(desktopFolder)) {
        fs.mkdirSync(desktopFolder, { recursive: true });
      }
    } catch (mkdirErr) {
      console.warn('Warning: Could not create desktop folder directly:', mkdirErr.message);
    }

    // 2. Format Date (DD-MM-YYYY)
    const d = examDate ? new Date(examDate) : new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const dateFormatted = `${day}-${month}-${year}`;

    // 3. Format Standard (e.g. STD_11 -> Std 11 or STD_11)
    const cleanStd = String(standard || 'STD_11').replace(/\s+/g, '_');

    // 4. Clean Subject & Exam Type
    const cleanSubject = String(subject || 'All_Subjects').replace(/[\/\\:*?"<>|]/g, '-').trim();
    const cleanType = String(examType || 'Exam').replace(/[\/\\:*?"<>|]/g, '-').trim();

    // 5. Exact Filename format required: subject name+date+standard+type.xlsx
    const fileName = `${cleanSubject}+${dateFormatted}+${cleanStd}+${cleanType}.xlsx`;

    // 6. Build Structured Excel Worksheet Data
    const sheetData = [];

    // Title / Institution Banner
    sheetData.push(['G.G. ZADAFIYA VIDHYALAYA — EXAMINATION MARKS REPORT']);
    sheetData.push([`Exam: ${examTitle}`, `Type: ${cleanType}`, `Standard: ${cleanStd} (Div ${division || 'ALL'})`]);
    sheetData.push([`Subject: ${cleanSubject}`, `Date: ${dateFormatted}`, `Entered By: ${assistantName || 'Assistant Faculty'}`]);
    sheetData.push([]); // blank separator

    // Headers
    if (isMulti) {
      sheetData.push([
        'S.No',
        'Roll No',
        'Student Name',
        'Standard',
        'Division',
        'Group',
        'Physics',
        'Chemistry',
        thirdLabel || 'Maths',
        'Total Obtained',
        'Total Max',
        'Percentage (%)',
        'Status',
      ]);
    } else {
      sheetData.push([
        'S.No',
        'Roll No',
        'Student Name',
        'Standard',
        'Division',
        'Marks Obtained',
        'Max Marks',
        'Percentage (%)',
        'Status',
      ]);
    }

    // Populate Data Rows
    let presentCount = 0;
    let absentCount = 0;
    let totalScoreSum = 0;

    rows.forEach((r, idx) => {
      const isAbsent = Boolean(r.ab);
      if (isAbsent) absentCount++;
      else presentCount++;

      const roll = r.rollNo || idx + 1;
      const name = r.name || r.studentName || `Student ${roll}`;
      const std = r.standard ? String(r.standard).replace('STD_', 'Std ') : cleanStd;
      const div = r.division || division || 'A';
      const status = isAbsent ? 'Absent' : 'Present';

      if (isMulti) {
        const phy = isAbsent ? 0 : parseFloat(r.phy) || 0;
        const chem = isAbsent ? 0 : parseFloat(r.chem) || 0;
        const third = isAbsent ? 0 : parseFloat(r.third) || 0;
        const total = isAbsent ? 0 : (r.totalObtained !== undefined ? r.totalObtained : phy + chem + third);
        const max = (marksPerSubject || 100) * 3;
        const pct = max > 0 ? ((total / max) * 100).toFixed(2) : '0.00';

        if (!isAbsent) totalScoreSum += total;

        sheetData.push([
          idx + 1,
          roll,
          name,
          std,
          div,
          r.streamGroup || (thirdLabel === 'Biology' ? 'Group B' : 'Group A'),
          isAbsent ? 'AB' : phy,
          isAbsent ? 'AB' : chem,
          isAbsent ? 'AB' : third,
          isAbsent ? 0 : total,
          max,
          isAbsent ? '0.00%' : `${pct}%`,
          status,
        ]);
      } else {
        const marksObt = isAbsent ? 0 : (r.single !== undefined ? parseFloat(r.single) || 0 : (r.marksObtained !== undefined ? parseFloat(r.marksObtained) || 0 : (r.mark || 0)));
        const maxMarks = marksPerSubject || r.maxMarks || (typeof r.mark === 'string' ? 'Grade' : 100);
        let pct = '0.00%';
        if (!isAbsent && typeof marksObt === 'number' && typeof maxMarks === 'number' && maxMarks > 0) {
          pct = `${((marksObt / maxMarks) * 100).toFixed(2)}%`;
          totalScoreSum += marksObt;
        } else if (!isAbsent && typeof marksObt === 'string') {
          pct = marksObt; // Grade e.g. Better / Excellent
        }

        sheetData.push([
          idx + 1,
          roll,
          name,
          std,
          div,
          isAbsent ? 'AB' : marksObt,
          maxMarks,
          pct,
          status,
        ]);
      }
    });

    // Summary Section at bottom
    sheetData.push([]); // blank row
    sheetData.push(['SUMMARY METRICS']);
    sheetData.push(['Total Students Evaluated', rows.length]);
    sheetData.push(['Present Students', presentCount]);
    sheetData.push(['Absent Students', absentCount]);
    if (presentCount > 0 && typeof totalScoreSum === 'number') {
      const avgScore = (totalScoreSum / presentCount).toFixed(2);
      sheetData.push(['Average Score (Present Students)', avgScore]);
    }
    sheetData.push(['Report Generated At', new Date().toLocaleString('en-GB')]);

    // 7. Create Worksheet and Workbook
    const ws = xlsx.utils.aoa_to_sheet(sheetData);

    // Set Column Widths for professional presentation
    ws['!cols'] = isMulti
      ? [
          { wch: 6 },  // S.No
          { wch: 9 },  // Roll No
          { wch: 26 }, // Name
          { wch: 10 }, // Std
          { wch: 9 },  // Div
          { wch: 10 }, // Group
          { wch: 10 }, // Phy
          { wch: 10 }, // Chem
          { wch: 10 }, // Third
          { wch: 14 }, // Total Obtained
          { wch: 12 }, // Total Max
          { wch: 14 }, // Pct
          { wch: 10 }, // Status
        ]
      : [
          { wch: 6 },  // S.No
          { wch: 9 },  // Roll No
          { wch: 28 }, // Name
          { wch: 12 }, // Std
          { wch: 10 }, // Div
          { wch: 16 }, // Marks Obtained
          { wch: 14 }, // Max Marks
          { wch: 15 }, // Pct
          { wch: 12 }, // Status
        ];

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Marks Sheet');

    // 8. Write to Desktop Folder
    try {
      if (fs.existsSync(desktopFolder)) {
        savedFilePath = path.join(desktopFolder, fileName);
        xlsx.writeFile(wb, savedFilePath);
        desktopSaved = true;
        console.log(`[ExcelExporter] Successfully saved marks Excel to Desktop: ${savedFilePath}`);
      }
    } catch (saveErr) {
      console.warn('[ExcelExporter] Could not write to Desktop folder directly:', saveErr.message);
    }

    // 9. Generate Base64 for instant browser automatic download
    const fileBase64 = xlsx.write(wb, { type: 'base64', bookType: 'xlsx' });

    return {
      success: true,
      fileName,
      filePath: savedFilePath,
      desktopSaved,
      fileBase64,
      desktopFolder,
      count: rows.length,
    };
  } catch (err) {
    console.error('[ExcelExporter] Error generating Excel marks sheet:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

module.exports = {
  exportMarksToDesktopExcel,
};

