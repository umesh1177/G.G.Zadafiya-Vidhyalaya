const fs = require('fs');
const path = require('path');

/**
 * Pure JavaScript Supervised ML Trainer for LT Analytics:
 * 1) Weak Topic Understanding Binary Logistic Regression Classifier
 *    Features: [excellentRatio, betterRatio, goodRatio, normalizedMeanScore]
 * 2) Student Longitudinal Consistency Multinomial Softmax Classifier (3 classes)
 *    Classes:
 *      0 => CONSISTENT_GOOD (predominantly Excellent/top Better across multiple LTs)
 *      1 => CONSISTENT_POOR (predominantly Good [lowest rubric tier] / AB across multiple LTs)
 *      2 => MODERATE_OR_VOLATILE (mixed / inconsistent / steady middle Better)
 *    Features: [ewmaNormalized, excellentRate, poorOrAbRate, consistencyStability, recentLastTwoMean]
 */

function sigmoid(z) {
  if (z > 20) return 1 - 1e-9;
  if (z < -20) return 1e-9;
  return 1 / (1 + Math.exp(-z));
}

function softmax(logits) {
  const maxLogit = Math.max(...logits);
  const exps = logits.map(v => Math.exp(v - maxLogit));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / (sum || 1));
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
  return X.map(row => row.map((v, j) => (v - means[j]) / (stds[j] || 1)));
}

// Deterministic pseudo-random generator for reproducible training/splits
function createRng(seed = 42) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
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

// Generate pedagogical training dataset for Model 1: Weak Topic Understanding
function generateTopicDataset(rng) {
  const samples = [];
  for (let i = 0; i < 240; i++) {
    let exc, bet, good;
    const regime = i % 3;
    if (regime === 0) {
      // Weak topic regime: many students in lowest "Good" rubric tier
      good = 0.45 + rng() * 0.50;
      exc = rng() * (1 - good) * 0.35;
      bet = Math.max(0, 1 - good - exc);
    } else if (regime === 1) {
      // Borderline / Moderate regime around the threshold
      exc = 0.10 + rng() * 0.30;
      good = 0.15 + rng() * 0.35;
      bet = Math.max(0, 1 - exc - good);
    } else {
      // Strong topic understanding regime
      exc = 0.35 + rng() * 0.55;
      bet = rng() * (1 - exc) * 0.85;
      good = Math.max(0, 1 - exc - bet);
    }

    const total = exc + bet + good || 1;
    const eR = exc / total;
    const bR = bet / total;
    const gR = good / total;
    const meanScore = 3 * eR + 2 * bR + 1 * gR; // 1.0 to 3.0
    const normMean = (meanScore - 1) / 2; // 0.0 to 1.0

    // Weak topic when class average is in "Good" band (meanScore < 1.75) OR majority (>= 50%) got weak/Good
    const label = (meanScore < 1.75 || gR >= 0.50) ? 1 : 0;

    samples.push({
      x: [eR, bR, gR, normMean],
      y: label,
    });
  }
  return shuffleWithRng(samples, rng);
}

function trainBinaryLogisticRegression(X, y, { lr = 0.15, epochs = 1200, l2 = 0.005 } = {}) {
  const n = X.length;
  const d = X[0].length;
  let weights = new Array(d).fill(0);
  let bias = 0;

  for (let ep = 0; ep < epochs; ep++) {
    const gradW = new Array(d).fill(0);
    let gradB = 0;

    for (let i = 0; i < n; i++) {
      let z = bias;
      for (let j = 0; j < d; j++) z += weights[j] * X[i][j];
      const pred = sigmoid(z);
      const err = pred - y[i];
      gradB += err;
      for (let j = 0; j < d; j++) {
        gradW[j] += err * X[i][j];
      }
    }

    bias -= lr * (gradB / n);
    for (let j = 0; j < d; j++) {
      weights[j] -= lr * (gradW[j] / n + l2 * weights[j]);
    }
  }

  return { weights, bias };
}

// Compute trajectory feature vector from array of rubric numeric scores (1=Good/Weak, 2=Better, 3=Excellent, 0=AB)
function extractStudentFeatures(scores = []) {
  if (!scores || scores.length === 0) {
    return [0.5, 0, 0, 0.5, 0.5];
  }
  const present = scores.filter(s => s > 0);
  const totalCount = scores.length;

  // Exponentially weighted moving average (more weight to recent LTs)
  const decay = 0.85;
  let weightSum = 0;
  let weightedSum = 0;
  scores.forEach((s, idx) => {
    const effectiveScore = s === 0 ? 1.0 : s; // AB penalizes similarly to weak engagement
    const w = Math.pow(decay, totalCount - 1 - idx);
    weightedSum += effectiveScore * w;
    weightSum += w;
  });
  const ewma = weightSum > 0 ? weightedSum / weightSum : 2.0;
  const ewmaNorm = (ewma - 1) / 2;

  const excCount = scores.filter(s => s === 3).length;
  const weakOrAbCount = scores.filter(s => s === 1 || s === 0).length;

  const excRate = excCount / totalCount;
  const poorRate = weakOrAbCount / totalCount;

  // Consistency stability (1 - stdDev)
  const meanRaw = scores.reduce((a, b) => a + (b === 0 ? 1 : b), 0) / totalCount;
  const variance = scores.reduce((a, b) => a + Math.pow((b === 0 ? 1 : b) - meanRaw, 2), 0) / totalCount;
  const stdDev = Math.sqrt(variance);
  const stability = Math.max(0, 1 - stdDev);

  // Recent 2 LTs mean
  const recent = scores.slice(-2).map(s => (s === 0 ? 1 : s));
  const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const recentNorm = (recentMean - 1) / 2;

  return [ewmaNorm, excRate, poorRate, stability, recentNorm];
}

// Generate multi-LT student trajectory training data for Model 2
function generateConsistencyDataset(rng) {
  const samples = [];

  for (let i = 0; i < 360; i++) {
    const numTests = 2 + Math.floor(rng() * 5); // 2 to 6 tests
    const cls = i % 3;
    const seq = [];

    for (let t = 0; t < numTests; t++) {
      const r = rng();
      if (cls === 0) {
        // Consistent Good Performer: mostly 3 (Excellent), occasionally 2 (Better)
        seq.push(r < 0.78 ? 3 : 2);
      } else if (cls === 1) {
        // Consistent Poor Performer: mostly 1 (Good/Weak) or occasional 0 (AB) / rare 2
        if (r < 0.76) seq.push(1);
        else if (r < 0.88) seq.push(0);
        else seq.push(2);
      } else {
        // Moderate / Average / Volatile
        if (r < 0.58) seq.push(2);
        else if (r < 0.79) seq.push(3);
        else seq.push(1);
      }
    }

    const features = extractStudentFeatures(seq);
    const [ewmaNorm, excRate, poorRate] = features;
    const ewmaRaw = ewmaNorm * 2 + 1;

    // Ground truth labeling rules aligned with domain
    let trueClass = 2; // Moderate
    if (ewmaRaw >= 2.40 && excRate >= 0.50 && poorRate <= 0.15) {
      trueClass = 0; // Consistent Good
    } else if (ewmaRaw <= 1.55 && poorRate >= 0.55) {
      trueClass = 1; // Consistent Poor
    }

    samples.push({ x: features, y: trueClass });
  }

  return shuffleWithRng(samples, rng);
}

function trainSoftmaxClassifier(X, y, numClasses = 3, { lr = 0.2, epochs = 1500, l2 = 0.005 } = {}) {
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

function trainAndSaveModels(customRecords = []) {
  const rng = createRng(202611);

  // ── 1. Topic Weakness Binary Model ──
  const topicSamples = generateTopicDataset(rng);
  const splitIdx1 = Math.floor(topicSamples.length * 0.8);
  const train1 = topicSamples.slice(0, splitIdx1);
  const test1 = topicSamples.slice(splitIdx1);

  const scaler1 = standardizeFit(train1.map(s => s.x));
  const X1Train = standardizeTransform(train1.map(s => s.x), scaler1.means, scaler1.stds);
  const X1Test = standardizeTransform(test1.map(s => s.x), scaler1.means, scaler1.stds);

  const model1 = trainBinaryLogisticRegression(
    X1Train,
    train1.map(s => s.y)
  );

  let correct1 = 0;
  X1Test.forEach((row, i) => {
    const z = row.reduce((acc, v, j) => acc + v * model1.weights[j], model1.bias);
    const pred = sigmoid(z) >= 0.5 ? 1 : 0;
    if (pred === test1[i].y) correct1++;
  });
  const acc1 = Number(((correct1 / test1.length) * 100).toFixed(2));

  // ── 2. Student Consistency Softmax Model ──
  let consistencySamples = generateConsistencyDataset(rng);
  if (Array.isArray(customRecords) && customRecords.length > 0) {
    consistencySamples = consistencySamples.concat(customRecords);
  }
  const splitIdx2 = Math.floor(consistencySamples.length * 0.8);
  const train2 = consistencySamples.slice(0, splitIdx2);
  const test2 = consistencySamples.slice(splitIdx2);

  const scaler2 = standardizeFit(train2.map(s => s.x));
  const X2Train = standardizeTransform(train2.map(s => s.x), scaler2.means, scaler2.stds);
  const X2Test = standardizeTransform(test2.map(s => s.x), scaler2.means, scaler2.stds);

  const model2 = trainSoftmaxClassifier(
    X2Train,
    train2.map(s => s.y),
    3
  );

  let correct2 = 0;
  X2Test.forEach((row, i) => {
    const logits = model2.W.map((wRow, c) =>
      wRow.reduce((sum, w, j) => sum + w * row[j], model2.b[c])
    );
    const probs = softmax(logits);
    const predClass = probs.indexOf(Math.max(...probs));
    if (predClass === test2[i].y) correct2++;
  });
  const acc2 = Number(((correct2 / test2.length) * 100).toFixed(2));

  const payload = {
    version: '1.0.0',
    trainedAt: new Date().toISOString(),
    topicWeaknessModel: {
      features: ['excellentRatio', 'betterRatio', 'goodRatio', 'normalizedMeanScore'],
      scaler: scaler1,
      weights: model1.weights,
      bias: model1.bias,
      validationAccuracyPercent: acc1,
      trainingSampleCount: train1.length,
      testSampleCount: test1.length,
    },
    consistencyModel: {
      classes: ['CONSISTENT_GOOD', 'CONSISTENT_POOR', 'MODERATE_OR_VOLATILE'],
      features: ['ewmaNormalized', 'excellentRate', 'poorOrAbRate', 'consistencyStability', 'recentLastTwoMean'],
      scaler: scaler2,
      W: model2.W,
      b: model2.b,
      validationAccuracyPercent: acc2,
      trainingSampleCount: train2.length,
      testSampleCount: test2.length,
    },
  };

  const outPath = path.join(__dirname, 'ltModelWeights.json');
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

if (require.main === module) {
  const result = trainAndSaveModels();
  console.log('🤖 LT ML Models Trained & Saved to ltModelWeights.json');
  console.log(`   - Topic Weakness Classifier Validation Accuracy: ${result.topicWeaknessModel.validationAccuracyPercent}%`);
  console.log(`   - Student Consistency Classifier Validation Accuracy: ${result.consistencyModel.validationAccuracyPercent}%`);
}

module.exports = {
  trainAndSaveModels,
  extractStudentFeatures,
  sigmoid,
  softmax,
};

