const fs = require('fs');
const path = require('path');

/**
 * Pure JavaScript Supervised ML Trainer for Exam Unit Analytics:
 * 1) Class Exam Performance & Difficulty Classifier (3-class Softmax)
 *    Classes:
 *      0 => STRONG_PERFORMANCE
 *      1 => MODERATE_PERFORMANCE
 *      2 => NEEDS_ATTENTION
 *    Features:
 *      [meanPctNorm, passRatio, high75PlusRatio, below40Ratio, deltaVsPrevNorm, stdDevNorm]
 *
 * 2) Student Longitudinal Exam Trajectory & Consistency Classifier (3-class Softmax)
 *    Classes:
 *      0 => CONSISTENT_GROWTH      (sustained upward trend / high consistent mastery)
 *      1 => CONSISTENT_DECREASE    (sustained declining trend / consistent weak trajectory)
 *      2 => STABLE_OR_VOLATILE     (flat, oscillating, or mixed performance)
 *    Features:
 *      [olsSlopeNorm, ewmaMomentumNorm, upwardStepRatio, downwardStepRatio, recentLevelNorm, netGainNorm]
 */

function softmax(logits) {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((v) => Math.exp(Math.max(-30, Math.min(30, v - maxLogit))));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / (sum || 1));
}

function standardizeFit(X) {
  const n = X.length;
  const d = X[0].length;
  const means = new Array(d).fill(0);
  const stds = new Array(d).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) means[j] += X[i][j];
  }
  for (let j = 0; j < d; j++) means[j] /= n;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) {
      const diff = X[i][j] - means[j];
      stds[j] += diff * diff;
    }
  }
  for (let j = 0; j < d; j++) {
    stds[j] = Math.sqrt(stds[j] / n) || 1;
  }
  return { means, stds };
}

function standardizeTransform(X, means, stds) {
  return X.map((row) => row.map((v, j) => (v - means[j]) / (stds[j] || 1)));
}

function createRng(seed = 202612) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffleWithRng(arr, rng) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function trainSoftmaxClassifier(X, y, numClasses = 3, { lr = 0.22, epochs = 1800, l2 = 0.004 } = {}) {
  const n = X.length;
  const d = X[0].length;
  const W = Array.from({ length: numClasses }, () => new Array(d).fill(0));
  const b = new Array(numClasses).fill(0);

  for (let ep = 0; ep < epochs; ep++) {
    const gradW = Array.from({ length: numClasses }, () => new Array(d).fill(0));
    const gradB = new Array(numClasses).fill(0);

    for (let i = 0; i < n; i++) {
      const logits = W.map((row, c) =>
        row.reduce((sum, w, j) => sum + w * X[i][j], b[c])
      );
      const probs = softmax(logits);

      for (let c = 0; c < numClasses; c++) {
        const indicator = y[i] === c ? 1 : 0;
        const err = probs[c] - indicator;
        gradB[c] += err;
        for (let j = 0; j < d; j++) {
          gradW[c][j] += err * X[i][j];
        }
      }
    }

    for (let c = 0; c < numClasses; c++) {
      b[c] -= lr * (gradB[c] / n);
      for (let j = 0; j < d; j++) {
        W[c][j] -= lr * (gradW[c][j] / n + l2 * W[c][j]);
      }
    }
  }

  return { W, b };
}

/**
 * Extract 6 trajectory features from chronological exam percentages [p0, p1, ..., pk-1] (0..100).
 */
function extractStudentExamTrajectoryFeatures(percentages = []) {
  if (!Array.isArray(percentages) || percentages.length === 0) {
    return [0, 0, 0, 0, 0.5, 0];
  }
  const n = percentages.length;
  if (n === 1) {
    const lvl = Math.max(0, Math.min(1, percentages[0] / 100));
    return [0, 0, 0, 0, lvl, 0];
  }

  // 1. Ordinary Least Squares linear slope across index 0..n-1
  const meanX = (n - 1) / 2;
  const meanY = percentages.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - meanX;
    num += dx * (percentages[i] - meanY);
    den += dx * dx;
  }
  const slope = den > 0 ? num / den : 0; // percentage points per exam
  const olsSlopeNorm = Math.max(-1, Math.min(1, slope / 20));

  // 2. EWMA momentum vs early baseline
  const decay = 0.72;
  let wSum = 0;
  let ewmaNum = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.pow(decay, n - 1 - i);
    ewmaNum += percentages[i] * w;
    wSum += w;
  }
  const recentEwma = wSum > 0 ? ewmaNum / wSum : meanY;
  const earlyHalfCount = Math.max(1, Math.floor(n / 2));
  const earlyMean = percentages.slice(0, earlyHalfCount).reduce((a, b) => a + b, 0) / earlyHalfCount;
  const ewmaMomentumNorm = Math.max(-1, Math.min(1, (recentEwma - earlyMean) / 25));

  // 3 & 4. Stepwise monotonic ratios (ignoring noise <= 0.4%)
  let upSteps = 0;
  let downSteps = 0;
  const transitions = n - 1;
  for (let i = 1; i < n; i++) {
    const d = percentages[i] - percentages[i - 1];
    if (d > 0.4) upSteps += 1;
    else if (d < -0.4) downSteps += 1;
  }
  const upwardStepRatio = upSteps / transitions;
  const downwardStepRatio = downSteps / transitions;

  // 5. Recent performance level
  const recentLevelNorm = Math.max(0, Math.min(1, recentEwma / 100));

  // 6. Net gain from first exam to last exam
  const netGain = percentages[n - 1] - percentages[0];
  const netGainNorm = Math.max(-1, Math.min(1, netGain / 35));

  return [
    olsSlopeNorm,
    ewmaMomentumNorm,
    upwardStepRatio,
    downwardStepRatio,
    recentLevelNorm,
    netGainNorm,
  ];
}

function generateExamPerformanceDataset(rng) {
  const samples = [];
  for (let i = 0; i < 420; i++) {
    const regime = i % 3;
    let meanPct, passRatio, highRatio, lowRatio, deltaPrev, stdDev;

    if (regime === 0) {
      // STRONG_PERFORMANCE
      meanPct = 72 + rng() * 23;
      passRatio = 0.84 + rng() * 0.16;
      highRatio = 0.42 + rng() * 0.50;
      lowRatio = Math.max(0, 1 - passRatio);
      deltaPrev = -2 + rng() * 14;
      stdDev = 8 + rng() * 10;
    } else if (regime === 1) {
      // MODERATE_PERFORMANCE
      meanPct = 53 + rng() * 19;
      passRatio = 0.62 + rng() * 0.25;
      highRatio = 0.14 + rng() * 0.28;
      lowRatio = Math.max(0, 1 - passRatio);
      deltaPrev = -6 + rng() * 12;
      stdDev = 12 + rng() * 12;
    } else {
      // NEEDS_ATTENTION / TOUGH
      meanPct = 28 + rng() * 26;
      passRatio = 0.25 + rng() * 0.42;
      highRatio = rng() * 0.15;
      lowRatio = Math.max(0.25, 1 - passRatio);
      deltaPrev = -18 + rng() * 12;
      stdDev = 14 + rng() * 14;
    }

    const x = [
      meanPct / 100,
      passRatio,
      highRatio,
      lowRatio,
      Math.max(-1, Math.min(1, deltaPrev / 25)),
      Math.min(1, stdDev / 35),
    ];

    let label = 1;
    if (meanPct >= 72 && passRatio >= 0.80 && deltaPrev >= -3) {
      label = 0;
    } else if (meanPct < 52 || lowRatio >= 0.35 || deltaPrev <= -8) {
      label = 2;
    }
    samples.push({ x, y: label });
  }
  return shuffleWithRng(samples, rng);
}

function generateStudentTrajectoryDataset(rng) {
  const samples = [];
  for (let i = 0; i < 600; i++) {
    const numExams = 2 + Math.floor(rng() * 5); // 2 to 6 exams
    const regime = i % 3;
    const seq = [];

    if (regime === 0) {
      // CONSISTENT_GROWTH: rising series across exams
      let base = 42 + rng() * 38;
      seq.push(base);
      for (let t = 1; t < numExams; t++) {
        const gain = 2.5 + rng() * 9.5;
        base = Math.min(99.5, base + gain - rng() * 1.2);
        seq.push(Number(base.toFixed(1)));
      }
    } else if (regime === 1) {
      // CONSISTENT_DECREASE: falling series across exams
      let base = 58 + rng() * 35;
      seq.push(base);
      for (let t = 1; t < numExams; t++) {
        const drop = 2.5 + rng() * 9.5;
        base = Math.max(8, base - drop + rng() * 1.2);
        seq.push(Number(base.toFixed(1)));
      }
    } else {
      // STABLE_OR_VOLATILE: oscillating / flat
      const anchor = 45 + rng() * 40;
      for (let t = 0; t < numExams; t++) {
        const osc = (t % 2 === 0 ? 1 : -1) * (rng() * 8);
        const val = Math.max(15, Math.min(96, anchor + osc + (rng() - 0.5) * 4));
        seq.push(Number(val.toFixed(1)));
      }
    }

    const x = extractStudentExamTrajectoryFeatures(seq);
    const [olsSlopeNorm, , upRatio, downRatio, , netGainNorm] = x;

    let trueClass = 2;
    if (olsSlopeNorm >= 0.12 && netGainNorm >= 0.08 && upRatio >= 0.55) {
      trueClass = 0; // CONSISTENT_GROWTH
    } else if (olsSlopeNorm <= -0.12 && netGainNorm <= -0.08 && downRatio >= 0.55) {
      trueClass = 1; // CONSISTENT_DECREASE
    }

    samples.push({ x, y: trueClass });
  }
  return shuffleWithRng(samples, rng);
}

function trainAndSaveExamModels(customTrajectorySamples = []) {
  const rng = createRng(20261215);

  // ── 1. Exam Class Performance Softmax Classifier ──
  const examSamples = generateExamPerformanceDataset(rng);
  const split1 = Math.floor(examSamples.length * 0.8);
  const train1 = examSamples.slice(0, split1);
  const test1 = examSamples.slice(split1);

  const scaler1 = standardizeFit(train1.map((s) => s.x));
  const X1Train = standardizeTransform(train1.map((s) => s.x), scaler1.means, scaler1.stds);
  const X1Test = standardizeTransform(test1.map((s) => s.x), scaler1.means, scaler1.stds);

  const model1 = trainSoftmaxClassifier(
    X1Train,
    train1.map((s) => s.y),
    3
  );

  let correct1 = 0;
  X1Test.forEach((row, idx) => {
    const logits = model1.W.map((wRow, c) =>
      wRow.reduce((sum, w, j) => sum + w * row[j], model1.b[c])
    );
    const probs = softmax(logits);
    const pred = probs.indexOf(Math.max(...probs));
    if (pred === test1[idx].y) correct1 += 1;
  });
  const acc1 = Number(((correct1 / test1.length) * 100).toFixed(2));

  // ── 2. Student Longitudinal Trajectory Softmax Classifier ──
  let trajSamples = generateStudentTrajectoryDataset(rng);
  if (Array.isArray(customTrajectorySamples) && customTrajectorySamples.length > 0) {
    trajSamples = trajSamples.concat(customTrajectorySamples);
  }
  const split2 = Math.floor(trajSamples.length * 0.8);
  const train2 = trajSamples.slice(0, split2);
  const test2 = trajSamples.slice(split2);

  const scaler2 = standardizeFit(train2.map((s) => s.x));
  const X2Train = standardizeTransform(train2.map((s) => s.x), scaler2.means, scaler2.stds);
  const X2Test = standardizeTransform(test2.map((s) => s.x), scaler2.means, scaler2.stds);

  const model2 = trainSoftmaxClassifier(
    X2Train,
    train2.map((s) => s.y),
    3
  );

  let correct2 = 0;
  X2Test.forEach((row, idx) => {
    const logits = model2.W.map((wRow, c) =>
      wRow.reduce((sum, w, j) => sum + w * row[j], model2.b[c])
    );
    const probs = softmax(logits);
    const pred = probs.indexOf(Math.max(...probs));
    if (pred === test2[idx].y) correct2 += 1;
  });
  const acc2 = Number(((correct2 / test2.length) * 100).toFixed(2));

  const payload = {
    version: '1.0.0',
    trainedAt: new Date().toISOString(),
    examPerformanceModel: {
      classes: ['STRONG_PERFORMANCE', 'MODERATE_PERFORMANCE', 'NEEDS_ATTENTION'],
      features: [
        'meanPctNorm',
        'passRatio',
        'high75PlusRatio',
        'below40Ratio',
        'deltaVsPrevNorm',
        'stdDevNorm',
      ],
      scaler: scaler1,
      W: model1.W,
      b: model1.b,
      validationAccuracyPercent: acc1,
      trainingSampleCount: train1.length,
      testSampleCount: test1.length,
    },
    studentTrajectoryModel: {
      classes: ['CONSISTENT_GROWTH', 'CONSISTENT_DECREASE', 'STABLE_OR_VOLATILE'],
      features: [
        'olsSlopeNorm',
        'ewmaMomentumNorm',
        'upwardStepRatio',
        'downwardStepRatio',
        'recentLevelNorm',
        'netGainNorm',
      ],
      scaler: scaler2,
      W: model2.W,
      b: model2.b,
      validationAccuracyPercent: acc2,
      trainingSampleCount: train2.length,
      testSampleCount: test2.length,
    },
  };

  const outPath = path.join(__dirname, 'examModelWeights.json');
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

if (require.main === module) {
  const result = trainAndSaveExamModels();
  console.log('🤖 Exam ML Models Trained & Saved to examModelWeights.json');
  console.log(
    `   - Exam Performance Classifier Validation Accuracy: ${result.examPerformanceModel.validationAccuracyPercent}%`
  );
  console.log(
    `   - Student Trajectory Consistency Classifier Validation Accuracy: ${result.studentTrajectoryModel.validationAccuracyPercent}%`
  );
}

module.exports = {
  trainAndSaveExamModels,
  extractStudentExamTrajectoryFeatures,
  softmax,
};

