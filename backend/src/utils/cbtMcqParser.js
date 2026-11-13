/**
 * CBT MCQ Parser & Question Extractor Utility
 * Parses raw text extracted from PDF or pasted question papers into structured MCQs.
 */

function parseMcqText(rawText, defaultSubject = 'Physics', marks = 4, negativeMarks = 1) {
  if (!rawText || typeof rawText !== 'string') return [];

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const questions = [];

  // Patterns for Question start:
  // e.g., "1.", "Q1.", "Q.1", "1)", "Question 1:", "પ્રશ્ન ૧.", "પ્રશ્ન 1:"
  const qStartRegex = /^(?:Q(?:uestion|\.)?\s*(\d+)|(?:પ્રશ્ન\s*)?(\d+)[\.\)\:\-]|(\d+)\.\s)/i;

  // Patterns for Options:
  // (A) or A. or A)
  const optionRegex = /^(?:\(?([A-Da-d])[\.\)]|\b([A-Da-d])\s*[\.\:\)])\s*(.*)$/;

  // Patterns for Answer Key inside question or at the bottom:
  // e.g. "Ans: A", "Answer: (B)", "Correct: C", "ઉત્તર: D", "Key: A"
  const ansRegex = /^(?:Ans(?:wer)?|Correct(?:\s*Option)?|ઉત્તર|Key)\s*[\:\-\=]?\s*\(?([A-Da-d])\)?/i;

  let currentQ = null;
  let optionMap = {};
  let currentOptKey = null;

  function finalizeCurrentQ() {
    if (currentQ && currentQ.questionText) {
      const opts = [
        optionMap['A'] || 'Option A',
        optionMap['B'] || 'Option B',
        optionMap['C'] || 'Option C',
        optionMap['D'] || 'Option D',
      ];
      questions.push({
        id: `q_${questions.length + 1}`,
        subject: currentQ.subject || defaultSubject,
        questionNo: questions.length + 1,
        marks: marks,
        negativeMarks: negativeMarks,
        questionText: currentQ.questionText.trim(),
        options: opts,
        correctAnswer: (currentQ.correctAnswer || 'A').toUpperCase(),
        explanation: currentQ.explanation || '',
      });
    }
    currentQ = null;
    optionMap = {};
    currentOptKey = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line indicates an Answer Key
    const ansMatch = line.match(ansRegex);
    if (ansMatch && currentQ) {
      currentQ.correctAnswer = ansMatch[1].toUpperCase();
      continue;
    }

    // Check if line starts a new Question
    const qMatch = line.match(qStartRegex);
    if (qMatch) {
      finalizeCurrentQ();
      const qNum = parseInt(qMatch[1] || qMatch[2] || qMatch[3] || (questions.length + 1), 10);
      const remainingText = line.replace(qStartRegex, '').trim();
      currentQ = {
        subject: defaultSubject,
        questionNo: qNum,
        questionText: remainingText,
        correctAnswer: 'A',
      };
      currentOptKey = null;
      continue;
    }

    // Check if line is an Option (A, B, C, D)
    const optMatch = line.match(optionRegex);
    if (optMatch && currentQ) {
      const key = (optMatch[1] || optMatch[2]).toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key)) {
        currentOptKey = key;
        optionMap[key] = (optMatch[3] || '').trim();
        continue;
      }
    }

    // Check for inline options like "(A) text (B) text (C) text (D) text"
    if (currentQ && /\(A\).+\(B\)/i.test(line)) {
      const parts = line.split(/\(([A-Da-d])\)/i);
      for (let j = 1; j < parts.length; j += 2) {
        const k = parts[j].toUpperCase();
        const text = (parts[j + 1] || '').trim();
        if (['A', 'B', 'C', 'D'].includes(k)) {
          optionMap[k] = text;
        }
      }
      continue;
    }

    // Otherwise append text to current option or question
    if (currentOptKey && optionMap[currentOptKey] !== undefined) {
      optionMap[currentOptKey] += ' ' + line;
    } else if (currentQ) {
      currentQ.questionText += ' ' + line;
    }
  }

  finalizeCurrentQ();

  // If questions were parsed without explicit answers, check for bottom answer key block
  // e.g. "1-A, 2-B, 3-C" or "1. A  2. B  3. C"
  const answerKeyMap = extractAnswerKeyBlock(rawText);
  if (Object.keys(answerKeyMap).length > 0) {
    questions.forEach((q, idx) => {
      const qIndex = idx + 1;
      if (answerKeyMap[qIndex]) {
        q.correctAnswer = answerKeyMap[qIndex];
      }
    });
  }

  return questions;
}

function extractAnswerKeyBlock(rawText) {
  const map = {};
  const keyBlockRegex = /(?:Answer\s*Key|ઉત્તરવહી|Key\s*Sheet)[\s\S]*$/i;
  const match = rawText.match(keyBlockRegex);
  if (!match) return map;

  const keyText = match[0];
  const pairRegex = /(\d+)\s*[\.\:\-\)]\s*\(?([A-Da-d])\)?/g;
  let m;
  while ((m = pairRegex.exec(keyText)) !== null) {
    const qNum = parseInt(m[1], 10);
    const ans = m[2].toUpperCase();
    map[qNum] = ans;
  }
  return map;
}

module.exports = {
  parseMcqText,
  extractAnswerKeyBlock,
};

