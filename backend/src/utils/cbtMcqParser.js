/**
 * CBT MCQ Parser & Question Extractor Utility
 * Parses raw text extracted from PDF or pasted question papers into structured MCQs.
 * Supports English and Gujarati formats, inline options, bottom answer keys, and various numbering schemes.
 */

function parseMcqText(rawText, defaultSubject = 'Physics', marks = 4, negativeMarks = 1) {
  if (!rawText || typeof rawText !== 'string') return [];

  // Normalize line endings and whitespace
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const questions = [];

  // Question start regex:
  // e.g. "1.", "1)", "1-", "Q1.", "Q.1", "Q 1.", "Question 1:", "પ્રશ્ન 1.", "પ્રશ્ન ૧.", "(1)", "[1]"
  const qStartRegex = /^(?:Q(?:uestion|\.)?\s*(\d+)[\.\:\)]?|(?:પ્રશ્ન\s*)?(\d+)[\.\)\:\-]|(?:પ્રશ્ન\s*)?([૦-૯]+)[\.\)\:\-]|(?:\(|\[)(\d+)(?:\)|\])\.?|(\d+)\.\s)/i;

  // Single option line regex:
  // e.g. "(A) text", "A. text", "A) text", "A: text", "(a) text", "a. text", "(અ) text", "(1) text"
  const optionRegex = /^(?:\(?([A-Da-d])[\.\)\:\-]|([A-Da-d])\s*[\.\:\)])\s*(.*)$/;
  const gujaratiOptRegex = /^(?:\(?([અબકડ])[\.\)\:\-]|\b([અબકડ])\s*[\.\:\)])\s*(.*)$/;

  // Gujarati to English option key mapping
  const gujMap = { 'અ': 'A', 'બ': 'B', 'ક': 'C', 'ડ': 'D' };

  // Answer Key inside question regex:
  // e.g. "Ans: A", "Answer: (B)", "Correct: C", "Correct Option: D", "ઉત્તર: A", "Key: B", "Ans - C"
  const ansRegex = /(?:Ans(?:wer)?|Correct(?:\s*Option)?|ઉત્તર|Key)\s*[\:\-\=]?\s*\(?([A-Da-dઅબકડ])\)?/i;

  let currentQ = null;
  let optionMap = {};
  let currentOptKey = null;

  function finalizeCurrentQ() {
    if (currentQ && currentQ.questionText && currentQ.questionText.trim().length > 3) {
      // Ensure exactly 4 options A, B, C, D
      const optA = optionMap['A'] || 'Option A';
      const optB = optionMap['B'] || 'Option B';
      const optC = optionMap['C'] || 'Option C';
      const optD = optionMap['D'] || 'Option D';

      const validOptions = [optA, optB, optC, optD];

      let finalCorrect = (currentQ.correctAnswer || 'A').toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(finalCorrect)) {
        finalCorrect = 'A';
      }

      questions.push({
        id: `q_${currentQ.subject ? currentQ.subject.toLowerCase() : 'gen'}_${questions.length + 1}_${Date.now()}`,
        subject: currentQ.subject || defaultSubject,
        questionNo: questions.length + 1,
        marks: Number(marks) || 4,
        negativeMarks: Number(negativeMarks) || 1,
        questionText: currentQ.questionText.trim(),
        options: validOptions,
        correctAnswer: finalCorrect,
        explanation: currentQ.explanation || '',
      });
    }
    currentQ = null;
    optionMap = {};
    currentOptKey = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line contains an Answer Key
    const ansMatch = line.match(ansRegex);
    if (ansMatch && currentQ) {
      let matchedKey = ansMatch[1].toUpperCase();
      if (gujMap[matchedKey]) matchedKey = gujMap[matchedKey];
      currentQ.correctAnswer = matchedKey;
      continue;
    }

    // Check if line has multiple inline options:
    // e.g. "(A) 10 m/s   (B) 20 m/s   (C) 30 m/s   (D) 40 m/s" or "A. Option A  B. Option B"
    if (currentQ && (/\(A\).+\(B\)/i.test(line) || /\bA[\.\)].+\bB[\.\)]/i.test(line))) {
      const parts = line.split(/(?=\([A-Da-d]\)|(?:\b[A-Da-d][\.\)]\s))/i);
      let matchedAny = false;
      parts.forEach(part => {
        const m = part.match(/^(?:\(?([A-Da-d])[\.\)]|\b([A-Da-d])[\.\)])\s*(.*)$/i);
        if (m) {
          const k = (m[1] || m[2]).toUpperCase();
          if (['A', 'B', 'C', 'D'].includes(k)) {
            optionMap[k] = m[3].trim();
            matchedAny = true;
          }
        }
      });
      if (matchedAny) {
        currentOptKey = null;
        continue;
      }
    }

    // Check for single English option line (A, B, C, D)
    const optMatch = line.match(optionRegex);
    if (optMatch && currentQ) {
      const key = (optMatch[1] || optMatch[2]).toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key)) {
        currentOptKey = key;
        optionMap[key] = (optMatch[3] || '').trim();
        continue;
      }
    }

    // Check for single Gujarati option line (અ, બ, ક, ડ)
    const gujOptMatch = line.match(gujaratiOptRegex);
    if (gujOptMatch && currentQ) {
      const rawKey = gujOptMatch[1] || gujOptMatch[2];
      const key = gujMap[rawKey] || 'A';
      currentOptKey = key;
      optionMap[key] = (gujOptMatch[3] || '').trim();
      continue;
    }

    // Check if line starts a new Question
    const qMatch = line.match(qStartRegex);
    if (qMatch) {
      finalizeCurrentQ();
      const rawQNum = qMatch[1] || qMatch[2] || qMatch[4] || qMatch[5] || (questions.length + 1);
      const remainingText = line.replace(qStartRegex, '').trim();
      currentQ = {
        subject: defaultSubject,
        questionNo: parseInt(rawQNum, 10) || (questions.length + 1),
        questionText: remainingText || 'Question statement',
        correctAnswer: 'A',
      };
      currentOptKey = null;
      continue;
    }

    // Otherwise append line text to active option or question text
    if (currentOptKey && optionMap[currentOptKey] !== undefined) {
      optionMap[currentOptKey] += ' ' + line;
    } else if (currentQ) {
      currentQ.questionText += ' ' + line;
    }
  }

  finalizeCurrentQ();

  // If questions were parsed without inline answers, check for bottom answer key block
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

/**
 * Extracts Answer Key block from the end of question paper
 * e.g.:
 * Answer Key:
 * 1-A, 2-B, 3-C, 4-D
 * or
 * 1. (A)  2. (C)  3. (D)
 */
function extractAnswerKeyBlock(rawText) {
  const map = {};
  if (!rawText || typeof rawText !== 'string') return map;

  const keyBlockRegex = /(?:Answer\s*Key|ઉત્તરવહી|Key\s*Sheet|ANSWERS|KEYS)[\s\S]*$/i;
  const match = rawText.match(keyBlockRegex);
  if (!match) return map;

  const keyText = match[0];
  const pairRegex = /(\d+)\s*[\.\:\-\)\=]\s*\(?([A-Da-dઅબકડ])\)?/g;
  const gujMap = { 'અ': 'A', 'બ': 'B', 'ક': 'C', 'ડ': 'D' };

  let m;
  while ((m = pairRegex.exec(keyText)) !== null) {
    const qNum = parseInt(m[1], 10);
    let ans = m[2].toUpperCase();
    if (gujMap[ans]) ans = gujMap[ans];
    map[qNum] = ans;
  }
  return map;
}

module.exports = {
  parseMcqText,
  extractAnswerKeyBlock,
};
