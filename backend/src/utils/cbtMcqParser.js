/**
 * CBT MCQ Parser & Question Extractor Utility
 * Parses raw text extracted from PDF or pasted question papers into structured MCQs.
 * Handles single/multi-column options, multi-line questions, Gujarati formats,
 * table/grid answer keys, and removes PDF page artifacts & footers.
 */

const gujOptionMap = { 'અ': 'A', 'બ': 'B', 'ક': 'C', 'ડ': 'D' };

function parseMcqText(rawText, defaultSubject = 'Physics', marks = 4, negativeMarks = 1) {
  if (!rawText || typeof rawText !== 'string') return [];

  // 1. Separate Answer Key section if present at the end of the text
  let questionsText = rawText;
  let answerKeyText = '';

  const akMarkerRegex = /(?:ANSWER\s*KEY|ANSWERS|KEY\s*SHEET|SOLUTION\s*KEY|ઉત્તરવહી|ઉત્તરો)[\s\S]*/i;
  const akMatch = rawText.match(akMarkerRegex);
  if (akMatch) {
    answerKeyText = akMatch[0];
    questionsText = rawText.substring(0, akMatch.index);
  }

  // Parse Answer Key Map from answerKeyText or full rawText
  const answerKeyMap = extractAnswerKeyBlock(answerKeyText || rawText);

  // 2. Clean lines by removing headers, footers, page counters, and school titles
  const rawLines = questionsText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const cleanLines = [];

  for (let line of rawLines) {
    // Ignore footer/header noise from PDFs
    if (/Page\s*\d+\s*of\s*\d+/i.test(line) || /--\s*\d+\s*of\s*\d+\s*--/i.test(line) || /Page\s*\d+\s*$/i.test(line)) {
      continue;
    }
    if (/^(?:Class\s*X|Time\s*:\s*\d+|Max(?:imum)?\s*Marks\s*:)/i.test(line)) {
      continue;
    }
    if (/(?:Collegiate\s*Academy|International\s*School|High\s*School|Vidhyalaya).*Page/i.test(line)) {
      continue;
    }
    cleanLines.push(line);
  }

  const questions = [];
  let currentQ = null;
  let optionMap = {};
  let currentOptKey = null;

  function finalizeCurrentQ() {
    if (currentQ && currentQ.questionText && currentQ.questionText.trim().length > 2) {
      const qNum = currentQ.questionNo || (questions.length + 1);

      // Clean options
      const optA = (optionMap['A'] || '').replace(/^[A-Da-dઅબકડ][\.\)\:\-]\s*/, '').trim() || 'Option A';
      const optB = (optionMap['B'] || '').replace(/^[A-Da-dઅબકડ][\.\)\:\-]\s*/, '').trim() || 'Option B';
      const optC = (optionMap['C'] || '').replace(/^[A-Da-dઅબકડ][\.\)\:\-]\s*/, '').trim() || 'Option C';
      const optD = (optionMap['D'] || '').replace(/^[A-Da-dઅબકડ][\.\)\:\-]\s*/, '').trim() || 'Option D';

      let correct = currentQ.correctAnswer || answerKeyMap[qNum] || answerKeyMap[questions.length + 1] || 'A';
      correct = correct.toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(correct)) correct = 'A';

      questions.push({
        id: `q_${(currentQ.subject || defaultSubject).toLowerCase()}_${qNum}_${Date.now()}`,
        subject: currentQ.subject || defaultSubject,
        questionNo: qNum,
        marks: Number(marks) || 4,
        negativeMarks: Number(negativeMarks) || 1,
        questionText: currentQ.questionText.trim(),
        options: [optA, optB, optC, optD],
        correctAnswer: correct,
        explanation: currentQ.explanation || '',
      });
    }
    currentQ = null;
    optionMap = {};
    currentOptKey = null;
  }

  // Question start regex:
  // e.g. "1.", "1)", "1-", "Q1.", "Q.1", "Q 1.", "Question 1:", "પ્રશ્ન 1.", "પ્રશ્ન ૧.", "(1)", "[1]"
  const qStartRegex = /^(?:Q(?:uestion|\.)?\s*(\d+)[\.\:\)]?|(?:પ્રશ્ન\s*)?(\d+)[\.\)\:\-]|(?:પ્રશ્ન\s*)?([૦-૯]+)[\.\)\:\-]|(?:\(|\[)(\d+)(?:\)|\])\.?|(\d+)\.\s*)/i;

  for (let line of cleanLines) {
    // Check if line contains one or more options
    // Must contain (A), (B), (C), (D) or A., B., C., D.
    const hasOptions = /(?:\(?([A-Da-dઅબકડ])[\.\)]|\b([A-Da-dઅબકડ])[\.\)])\s*/.test(line);

    if (currentQ && hasOptions && !qStartRegex.test(line)) {
      const chunks = line.split(/(?=\([A-Da-dઅબકડ]\)|(?:\b[A-Da-dઅબકડ][\.\)]\s*))/);
      let matchedInLine = 0;

      for (let chunk of chunks) {
        const m = chunk.trim().match(/^(?:\(?([A-Da-dઅબકડ])[\.\)]|([A-Da-dઅબકડ])[\.\)])\s*(.*)$/);
        if (m) {
          const rawKey = (m[1] || m[2]).toUpperCase();
          const key = gujOptionMap[rawKey] || rawKey;
          if (['A', 'B', 'C', 'D'].includes(key)) {
            currentOptKey = key;
            optionMap[key] = (m[3] || '').trim();
            matchedInLine++;
          }
        }
      }

      if (matchedInLine > 0) {
        continue;
      }
    }

    // Check Question Start
    const qMatch = line.match(qStartRegex);
    if (qMatch) {
      finalizeCurrentQ();
      const rawQNum = qMatch[1] || qMatch[2] || qMatch[4] || qMatch[5] || (questions.length + 1);
      const remainingText = line.replace(qStartRegex, '').trim();
      currentQ = {
        subject: defaultSubject,
        questionNo: parseInt(rawQNum, 10) || (questions.length + 1),
        questionText: remainingText,
        correctAnswer: null,
      };
      currentOptKey = null;
      continue;
    }

    // Check inline answer in question
    const ansMatch = line.match(/(?:Ans(?:wer)?|Correct(?:\s*Option)?|ઉત્તર|Key)\s*[\:\-\=]?\s*\(?([A-Da-dઅબકડ])\)?/i);
    if (ansMatch && currentQ) {
      const k = ansMatch[1].toUpperCase();
      currentQ.correctAnswer = gujOptionMap[k] || k;
      continue;
    }

    // Continued line
    if (currentOptKey && optionMap[currentOptKey] !== undefined) {
      optionMap[currentOptKey] += ' ' + line;
    } else if (currentQ) {
      currentQ.questionText += ' ' + line;
    }
  }

  finalizeCurrentQ();
  return questions;
}

/**
 * Extracts Answer Key block from raw text
 * Supports table format (Q1 Q2 Q3 ... with B C B ...),
 * pairs like 1-A, 2-B, and bullet formats.
 */
function extractAnswerKeyBlock(rawText) {
  const map = {};
  if (!rawText || typeof rawText !== 'string') return map;

  const keyBlockRegex = /(?:Answer\s*Key|ઉત્તરવહી|Key\s*Sheet|ANSWERS|KEYS|SOLUTION\s*KEY)[\s\S]*$/i;
  const match = rawText.match(keyBlockRegex);
  const targetText = match ? match[0] : rawText;

  const lines = targetText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for tabular format e.g. Q1 \t Q2 \t Q3 ...
    const qCols = line.split(/[\t\s]{2,}|\t/).map(c => c.trim()).filter(Boolean);
    const isQHeaderRow = qCols.length >= 2 && qCols.every(c => /^Q?\d+$/i.test(c));

    if (isQHeaderRow && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const aCols = nextLine.split(/[\t\s]{2,}|\t/).map(c => c.trim()).filter(Boolean);
      if (aCols.length >= 2) {
        qCols.forEach((col, idx) => {
          const qNum = parseInt(col.replace(/\D/g, ''), 10);
          if (qNum && aCols[idx]) {
            const ansMatch = aCols[idx].match(/\(?([A-Da-dઅબકડ])\)?/);
            if (ansMatch) {
              const k = ansMatch[1].toUpperCase();
              map[qNum] = gujOptionMap[k] || k;
            }
          }
        });
        i++; // skip nextLine
        continue;
      }
    }

    // Match pairs like: "1.(B)", "1. B", "1-B", "Q1: B", "1: (B)", "Q1\tB"
    const pairRegex = /(?:Q\s*)?(\d+)[\.\:\-\s\=\)]+\(?([A-Da-dઅબકડ])\)?/gi;
    let m;
    while ((m = pairRegex.exec(line)) !== null) {
      const qNum = parseInt(m[1], 10);
      let ans = m[2].toUpperCase();
      map[qNum] = gujOptionMap[ans] || ans;
    }
  }

  return map;
}

module.exports = {
  parseMcqText,
  extractAnswerKeyBlock,
};
