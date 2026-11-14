/**
 * CBT MCQ Parser & Question Extractor Utility
 * Parses raw text extracted from PDF or pasted question papers into structured MCQs.
 * Handles Gujarati & English question papers, single/multi-column options, multi-line questions,
 * preserves all Gujarati characters and words without drops or false-positive option splitting,
 * converts Gujarati numerals (૦-૯) for question numbering, and extracts answer keys.
 */

const gujOptionMap = {
  'અ': 'A', 'બ': 'B', 'ક': 'C', 'ડ': 'D',
  'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D',
  'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D',
  '1': 'A', '2': 'B', '3': 'C', '4': 'D',
  '૧': 'A', '૨': 'B', '૩': 'C', '૪': 'D',
};

// Convert Gujarati digits (૦-૯) to ASCII digits (0-9)
function toAsciiDigits(str) {
  if (!str) return '';
  return String(str).replace(/[૦-૯]/g, d => String(d.charCodeAt(0) - 0x0AE6));
}

// Clean and normalize Gujarati & Unicode text
function cleanText(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.normalize('NFC');
  
  // Remove soft hyphens, zero-width spaces, BOM
  cleaned = cleaned.replace(/[\u00AD\u200B\uFEFF]/g, '');

  // Fix detached Gujarati matras/vowel signs (e.g. consonant followed by space then matra/virama)
  cleaned = cleaned.replace(/([\u0A85-\u0AB9])\s+([\u0ABE-\u0ACD\u0A81-\u0A83])/g, '$1$2');

  return cleaned;
}

function parseMcqText(rawText, defaultSubject = 'Physics', marks = 4, negativeMarks = 1) {
  if (!rawText || typeof rawText !== 'string') return [];

  const normalized = cleanText(rawText);

  // 1. Separate Answer Key section if present at the end of the text
  let questionsText = normalized;
  let answerKeyText = '';

  const akMarkerRegex = /(?:ANSWER\s*KEY|ANSWERS|KEY\s*SHEET|SOLUTION\s*KEY|ઉત્તરવહી|જવાબો|સાચા\s*જવાબો|ઉત્તરો)[\s\S]*/i;
  const akMatch = normalized.match(akMarkerRegex);
  if (akMatch) {
    answerKeyText = akMatch[0];
    questionsText = normalized.substring(0, akMatch.index);
  }

  // Parse Answer Key Map from answerKeyText or full rawText
  const answerKeyMap = extractAnswerKeyBlock(answerKeyText || normalized);

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
    if (currentQ && currentQ.questionText && currentQ.questionText.trim().length > 1) {
      const qNum = currentQ.questionNo || (questions.length + 1);

      // Clean option labels from option texts
      const cleanOption = (txt, fallbackLabel) => {
        if (!txt || !txt.trim()) return fallbackLabel;
        let s = txt.trim();

        // Check if line contains inline answer at end of option (e.g. "0 Ans: (1)")
        const ansEndMatch = s.match(/(?:Ans(?:wer)?|Correct(?:\s*Option)?|ઉત્તર|જવાબ|Key)\s*[\:\-\=]?\s*[\(\[]?([A-Da-dઅબકડ1-4૧-૪])[\)\]]?/i);
        if (ansEndMatch) {
          if (!currentQ.correctAnswer) {
            const k = ansEndMatch[1].toUpperCase();
            currentQ.correctAnswer = gujOptionMap[k] || k;
          }
          s = s.replace(/(?:Ans(?:wer)?|Correct(?:\s*Option)?|ઉત્તર|જવાબ|Key)\s*[\:\-\=]?\s*[\(\[]?([A-Da-dઅબકડ1-4૧-૪])[\)\]]?.*/i, '').trim();
        }

        // Remove leading option marker like (A), (1), (અ), (૧), [A], [1], or "A. ", "1. ", "A) ", "1) "
        // MUST require parentheses OR delimiter + whitespace so Gujarati words starting with ક/અ/બ/ડ (e.g. કાર્બન, અવરોધ, બળ) never lose their first letter!
        s = s.replace(/^(?:\([A-Da-dઅબકડ1-4૧-૪]\)|\[[A-Da-dઅબકડ1-4૧-૪]\]|[A-Da-dઅબકડ][\.\)\:\-]\s+)\s*/, '').trim();
        return s || fallbackLabel;
      };

      const optA = cleanOption(optionMap['A'], 'Option A');
      const optB = cleanOption(optionMap['B'], 'Option B');
      const optC = cleanOption(optionMap['C'], 'Option C');
      const optD = cleanOption(optionMap['D'], 'Option D');

      let correct = currentQ.correctAnswer || answerKeyMap[qNum] || answerKeyMap[questions.length + 1] || 'A';
      correct = correct.toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(correct)) correct = 'A';

      questions.push({
        id: `q_${(currentQ.subject || defaultSubject).toLowerCase()}_${qNum}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
  // e.g. "1.", "1)", "1-", "Q1.", "Q.1", "Question 1:", "પ્રશ્ન 1.", "પ્રશ્ન ૧.", "MCQ 1."
  // Note: we intentionally do NOT treat naked (1) as a question start so numbered options (1), (2), (3), (4) are not broken!
  const qStartRegex = /^(?:(?:પ્રશ્ન|Question|Que[\.\:]?|Q[\.\:]?|MCQ)\s*([0-9૦-૯]+)[\.\)\:\-\s]|([0-9૦-૯]+)[\.\)\:\-]\s*)/i;

  // Regex to detect multiple options on one line: e.g. "(A) 10 (B) 20 (C) 30 (D) 40" or "(1) 10 (2) 20" or "(અ) 10 (બ) 20"
  const multiOptionRegex = /(?:[\(\[]([A-Da-dઅબકડ1-4૧-૪])[\)\]]|(?:^|[\s\t])([A-Da-dઅબકડ])[\.\)\:\-])\s+/g;

  // Regex to detect a line that starts as a single option: e.g. "(A) 10 Ω" or "A. 10 Ω" or "(1) 10 Ω" or "(અ) 10 Ω"
  const singleOptionLineRegex = /^(?:[\(\[]([A-Da-dઅબકડ1-4૧-૪])[\)\]]|([A-Da-dઅબકડ])[\.\)\:\-]\s*)(.*)$/;

  for (let line of cleanLines) {
    // 1. Check Question Start
    const qMatch = line.match(qStartRegex);
    if (qMatch) {
      finalizeCurrentQ();
      const rawDigits = qMatch[1] || qMatch[2] || qMatch[3] || (questions.length + 1);
      const qNum = parseInt(toAsciiDigits(rawDigits), 10) || (questions.length + 1);
      const remainingText = line.replace(qStartRegex, '').trim();

      currentQ = {
        subject: defaultSubject,
        questionNo: qNum,
        questionText: remainingText,
        correctAnswer: null,
      };
      currentOptKey = null;
      continue;
    }

    // 2. Check inline answer in question
    const ansMatch = line.match(/(?:Ans(?:wer)?|Correct(?:\s*Option)?|ઉત્તર|જવાબ|Key)\s*[\:\-\=]?\s*[\(\[]?([A-Da-dઅબકડ1-4૧-૪])[\)\]]?/i);
    if (ansMatch && currentQ) {
      const k = ansMatch[1].toUpperCase();
      currentQ.correctAnswer = gujOptionMap[k] || gujOptionMap[ansMatch[1]] || k;
      continue;
    }

    // 3. Check if line contains MULTIPLE options (e.g. "(A) ... (B) ... (C) ... (D) ..." or "(અ) ... (બ) ...")
    const optionMatches = [];
    let match;
    multiOptionRegex.lastIndex = 0;
    while ((match = multiOptionRegex.exec(line)) !== null) {
      const rawK = (match[1] || match[2]).toUpperCase();
      const mappedK = gujOptionMap[rawK] || rawK;
      if (['A', 'B', 'C', 'D'].includes(mappedK)) {
        optionMatches.push({
          key: mappedK,
          startIndex: match.index,
          headerLength: match[0].length,
        });
      }
    }

    // A valid multi-option line must have at least 2 distinct option markers, OR start with Option A/અ
    if (currentQ && optionMatches.length >= 2) {
      for (let i = 0; i < optionMatches.length; i++) {
        const cur = optionMatches[i];
        const next = optionMatches[i + 1];
        const val = line.substring(cur.startIndex + cur.headerLength, next ? next.startIndex : undefined).trim();
        optionMap[cur.key] = val;
        currentOptKey = cur.key;
      }
      continue;
    }

    // 4. Check if line is a SINGLE option line (e.g. "(A) 50 J" or "A. 50 J")
    const singleMatch = line.match(singleOptionLineRegex);
    if (currentQ && singleMatch) {
      const rawK = (singleMatch[1] || singleMatch[2]).toUpperCase();
      const mappedK = gujOptionMap[rawK] || rawK;

      // Ensure that if it's B, C, or D, either Option A was already seen, or we are in options mode
      const isExpectedSeq =
        mappedK === 'A' ||
        (mappedK === 'B' && optionMap['A'] !== undefined) ||
        (mappedK === 'C' && optionMap['B'] !== undefined) ||
        (mappedK === 'D' && optionMap['C'] !== undefined);

      if (['A', 'B', 'C', 'D'].includes(mappedK) && isExpectedSeq) {
        currentOptKey = mappedK;
        optionMap[mappedK] = singleMatch[3] ? singleMatch[3].trim() : '';
        continue;
      }
    }

    // 5. Continued line: append to current option if inside options mode, otherwise to question text
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
 * Supports table formats, pairs like 1-A, 1-(B), 1-અ, and bullet formats.
 */
function extractAnswerKeyBlock(rawText) {
  const map = {};
  if (!rawText || typeof rawText !== 'string') return map;

  const keyBlockRegex = /(?:Answer\s*Key|ઉત્તરવહી|જવાબો|સાચા\s*જવાબો|Key\s*Sheet|ANSWERS|KEYS|SOLUTION\s*KEY)[\s\S]*$/i;
  const match = rawText.match(keyBlockRegex);
  const targetText = match ? match[0] : rawText;

  const lines = targetText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for tabular format e.g. Q1 \t Q2 \t Q3 ... or 1 \t 2 \t 3
    const qCols = line.split(/[\t\s]{2,}|\t/).map(c => c.trim()).filter(Boolean);
    const isQHeaderRow = qCols.length >= 2 && qCols.every(c => /^Q?[0-9૦-૯]+$/i.test(c));

    if (isQHeaderRow && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const aCols = nextLine.split(/[\t\s]{2,}|\t/).map(c => c.trim()).filter(Boolean);
      if (aCols.length >= 2) {
        qCols.forEach((col, idx) => {
          const rawNum = col.replace(/\D/g, '');
          const qNum = parseInt(toAsciiDigits(rawNum), 10);
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

    // Match pairs like: "1.(B)", "1. B", "1-B", "Q1: B", "1: (B)", "1 - અ", "૧ - અ", "1 - (1)"
    const pairRegex = /(?:Q\s*)?([0-9૦-૯]+)[\.\:\-\s\=\)]+[\(\[]?([A-Da-dઅબકડ1-4૧-૪])[\)\]]?/gi;
    let m;
    while ((m = pairRegex.exec(line)) !== null) {
      const qNum = parseInt(toAsciiDigits(m[1]), 10);
      const rawAns = m[2];
      const mapped = gujOptionMap[rawAns] || gujOptionMap[rawAns.toUpperCase()] || rawAns.toUpperCase();
      if (qNum && ['A', 'B', 'C', 'D'].includes(mapped)) {
        map[qNum] = mapped;
      }
    }
  }

  return map;
}

module.exports = {
  parseMcqText,
  extractAnswerKeyBlock,
  cleanText,
  toAsciiDigits,
};
