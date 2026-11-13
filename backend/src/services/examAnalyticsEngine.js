const fs = require('fs');
const path = require('path');
const {
  trainAndSaveExamModels,
  extractStudentExamTrajectoryFeatures,
  softmax,
} = require('../ml/trainExamModel');

const WEIGHTS_PATH = path.join(__dirname, '../ml/examModelWeights.json');
let cachedExamModel = null;

function loadExamMlModel() {
  if (cachedExamModel) return cachedExamModel;
  try {
    if (fs.existsSync(WEIGHTS_PATH)) {
      cachedExamModel = JSON.parse(fs.readFileSync(WEIGHTS_PATH, 'utf8'));
      return cachedExamModel;
    }
  } catch (err) {
    console.warn('Could not read examModelWeights.json, retraining:', err.message);
  }
  cachedExamModel = trainAndSaveExamModels();
  return cachedExamModel;
}

function retrainExamMlModel(customSamples = []) {
  cachedExamModel = trainAndSaveExamModels(customSamples);
  return cachedExamModel;
}

function round1(val) {
  return Math.round((Number(val) || 0) * 10) / 10;
}

function round2(val) {
  return Math.round((Number(val) || 0) * 100) / 100;
}

function normalizeExamType(raw = 'BOARD') {
  const s = String(raw || 'BOARD').trim().toUpperCase();
  if (s.includes('GUJCET')) return 'GUJCET';
  if (s.includes('JEE')) return 'JEE';
  if (s.includes('NEET')) return 'NEET';
  if (s.includes('BOARD')) return 'BOARD';
  if (s.includes('ANNUAL')) return 'ANNUAL';
  if (s.includes('WEEK')) return 'WEEKLY';
  return 'OTHER';
}

function isMultiSubjectExam(examType) {
  return ['JEE', 'NEET', 'GUJCET'].includes(normalizeExamType(examType));
}

function normalizeStd(std) {
  const s = String(std || 'STD_12').trim().toUpperCase();
  if (s.includes('11')) return 'STD_11';
  return 'STD_12';
}

function formatStdLabel(std) {
  return normalizeStd(std) === 'STD_11' ? 'Standard 11' : 'Standard 12';
}

function normalizeCanonicalSubject(subj = '') {
  const s = String(subj || '').trim().toLowerCase();
  if (!s) return 'other';
  if (s === 'pcm' || s === 'group_a' || s === 'group a') return 'pcm';
  if (s === 'pcb' || s === 'group_b' || s === 'group b') return 'pcb';
  if (s === 'pcmb' || s === 'group_ab' || s === 'group ab') return 'pcmb';
  if (s.includes('chem')) return 'chemistry';
  if (s.includes('phys')) return 'physics';
  if (s.includes('math')) return 'maths';
  if (s.includes('bio')) return 'biology';
  return s;
}

function displaySubjectName(canonical) {
  const map = {
    physics: 'Physics',
    chemistry: 'Chemistry',
    maths: 'Maths',
    biology: 'Biology',
    pcm: 'PCM',
    pcb: 'PCB',
    pcmb: 'PCMB',
  };
  return map[canonical] || canonical.charAt(0).toUpperCase() + canonical.slice(1);
}

function getExamSubjectList(exam, marksDocs = []) {
  const type = normalizeExamType(exam?.examType);
  if (type === 'JEE') return ['Physics', 'Chemistry', 'Maths'];
  if (type === 'NEET') return ['Physics', 'Chemistry', 'Biology'];
  if (type === 'GUJCET') {
    const found = new Set(['Physics', 'Chemistry']);
    marksDocs.forEach((m) => {
      if (m.examGroup === 'A') found.add('Maths');
      if (m.examGroup === 'B') found.add('Biology');
      (m.subjectMarks || []).forEach((sm) => {
        const c = normalizeCanonicalSubject(sm.subject);
        if (c === 'maths') found.add('Maths');
        if (c === 'biology') found.add('Biology');
      });
    });
    if (!found.has('Maths') && !found.has('Biology')) {
      found.add('Maths');
      found.add('Biology');
    }
    return ['Physics', 'Chemistry', ...(found.has('Maths') ? ['Maths'] : []), ...(found.has('Biology') ? ['Biology'] : [])];
  }
  return [exam?.subject || 'Physics'];
}

function getStudentDisplay(m) {
  const fullName =
    m.studentId?.fullName ||
    m.studentId?.name ||
    [m.studentId?.firstName, m.studentId?.lastName].filter(Boolean).join(' ') ||
    m.studentName ||
    'Student';
  return {
    studentId: String(m.studentId?._id || m.studentId || `roll-${m.rollNo || '0'}`),
    rollNo: m.studentId?.rollNo || m.rollNo || 0,
    name: fullName,
    division: m.studentId?.division || 'A',
    streamGroup: m.studentId?.streamGroup || m.streamGroup || 'ALL',
  };
}

/**
 * Extract normalized student entries for an exam, optionally filtered by
 * examGroup ('ALL' | 'A' | 'B') and/or canonical targetSubject (e.g., 'physics').
 * Ensures 1 entry per studentId when targetSubject or ALL scope is evaluated.
 */
function extractStudentScoreEntries(exam, marksDocs = [], { scopeGroup = 'ALL', targetSubject = null } = {}) {
  const targetCanon = targetSubject ? normalizeCanonicalSubject(targetSubject) : null;
  const groupFilter = String(scopeGroup || 'ALL').toUpperCase();

  let filteredDocs = marksDocs;
  if (normalizeExamType(exam?.examType) === 'GUJCET' && (groupFilter === 'A' || groupFilter === 'B')) {
    filteredDocs = marksDocs.filter((m) => String(m.examGroup || 'ALL').toUpperCase() === groupFilter);
  }

  const byStudent = new Map();

  filteredDocs.forEach((m) => {
    const info = getStudentDisplay(m);
    const sid = info.studentId;
    const isAbsent = Boolean(m.ab);

    let marksObtained = 0;
    let totalMaxMarks = Number(m.totalMaxMarks) || Number(exam?.totalMarks) || Number(exam?.marksPerSubject) || 100;
    let matchedSubject = false;

    if (targetCanon && targetCanon !== 'all') {
      const subArr = Array.isArray(m.subjectMarks) ? m.subjectMarks : [];
      const foundSm = subArr.find((sm) => normalizeCanonicalSubject(sm.subject) === targetCanon);
      if (foundSm) {
        matchedSubject = true;
        marksObtained = isAbsent ? 0 : Number(foundSm.marksObtained) || 0;
        totalMaxMarks = Number(foundSm.totalMarks) || Number(exam?.marksPerSubject) || 100;
      } else if (!isMultiSubjectExam(exam?.examType) && normalizeCanonicalSubject(exam?.subject) === targetCanon) {
        matchedSubject = true;
        marksObtained = isAbsent ? 0 : Number(m.totalObtained) || 0;
        totalMaxMarks = Number(m.totalMaxMarks) || Number(exam?.marksPerSubject) || 100;
      }
      if (!matchedSubject) return; // This marks row (e.g. Group B PCB) does not contain Maths
    } else {
      marksObtained = isAbsent ? 0 : Number(m.totalObtained) || 0;
    }

    const pct = isAbsent || totalMaxMarks <= 0 ? 0 : round1((marksObtained / totalMaxMarks) * 100);

    if (!byStudent.has(sid)) {
      byStudent.set(sid, {
        ...info,
        examGroup: m.examGroup || 'ALL',
        ab: isAbsent,
        marksObtained: round2(marksObtained),
        totalMaxMarks: round2(totalMaxMarks),
        percentage: pct,
        subjectMarks: Array.isArray(m.subjectMarks) ? m.subjectMarks : [],
        enteredByName: m.enteredByName || exam?.marksEnteredByName || 'Assistant Faculty',
        enteredAt: m.enteredAt || exam?.marksEnteredAt || null,
        _groupRecords: 1,
      });
    } else {
      // Handle GUJCET GROUP_AB students who took both Group A (PCM) and Group B (PCB)
      const prev = byStudent.get(sid);
      if (targetCanon && targetCanon !== 'all') {
        // For shared Physics/Chemistry in both A & B, prefer non-absent or higher recorded marks
        if (prev.ab && !isAbsent) {
          byStudent.set(sid, {
            ...info,
            examGroup: `${prev.examGroup}+${m.examGroup}`,
            ab: false,
            marksObtained: round2(marksObtained),
            totalMaxMarks: round2(totalMaxMarks),
            percentage: pct,
            subjectMarks: m.subjectMarks || [],
            enteredByName: m.enteredByName || prev.enteredByName,
            enteredAt: m.enteredAt || prev.enteredAt,
            _groupRecords: prev._groupRecords + 1,
          });
        }
      } else {
        // Combined A+B entry
        const mergedAb = prev.ab && isAbsent;
        const sumObt = (prev.ab ? 0 : prev.marksObtained) + (isAbsent ? 0 : marksObtained);
        const sumMax = (prev.ab ? 0 : prev.totalMaxMarks) + (isAbsent ? 0 : totalMaxMarks);
        const mergedPct = mergedAb || sumMax <= 0 ? 0 : round1((sumObt / sumMax) * 100);
        // Merge unique subjectMarks
        const subMap = new Map();
        [...(prev.subjectMarks || []), ...(m.subjectMarks || [])].forEach((sm) => {
          const key = normalizeCanonicalSubject(sm.subject);
          if (!subMap.has(key)) subMap.set(key, sm);
        });
        byStudent.set(sid, {
          ...prev,
          examGroup: prev.examGroup !== m.examGroup ? 'A+B' : prev.examGroup,
          ab: mergedAb,
          marksObtained: round2(sumObt),
          totalMaxMarks: round2(sumMax || prev.totalMaxMarks),
          percentage: mergedPct,
          subjectMarks: Array.from(subMap.values()),
          _groupRecords: prev._groupRecords + 1,
        });
      }
    }
  });

  return Array.from(byStudent.values()).sort((a, b) => (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0));
}

function computeSummaryStatsFromEntries(entries = []) {
  const present = entries.filter((e) => !e.ab);
  const absent = entries.filter((e) => e.ab);
  const totalCount = entries.length;
  const presentCount = present.length;

  if (presentCount === 0) {
    return {
      totalStudents: totalCount,
      presentCount: 0,
      absentCount: absent.length,
      classAveragePercent: 0,
      averageMarks: 0,
      totalMaxMarks: entries[0]?.totalMaxMarks || 100,
      highestMarks: 0,
      highestPercent: 0,
      lowestMarks: 0,
      lowestPercent: 0,
      passStudents: 0,
      failedStudents: 0,
      passRatePercent: 0,
      stdDevPercent: 0,
      brackets: [
        { range: '90–100%', count: 0, color: '#1F9D6B' },
        { range: '75–90%', count: 0, color: '#123B5D' },
        { range: '60–75%', count: 0, color: '#D99A2B' },
        { range: '40–60%', count: 0, color: '#E0473D' },
        { range: 'Below 40%', count: 0, color: '#64748B' },
      ],
    };
  }

  const pctSum = present.reduce((s, e) => s + e.percentage, 0);
  const marksSum = present.reduce((s, e) => s + e.marksObtained, 0);
  const maxRef = present[0]?.totalMaxMarks || 100;
  const classAveragePercent = round1(pctSum / presentCount);
  const averageMarks = round2(marksSum / presentCount);

  let highestMarks = -Infinity;
  let highestPercent = -Infinity;
  let lowestMarks = Infinity;
  let lowestPercent = Infinity;
  let passStudents = 0;
  let failedStudents = 0;

  let b90 = 0;
  let b75 = 0;
  let b60 = 0;
  let b40 = 0;
  let bBelow = 0;

  present.forEach((e) => {
    if (e.marksObtained > highestMarks) highestMarks = e.marksObtained;
    if (e.percentage > highestPercent) highestPercent = e.percentage;
    if (e.marksObtained < lowestMarks) lowestMarks = e.marksObtained;
    if (e.percentage < lowestPercent) lowestPercent = e.percentage;

    if (e.percentage >= 40) passStudents += 1;
    else failedStudents += 1;

    if (e.percentage >= 90) b90 += 1;
    else if (e.percentage >= 75) b75 += 1;
    else if (e.percentage >= 60) b60 += 1;
    else if (e.percentage >= 40) b40 += 1;
    else bBelow += 1;
  });

  // Note: Include absent students in failed count? No, keep present fail <40 separate from absent OR report clearly
  const variance = present.reduce((s, e) => s + Math.pow(e.percentage - classAveragePercent, 2), 0) / presentCount;
  const stdDevPercent = round1(Math.sqrt(variance));

  return {
    totalStudents: totalCount,
    presentCount,
    absentCount: absent.length,
    classAveragePercent,
    averageMarks,
    totalMaxMarks: maxRef,
    highestMarks: round2(highestMarks),
    highestPercent: round1(highestPercent),
    lowestMarks: round2(lowestMarks),
    lowestPercent: round1(lowestPercent),
    passStudents,
    failedStudents,
    passRatePercent: round1((passStudents / presentCount) * 100),
    stdDevPercent,
    brackets: [
      { range: '90–100%', count: b90, color: '#1F9D6B' },
      { range: '75–90%', count: b75, color: '#123B5D' },
      { range: '60–75%', count: b60, color: '#D99A2B' },
      { range: '40–60%', count: b40, color: '#E0473D' },
      { range: 'Below 40%', count: bBelow, color: '#64748B' },
    ],
  };
}

function sortExamsChronologically(exams = []) {
  return [...exams].sort((a, b) => {
    const da = new Date(a.examDate || a.createdAt).getTime();
    const db = new Date(b.examDate || b.createdAt).getTime();
    if (da !== db) return da - db;
    const na = Number(a.examNo) || 0;
    const nb = Number(b.examNo) || 0;
    if (na !== nb) return na - nb;
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });
}

/**
 * Filter historical evaluated exams of SAME examType, standard, and matching subject
 * (for single-subject exams, exact canonical subject match; for JEE/NEET/GUJCET, same examType).
 */
function findMatchingSeriesExams(currentExam, allEvaluatedExams, { targetSubject = null } = {}) {
  const curStd = normalizeStd(currentExam.standard);
  const curType = normalizeExamType(currentExam.examType);
  const curCanonSubj = normalizeCanonicalSubject(currentExam.subject);
  const multi = isMultiSubjectExam(curType);
  const subjFilter = targetSubject ? normalizeCanonicalSubject(targetSubject) : null;

  const sorted = sortExamsChronologically(allEvaluatedExams).filter((e) => {
    if (normalizeStd(e.standard) !== curStd) return false;
    if (normalizeExamType(e.examType) !== curType) return false;
    if (subjFilter && subjFilter !== 'all') {
      if (!multi) {
        return normalizeCanonicalSubject(e.subject) === subjFilter;
      }
      // For multi-subject exams, allow if it could contain that subject (checked dynamically with marks)
      return true;
    }
    if (!multi) {
      return normalizeCanonicalSubject(e.subject) === curCanonSubj;
    }
    return true;
  });

  // Division preference: if current exam specifies a specific division ('A'..'D'), keep matching division or 'ALL'
  const curDiv = String(currentExam.division || 'ALL').toUpperCase();
  if (curDiv !== 'ALL') {
    const divMatched = sorted.filter((e) => {
      const ed = String(e.division || 'ALL').toUpperCase();
      return ed === curDiv || ed === 'ALL';
    });
    if (divMatched.some((e) => String(e._id || e.id) === String(currentExam._id || currentExam.id))) {
      return divMatched;
    }
  }
  return sorted;
}

/**
 * Run Model 1 (examPerformanceModel) + difficulty / evaluation messaging
 */
function evaluateExamPerformanceBanner(stats, prevStats, hasPreviousExam, currentExam) {
  const model = loadExamMlModel();
  const perfModel = model.examPerformanceModel;

  const present = stats.presentCount || 0;
  if (present === 0) {
    return {
      difficultyLabel: 'Pending',
      performanceTier: 'NEEDS_ATTENTION',
      mlConfidence: 0,
      performanceMessage: 'No student marks have been recorded for this examination yet.',
      alertStatus: 'WEAK_TOPIC_UNDERSTANDING',
    };
  }

  const highCount = (stats.brackets[0]?.count || 0) + (stats.brackets[1]?.count || 0);
  const belowCount = stats.brackets[4]?.count || 0;
  const delta = hasPreviousExam && prevStats ? stats.classAveragePercent - prevStats.classAveragePercent : 0;

  const rawFeat = [
    stats.classAveragePercent / 100,
    stats.passStudents / present,
    highCount / present,
    belowCount / present,
    Math.max(-1, Math.min(1, delta / 25)),
    Math.min(1, (stats.stdDevPercent || 10) / 35),
  ];

  const stdFeat = rawFeat.map((v, j) => (v - perfModel.scaler.means[j]) / (perfModel.scaler.stds[j] || 1));
  const logits = perfModel.W.map((row, c) => row.reduce((sum, w, j) => sum + w * stdFeat[j], perfModel.b[c]));
  const probs = softmax(logits);
  const predIdx = probs.indexOf(Math.max(...probs));
  const mlConfidence = Math.round(probs[predIdx] * 100);
  const performanceTier = perfModel.classes[predIdx];

  let difficultyLabel = 'Moderate';
  if (stats.classAveragePercent < 55 || stats.passRatePercent < 65) difficultyLabel = 'Hard';
  else if (stats.classAveragePercent >= 78 && stats.passRatePercent >= 88) difficultyLabel = 'Easy / Balanced';

  let performanceMessage = '';
  const subjLabel = isMultiSubjectExam(currentExam.examType)
    ? `${currentExam.examType} (${currentExam.subject})`
    : currentExam.subject;

  if (hasPreviousExam && prevStats) {
    const diff = round1(stats.classAveragePercent - prevStats.classAveragePercent);
    if (diff > 0) {
      performanceMessage =
        diff >= 4 || stats.classAveragePercent >= 72
          ? `Class performance is Good this exam — average rose +${diff.toFixed(1)}% vs. previous ${subjLabel} exam (${prevStats.classAveragePercent}% → ${stats.classAveragePercent}%).`
          : `Class improved steadily (+${diff.toFixed(1)}%) compared to the previous ${subjLabel} exam (${prevStats.classAveragePercent}% → ${stats.classAveragePercent}%).`;
    } else if (diff < 0) {
      performanceMessage = `Class average declined by -${Math.abs(diff).toFixed(1)}% vs. previous ${subjLabel} exam (${prevStats.classAveragePercent}% → ${stats.classAveragePercent}%). Targeted revision recommended.`;
    } else {
      performanceMessage = `Class average remained steady at ${stats.classAveragePercent}% compared to the previous ${subjLabel} exam.`;
    }
  } else if (performanceTier === 'STRONG_PERFORMANCE') {
    performanceMessage = `Strong baseline performance with ${stats.classAveragePercent}% class average and ${stats.passRatePercent}% pass rate across ${present} evaluated students.`;
  } else if (performanceTier === 'NEEDS_ATTENTION') {
    performanceMessage = `Attention required: class average is ${stats.classAveragePercent}% with ${stats.failedStudents} student(s) below the 40% benchmark.`;
  } else {
    performanceMessage = `Satisfactory baseline with ${stats.classAveragePercent}% class average (${stats.passStudents}/${present} passed).`;
  }

  const isWeak =
    stats.classAveragePercent < 50 ||
    stats.passRatePercent < 65 ||
    (hasPreviousExam && prevStats && stats.classAveragePercent - prevStats.classAveragePercent <= -5) ||
    performanceTier === 'NEEDS_ATTENTION';

  return {
    difficultyLabel,
    performanceTier,
    mlConfidence,
    performanceMessage,
    alertStatus: isWeak ? 'WEAK_TOPIC_UNDERSTANDING' : 'GOOD_UNDERSTANDING',
  };
}

/**
 * Compute NTA-style percentile leaderboard
 */
function buildLeaderboard(entries = []) {
  const present = entries
    .filter((e) => !e.ab)
    .sort((a, b) => b.percentage - a.percentage || b.marksObtained - a.marksObtained || (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0));
  const absent = entries
    .filter((e) => e.ab)
    .sort((a, b) => (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0));

  const N = present.length;
  const rows = [];
  let prevPct = null;
  let currentRank = 0;

  present.forEach((st, idx) => {
    if (prevPct === null || st.percentage < prevPct) {
      currentRank = idx + 1;
      prevPct = st.percentage;
    }
    const countLessOrEqual = present.filter((p) => p.percentage <= st.percentage).length;
    const percentile = N > 0 ? round2((countLessOrEqual / N) * 100) : 0;

    rows.push({
      rank: currentRank,
      studentId: st.studentId,
      rollNo: st.rollNo,
      name: st.name,
      division: st.division,
      examGroup: st.examGroup,
      marksObtained: st.marksObtained,
      totalMaxMarks: st.totalMaxMarks,
      percentage: st.percentage,
      percentile,
      ab: false,
      passed: st.percentage >= 40,
      subjectMarks: st.subjectMarks || [],
    });
  });

  absent.forEach((st) => {
    rows.push({
      rank: present.length + 1,
      studentId: st.studentId,
      rollNo: st.rollNo,
      name: st.name,
      division: st.division,
      examGroup: st.examGroup,
      marksObtained: 0,
      totalMaxMarks: st.totalMaxMarks,
      percentage: 0,
      percentile: 0,
      ab: true,
      passed: false,
      subjectMarks: st.subjectMarks || [],
    });
  });

  return rows;
}

/**
 * Compute student-by-student shift vs previous same type & subject exam
 */
function computeStudentComparisonVsPrevious(currentEntries = [], previousEntries = []) {
  const prevBySid = new Map();
  const prevByRoll = new Map();
  previousEntries.forEach((p) => {
    if (p.ab) return;
    prevBySid.set(p.studentId, p);
    if (p.rollNo) prevByRoll.set(String(p.rollNo), p);
  });

  const increasedStudents = [];
  const decreasedStudents = [];
  let unchangedCount = 0;

  currentEntries.forEach((curr) => {
    if (curr.ab) return;
    const prev = prevBySid.get(curr.studentId) || (curr.rollNo ? prevByRoll.get(String(curr.rollNo)) : null);
    if (!prev) return;

    const deltaPercent = round1(curr.percentage - prev.percentage);
    const deltaMarks = round2(curr.marksObtained - prev.marksObtained);
    const payload = {
      studentId: curr.studentId,
      rollNo: curr.rollNo,
      name: curr.name,
      division: curr.division,
      examGroup: curr.examGroup,
      previousMarks: prev.marksObtained,
      previousMaxMarks: prev.totalMaxMarks,
      previousPercent: prev.percentage,
      currentMarks: curr.marksObtained,
      currentMaxMarks: curr.totalMaxMarks,
      currentPercent: curr.percentage,
      deltaMarks,
      deltaPercent,
    };

    if (deltaPercent > 0.05) {
      increasedStudents.push(payload);
    } else if (deltaPercent < -0.05) {
      decreasedStudents.push(payload);
    } else {
      unchangedCount += 1;
    }
  });

  increasedStudents.sort((a, b) => b.deltaPercent - a.deltaPercent || (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0));
  decreasedStudents.sort((a, b) => a.deltaPercent - b.deltaPercent || (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0));

  return { increasedStudents, decreasedStudents, unchangedCount };
}

/**
 * Predict Consistent Growth & Consistent Decrease lists using ML Softmax Trajectory Classifier + statistical safeguards
 */
function computeLongitudinalStudentConsistency(seriesExams = [], marksByExamId, scopeGroup = 'ALL') {
  const model = loadExamMlModel();
  const trajModel = model.studentTrajectoryModel;

  if (!seriesExams || seriesExams.length < 2) {
    return {
      requiresMoreExams: true,
      evaluatedExamsAnalyzed: seriesExams ? seriesExams.length : 0,
      consistentGrowthList: [],
      consistentDecreaseList: [],
      mlAccuracyPercent: trajModel.validationAccuracyPercent,
    };
  }

  const studentHistMap = new Map();

  seriesExams.forEach((ex) => {
    const eid = String(ex._id || ex.id);
    const mDocs = marksByExamId.get(eid) || [];
    const entries = extractStudentScoreEntries(ex, mDocs, { scopeGroup });
    entries.forEach((st) => {
      if (st.ab) return;
      if (!studentHistMap.has(st.studentId)) {
        studentHistMap.set(st.studentId, {
          studentId: st.studentId,
          rollNo: st.rollNo,
          name: st.name,
          division: st.division,
          percentages: [],
          history: [],
        });
      }
      const holder = studentHistMap.get(st.studentId);
      holder.percentages.push(st.percentage);
      holder.history.push({
        examId: eid,
        examNo: ex.examNo,
        examType: ex.examType,
        subject: ex.subject,
        date: ex.examDate,
        marksObtained: st.marksObtained,
        totalMaxMarks: st.totalMaxMarks,
        percentage: st.percentage,
      });
    });
  });

  const consistentGrowthList = [];
  const consistentDecreaseList = [];

  studentHistMap.forEach((st) => {
    const seq = st.percentages;
    if (seq.length < 2) return;

    const rawFeat = extractStudentExamTrajectoryFeatures(seq);
    const stdFeat = rawFeat.map((v, j) => (v - trajModel.scaler.means[j]) / (trajModel.scaler.stds[j] || 1));
    const logits = trajModel.W.map((row, c) => row.reduce((sum, w, j) => sum + w * stdFeat[j], trajModel.b[c]));
    const probs = softmax(logits);
    const predIdx = probs.indexOf(Math.max(...probs));
    const mlConfidence = Math.round(probs[predIdx] * 100);

    const [olsSlopeNorm, , upRatio, downRatio] = rawFeat;
    const olsSlope = round1(olsSlopeNorm * 20);
    const netChange = round1(seq[seq.length - 1] - seq[0]);
    const avgPercent = round1(seq.reduce((a, b) => a + b, 0) / seq.length);
    const latestPercent = seq[seq.length - 1];

    const record = {
      studentId: st.studentId,
      rollNo: st.rollNo,
      name: st.name,
      division: st.division,
      testsCount: seq.length,
      avgPercent,
      latestPercent,
      netChange,
      slopePerExam: olsSlope,
      upwardRatio: round2(upRatio),
      downwardRatio: round2(downRatio),
      mlConfidence,
      history: st.history,
    };

    // Hybrid ML + trajectory sanity check:
    // Consistent Growth = ML class 0 OR sustained upward monotonic trajectory with net gain > 2%
    if ((predIdx === 0 || (probs[0] >= 0.42 && upRatio >= 0.67)) && netChange > 0.5 && olsSlope > 0) {
      consistentGrowthList.push(record);
    } else if ((predIdx === 1 || (probs[1] >= 0.42 && downRatio >= 0.67)) && netChange < -0.5 && olsSlope < 0) {
      consistentDecreaseList.push(record);
    } else if (seq.length >= 2 && avgPercent >= 82 && netChange >= 0 && predIdx !== 1) {
      // Sustained elite high performers who remain consistently strong
      consistentGrowthList.push({
        ...record,
        mlConfidence: Math.max(mlConfidence, Math.round(probs[0] * 100)),
      });
    }
  });

  consistentGrowthList.sort((a, b) => b.netChange - a.netChange || b.avgPercent - a.avgPercent || (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0));
  consistentDecreaseList.sort((a, b) => a.netChange - b.netChange || a.avgPercent - b.avgPercent || (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0));

  return {
    requiresMoreExams: false,
    evaluatedExamsAnalyzed: seriesExams.length,
    consistentGrowthList,
    consistentDecreaseList,
    mlAccuracyPercent: trajModel.validationAccuracyPercent,
  };
}

/**
 * Compute per-subject stats + comparison against previous same-type exam containing that subject
 */
function computeSubjectAnalytics(currentExam, allEvaluatedExams, marksByExamId, targetSubject) {
  const curId = String(currentExam._id || currentExam.id);
  const currDocs = marksByExamId.get(curId) || [];
  const currEntries = extractStudentScoreEntries(currentExam, currDocs, { scopeGroup: 'ALL', targetSubject });
  const currStats = computeSummaryStatsFromEntries(currEntries);

  // Find previous evaluated exam of same examType & standard that has entries for targetSubject
  const series = findMatchingSeriesExams(currentExam, allEvaluatedExams, { targetSubject });
  const curIdx = series.findIndex((e) => String(e._id || e.id) === curId);

  let prevExamDoc = null;
  let prevStats = null;
  let prevEntries = [];
  for (let i = curIdx - 1; i >= 0; i--) {
    const candidate = series[i];
    const cid = String(candidate._id || candidate.id);
    const cDocs = marksByExamId.get(cid) || [];
    const cEntries = extractStudentScoreEntries(candidate, cDocs, { scopeGroup: 'ALL', targetSubject });
    if (cEntries.some((e) => !e.ab)) {
      prevExamDoc = candidate;
      prevEntries = cEntries;
      prevStats = computeSummaryStatsFromEntries(cEntries);
      break;
    }
  }

  const hasPrevious = Boolean(prevExamDoc && prevStats && prevStats.presentCount > 0);
  const deltaPercent = hasPrevious ? round1(currStats.classAveragePercent - prevStats.classAveragePercent) : null;
  const growthRate = hasPrevious && deltaPercent >= 0 ? deltaPercent : null;
  const downfallRate = hasPrevious && deltaPercent < 0 ? round1(Math.abs(deltaPercent)) : null;

  let strongCount = 0;
  let midCount = 0;
  let weakCount = 0;
  currEntries.forEach((e) => {
    if (e.ab) return;
    if (e.percentage >= 75) strongCount += 1;
    else if (e.percentage >= 40) midCount += 1;
    else weakCount += 1;
  });

  const displayName = displaySubjectName(normalizeCanonicalSubject(targetSubject));
  const isWeak =
    currStats.presentCount > 0 &&
    (currStats.classAveragePercent < 50 ||
      currStats.passRatePercent < 65 ||
      (downfallRate !== null && downfallRate >= 5));

  const alertTitle = isWeak
    ? `${displayName} — Attention / Revision Recommended`
    : `${displayName} — Strong Class Performance`;

  let alertMessage = '';
  if (currStats.presentCount === 0) {
    alertMessage = `No evaluated submissions for ${displayName} in this exam yet.`;
  } else if (hasPrevious) {
    const trendTxt =
      growthRate !== null
        ? `improved by +${growthRate.toFixed(1)}% vs. Exam #${prevExamDoc.examNo} (${prevStats.classAveragePercent}% → ${currStats.classAveragePercent}%)`
        : `declined by -${downfallRate.toFixed(1)}% vs. Exam #${prevExamDoc.examNo} (${prevStats.classAveragePercent}% → ${currStats.classAveragePercent}%)`;
    alertMessage = `${displayName} class average is ${currStats.classAveragePercent}% (${currStats.averageMarks}/${currStats.totalMaxMarks} marks), Highest: ${currStats.highestMarks}, Lowest: ${currStats.lowestMarks}. Performance ${trendTxt}.`;
  } else {
    alertMessage = `${displayName} class average is ${currStats.classAveragePercent}% (${currStats.averageMarks}/${currStats.totalMaxMarks} marks), Highest: ${currStats.highestMarks}, Lowest: ${currStats.lowestMarks}. First evaluated ${currentExam.examType} exam baseline.`;
  }

  return {
    subject: displayName,
    canonicalSubject: normalizeCanonicalSubject(targetSubject),
    presentCount: currStats.presentCount,
    absentCount: currStats.absentCount,
    totalStudents: currStats.totalStudents,
    classAveragePercent: currStats.classAveragePercent,
    averageMarks: currStats.averageMarks,
    totalMaxMarks: currStats.totalMaxMarks,
    highestMarks: currStats.highestMarks,
    highestPercent: currStats.highestPercent,
    lowestMarks: currStats.lowestMarks,
    lowestPercent: currStats.lowestPercent,
    passCount: currStats.passStudents,
    failCount: currStats.failedStudents,
    passRatePercent: currStats.passRatePercent,
    strongCount,
    midCount,
    weakCount,
    hasPrevious,
    previousExam: hasPrevious
      ? {
          id: String(prevExamDoc._id || prevExamDoc.id),
          examNo: prevExamDoc.examNo,
          examType: prevExamDoc.examType,
          examDate: prevExamDoc.examDate,
          averagePercent: prevStats.classAveragePercent,
          averageMarks: prevStats.averageMarks,
        }
      : null,
    deltaPercent,
    growthRate,
    downfallRate,
    alertStatus: isWeak ? 'WEAK_TOPIC_UNDERSTANDING' : 'GOOD_UNDERSTANDING',
    alertTitle,
    alertMessage,
    comparison: hasPrevious ? computeStudentComparisonVsPrevious(currEntries, prevEntries) : null,
  };
}

/**
 * Full Detailed Analytics Payload for Principal ExamAnalysisDetail page
 */
function buildExamDetailedAnalytics(currentExam, allEvaluatedExams = [], marksByExamId, { scopeGroup = 'ALL' } = {}) {
  const curId = String(currentExam._id || currentExam.id);
  const currDocs = marksByExamId.get(curId) || [];
  const multi = isMultiSubjectExam(currentExam.examType);

  const currEntries = extractStudentScoreEntries(currentExam, currDocs, { scopeGroup });
  const stats = computeSummaryStatsFromEntries(currEntries);

  // Match chronological series for overall exam comparison
  const series = findMatchingSeriesExams(currentExam, allEvaluatedExams);
  const curIdx = series.findIndex((e) => String(e._id || e.id) === curId);

  let prevExam = null;
  let prevEntries = [];
  let prevStats = null;
  for (let i = curIdx - 1; i >= 0; i--) {
    const candidate = series[i];
    const cid = String(candidate._id || candidate.id);
    const cDocs = marksByExamId.get(cid) || [];
    const cEntries = extractStudentScoreEntries(candidate, cDocs, { scopeGroup });
    if (cEntries.some((e) => !e.ab)) {
      prevExam = candidate;
      prevEntries = cEntries;
      prevStats = computeSummaryStatsFromEntries(cEntries);
      break;
    }
  }

  const hasPreviousExam = Boolean(prevExam && prevStats && prevStats.presentCount > 0);
  const deltaPercent = hasPreviousExam ? round1(stats.classAveragePercent - prevStats.classAveragePercent) : null;
  const growthRate = hasPreviousExam && deltaPercent >= 0 ? deltaPercent : null;
  const downfallRate = hasPreviousExam && deltaPercent < 0 ? round1(Math.abs(deltaPercent)) : null;

  const studentShift = hasPreviousExam
    ? computeStudentComparisonVsPrevious(currEntries, prevEntries)
    : { increasedStudents: [], decreasedStudents: [], unchangedCount: 0 };

  const banner = evaluateExamPerformanceBanner(stats, prevStats, hasPreviousExam, currentExam);
  const leaderboard = buildLeaderboard(currEntries);
  const consistency = computeLongitudinalStudentConsistency(series.slice(0, curIdx >= 0 ? curIdx + 1 : series.length), marksByExamId, scopeGroup);

  // Build subject-wise breakdown + 2 multi-subject chart datasets for JEE / NEET / GUJCET (and usable for Faculty Reports!)
  const subjectNames = getExamSubjectList(currentExam, currDocs);
  const subjectSummaries = subjectNames.map((sub) =>
    computeSubjectAnalytics(currentExam, allEvaluatedExams, marksByExamId, sub)
  );

  // Chronological trend across up to 6 recent same-type exams for Chart 2 in Student Analysis tab
  let subjectTrendSeries = null;
  if (multi) {
    const windowExams = series.slice(0, curIdx >= 0 ? curIdx + 1 : series.length).slice(-6);
    const labels = windowExams.map((e) => `Exam #${e.examNo}`);
    const datasets = subjectNames.map((sub) => {
      const dataPoints = windowExams.map((ex) => {
        const eid = String(ex._id || ex.id);
        const docs = marksByExamId.get(eid) || [];
        const entries = extractStudentScoreEntries(ex, docs, { scopeGroup: 'ALL', targetSubject: sub });
        const s = computeSummaryStatsFromEntries(entries);
        return s.presentCount > 0 ? s.classAveragePercent : null;
      });
      return {
        subject: sub,
        data: dataPoints,
      };
    });
    subjectTrendSeries = {
      labels,
      examsCount: windowExams.length,
      datasets,
    };
  }

  const model = loadExamMlModel();

  return {
    exam: {
      id: curId,
      examNo: currentExam.examNo,
      title: currentExam.title,
      examType: normalizeExamType(currentExam.examType),
      subject: currentExam.subject,
      standard: normalizeStd(currentExam.standard),
      standardLabel: formatStdLabel(currentExam.standard),
      division: currentExam.division || 'ALL',
      streamGroup: currentExam.streamGroup || 'ALL',
      isMultiSubject: multi,
      availableSubjects: subjectNames,
      availableGroups:
        normalizeExamType(currentExam.examType) === 'GUJCET'
          ? Array.from(new Set(currDocs.map((d) => d.examGroup).filter((g) => g === 'A' || g === 'B'))).sort()
          : [],
      examDate: currentExam.examDate,
      examTime: currentExam.examTime,
      marksPerSubject: currentExam.marksPerSubject || 100,
      totalMarks: currentExam.totalMarks || 100,
      unitSummary: currentExam.unitSummary || '',
      questionPaperStatus: currentExam.questionPaperStatus || 'PENDING',
      questionPaperFileName: currentExam.questionPaperFileName || null,
      status: currentExam.status,
      marksEnteredAt: currentExam.marksEnteredAt || null,
      marksEnteredByName: currentExam.marksEnteredByName || 'Assistant Faculty',
      facultyName: currentExam.facultyName || '',
    },
    scopeGroup,
    overview: {
      classAveragePercent: stats.classAveragePercent,
      averageMarks: stats.averageMarks,
      totalMaxMarks: stats.totalMaxMarks,
      highestMarks: stats.highestMarks,
      lowestMarks: stats.lowestMarks,
      passStudents: stats.passStudents,
      failedStudents: stats.failedStudents,
      absentCount: stats.absentCount,
      presentCount: stats.presentCount,
      totalStudents: stats.totalStudents,
      passRatePercent: stats.passRatePercent,
      difficultyLabel: banner.difficultyLabel,
      performanceTier: banner.performanceTier,
      mlConfidence: banner.mlConfidence,
      alertStatus: banner.alertStatus,
    },
    scoreBrackets: stats.brackets,
    comparison: {
      hasPreviousExam,
      previousExam: hasPreviousExam
        ? {
            id: String(prevExam._id || prevExam.id),
            examNo: prevExam.examNo,
            subject: prevExam.subject,
            examType: prevExam.examType,
            examDate: prevExam.examDate,
            classAveragePercent: prevStats.classAveragePercent,
            averageMarks: prevStats.averageMarks,
          }
        : null,
      currentAveragePercent: stats.classAveragePercent,
      previousAveragePercent: hasPreviousExam ? prevStats.classAveragePercent : null,
      growthRate,
      downfallRate,
      deltaPercent,
      increasedCount: studentShift.increasedStudents.length,
      decreasedCount: studentShift.decreasedStudents.length,
      unchangedCount: studentShift.unchangedCount,
      increasedStudents: studentShift.increasedStudents,
      decreasedStudents: studentShift.decreasedStudents,
      performanceMessage: banner.performanceMessage,
    },
    leaderboard,
    studentAnalysis: {
      topGrowth: studentShift.increasedStudents.map((s) => ({
        studentId: s.studentId,
        rollNo: s.rollNo,
        name: s.name,
        division: s.division,
        previousPercent: s.previousPercent,
        currentPercent: s.currentPercent,
        rate: s.deltaPercent,
      })),
      decreaseGrowth: studentShift.decreasedStudents.map((s) => ({
        studentId: s.studentId,
        rollNo: s.rollNo,
        name: s.name,
        division: s.division,
        previousPercent: s.previousPercent,
        currentPercent: s.currentPercent,
        rate: Math.abs(s.deltaPercent),
      })),
      consistentGrowth: consistency.consistentGrowthList,
      consistentDecrease: consistency.consistentDecreaseList,
      requiresMoreExams: consistency.requiresMoreExams,
      evaluatedExamsAnalyzed: consistency.evaluatedExamsAnalyzed,
      subjectWiseAnalytics: multi
        ? {
            subjects: subjectSummaries,
            trendSeries: subjectTrendSeries,
          }
        : null,
    },
    subjectReportSummaries: subjectSummaries,
    mlModelMeta: {
      version: model.version,
      examPerformanceAccuracy: model.examPerformanceModel.validationAccuracyPercent,
      studentTrajectoryAccuracy: model.studentTrajectoryModel.validationAccuracyPercent,
    },
  };
}

module.exports = {
  loadExamMlModel,
  retrainExamMlModel,
  normalizeExamType,
  isMultiSubjectExam,
  normalizeStd,
  formatStdLabel,
  normalizeCanonicalSubject,
  displaySubjectName,
  getExamSubjectList,
  extractStudentScoreEntries,
  computeSummaryStatsFromEntries,
  sortExamsChronologically,
  computeSubjectAnalytics,
  buildExamDetailedAnalytics,
};

