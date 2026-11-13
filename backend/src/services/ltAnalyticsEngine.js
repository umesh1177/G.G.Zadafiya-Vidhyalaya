const fs = require('fs');
const path = require('path');
const { trainAndSaveModels, extractStudentFeatures, sigmoid, softmax } = require('../ml/trainLtModel');

const WEIGHTS_PATH = path.join(__dirname, '../ml/ltModelWeights.json');
let cachedModel = null;

function loadMlModel() {
  if (cachedModel) return cachedModel;
  try {
    if (fs.existsSync(WEIGHTS_PATH)) {
      cachedModel = JSON.parse(fs.readFileSync(WEIGHTS_PATH, 'utf8'));
      return cachedModel;
    }
  } catch (err) {
    console.warn('Could not read ltModelWeights.json, retraining:', err.message);
  }
  cachedModel = trainAndSaveModels();
  return cachedModel;
}

function retrainMlModel(customSamples = []) {
  cachedModel = trainAndSaveModels(customSamples);
  return cachedModel;
}

function normalizeGrade(gradeRaw) {
  const up = String(gradeRaw || '').trim().toUpperCase();
  if (up === 'EXCELLENT') return 'Excellent';
  if (up === 'BETTER') return 'Better';
  if (up === 'AB' || up === 'ABSENT') return 'AB';
  if (up === 'GOOD' || up === 'POOR') return 'Good';
  return 'Better';
}

function gradeToNumeric(gradeNormalized) {
  if (gradeNormalized === 'Excellent') return 3;
  if (gradeNormalized === 'Better') return 2;
  if (gradeNormalized === 'Good') return 1;
  return 0; // AB
}

function normalizeStd(std) {
  const s = String(std || '').toUpperCase().trim();
  if (s.includes('11')) return 'STD_11';
  return 'STD_12';
}

function normalizeSubjKey(subj) {
  const s = String(subj || '').trim().toLowerCase();
  if (s.includes('chem')) return 'chemistry';
  if (s.includes('phys')) return 'physics';
  if (s.includes('math')) return 'mathematics';
  if (s.includes('bio')) return 'biology';
  return s;
}

function formatStdDisplay(std) {
  return normalizeStd(std) === 'STD_11' ? 'Standard 11' : 'Standard 12';
}

/**
 * Predict class average rubric band & weak-topic understanding risk
 * combining exact weighted rubric mean + trained Binary Logistic Regression classifier
 */
function analyzeClassDistribution(marks = []) {
  const model = loadMlModel();
  const topicModel = model.topicWeaknessModel;

  let excellent = 0;
  let better = 0;
  let good = 0;
  let ab = 0;

  const excellentList = [];
  const betterList = [];
  const goodList = [];
  const abList = [];

  marks.forEach((m) => {
    const norm = normalizeGrade(m.grade);
    const fullStName = m.studentId?.fullName || m.studentId?.name || [m.studentId?.firstName, m.studentId?.lastName].filter(Boolean).join(' ') || m.studentName || 'Student';
    const studentEntry = {
      studentId: String(m.studentId?._id || m.studentId || ''),
      rollNo: m.studentId?.rollNo || m.rollNo || '—',
      name: fullStName,
      standard: formatStdDisplay(m.studentId?.standard || 'STD_12'),
      division: m.studentId?.division || '',
      grade: norm,
    };

    if (norm === 'Excellent') {
      excellent++;
      excellentList.push(studentEntry);
    } else if (norm === 'Better') {
      better++;
      betterList.push(studentEntry);
    } else if (norm === 'Good') {
      good++;
      goodList.push(studentEntry);
    } else {
      ab++;
      abList.push(studentEntry);
    }
  });

  // Sort lists numerically by rollNo
  const byRoll = (a, b) => (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0);
  excellentList.sort(byRoll);
  betterList.sort(byRoll);
  goodList.sort(byRoll);
  abList.sort(byRoll);

  const presentCount = excellent + better + good;
  const totalCount = presentCount + ab;

  if (presentCount === 0) {
    return {
      distribution: { excellent: 0, better: 0, good: 0, ab, total: totalCount, present: 0 },
      overallAverage: 'Good',
      classAverageScore: 0,
      classAveragePercent: 0,
      weakTopicProbability: 1,
      alertStatus: 'WEAK_TOPIC_UNDERSTANDING',
      alertTitle: 'Weak Topic Understanding / Insufficient Submissions',
      alertMessage: 'No graded student submissions are present for this LT yet.',
      excellentList,
      betterList,
      goodList,
      abList,
      mlModelMeta: {
        version: model.version,
        topicClassifierAccuracy: topicModel.validationAccuracyPercent,
        consistencyClassifierAccuracy: model.consistencyModel.validationAccuracyPercent,
      },
    };
  }

  const meanScore = (3 * excellent + 2 * better + 1 * good) / presentCount; // 1.0 to 3.0
  const classAveragePercent = Math.round((meanScore / 3) * 100);

  let overallAverage = 'Better';
  if (meanScore >= 2.45 && good / presentCount < 0.25) {
    overallAverage = 'Excellent';
  } else if (meanScore < 1.75 || good / presentCount >= 0.5) {
    overallAverage = 'Good';
  }

  // Run Model 1 inference (standardized features)
  const eR = excellent / presentCount;
  const bR = better / presentCount;
  const gR = good / presentCount;
  const normMean = (meanScore - 1) / 2;
  const rawFeat = [eR, bR, gR, normMean];
  const stdFeat = rawFeat.map((v, j) => (v - topicModel.scaler.means[j]) / (topicModel.scaler.stds[j] || 1));
  const z = stdFeat.reduce((acc, v, j) => acc + v * topicModel.weights[j], topicModel.bias);
  const weakTopicProbability = Number(sigmoid(z).toFixed(4));

  // Flag weak topic understanding whenever average is 'Good' (lowest rubric tier) OR ML classifier predicts weak
  const isWeakTopic = overallAverage === 'Good' || weakTopicProbability >= 0.5;
  const alertStatus = isWeakTopic ? 'WEAK_TOPIC_UNDERSTANDING' : 'GOOD_UNDERSTANDING';

  const alertTitle = isWeakTopic
    ? 'Weak Topic Understanding Alert'
    : overallAverage === 'Excellent'
      ? 'Excellent Topic Understanding'
      : 'Good Class Performance & Understanding';

  const alertMessage = isWeakTopic
    ? `Overall class average is "${overallAverage}" (${classAveragePercent}%, mean ${meanScore.toFixed(2)}/3.00). ${good} of ${presentCount} present students (${Math.round(gR * 100)}%) fell into the remedial "Good" tier — indicating weak understanding of this topic. Remedial revision recommended.`
    : `Overall class average is "${overallAverage}" (${classAveragePercent}%, mean ${meanScore.toFixed(2)}/3.00). ${excellent + better} of ${presentCount} present students demonstrated competent or mastered understanding.`;

  return {
    distribution: { excellent, better, good, ab, total: totalCount, present: presentCount },
    overallAverage,
    classAverageScore: Number(meanScore.toFixed(2)),
    classAveragePercent,
    weakTopicProbability,
    alertStatus,
    alertTitle,
    alertMessage,
    excellentList,
    betterList,
    goodList,
    abList,
    mlModelMeta: {
      version: model.version,
      topicClassifierAccuracy: topicModel.validationAccuracyPercent,
      consistencyClassifierAccuracy: model.consistencyModel.validationAccuracyPercent,
    },
  };
}

/**
 * Compare current LT against immediately preceding Evaluated LT of SAME subject & standard
 */
function computeScoreTrajectory(currentLt, currentMarks, allEvaluatedLts, marksByLtId) {
  const curId = String(currentLt._id || currentLt.id);
  const curSubject = normalizeSubjKey(currentLt.subject);
  const curStd = normalizeStd(currentLt.standard);

  const sameSubjectLts = allEvaluatedLts
    .filter((lt) => {
      return (
        normalizeSubjKey(lt.subject) === curSubject &&
        normalizeStd(lt.standard) === curStd
      );
    })
    .sort((a, b) => {
      const da = new Date(a.examDate || a.createdAt).getTime();
      const db = new Date(b.examDate || b.createdAt).getTime();
      if (da !== db) return da - db;
      return (a.ltNo || 0) - (b.ltNo || 0);
    });

  const curIdx = sameSubjectLts.findIndex((lt) => String(lt._id || lt.id) === curId);
  const prevLt = curIdx > 0 ? sameSubjectLts[curIdx - 1] : null;

  if (!prevLt) {
    return {
      hasPreviousLt: false,
      previousLt: null,
      increasedList: [],
      decreasedList: [],
      unchangedCount: 0,
    };
  }

  const prevId = String(prevLt._id || prevLt.id);
  const prevMarks = marksByLtId.get(prevId) || [];
  const prevMap = new Map();
  prevMarks.forEach((m) => {
    const sid = String(m.studentId?._id || m.studentId || '');
    const roll = m.studentId?.rollNo || m.rollNo;
    const norm = normalizeGrade(m.grade);
    const num = gradeToNumeric(norm);
    if (sid) prevMap.set(sid, { grade: norm, score: num });
    if (roll) prevMap.set(`roll-${roll}`, { grade: norm, score: num });
  });

  const increasedList = [];
  const decreasedList = [];
  let unchangedCount = 0;

  currentMarks.forEach((m) => {
    const sid = String(m.studentId?._id || m.studentId || '');
    const roll = m.studentId?.rollNo || m.rollNo || '—';
    const name = m.studentId?.fullName || m.studentId?.name || [m.studentId?.firstName, m.studentId?.lastName].filter(Boolean).join(' ') || m.studentName || 'Student';
    const currGrade = normalizeGrade(m.grade);
    const currScore = gradeToNumeric(currGrade);

    // Exclude Absent students from score increase/decrease shift unless they were both non-AB
    if (currScore === 0) return;

    const prevRecord = prevMap.get(sid) || prevMap.get(`roll-${roll}`);
    if (!prevRecord || prevRecord.score === 0) return;

    if (currScore > prevRecord.score) {
      increasedList.push({
        studentId: sid,
        rollNo: roll,
        name,
        previousGrade: prevRecord.grade,
        currentGrade: currGrade,
        stepChange: currScore - prevRecord.score,
      });
    } else if (currScore < prevRecord.score) {
      decreasedList.push({
        studentId: sid,
        rollNo: roll,
        name,
        previousGrade: prevRecord.grade,
        currentGrade: currGrade,
        stepChange: currScore - prevRecord.score,
      });
    } else {
      unchangedCount++;
    }
  });

  const byRoll = (a, b) => (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0);
  increasedList.sort(byRoll);
  decreasedList.sort(byRoll);

  return {
    hasPreviousLt: true,
    previousLt: {
      id: prevId,
      ltNo: prevLt.ltNo,
      subject: prevLt.subject,
      standard: prevLt.standard,
      takenDate: prevLt.takenDate || prevLt.examDate,
    },
    increasedList,
    decreasedList,
    unchangedCount,
  };
}

/**
 * Predict Consistent Good and Consistent Poor performers across evaluated LTs
 * using Trained Softmax ML Classifier + EWMA trajectory metrics.
 */
function computeConsistentPerformers(currentLt, allEvaluatedLts, marksByLtId) {
  const model = loadMlModel();
  const consModel = model.consistencyModel;
  const curStd = normalizeStd(currentLt.standard);
  const curSubject = normalizeSubjKey(currentLt.subject);

  // Order all evaluated LTs matching this Standard chronologically
  const stdLts = allEvaluatedLts
    .filter((lt) => normalizeStd(lt.standard) === curStd)
    .sort((a, b) => {
      const da = new Date(a.examDate || a.createdAt).getTime();
      const db = new Date(b.examDate || b.createdAt).getTime();
      if (da !== db) return da - db;
      return (a.ltNo || 0) - (b.ltNo || 0);
    });

  // Also check if >=2 LTs exist specifically for same subject; prioritize same-subject if available,
  // otherwise use all evaluated LTs in same standard for rich multi-LT trajectory analysis.
  const sameSubjStdLts = stdLts.filter(
    (lt) => normalizeSubjKey(lt.subject) === curSubject
  );
  const ltsForConsistency = sameSubjStdLts.length >= 2 ? sameSubjStdLts : stdLts;
  const scopeLabel =
    sameSubjStdLts.length >= 2
      ? `${currentLt.subject} (${formatStdDisplay(curStd)} • ${sameSubjStdLts.length} LTs)`
      : `${formatStdDisplay(curStd)} All Subjects (${stdLts.length} LTs)`;

  if (ltsForConsistency.length < 2) {
    return {
      requiresMoreTests: true,
      evaluatedLtsAnalyzed: ltsForConsistency.length,
      scopeLabel,
      consistentGoodList: [],
      consistentPoorList: [],
    };
  }

  // Group marks per student across ltsForConsistency
  const studentMap = new Map();
  ltsForConsistency.forEach((lt) => {
    const ltId = String(lt._id || lt.id);
    const marks = marksByLtId.get(ltId) || [];
    marks.forEach((m) => {
      const sid = String(m.studentId?._id || m.studentId || `roll-${m.rollNo}`);
      const rollNo = m.studentId?.rollNo || m.rollNo || '—';
      const name = m.studentId?.fullName || m.studentId?.name || [m.studentId?.firstName, m.studentId?.lastName].filter(Boolean).join(' ') || m.studentName || 'Student';
      const normGrade = normalizeGrade(m.grade);
      const numericScore = gradeToNumeric(normGrade);

      if (!studentMap.has(sid)) {
        studentMap.set(sid, {
          studentId: sid,
          rollNo,
          name,
          standard: formatStdDisplay(curStd),
          history: [],
          scores: [],
        });
      }
      const entry = studentMap.get(sid);
      entry.history.push({
        ltId,
        ltNo: lt.ltNo,
        subject: lt.subject,
        date: lt.takenDate || lt.examDate,
        grade: normGrade,
        numericScore,
      });
      entry.scores.push(numericScore);
    });
  });

  const consistentGoodList = [];
  const consistentPoorList = [];

  studentMap.forEach((st) => {
    if (st.scores.length < 2) return;

    const rawFeat = extractStudentFeatures(st.scores);
    const stdFeat = rawFeat.map((v, j) => (v - consModel.scaler.means[j]) / (consModel.scaler.stds[j] || 1));
    const logits = consModel.W.map((wRow, c) =>
      wRow.reduce((sum, w, j) => sum + w * stdFeat[j], consModel.b[c])
    );
    const probs = softmax(logits);
    const predClassIdx = probs.indexOf(Math.max(...probs));
    const predConfidence = Math.round(probs[predClassIdx] * 100);

    const excellentCount = st.scores.filter((s) => s === 3).length;
    const betterCount = st.scores.filter((s) => s === 2).length;
    const goodCount = st.scores.filter((s) => s === 1).length;
    const abCount = st.scores.filter((s) => s === 0).length;
    const avgScore = Number(
      (st.scores.map((s) => (s === 0 ? 1 : s)).reduce((a, b) => a + b, 0) / st.scores.length).toFixed(2)
    );

    const studentPayload = {
      studentId: st.studentId,
      rollNo: st.rollNo,
      name: st.name,
      standard: st.standard,
      totalTests: st.scores.length,
      excellentCount,
      betterCount,
      goodCount,
      abCount,
      avgScore,
      mlConfidence: predConfidence,
      history: st.history,
    };

    if (predClassIdx === 0) {
      // CONSISTENT_GOOD
      consistentGoodList.push(studentPayload);
    } else if (predClassIdx === 1) {
      // CONSISTENT_POOR
      consistentPoorList.push(studentPayload);
    }
  });

  consistentGoodList.sort((a, b) => b.avgScore - a.avgScore || (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0));
  consistentPoorList.sort((a, b) => a.avgScore - b.avgScore || (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0));

  return {
    requiresMoreTests: false,
    evaluatedLtsAnalyzed: ltsForConsistency.length,
    scopeLabel,
    consistentGoodList,
    consistentPoorList,
  };
}

module.exports = {
  loadMlModel,
  retrainMlModel,
  normalizeGrade,
  gradeToNumeric,
  normalizeStd,
  formatStdDisplay,
  analyzeClassDistribution,
  computeScoreTrajectory,
  computeConsistentPerformers,
};
