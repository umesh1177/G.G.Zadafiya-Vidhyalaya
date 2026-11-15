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

// Clean, repair and normalize Gujarati & Unicode text from PDF/OCR extractions
function repairGujaratiText(txt) {
  if (!txt || typeof txt !== 'string') return '';
  let s = txt.normalize('NFC');

  // Dictionary of exact font-degraded patterns with null bytes, spaces or broken ligatures
  // Restores missing font glyphs (િ, ી, ુ, ૂ, ં, ligatures) before nulls are stripped
  const dict = [
    [/(?:^|\s)ુદ્ધ\s*પાણી/g, ' શુદ્ધ પાણી'],
    [/pH\s*(?:■|[\u0000\uFFFD]|\s)*ૂલ્\s*ય/g, 'pH મૂલ્ય'],
    [/(?:■|[\u0000\uFFFD])+\s*ૂલ્\s*ય/g, 'મૂલ્ય'],
    [/મ\s*[\u0000■\uFFFD\s]*ૂ\s*લ્\s*ય/g, 'મૂલ્ય'],
    [/[\u0000■\uFFFD]+\s*પાણી/g, 'પાણી'],
    [/પા\s*[\u0000■\uFFFD\s]*ણી/g, 'પાણી'],
    [/\u0000+\s*ઘાત/g, 'દ્વિઘાત'],
    [/સાવ\u0000+\s*ક/g, 'સાર્વત્રિક'],
    [/\u0000+\s*ુરુ\s*\t*\s*ત્\s*\t*\s*વાકષ\s*\u0000*\s*ણ/g, 'ગુરુત્વાકર્ષણ'],
    [/\u0000+\s*વ\s*\u0000*\s*ુત\s*\u0000+\s*તમાન/g, 'વિદ્યુત સ્થિતિમાન'],
    [/\u0000+\s*વ\s*\u0000*\s*ુત/g, 'વિદ્યુત'],
    [/\u0000+\s*વ\s*\u0000*\s*ા/g, 'વિદ્યા'],
    [/\u0000+\s*વ\s*\u0000*\s*ાન/g, 'વિજ્ઞાન'],
    [/\u0000+\s*વષય/g, 'વિષય'],
    [/\u0000+\s*વભાગ/g, 'વિભાગ'],
    [/\u0000+\s*વકલ્\s*પ/g, 'વિકલ્પ'],
    [/\u0000+\s*વકલ્\s*પો/g, 'વિકલ્પો'],
    [/\u0000+\s*ેણી/g, 'શ્રેણી'],
    [/\u0000+\s*ૂન્\s*ય/g, 'શૂન્ય'],
    [/\u0000+\s*ૂચના/g, 'સૂચના'],
    [/\u0000+\s*ુરત/g, 'સુરત'],
    [/\u0000+\s*ુણ/g, 'ગુણ'],
    [/\u0000+\s*ુગ્\s*મ/g, 'યુગ્મ'],
    [/\u0000+\s*ુખ્ય/g, 'મુખ્ય'],
    [/\u0000+\s*ૂલ્\s*ય/g, 'મૂલ્ય'],
    [/\u0000+\s*ૂત્ર/g, 'સૂત્ર'],
    [/\u0000+\s*ક\s*\u0000*\s*મત/g, 'કિંમત'],
    [/\u0000+\s*બ\s*\u0000*\s*દુ/g, 'બિંદુ'],
    [/\u0000+\s*કલોવોટ/g, 'કિલોવોટ'],
    [/\u0000+\s*નયમ/g, 'નિયમ'],
    [/ગ\s*\u0000+\s*ણત/g, 'ગણિત'],
    [/મ\s*\u0000+\s*નટ/g, 'મિનિટ'],
    [/ફર\s*\u0000+\s*જયાત/g, 'ફરજિયાત'],
    [/સં\s*\u0000+\s*ા/g, 'સંખ્યા'],
    [/વ\s*\u0000+\s*ુ\s*\u0000*\s*ળ/g, 'વર્તુળ'],
    [/પ\s*\u0000+\s*રઘ/g, 'પરિઘ'],
    [/\u0000{2,}\s*ા(\s*કેટલી|\s*શોધો|\s*છે)/g, 'ત્રિજ્યા$1'],
    [/બહુપદ\s*\u0000+/g, 'બહુપદી'],
    [/જવાબવહ\s*\u0000+/g, 'જવાબવહી'],
    [/વા\s*\u0000+\s*ષ\s*\u0000*\s*ક/g, 'વાર્ષિક'],
    [/કસોટ\s*\u0000+/g, 'કસોટી'],
    [/ભૌ\s*\u0000+\s*તક/g, 'ભૌતિક'],
    [/પાછળ\s*\u0000+\s*ું/g, 'પાછળનું'],
    [/તર\s*\u0000+\s*કે/g, 'તરીકે'],
    [/અર\s*\u0000+\s*સા/g, 'અરીસા'],
    [/અર\s*\u0000+\s*સો/g, 'અરીસો'],
    [/અંતગ\s*\u0000*\s*ળ/g, 'અંતર્ગોળ'],
    [/બ\s*\u0000+\s*હગ\s*\u0000*\s*ળ/g, 'બહિર્ગોળ'],
    [/ન્\s*\u0000+\s*ૂટન/g, 'ન્યૂટન'],
    [/ર\s*\u0000+\s*ગ/g, 'રંગ'],
    [/વાદળ\s*\u0000+/g, 'વાદળી'],
    [/દેખાવા\s*\u0000+\s*ું/g, 'દેખાવાનું'],
    [/પરાવત\s*\u0000*\s*ન/g, 'પરાવર્તન'],
    [/વ\s*\u0000+\s*ભવન/g, 'વક્રીભવન'],
    [/પ્ર\s*ક\s*\u0000+\s*ણ\s*\u0000*\s*ન/g, 'પ્રકીર્ણન'],
    [/ૂણ\s*\u0000+\s*આંત/g, 'પૂર્ણ આંત'],
    [/આંત\s*\u0000+\s*રક/g, 'આંતરિક'],
    [/સેન્\s*ટ\s*\u0000+\s*મીટર/g, 'સેન્ટિમીટર'],
    [/હ\s*\u0000+\s*ઝ/g, 'હર્ટ્ઝ'],
    [/ઊ\s*\u0000+\s*થાય/g, 'ઊર્જા થાય'],
    [/ધ્\s*વ\s*\u0000+\s*નના/g, 'ધ્વનિના'],
    [/તર\s*\u0000+\s*ગો/g, 'તરંગો'],
    [/પ્ર\s*સર\s*\u0000+\s*શકતા/g, 'પ્રસરી શકતા'],
    [/પદાથ\s*\u0000*\s*માં/g, 'પદાર્થમાં'],
    [/પ્ર\s*વાહ\s*\u0000*\s*માં/g, 'પ્રવાહીમાં'],
    [/વા\s*\u0000+\s*ુમાં/g, 'વાયુમાં'],
    [/વૈ\s*\u0000+\s*ા\s*\u0000*\s*નકે/g, 'વૈજ્ઞાનિકે'],
    [/આલ્\s*બટ\s*\u0000*\s*આઈન્સ્/g, 'આલ્બર્ટ આઈન્સ્'],
    [/ગે\s*\u0000+\s*લ\s*\u0000*\s*લયો/g, 'ગેલેલીયો'],
    [/એ\s*\u0000+\s*પયર/g, 'એમ્પીયર'],
    [/સમઘન\s*\u0000+\s*ું/g, 'સમઘનનું'],
    [/વચ્\s*ચે\s*\u0000+\s*ું/g, 'વચ્ચેનું'],
    [/કેટ\s*\u0000+\s*ું/g, 'કેટલું'],
    [/ક\s*\u0000+\s*ું/g, 'કયું'],
    [/બેક\s*\u0000+/g, 'બેકી'],
    [/સ્\s*વરૂ\s*પ/g, 'સ્વરૂપ'],
    [/આલ્\s*કેન/g, 'આલ્કેન'],
    [/કાબ\s*ન/g, 'કાર્બન'],
    [/કાબ\s*ો/g, 'કાર્બો'],
    [/આવત\s*કોષ્ટ\s*ક/g, 'આવર્ત કોષ્ટક'],
    [/દ્રશ્\s*ય/g, 'દ્રશ્ય'],
  ];

  for (const [re, rep] of dict) {
    s = s.replace(re, rep);
  }

  // Broken virama ligature: Consonant + Virama + whitespace + Consonant => Consonant + Virama + Consonant
  s = s.replace(/([\u0A85-\u0AB9]\u0ACD)\s+([\u0A85-\u0AB9])/g, '$1$2');

  // Fix detached Gujarati matras/vowel signs (consonant followed by space then matra/virama)
  s = s.replace(/([\u0A85-\u0AB9])\s+([\u0ABE-\u0ACD\u0A81-\u0A83])/g, '$1$2');

  // Trailing question markers from options
  s = s.replace(/\s*(?:પ્રશ્ન|Question|Que|Q|MCQ)\s*[0-9૦-૯]*\s*$/i, '');
  s = s.replace(/\s*(?:જવાબવહી|જવાબવહ|ઉત્તરવહી|Answer\s*Key|Key).*$/i, '');

  // Strip remaining null bytes, replacement characters, BOM, soft hyphens, zero-width spaces
  s = s.replace(/[\u0000\uFFFD■\u00AD\u200B\uFEFF]/g, '');

  // Collapse multiple spaces
  s = s.replace(/[ \t]+/g, ' ').trim();

  return s;
}

// Clean and normalize text
function cleanText(text) {
  if (!text || typeof text !== 'string') return '';
  return repairGujaratiText(text);
}

/**
 * Extracts Answer Key block from raw text
 * Supports table formats, pairs like 1-A, 1-(B), 1-અ, and bullet formats.
 */
function extractAnswerKeyBlock(rawText) {
  const map = {};
  if (!rawText || typeof rawText !== 'string') return map;

  const keyBlockRegex = /(?:Answer\s*Key|જવાબવહ\s*\u0000*|જવાબવહી|ઉત્તરવહી|જવાબો|સાચા\s*જવાબો|Key\s*Sheet|ANSWERS|KEYS|SOLUTION\s*KEY)[\s\S]*$/i;
  const match = rawText.match(keyBlockRegex);
  const targetText = match ? match[0] : rawText;

  const lines = targetText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for tabular format: Row of Question Numbers followed by Row of Answers
    const qNums = (line.match(/[0-9૦-૯]+/g) || [])
      .map(n => parseInt(toAsciiDigits(n), 10))
      .filter(n => n > 0 && n <= 250);

    if (qNums.length >= 2 && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      // Clean leading row label like "સાચો વિકલ્પ", "સાચો વકલ્પ", "Answer", "Key" so letters like 'ક' in 'વિકલ્પ' are never confused with Option C
      const aLine = nextLine.replace(/^(?:સાચો\s*વ(?:િક|ક)લ્\s*પ|સાચો\s*વિકલ્પ|સાચો\s*જવાબ|જવાબ|ઉત્તર|Option|Correct(?:\s*Option)?|Answer|Ans)[\s\:\-\t]*/i, '');
      const aMatches = Array.from(aLine.matchAll(/(?:[\(\[]([A-Da-dઅબકડ1-4૧-૪])[\)\]]|(?:^|[\s\t])([A-Da-dઅબકડ])(?:$|[\s\t\.\,\-\)]))/g))
        .map(m => m[1] || m[2])
        .filter(Boolean)
        .map(k => gujOptionMap[k.toUpperCase()] || k.toUpperCase());

      if (aMatches.length >= 2) {
        qNums.forEach((q, idx) => {
          if (aMatches[idx]) {
            map[q] = aMatches[idx];
          }
        });
        i++;
        continue;
      }
    }

    // Match pairs like: "1.(B)", "1. B", "1-B", "Q1: B", "1: (B)", "1 - અ", "૧ - અ", "1 - (1)"
    const pairRegex = /(?:Q\s*)?([0-9૦-૯]+)[\.\:\-\s\=\)]+[\(\[]?([A-Da-dઅબકડ1-4૧-૪])[\)\]]?/gi;
    let m;
    while ((m = pairRegex.exec(line)) !== null) {
      const qNum = parseInt(toAsciiDigits(m[1]), 10);
      let ans = m[2].toUpperCase();
      if (qNum > 0 && qNum <= 250) {
        map[qNum] = gujOptionMap[ans] || ans;
      }
    }
  }

  // Support Quantum Paper section answer table: "1. A Chap...", "2. D Chap...", etc.
  const qpTableRegex = /(?:^|\n)\s*([0-9]+)\.\s*([A-Da-dઅબકડ1-4૧-૪])(?:\s+(?:Chap|S\d+|QP|[A-Za-z0-9_]+))?/gi;
  let qpM;
  while ((qpM = qpTableRegex.exec(targetText)) !== null) {
    const qNum = parseInt(qpM[1], 10);
    const ans = qpM[2].toUpperCase();
    if (qNum > 0 && qNum <= 250) {
      map[qNum] = gujOptionMap[ans] || ans;
    }
  }

  return map;
}

function parseMcqText(rawText, defaultSubject = 'Physics', marks = 4, negativeMarks = 1, imageMap = {}) {
  if (!rawText || typeof rawText !== 'string') return [];

  const normalized = repairGujaratiText(rawText);

  // 1. Separate Answer Key section if present at the end of the text
  let questionsText = normalized;
  let answerKeyText = '';

  const akMarkerRegex = /(?:ANSWER\s*KEY|ANSWERS|KEY\s*SHEET|SOLUTION\s*KEY|ઉત્તરવહી|જવાબવહી|જવાબો|સાચા\s*જવાબો|ઉત્તરો)[\s\S]*/i;
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
    if (/^(?:Class\s*X|Time\s*:\s*\d+|Max(?:imum)?\s*Marks\s*:|સમય\s*:|કુલ\s*ગુણ\s*:)/i.test(line)) {
      continue;
    }
    if (/(?:Collegiate\s*Academy|International\s*School|High\s*School|Vidhyalaya|મંદિર).*Page/i.test(line)) {
      continue;
    }
    // Ignore table of contents / syllabus summary lines like "4.12, 4.20 (2)" or "8.4, 8.8"
    if (/^[0-9૦-૯]+\.[0-9૦-૯]+(?:\s*,\s*[0-9૦-૯]+\.[0-9૦-૯]+)*\s*\(\d+\)/.test(line)) {
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

        // Remove any embedded image markers if present
        s = s.replace(/\[(?:DOCX_IMG|IMAGE|IMG)\s*:\s*([^\]]+)\]/gi, '').trim();

        // Remove leading option marker like (A), (1), (અ), (૧), [A], [1], or "A. ", "1. ", "A) ", "1) "
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

      // Clean question text and extract any embedded image if not already set
      let cleanQText = (currentQ.questionText || '')
        .replace(/\[(?:DOCX_IMG|IMAGE|IMG)\s*:\s*([^\]]+)\]/gi, '')
        .trim();
      let qImg = currentQ.imageUrl || '';
      if (!qImg) {
        const inlineImg = (currentQ.questionText || '').match(/\[(?:DOCX_IMG|IMAGE|IMG)\s*:\s*([^\]]+)\]/i);
        if (inlineImg && imageMap && imageMap[inlineImg[1].trim()]) {
          qImg = imageMap[inlineImg[1].trim()];
        }
      }

      questions.push({
        id: `q_${(currentQ.subject || defaultSubject).toLowerCase()}_${qNum}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        subject: currentQ.subject || defaultSubject,
        questionNo: qNum,
        marks: Number(marks) || 4,
        negativeMarks: Number(negativeMarks) || 1,
        questionText: cleanQText,
        imageUrl: qImg,
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
  // Must NOT match decimal numbers like 4.12!
  // Requires dot to not be followed by a digit: `\.(?!\d)`!
  const qStartRegex = /^(?:(?:પ્રશ્ન|Question|Que[\.\:]?|Q[\.\:]?|MCQ|ઉદાહરણ|ઉદા[\.]?|સ્વાધ્યાય|સ્વા[\.]?|કોયડો|દાખલો)\s*([0-9૦-૯]+)[\.\)\:\-\s]|([0-9૦-૯]+)\.(?!\d)\s*|([0-9૦-૯]+)[\)\:\-]\s*|[\(\[]([0-9૦-૯]+)[\)\]]\s+)/i;

  // Regex to detect multiple options on one line: e.g. "(A) 10 (B) 20 (C) 30 (D) 40" or "(1) 10 (2) 20" or "(અ) 10 (બ) 20"
  const multiOptionRegex = /(?:[\(\[]([A-Da-dઅબકડ1-4૧-૪])[\)\]]|(?:^|[\s\t])([A-Da-dઅબકડ])[\.\)\:\-])\s+/g;

  // Regex to detect a line that starts as a single option: e.g. "(A) 10 Ω" or "A. 10 Ω" or "(1) 10 Ω" or "(અ) 10 Ω"
  const singleOptionLineRegex = /^(?:[\(\[]([A-Da-dઅબકડ1-4૧-૪])[\)\]]|([A-Da-dઅબકડ])[\.\)\:\-]\s*)(.*)$/;

  for (let line of cleanLines) {
    // 0. Check if line is an embedded image marker [DOCX_IMG:filename]
    const imgMarkerMatch = line.match(/\[(?:DOCX_IMG|IMAGE|IMG)\s*:\s*([^\]]+)\]/i);
    if (imgMarkerMatch) {
      const imgKey = imgMarkerMatch[1].trim();
      const resolved = (imageMap && imageMap[imgKey]) || (imgKey.startsWith('data:') || imgKey.startsWith('http') ? imgKey : '');
      if (resolved && currentQ) {
        currentQ.imageUrl = resolved;
      }
      continue;
    }

    // 1. Check Question Start
    const qMatch = line.match(qStartRegex);
    if (qMatch) {
      finalizeCurrentQ();
      const rawDigits = qMatch[1] || qMatch[2] || qMatch[3] || qMatch[4] || (questions.length + 1);
      const qNum = parseInt(toAsciiDigits(rawDigits), 10) || (questions.length + 1);
      const remainingText = line.replace(qStartRegex, '').trim();

      currentQ = {
        subject: defaultSubject,
        questionNo: qNum,
        questionText: remainingText,
        imageUrl: '',
        correctAnswer: null,
      };
      currentOptKey = null;
      continue;
    }

    // 2. Check inline answer in question
    const ansMatch = line.match(/(?:Ans(?:wer)?|Correct(?:\s*Option)?|ઉત્તર|જવાબ|Key)\s*[\:\-\=]?\s*\(?([A-Da-dઅબકડ])\)?/i);
    if (ansMatch && currentQ) {
      const k = ansMatch[1].toUpperCase();
      currentQ.correctAnswer = gujOptionMap[k] || k;
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

    // A valid multi-option line must have at least 2 distinct option markers
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
 * Extracts raw embedded JPEG streams from binary buffers
 */
function extractEmbeddedJpegsFromBuffer(buf) {
  const jpegs = [];
  if (!Buffer.isBuffer(buf) || buf.length < 500) return jpegs;
  let pos = 0;
  while (pos < buf.length - 4 && jpegs.length < 50) {
    const start = buf.indexOf(Buffer.from([0xff, 0xd8, 0xff]), pos);
    if (start === -1) break;
    let end = start + 3;
    while (end < buf.length - 1) {
      if (buf[end] === 0xff && buf[end + 1] === 0xd9) {
        end += 2;
        break;
      }
      end++;
    }
    const len = end - start;
    if (len >= 400 && len <= 10 * 1024 * 1024) {
      jpegs.push(buf.subarray(start, end));
      pos = end;
    } else {
      pos = start + 1;
    }
  }
  return jpegs;
}

/**
 * Extracts media/images from Word .docx file buffer
 */
function extractImagesFromDocx(buf) {
  const images = [];
  try {
    const XLSX = require('xlsx');
    const zip = XLSX.CFB.read(buf, { type: 'buffer' });
    if (zip && Array.isArray(zip.FileIndex)) {
      const imgEntries = zip.FileIndex.filter(entry => {
        if (!entry.name || !entry.content) return false;
        const name = String(entry.name).toLowerCase();
        if (name.includes('thumbnail')) return false;
        return /\.(png|jpe?g|gif|webp|bmp)$/i.test(name) || name.includes('image');
      });

      // Sort naturally so image1, image2, image3 ... image10 are in sequential order
      imgEntries.sort((a, b) => {
        const numA = parseInt(String(a.name).replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(String(b.name).replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

      for (const entry of imgEntries) {
        const name = String(entry.name).toLowerCase();
        let mime = 'image/png';
        if (name.endsWith('.jpg') || name.endsWith('.jpeg')) mime = 'image/jpeg';
        else if (name.endsWith('.gif')) mime = 'image/gif';
        else if (name.endsWith('.webp')) mime = 'image/webp';
        else if (name.endsWith('.bmp')) mime = 'image/bmp';
        
        const contentBuf = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content);
        if (contentBuf.length >= 200) {
          images.push({
            name: entry.name,
            size: contentBuf.length,
            dataUrl: `data:${mime};base64,${contentBuf.toString('base64')}`,
          });
        }
      }
    }
  } catch (err) {
    console.warn('Docx image extraction error:', err.message);
  }
  return images;
}

/**
 * Parses Word .docx file buffer, extracts text preserving image embeddings as [DOCX_IMG:filename],
 * and extracts all embedded images into a map and sequential list.
 */
function parseDocxWithImages(buf) {
  try {
    const XLSX = require('xlsx');
    const zip = XLSX.CFB.read(buf, { type: 'buffer' });

    // 1. Rel map: rId -> target image filename
    const relsEntry = (zip.FileIndex || []).find(
      x => x.name === 'document.xml.rels' || (x.name && x.name.endsWith('document.xml.rels'))
    );
    const relMap = {};
    if (relsEntry && relsEntry.content) {
      const relsXml = Buffer.from(relsEntry.content).toString('utf-8');
      const relRegex = /Id="([^"]+)"[^>]*Target="([^"]+)"/g;
      let m;
      while ((m = relRegex.exec(relsXml)) !== null) {
        relMap[m[1]] = m[2].replace(/^.*[\\\/]/, '');
      }
    }

    // 2. Image map: filename -> dataUrl
    const imgMap = {};
    const extractedImages = [];
    (zip.FileIndex || []).forEach(entry => {
      if (!entry.name || !entry.content) return;
      const baseName = entry.name.replace(/^.*[\\\/]/, '');
      if (/\.(png|jpe?g|gif|webp|bmp)$/i.test(baseName) && !baseName.toLowerCase().includes('thumbnail')) {
        const ext = baseName.split('.').pop().toLowerCase();
        const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
        const contentBuf = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content);
        if (contentBuf.length >= 200) {
          const dataUrl = `data:${mime};base64,${contentBuf.toString('base64')}`;
          imgMap[baseName] = dataUrl;
          extractedImages.push({ name: baseName, size: contentBuf.length, dataUrl });
        }
      }
    });

    // Sort extractedImages naturally: image1, image2, ... image10
    extractedImages.sort((a, b) => {
      const numA = parseInt(String(a.name).replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.name).replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    // 3. Document text with embed tags
    const docEntry = (zip.FileIndex || []).find(
      x => x.name === 'document.xml' || (x.name && x.name.endsWith('document.xml'))
    );
    if (!docEntry || !docEntry.content) {
      return { textContent: '', imgMap, extractedImages };
    }

    let docXml = Buffer.from(docEntry.content).toString('utf-8');
    // Replace <a:blip r:embed="rIdX"> with image token
    docXml = docXml.replace(/<a:blip[^>]+r:embed="([^"]+)"[^>]*>/gi, (match, rId) => {
      const imgName = relMap[rId] || '';
      return imgName ? `\n[DOCX_IMG:${imgName}]\n` : '';
    });

    const textContent = docXml
      .replace(/<w:p\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim();

    return { textContent, imgMap, extractedImages };
  } catch (err) {
    console.warn('Docx parse with images error:', err.message);
    return { textContent: '', imgMap: {}, extractedImages: [] };
  }
}

/**
 * Extracts images from PDF file buffer (using pdf-parse with fallback to raw scan)
 */
async function extractImagesFromPdf(cleanPdfBuf) {
  const images = [];
  if (!Buffer.isBuffer(cleanPdfBuf) || cleanPdfBuf.length < 100) return images;

  // 1. Try pdf-parse built-in image extractor
  try {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: cleanPdfBuf });
    const imgResult = await parser.getImage({ imageDataUrl: true, imageBuffer: true });
    if (imgResult && Array.isArray(imgResult.pages)) {
      for (const p of imgResult.pages) {
        if (Array.isArray(p.images)) {
          for (const img of p.images) {
            let dataUrl = img.dataUrl;
            if (!dataUrl && img.data && img.data.length > 0) {
              dataUrl = `data:image/png;base64,${Buffer.from(img.data).toString('base64')}`;
            }
            if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
              // Ignore tiny icons or spacer dots (under 25x25)
              if ((img.width && img.width < 25) || (img.height && img.height < 25)) continue;
              images.push({
                pageNumber: p.pageNumber,
                dataUrl,
                width: img.width || 300,
                height: img.height || 200,
              });
            }
          }
        }
      }
    }
    await parser.destroy().catch(() => {});
  } catch (err) {
    console.warn('pdf-parse getImage failed, trying embedded scan:', err.message);
  }

  // 2. Fallback: Scan for embedded JPEGs directly in the PDF streams
  if (images.length === 0) {
    try {
      const jpegs = extractEmbeddedJpegsFromBuffer(cleanPdfBuf);
      for (let i = 0; i < jpegs.length; i++) {
        images.push({
          pageNumber: i + 1,
          dataUrl: `data:image/jpeg;base64,${jpegs[i].toString('base64')}`,
          width: 300,
          height: 200,
        });
      }
    } catch (rawErr) {
      console.warn('Raw JPEG scan error:', rawErr.message);
    }
  }

  return images;
}

/**
 * Automatically associates extracted PDF/DOCX images with questions based on diagram references
 */
function associateImagesWithQuestions(questions, extractedImages) {
  if (!extractedImages || extractedImages.length === 0 || !questions || questions.length === 0) return;

  let imgIdx = 0;
  // Broad list of keywords indicating diagrams in English and Gujarati
  const diagramKeywords = /આકૃતિ|પરિપથ|આલેખ|ચિત્ર|દર્શાવ્યા|દર્શાવેલ|નીચે|રચના|બંધરેખા|માળખાંકીય|સમતુલ્ય|પ્રતિબિંબ|કિરણ|રેખાકૃતિ|સંયોજન|જોડાણ|લુઈસ|કોયડો|સ્વાધ્યાય|figure|diagram|graph|circuit|chart|shown below|following figure|image|refer to|structure|formula|as shown|given below/i;

  // Pass 1: Assign images to questions with explicit diagram keywords
  for (const q of questions) {
    if (imgIdx >= extractedImages.length) break;
    const combinedText = `${q.questionText || ''} ${q.questionTextGujarati || ''}`;
    if (!q.imageUrl && diagramKeywords.test(combinedText)) {
      q.imageUrl = extractedImages[imgIdx].dataUrl;
      imgIdx++;
    }
  }

  // Pass 2: If there are remaining unassigned images, assign sequentially to remaining questions without images
  if (imgIdx < extractedImages.length) {
    for (const q of questions) {
      if (imgIdx >= extractedImages.length) break;
      if (!q.imageUrl) {
        q.imageUrl = extractedImages[imgIdx].dataUrl;
        imgIdx++;
      }
    }
  }
}

/**
 * Converts Gopika / Saral / Avantika / LMG ASCII non-Unicode font encodings to Gujarati Unicode.
 * Widely used in Gujarat high schools, coaching institutes and Quantum Paper software.
 */
function convertGopikaToUnicode(txt) {
  if (!txt || typeof txt !== 'string') return '';
  let s = txt;

  const phrases = [
    // Quantum Paper instructions & headers
    [/Lke\[u ykÃku÷k «&LkkuLkk \{køÞk \{wsçk W¥kh ÷¾ku/g, 'નીચે આપેલા પ્રશ્નોના માગ્યા મુજબ ઉત્તર લખો'],
    [/Lke\[u ykÃku÷k/g, 'નીચે આપેલા'],
    [/Lke\[uLkk\{ktÚke/g, 'નીચેનામાંથી'],
    [/Lke\[uLkk/g, 'નીચેના'],
    [/«&LkkuLkk/g, 'પ્રશ્નોના'],
    [/\{køÞk \{wsçk/g, 'માગ્યા મુજબ'],
    [/W¥kh ÷¾ku/g, 'ઉત્તર લખો'],
    [/«íÞufLkk/g, 'પ્રત્યેકના'],
    [/økwý/g, 'ગુણ'],
    [/yLku/g, 'અને'],

    // Avantika / Saral Font (used in Maths & Physics)
    [/Q„\{®ƒŒw/g, 'ઉગમબિંદુ'],
    [/Q„\{/g, 'ઉગમ'],
    [/®ƒŒw/g, 'બિંદુ'],
    [/®çkËw/g, 'બિંદુ'],
    [/\{tkÚte/g, 'માંથી'],
    [/…Ëth/g, 'પસાર'],
    [/Út‚e/g, 'થતી'],
    [/hu¾tytu/g, 'રેખાઓ'],
    [/hu¾t™wk/g, 'રેખાનું'],
    [/hu¾t™t/g, 'રેખાના'],
    [/hu¾t/g, 'રેખા'],
    [/Ë{tk‚h/g, 'સમાંતર'],
    [/y™w¢\{u/g, 'અનુક્રમે'],
    [/y™u/g, 'અને'],
    [/AuŒu Au/g, 'છેદે છે'],
    [/AuŒu/g, 'છેદે'],
    [/„wýtu¥th\{tk/g, 'ગુણોત્તરમાં'],
    [/„wýtu¥th/g, 'ગુણોત્તર'],
    [/rð¼ts™/g, 'વિભાજન'],
    [/fÞt/g, 'કયા'],
    [/fhu \?/g, 'કરે ?'],
    [/fhu/g, 'કરે'],
    [/yût™u/g, 'અક્ષને'],
    [/yût/g, 'અક્ષ'],
    [/yûkLku/g, 'અક્ષને'],
    [/yûk/g, 'અક્ષ'],
    [/Ë\{efhýtu/g, 'સમીકરણો'],
    [/Ë\{efhý/g, 'સમીકરણ'],
    [/‚hVÚte/g, 'તરફથી'],
    [/fh‚e/g, 'કરતી'],
    [/Œtuhu÷/g, 'દોરેલ'],
    [/ðuÄ™e/g, 'વેધની'],
    [/÷kƒtE/g, 'લંબાઈ'],
    [/«\[÷/g, 'પ્રચલ'],
    [/ftítuorÍÞ™/g, 'કાર્તેઝિયન'],
    [/fkíkuorÍÞ™/g, 'કાર્તેઝિયન'],
    [/fkíkuorÍÞ/g, 'કાર્તેઝિયન'],
    [/ðå\[u™tu/g, 'વચ્ચેનો'],
    [/ðå\[uLkku/g, 'વચ્ચેનો'],
    [/ðå\[u/g, 'વચ્ચે'],
    [/¾qýtu/g, 'ખૂણો'],
    [/rþhku®çkËwðk¤k/g, 'શિરોબિંદુવાળા'],
    [/rºkfkuýLkwt/g, 'ત્રિકોણનું'],
    [/rºkfkuý/g, 'ત્રિકોણ'],
    [/ûkuºkV¤/g, 'ક્ષેત્રફળ'],
    [/hu¾kLku/g, 'રેખાને'],
    [/hu¾k/g, 'રેખા'],
    [/suLkku/g, 'જેનો'],
    [/ytík:¾tz/g, 'અંત:ખંડ'],
    [/íkuðe/g, 'તેવી'],
    [/Mk\{ktíkh/g, 'સમાંતર'],
    [/«r¢ÞkÚke/g, 'પ્રક્રિયાથી'],
    [/«r¢Þk/g, 'પ્રક્રિયા'],
    [/çkLku Au \?/g, 'બને છે ?'],
    [/çkLku Au/g, 'બને છે'],
    [/LkeÃks/g, 'નીપજ'],
    [/çkLkþu \?/g, 'બનશે ?'],
    [/çkLkþu/g, 'બનશે'],
    [/òu/g, 'જો'],
    [/‚tu/g, 'તો'],
    [/íkku/g, 'તો'],
    [/ntuÞ/g, 'હોય'],
    [/nkuÞ/g, 'હોય'],
    [/™wk/g, 'નું'],
    [/™u/g, 'ને'],
    [/yu/g, 'એ'],
    [/\{tk/g, 'માં'],

    // Chemistry specific phrases (Class 11 & 12)
    [/fÞku ík\]íkeÞf fkçkoLk Ähkðu Au \?/g, 'કયો તૃતીયક કાર્બન ધરાવે છે ?'],
    [/fÞku ík\]íkeÞf fkçkoLk/g, 'કયો તૃતીયક કાર્બન'],
    [/fÞku ík\]íkeÞf ykÕfkunkì÷ Au \?/g, 'કયો તૃતીયક આલ્કોહોલ છે ?'],
    [/ykÕfkunkì÷/g, 'આલ્કોહોલ'],
    [/ykÕfkunkìr÷f/g, 'આલ્કોહોલિક'],
    [/suLku þwt fnu Au \?/g, 'જેને શું કહે છે ?'],
    [/he\{h–rx\{kLk/g, 'રીમર-ટીમાન'],
    [/fkìÕçku-ÂM\{xT/g, 'કોલ્બે-શ્મિટ'],
    [/yurMkrx÷uþLk/g, 'એસિટિલેશન'],
    [/çkuLÍkuR÷uþLk/g, 'બેન્ઝોઇલેશન'],
    [/EÚkh/g, 'ઈથર'],
    [/MktÞkusLk/g, 'સંયોજન'],
    [/\{kuLkkuçkúkur\{LkuþLk/g, 'મોનોબ્રોમિનેશન'],
    [/\{wÏÞ LkeÃks/g, 'મુખ્ય નીપજ'],
    [/\{wÏÞ/g, 'મુખ્ય'],
    [/\{¤þu \?/g, 'મળશે ?'],
    [/\{¤þu/g, 'મળશે'],
    [/rðÄkLkLke/g, 'વિધાનની'],
    [/rðÄkLk/g, 'વિધાન'],
    [/fkhýðk¤wt/g, 'કારણવાળું'],
    [/fkhý/g, 'કારણ'],
    [/«&™ Lkt\./g, 'પ્રશ્ન નં.'],
    [/«&™/g, 'પ્રશ્ન'],
    [/Lkt\./g, 'નં.'],
    [/ÞkuøÞ/g, 'યોગ્ય'],
    [/rðfÕÃk/g, 'વિકલ્પ'],
    [/ÃkMktË fhku/g, 'પસંદ કરો'],
    [/ÃkMktË/g, 'પસંદ'],
    [/fhku/g, 'કરો'],
    [/Mkk\[wtt/g, 'સાચું'],
    [/Mkk\[wt Au/g, 'સાચું છે'],
    [/Mkk\[wt/g, 'સાચું'],
    [/Mkk\[kt Au/g, 'સાચાં છે'],
    [/Mkk\[kt/g, 'સાચાં'],
    [/Mkk\[e Mk\{sqíke Au/g, 'સાચી સમજૂતી છે'],
    [/Mkk\[e Mk\{sqíke LkÚke/g, 'સાચી સમજૂતી નથી'],
    [/Mkk\[e/g, 'સાચી'],
    [/Mk\{sqíke/g, 'સમજૂતી'],
    [/¾kuxwt Au/g, 'ખોટું છે'],
    [/¾kuxwt/g, 'ખોટું'],
    [/fhíkkt/g, 'કરતાં'],
    [/ðÄw/g, 'વધુ'],
    [/r¢Þkþe÷/g, 'ક્રિયાશીલ'],
    [/\{kxu/g, 'માટે'],
    [/îkhk/g, 'દ્વારા'],
    [/Ãký/g, 'પણ'],
    [/çkuÂLÍLk/g, 'બેન્ઝીન'],
    [/çktLku/g, 'બંને'],
    [/yLku/g, 'અને'],
    [/Lke\[u ykÃku÷/g, 'નીચે આપેલ'],
    [/Lke\[u/g, 'નીચે'],
    [/R÷uõxÙkìLkyLkwhkøke/g, 'ઇલેક્ટ્રોનઅનુરાગી'],
    [/R÷uõxÙkìLk/g, 'ઇલેક્ટ્રોન'],
    [/yLkwhkøke/g, 'અનુરાગી'],
    [/rðMÚkkÃkLk/g, 'વિસ્થાપન'],
    [/rVLkku÷/g, 'ફિનોલ'],
    [/\{æÞMÚk/g, 'મધ્યસ્થ'],
    [/fkçkkuofuxkÞLk/g, 'કાર્બોકેટાયન'],
    [/MkMÃktËLk/g, 'સસ્પંદન'],
    [/MÚkkÞe ÚkÞu÷/g, 'સ્થાયી થયેલ'],
    [/MÚkkÞe/g, 'સ્થાયી'],
    [/s÷eÞ/g, 'જલીય'],
    [/s¤rð¼ksLk/g, 'જળવિભાજન'],
    [/WÃkhkuõík/g, 'ઉપરોક્ત'],
    [/Þkuøkþe÷/g, 'યોગશીલ'],
    [/Mkr¢Þf\]ík/g, 'સક્રિયકૃત'],
    [/fuLÿkLkwhkøke/g, 'કેન્દ્રાનુરાગી'],
    [/çkuLÍkRLk/g, 'બેન્ઝાઇન'],
    [/Lk¬e fhku/g, 'નક્કી કરો'],
    [/Mkktÿ/g, 'સાંદ્ર'],
    [/çkúku\{kuRÚkuLk/g, 'બ્રોમોઇથેન'],
    [/r\{ÚkuLkku÷/g, 'મિથેનોલ'],
    [/RÚkuLkku÷/g, 'ઇથેનોલ'],
    [/MkÕVux/g, 'સલ્ફેટ'],
    [/ík\]íkeÞf/g, 'તૃતીયક'],
    [/fkçkoLk/g, 'કાર્બન'],
    [/Ähkðu Au \?/g, 'ધરાવે છે ?'],
    [/Ähkðu Au/g, 'ધરાવે છે'],
    [/Ähkðu/g, 'ધરાવે'],
    [/«kuÃkuLk/g, 'પ્રોપેન'],
    [/n-\s*çÞwxuLk/g, 'n-બ્યુટેન'],
    [/çÞwxuLk/g, 'બ્યુટેન'],
    [/r\{ÚkkR÷«kuÃkuLk/g, 'મિથાઇલપ્રોપેન'],
    [/zkÞr\{ÚkkR÷«kuÃkuLk/g, 'ડાયમિથાઇલપ્રોપેન'],
    [/r\{ÚkkR÷/g, 'મિથાઇલ'],
    [/zkÞ/g, 'ડાય'],
    [/Mkkuzk÷kR{/g, 'સોડાલાઇમ'],
    [/þwt Au \?/g, 'શું છે ?'],
    [/þwt fnu Au/g, 'શું કહે છે'],
    [/þwt/g, 'શું'],
    [/þkLkwt/g, 'શાનું'],
    [/Mkk\{kLÞ/g, 'સામાન્ય'],
    [/Mkqºk/g, 'સૂત્ર'],
    [/ykÕfuLk/g, 'આલ્કેન'],
    [/ykÕfeLk/g, 'આલ્કીન'],
    [/ykÕfkRLk/g, 'આલ્કાઇન'],
    [/MkkÞõ÷kuykÕfeLk/g, 'સાયક્લોઆલ્કીન'],
    [/MkkÞõ÷ku/g, 'સાયક્લો'],
    [/r÷LkzMko/g, 'લિન્ડર્સ'],
    [/WÆeÃkf/g, 'ઉદ્દીપક'],
    [/Mktík\]Ãík/g, 'સંતૃપ્ત'],
    [/nkRzÙkufkçkoLk/g, 'હાઇડ્રોકાર્બન'],
    [/RÚkeLk/g, 'ઇથીન'],
    [/RÚkkRLk/g, 'ઇથાઇન'],
    [/çÞwxkRLk/g, 'બ્યુટાઇન'],
    [/«fkhLkku/g, 'પ્રકારનો'],
    [/nkRzÙkusLk/g, 'હાઇડ્રોજન'],
    [/LkÚke nkuíkku \?/g, 'નથી હોતો ?'],
    [/LkÚke nkuíkku/g, 'નથી હોતો'],
    [/LkÚke \?/g, 'નથી ?'],
    [/çkuLÍuLkkRz/g, 'બેન્ઝેનાઇડ'],
    [/çkuÂLÍLkLke/g, 'બેન્ઝીનની'],
    [/çkuÂLÍLk/g, 'બેન્ઝીન'],
    [/õ÷kurhLk/g, 'ક્લોરીન'],
    [/rLkso¤/g, 'નિર્જળ'],
    [/nksheLke/g, 'હાજરીની'],
    [/fhðkÚke/g, 'કરવાથી'],
    [/õ÷kuhkuçkuÂLÍLk/g, 'ક્લોરોબેન્ઝીન'],
    [/õ÷kuhku/g, 'ક્લોરો'],
    [/nuõÍkõ÷kuhkuMkkÞõ÷kunufÍuLk/g, 'હેક્ઝાક્લોરોસાયક્લોહેક્ઝેન'],
    [/nuõÍkõ÷kuhkRz/g, 'હેક્ઝાક્લોરાઇડ'],
    [/nuõÍk/g, 'હેક્ઝા'],
    [/yuf Ãký Lknª/g, 'એક પણ નહીં'],
    [/«kuÃkeLk/g, 'પ્રોપીન'],
    [/nu÷ku«kuÃkeLk/g, 'હેલોપ્રોપીન'],
    [/nþu \?/g, 'હશે ?'],
    [/çkÄks/g, 'બધાજ'],
    [/çkÄe s/g, 'બધી જ'],

    // Mathematics specific phrases (Class 11 & 12)
    [/©urýf/g, 'શ્રેણિક'],
    [/ÔÞMík ©urýf/g, 'વ્યસ્ત શ્રેણિક'],
    [/ÔÞMík/g, 'વ્યસ્ત'],
    [/yMkíÞ Au/g, 'અસત્ય છે'],
    [/yMkíÞ/g, 'અસત્ય'],
    [/MkíÞ Au/g, 'સત્ય છે'],
    [/MkíÞ/g, 'સત્ય'],
    [/Mkíkík nkuÞ íkku/g, 'સતત હોય તો'],
    [/Mkíkík nkuÞ/g, 'સતત હોય'],
    [/Mkíkík Au/g, 'સતત છે'],
    [/Mkíkík/g, 'સતત'],
    [/rðf÷LkeÞ Au/g, 'વિકલનીય છે'],
    [/rðf÷LkeÞ/g, 'વિકલનીય'],
    [/rðÄuÞ/g, 'વિધેય'],
    [/ykøk¤/g, 'આગળ'],

    // Physics specific phrases (Class 11 & 12)
    [/rðãwíkûkuºkLke íkeðúíkkLkwt/g, 'વિદ્યુતક્ષેત્રની તીવ્રતાનું'],
    [/rðãwíkûkuºkLke/g, 'વિદ્યુતક્ષેત્રની'],
    [/rðãwíkûkuºk\{kt/g, 'વિદ્યુતક્ષેત્રમાં'],
    [/rðãwíkûkuºk/g, 'વિદ્યુતક્ષેત્ર'],
    [/íkeðúíkkLkwt/g, 'તીવ્રતાનું'],
    [/íkeðúíkk/g, 'તીવ્રતા'],
    [/Ãkkrh\{krýf Mkqºk/g, 'પારિમાણિક સૂત્ર'],
    [/Ãkkrh\{krýf/g, 'પારિમાણિક'],
    [/ÃkíkLk Ãkk\{u Au/g, 'પતન પામે છે'],
    [/ÃkíkLk/g, 'પતન'],
    [/«ðuøk þwt nþu \?/g, 'પ્રવેગ શું હશે ?'],
    [/«ðuøk/g, 'પ્રવેગ'],
    [/rðãwík¼khku/g, 'વિદ્યુતભારો'],
    [/rðãwík¼khLkwt/g, 'વિદ્યુતભારનું'],
    [/rðãwík¼kh/g, 'વિદ્યુતભાર'],
    [/®çkËwðíkT/g, 'બિંદુવત'],
    [/\{n¥k{ nþu \?/g, 'મહત્તમ હશે ?'],
    [/\{n¥k{/g, 'મહત્તમ'],
    [/rð\[kh fhku/g, 'વિચાર કરો'],
    [/VT÷õMk/g, 'ફ્લક્સ'],
    [/þqLÞ/g, 'શૂન્ય'],
    [/zkÞÃkku÷Lku/g, 'ડાયપોલને'],
    [/zkÞÃkku÷/g, 'ડાયપોલ'],
    [/s\{ýe íkhV/g, 'જમણી તરફ'],
    [/zkçke íkhV/g, 'ડાબી તરફ'],
    [/WÃkh íkhV/g, 'ઉપર તરફ'],
    [/fw÷tçkeÞ çk¤/g, 'કુલંબીય બળ'],
    [/fw÷tçkeÞ/g, 'કુલંબીય'],
    [/økkuXððk\{kt ykÔÞk Au/g, 'ગોઠવવામાં આવ્યા છે'],
    [/økkuXððk\{kt ykÔÞk/g, 'ગોઠવવામાં આવ્યા'],
    [/Mk\{«\{ký\{kt nþu/g, 'સમપ્રમાણમાં હશે'],
    [/Mk\{«\{ký\{kt/g, 'સમપ્રમાણમાં'],
    [/÷xfkðu÷ Au/g, 'લટકાવેલ છે'],
    [/÷xfkðu÷/g, 'લટકાવેલ'],
    [/Ãk\]c/g, 'પૃષ્ઠ'],
    [/½Lkíkk/g, 'ઘનતા'],
    [/yk÷u¾ Au/g, 'આલેખ છે'],
    [/yk÷u¾/g, 'આલેખ'],
    [/ðknf/g, 'વાહક'],
    [/Lk¬h økku¤ku/g, 'નક્કર ગોળો'],
    [/Lk¬h ½Lk/g, 'નક્કર ઘન'],
    [/Lk¬h/g, 'નક્કર'],
    [/íkýkðçk¤ fux÷wt Úkþu \?/g, 'તણાવબળ કેટલું થશે ?'],
    [/íkýkðçk¤/g, 'તણાવબળ'],
    [/Úkþu \?/g, 'થશે ?'],
    [/Úkþu/g, 'થશે'],

    // Physics specific phrases
    [/MkrËþku Au/g, 'સદિશો છે'],
    [/MkrËþku/g, 'સદિશો'],
    [/MkrËþ/g, 'સદિશ'],
    [/X-yûk Ãkh/g, 'X-અક્ષ પર'],
    [/Y-yûk Ãkh/g, 'Y-અક્ષ પર'],
    [/X- yûk Ãkh/g, 'X-અક્ષ પર'],
    [/Y- yûk Ãkh/g, 'Y-અક્ષ પર'],
    [/X- yûk/g, 'X-અક્ષ'],
    [/Y- yûk/g, 'Y-અક્ષ'],
    [/X– yûk/g, 'X-અક્ષ'],
    [/Y– yûk/g, 'Y-અક્ષ'],
    [/ÃkhLkku/g, 'પરનો'],
    [/Ãkh/g, 'પર'],
    [/…h/g, 'પર'],
    [/Lkku/g, 'નો'],
    [/Lkk/g, 'ના'],
    [/‚u™wk/g, 'તેનું'],
    [/‚u/g, 'તે'],
    [/køkúk\{/g, 'ાગ્રામ'],
    [/Lkku ½xf fÞku Au \?/g, 'નો ઘટક કયો છે ?'],
    [/Lkku ½xf fÞku Au/g, 'નો ઘટક કયો છે'],
    [/½xf/g, 'ઘટક'],
    [/fÞku Au \?/g, 'કયો છે ?'],
    [/fÞku Au/g, 'કયો છે'],
    [/fÞwt/g, 'કયું'],
    [/fE/g, 'કઈ'],
    [/fÞku/g, 'કયો'],
    [/Lku ÷tçk fÞku Au \?/g, 'ને લંબ કયો છે ?'],
    [/Lku ÷tçk/g, 'ને લંબ'],
    [/÷tçk/g, 'લંબ'],
    [/«ûkuÃk/g, 'પ્રક્ષેપ'],
    [/ykf\]rík\{kt Ëþkoðu÷ zkÞkøkúk\{ ÃkhÚke/g, 'આકૃતિમાં દર્શાવેલ ડાયાગ્રામ પરથી'],
    [/ykf\]rík\{kt/g, 'આકૃતિમાં'],
    [/ykf\]rík/g, 'આકૃતિ'],
    [/Ëþkoðu÷/g, 'દર્શાવેલ'],
    [/zkÞkøkúk\{/g, 'ડાયાગ્રામ'],
    [/ÃkhÚke/g, 'પરથી'],
    [/þkuÄku/g, 'શોધો'],
    [/ynª/g, 'અહીં'],
    [/ºký/g, 'ત્રણ'],
    [/Mk\{ík÷eÞ/g, 'સમતલીય'],
    [/çkLkkðu Au/g, 'બનાવે છે'],
    [/ÚkkÞ/g, 'થાય'],
    [/çku çk¤kuLkwt/g, 'બે બળોનું'],
    [/Ãkrhýk\{eçk¤/g, 'પરિણામીબળ'],
    [/Ãkrhýk\{e/g, 'પરિણામી'],
    [/ykÃku÷kt/g, 'આપેલાં'],
    [/ykÃku÷/g, 'આપેલ'],
    [/ykÃkðk\{kt ykðu Au/g, 'આપવામાં આવે છે'],
    [/ðå\[uLkku ¾qýku/g, 'વચ્ચેનો ખૂણો'],
    [/ðå\[uLkku/g, 'વચ્ચેનો'],
    [/¾qýku/g, 'ખૂણો'],
    [/íku\{s/g, 'તેમજ'],
    [/ðzu/g, 'વડે'],
    [/MkkÚku/g, 'સાથે'],
    [/h\[kÞu÷/g, 'રચાયેલ'],
    [/h\[kÞu÷ku/g, 'રચાયેલો'],
    [/yuf ÃkËkÚko fýLkwt MÚkkLk/g, 'એક પદાર્થ કણનું સ્થાન'],
    [/yuf ÃkËkÚko/g, 'એક પદાર્થ'],
    [/yuf 5ËkÚko/g, 'એક પદાર્થ'],
    [/fýLkwt/g, 'કણનું'],
    [/fýLkku/g, 'કણનો'],
    [/MÚkkLk/g, 'સ્થાન'],
    [/Úke çkË÷kE/g, 'થી બદલાઈ'],
    [/çkË÷kE/g, 'બદલાઈ'],
    [/íkuLkku/g, 'તેનો'],
    [/íkuLke/g, 'તેની'],
    [/íkuLkk/g, 'તેના'],
    [/Mkhuhkþ ðuøk/g, 'સરેરાશ વેગ'],
    [/Mkhuhkþ/g, 'સરેરાશ'],
    [/ðuøk/g, 'વેગ'],
    [/yuf ðMíkwyu/g, 'એક વસ્તુએ'],
    [/ðMíkw/g, 'વસ્તુ'],
    [/Þk\{kûkkuLke/g, 'યામાક્ષોની'],
    [/rËþk\{kt/g, 'દિશામાં'],
    [/fkÃku÷k ytíkhku/g, 'કાપેલા અંતરો'],
    [/fkÃku÷/g, 'કાપેલ'],
    [/ytíkhku/g, 'અંતરો'],
    [/«khtr¼f/g, 'પ્રારંભિક'],
    [/yuf\{/g, 'એકમ'],
    [/XY-Mk\{ík÷\{kt/g, 'XY-સમતલમાં'],
    [/Mk\{ík÷\{kt/g, 'સમતલમાં'],
    [/Mk\{Þu/g, 'સમયે'],
    [/ðuøkLkwt/g, 'વેગનું'],
    [/\{qÕÞ/g, 'મૂલ્ય'],
    [/fux÷wt \?/g, 'કેટલું ?'],
    [/fux÷wt/g, 'કેટલું'],
    [/çku/g, 'બે'],
    [/Au/g, 'છે'],
  ];

  for (const [re, rep] of phrases) {
    s = s.replace(re, rep);
  }

  // Math & Physics symbols
  s = s.replace(/i\s*Ù/g, 'î');
  s = s.replace(/\^\s*i/g, 'î');
  s = s.replace(/j\s*Ù/g, 'ĵ');
  s = s.replace(/\^\s*j/g, 'ĵ');
  s = s.replace(/k\s*Ù/g, 'k̂');
  s = s.replace(/\^\s*k/g, 'k̂');
  s = s.replace(/®/g, '⃗');
  s = s.replace(/cosq/g, 'cos θ');
  s = s.replace(/sinq/g, 'sin θ');
  s = s.replace(/tanq/g, 'tan θ');
  s = s.replace(/º/g, '≡');
  s = s.replace(/¾¾+ ®/g, ' ——→ ');
  s = s.replace(/¾¾+/g, '——');
  s = s.replace(/\bÎ\s*R\b/g, '∈ ℝ');
  s = s.replace(/æ\s*ö/g, '');
  s = s.replace(/è\s*ø/g, '');
  s = s.replace(/ç\s*÷/g, '');
  s = s.replace(/[æçè]/g, '(');
  s = s.replace(/[ö÷ø]/g, ')');
  s = s.replace(/é/g, '[');
  s = s.replace(/ù/g, ']');
  s = s.replace(/ê/g, '[');
  s = s.replace(/ë/g, ']');
  s = s.replace(/\bl\b/g, 'λ');

  // Fractions with pi: 3\s*p\s*4 -> 3π/4
  s = s.replace(/3\s*p\s*4/g, '3π/4');
  s = s.replace(/p\s*4/g, 'π/4');
  s = s.replace(/p\s*3/g, 'π/3');
  s = s.replace(/p\s*2/g, 'π/2');
  s = s.replace(/\bp\b/g, 'π');

  // Clean multiple spaces
  s = s.replace(/[ \t]+/g, ' ').trim();
  return s;
}

/**
 * Detects whether a PDF text stream is generated by Quantum Paper or encoded in Gopika / Saral font
 */
function isQuantumPaperOrGopika(text) {
  if (!text || typeof text !== 'string') return false;
  return (
    /Quantum\s*Paper/i.test(text) ||
    /Universal_QueId/i.test(text) ||
    /Section\s*\[\s*[A-Z]\s*\]\s*:\s*\d+\s*Marks/i.test(text) ||
    /•\s*Lke\[u\s*ykÃku÷k/i.test(text) ||
    /MkrËþku|zkÞkøkúk\{|ykf\]rík\{kt|Ãkrhýk\{e/i.test(text) ||
    /Q„\{®ƒŒw|…Ëth|hu¾t|Ë\{tk‚h/i.test(text)
  );
}

/**
 * Automatically trims white padding from a cropped diagram or chemical structure canvas
 */
function autoTrimCanvas(canvas) {
  try {
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    let darkPixelCount = 0;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        if (r < 220 || g < 220 || b < 220) {
          darkPixelCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (darkPixelCount < 50) return null;
    const pad = 10;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(canvas.width, maxX + pad);
    maxY = Math.min(canvas.height, maxY + pad);
    const w = maxX - minX;
    const h = maxY - minY;
    if (w <= 15 || h <= 15) return null;

    let createCanvas;
    try {
      createCanvas = require('@napi-rs/canvas').createCanvas;
    } catch (e) {
      return null;
    }

    const trimmedCanvas = createCanvas(w, h);
    const tCtx = trimmedCanvas.getContext('2d');
    tCtx.fillStyle = '#ffffff';
    tCtx.fillRect(0, 0, w, h);
    tCtx.drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
    return trimmedCanvas;
  } catch (err) {
    return null;
  }
}

/**
 * Full coordinate-based parser for Quantum Paper PDFs
 * Extracts questions across multiple pages, 4 options (text or cropped molecular structures),
 * equations, fractions, vector diagrams, and matches 100% of answer keys from the answer key table.
 */
async function parseQuantumPaperPdf(cleanPdfBuf, defaultSubject = 'Physics', marks = 4, negativeMarks = 1) {
  const { PDFParse } = require('pdf-parse');
  const parser = new PDFParse({ data: cleanPdfBuf });
  await parser.load();

  const textRes = await parser.getText();
  const fullText = textRes.text;

  // 1. Extract Answer Key table from any page
  const keyMap = {};
  const qpTableRegex = /(?:^|\n)\s*([0-9]+)\.\s*([A-Da-dઅબકડ1-4૧-૪])(?:\s+(?:Chap|S\d+|QP|[A-Za-z0-9_]+))?/gi;
  let qpM;
  while ((qpM = qpTableRegex.exec(fullText)) !== null) {
    const qNum = parseInt(qpM[1], 10);
    const ans = qpM[2].toUpperCase();
    if (qNum > 0 && qNum <= 250) {
      keyMap[qNum] = gujOptionMap[ans] || ans;
    }
  }

  // 2. High-res page screenshots
  let screenshots = null;
  let createCanvas, loadImage;
  try {
    const canvasMod = require('@napi-rs/canvas');
    createCanvas = canvasMod.createCanvas;
    loadImage = canvasMod.loadImage;
    screenshots = await parser.getScreenshot({ scale: 2, imageBuffer: true });
  } catch (scErr) {
    console.warn('Screenshot generation warning:', scErr.message);
  }

  const numPages = parser.doc.numPages;
  const questionsMap = new Map();
  let lastSeenQ = 0;

  for (let pNum = 1; pNum <= numPages; pNum++) {
    const pageText = (textRes.pages[pNum - 1] && textRes.pages[pNum - 1].text) || '';
    // Skip purely answer key summary pages
    if (/Section\s*\[\s*[A-Z]\s*\]\s*:\s*\d+\s*Mark/i.test(pageText) && !/\(A\)/.test(pageText)) continue;
    if (!/\(A\)/.test(pageText) && !/\([1-4]\)/.test(pageText) && !/•/.test(pageText)) continue;

    const page = await parser.doc.getPage(pNum);
    const tc = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });
    const H = viewport.height;

    let pageImg = null;
    if (screenshots && screenshots.pages && screenshots.pages[pNum - 1] && loadImage) {
      try {
        pageImg = await loadImage(Buffer.from(screenshots.pages[pNum - 1].data));
      } catch (imgErr) {}
    }

    // Detect question numbers on this page
    const qCoords = [];
    tc.items.forEach(it => {
      const m = it.str && it.str.trim().match(/^([0-9]+)\.\s*$/);
      if (m && it.transform[4] < 60) {
        qCoords.push({ qNum: parseInt(m[1], 10), y: Math.round(it.transform[5]) });
      }
    });
    qCoords.sort((a, b) => b.y - a.y);

    const pageOptMarkers = [];
    tc.items.forEach(it => {
      const m = it.str && it.str.trim().match(/\(([A-D])\)/);
      if (m) {
        pageOptMarkers.push({
          letter: m[1],
          x: Math.round(it.transform[4]),
          y: Math.round(it.transform[5]),
          raw: it.str,
        });
      }
    });

    const firstAnchorY = qCoords.length > 0 ? qCoords[0].y : 0;
    const topOptMarkers = pageOptMarkers.filter(o => o.y > firstAnchorY);

    if (topOptMarkers.length >= 2 || (qCoords.length === 0 && pageOptMarkers.length >= 2)) {
      const topQNum = qCoords.length > 0 ? (qCoords[0].qNum - 1) : (lastSeenQ || 1);
      const topAnchorY = Math.max(...pageOptMarkers.map(o => o.y)) + 50;
      qCoords.unshift({ qNum: topQNum, y: Math.min(topAnchorY, Math.round(H - 30)), isImplicit: true });
    }

    for (let i = 0; i < qCoords.length; i++) {
      const cur = qCoords[i];
      const next = qCoords[i + 1];
      const topY = cur.y + 14;
      const botY = next ? next.y + 14 : 0;

      const items = tc.items.filter(it => {
        const y = Math.round(it.transform[5]);
        const x = Math.round(it.transform[4]);
        if (x < 55) return false;
        if (y > topY || y <= botY) return false;
        const str = it.str.trim();
        if (!str || str.includes('Wish You - All The Best') || str.includes('Quantum Paper')) return false;
        if (str.replace(/[ંુે\s]/g, '').length === 0) return false;
        return true;
      });

      // Filter raw candidate markers
      const rawMarkers = [];
      items.forEach(it => {
        const str = it.str.trim();
        const m = str.match(/\(([A-D])\)/);
        if (m) {
          rawMarkers.push({
            letter: m[1],
            x: Math.round(it.transform[4]),
            y: Math.round(it.transform[5]),
            raw: it.str,
          });
        }
      });

      // Pick best A, B, C, D if duplicates exist
      const byLetter = { A: [], B: [], C: [], D: [] };
      rawMarkers.forEach(m => byLetter[m.letter] && byLetter[m.letter].push(m));

      let optMarkers = [];
      if (byLetter.A && byLetter.A.length && byLetter.B && byLetter.B.length && byLetter.C && byLetter.C.length && byLetter.D && byLetter.D.length) {
        if (byLetter.B.length === 1 && byLetter.C.length === 1 && byLetter.D.length === 1 && byLetter.A.length > 1) {
          const avgY = (byLetter.B[0].y + byLetter.C[0].y + byLetter.D[0].y) / 3;
          const bestA = byLetter.A.reduce((prev, curr) => Math.abs(curr.y - avgY) < Math.abs(prev.y - avgY) ? curr : prev, byLetter.A[0]);
          optMarkers = [bestA, byLetter.B[0], byLetter.C[0], byLetter.D[0]];
        } else {
          optMarkers = [byLetter.A[0], byLetter.B[0], byLetter.C[0], byLetter.D[0]];
        }
      } else {
        optMarkers = rawMarkers;
      }

      const isHorizontal = optMarkers.length === 4 && Math.abs(optMarkers[0].y - optMarkers[3].y) <= 8;
      const isVertical = optMarkers.length === 4 && Math.abs(optMarkers[0].x - optMarkers[3].x) <= 15;

      // 2x2 Grid detection
      let isGrid2x2 = false;
      let hasDiagramOnRight = false;
      if (optMarkers.length === 4 && !isHorizontal && !isVertical) {
        const yA = optMarkers[0].y, yB = optMarkers[1].y;
        const yC = optMarkers[2].y, yD = optMarkers[3].y;
        const xA = optMarkers[0].x, xB = optMarkers[1].x;
        const xC = optMarkers[2].x, xD = optMarkers[3].x;
        if (Math.abs(yA - yB) <= 10 && Math.abs(yC - yD) <= 10 && yA > yC + 10 && xB > xA + 50 && xD > xC + 50) {
          isGrid2x2 = true;
          if (optMarkers.every(m => m.x < 260)) {
            hasDiagramOnRight = true;
          }
        }
      }

      let stmtItems = [];
      let optAItems = [], optBItems = [], optCItems = [], optDItems = [];
      let diagCropNeeded = false;
      let diagCropRegion = null;

      if (optMarkers.length < 2) {
        stmtItems = items;
      } else if (isHorizontal) {
        const optY = optMarkers[0].y;
        stmtItems = items.filter(it => Math.round(it.transform[5]) > optY + 12);
        const optBandItems = items.filter(it => Math.round(it.transform[5]) <= optY + 12);

        const xA = optMarkers[0].x - 10;
        const xB = optMarkers[1].x - 10;
        const xC = optMarkers[2].x - 10;
        const xD = optMarkers[3].x - 10;

        optAItems = optBandItems.filter(it => it.transform[4] >= xA && it.transform[4] < xB);
        optBItems = optBandItems.filter(it => it.transform[4] >= xB && it.transform[4] < xC);
        optCItems = optBandItems.filter(it => it.transform[4] >= xC && it.transform[4] < xD);
        optDItems = optBandItems.filter(it => it.transform[4] >= xD);
      } else if (isGrid2x2) {
        const yA = optMarkers[0].y, yB = optMarkers[1].y;
        const yC = optMarkers[2].y, yD = optMarkers[3].y;
        const xA = optMarkers[0].x, xB = optMarkers[1].x;
        const xC = optMarkers[2].x, xD = optMarkers[3].x;

        const optTopY = Math.max(yA, yB) + 12;
        const midY = (Math.min(yA, yB) + Math.max(yC, yD)) / 2;
        const midX = (Math.min(xB, xD) + Math.max(xA, xC)) / 2;
        const optXLimit = hasDiagramOnRight ? 270 : 1000;

        stmtItems = items.filter(it => Math.round(it.transform[5]) > optTopY);
        const optBand = items.filter(it => Math.round(it.transform[5]) <= optTopY && it.transform[4] < optXLimit);

        optAItems = optBand.filter(it => it.transform[5] > midY && it.transform[4] < midX);
        optBItems = optBand.filter(it => it.transform[5] > midY && it.transform[4] >= midX);
        optCItems = optBand.filter(it => it.transform[5] <= midY && it.transform[4] < midX);
        optDItems = optBand.filter(it => it.transform[5] <= midY && it.transform[4] >= midX);

        if (hasDiagramOnRight) {
          diagCropNeeded = true;
          diagCropRegion = { xNorm: 0.45, topNorm: Math.max(0, (H - topY) / H), wNorm: 0.52, hNorm: Math.min(1, (topY - botY) / H) };
        }
      } else if (isVertical) {
        const optXMax = optMarkers[0].x + 75;
        const optTopY = optMarkers[0].y + 10;

        stmtItems = items.filter(it => Math.round(it.transform[5]) > optTopY);

        const yA = optMarkers[0].y;
        const yB = optMarkers[1].y;
        const yC = optMarkers[2].y;
        const yD = optMarkers[3].y;

        const optItems = items.filter(it => it.transform[4] <= optXMax && Math.round(it.transform[5]) <= optTopY);
        optAItems = optItems.filter(it => it.transform[5] > (yA + yB) / 2);
        optBItems = optItems.filter(it => it.transform[5] <= (yA + yB) / 2 && it.transform[5] > (yB + yC) / 2);
        optCItems = optItems.filter(it => it.transform[5] <= (yB + yC) / 2 && it.transform[5] > (yC + yD) / 2);
        optDItems = optItems.filter(it => it.transform[5] <= (yC + yD) / 2);

        diagCropNeeded = true;
        diagCropRegion = { xNorm: 0.38, topNorm: Math.max(0, (H - topY) / H), wNorm: 0.58, hNorm: Math.min(1, (topY - botY) / H) };
      } else {
        const optXCut = 280;
        const optTopY = (optMarkers.length >= 2 ? Math.max(optMarkers[0].y, optMarkers[1].y) : cur.y) + 10;
        stmtItems = items.filter(it => Math.round(it.transform[5]) > optTopY);

        const midY = optMarkers.length >= 4 ? (Math.min(optMarkers[0].y, optMarkers[1].y) + Math.max(optMarkers[2].y, optMarkers[3].y)) / 2 : cur.y - 30;
        const midX = optMarkers.length >= 2 ? (optMarkers[0].x + optMarkers[1].x) / 2 : 130;

        const optItems = items.filter(it => it.transform[4] < optXCut && Math.round(it.transform[5]) <= optTopY);
        optAItems = optItems.filter(it => it.transform[5] > midY && it.transform[4] < midX);
        optBItems = optItems.filter(it => it.transform[5] > midY && it.transform[4] >= midX);
        optCItems = optItems.filter(it => it.transform[5] <= midY && it.transform[4] < midX);
        optDItems = optItems.filter(it => it.transform[5] <= midY && it.transform[4] >= midX);

        diagCropNeeded = true;
        diagCropRegion = { xNorm: 0.45, topNorm: Math.max(0, (H - topY) / H), wNorm: 0.52, hNorm: Math.min(1, (topY - botY) / H) };
      }

      const sortItems = arr => [...arr].sort((a, b) => {
        const dy = Math.round(b.transform[5]) - Math.round(a.transform[5]);
        if (Math.abs(dy) > 3) return dy;
        return a.transform[4] - b.transform[4];
      });

      let stmtRaw = sortItems(stmtItems).map(it => it.str).join(' ');
      let cleanStmt = convertGopikaToUnicode(stmtRaw).replace(/^[0-9]+\.\s*/, '').trim();

      const formatOpt = (arr, optLetter) => {
        const sorted = sortItems(arr);
        let raw = sorted.map(it => it.str).join(' ').trim();
        raw = raw.replace(new RegExp('\\(' + optLetter + '\\)', 'g'), '').trim();
        raw = raw.replace(/\([A-D]\)/g, '').trim();
        raw = raw.replace(/^[YyXx]\s+(?=[A-Za-z0-9\(\[\–\-])/, '').trim();
        raw = raw.replace(/^=\s*0\s*/, '').trim();

        // Check if real stacked fraction (vertical distance >= 8 between distinct Y lines)
        if (sorted.length >= 2) {
          const yVals = sorted.map(it => Math.round(it.transform[5]));
          const minY = Math.min(...yVals);
          const maxY = Math.max(...yVals);
          if (maxY - minY >= 8) {
            const midY = (minY + maxY) / 2;
            const numItems = sorted.filter(it => it.transform[5] > midY && !/\([A-D]\)/.test(it.str));
            const denItems = sorted.filter(it => it.transform[5] <= midY && !/\([A-D]\)/.test(it.str));
            const numStr = numItems.map(it => it.str.trim()).filter(Boolean).join(' ');
            const denStr = denItems.map(it => it.str.trim()).filter(Boolean).join(' ');
            if (numStr && denStr && (/^[\d–\-\+p\s]+$/.test(numStr) || /^[\d–\-\+p\s]+$/.test(denStr))) {
              const cleanNum = convertGopikaToUnicode(numStr);
              const cleanDen = convertGopikaToUnicode(denStr);
              return `${cleanNum}/${cleanDen}`;
            }
          }
        }
        return convertGopikaToUnicode(raw).replace(/\s*=\s*0\s*$/, '').trim();
      };

      let optA = formatOpt(optAItems, 'A');
      let optB = formatOpt(optBItems, 'B');
      let optC = formatOpt(optCItems, 'C');
      let optD = formatOpt(optDItems, 'D');

      // Check for visual chemical structure options
      const hasEmptyVisualOptions = isHorizontal && optMarkers.length === 4 && (
        (!optA.trim() && !optB.trim()) ||
        (!optA.trim() && optD.trim() && !optB.trim())
      );

      if (pageImg && createCanvas && hasEmptyVisualOptions) {
        const optY = optMarkers[0].y;
        const optTopNorm = Math.max(0, (H - (optY + 12)) / H);
        const optBotNorm = Math.min(1, (H - (botY - 4)) / H);
        const optHNorm = Math.max(0.06, optBotNorm - optTopNorm);

        const cols = [
          { x1: 0.10, x2: 0.31 },
          { x1: 0.32, x2: 0.53 },
          { x1: 0.54, x2: 0.75 },
          { x1: 0.76, x2: 0.96 },
        ];

        const croppedOpts = [];
        for (let c = 0; c < 4; c++) {
          const cropX = pageImg.width * cols[c].x1;
          const cropY = pageImg.height * optTopNorm;
          const cropW = pageImg.width * (cols[c].x2 - cols[c].x1);
          const cropH = pageImg.height * optHNorm;

          const optCanvas = createCanvas(cropW, cropH);
          const optCtx = optCanvas.getContext('2d');
          optCtx.drawImage(pageImg, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          const trimmed = autoTrimCanvas(optCanvas);
          if (trimmed) {
            croppedOpts.push(`data:image/png;base64,${trimmed.toBuffer('image/png').toString('base64')}`);
          } else {
            croppedOpts.push(null);
          }
        }

        if (croppedOpts.filter(Boolean).length >= 2) {
          if (croppedOpts[0]) optA = croppedOpts[0];
          if (croppedOpts[1]) optB = croppedOpts[1];
          if (croppedOpts[2]) optC = croppedOpts[2];
          if (croppedOpts[3]) optD = croppedOpts[3];
        }
      }

      // Crop Question Diagram if needed
      let qImageUrl = '';
      if (diagCropNeeded && pageImg && createCanvas && diagCropRegion) {
        const cropX = pageImg.width * diagCropRegion.xNorm;
        const cropY = pageImg.height * diagCropRegion.topNorm;
        const cropW = pageImg.width * diagCropRegion.wNorm;
        const cropH = pageImg.height * diagCropRegion.hNorm;

        const diagCanvas = createCanvas(cropW, cropH);
        const diagCtx = diagCanvas.getContext('2d');
        diagCtx.drawImage(pageImg, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        const trimmed = autoTrimCanvas(diagCanvas);
        if (trimmed) {
          qImageUrl = `data:image/png;base64,${trimmed.toBuffer('image/png').toString('base64')}`;
        }
      }

      const finalQuestionText = cleanStmt || `પ્રશ્ન ${cur.qNum}`;

      const qObj = {
        id: `q_${defaultSubject.toLowerCase()}_${cur.qNum}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        subject: defaultSubject,
        questionNo: cur.qNum,
        marks: Number(marks) || 4,
        negativeMarks: Number(negativeMarks) || 1,
        questionText: finalQuestionText,
        imageUrl: qImageUrl,
        options: [optA || 'Option A', optB || 'Option B', optC || 'Option C', optD || 'Option D'],
        correctAnswer: keyMap[cur.qNum] || 'A',
        explanation: '',
      };

      if (questionsMap.has(cur.qNum)) {
        const prev = questionsMap.get(cur.qNum);
        const prevOptsCount = prev.options.filter(o => o && !o.startsWith('Option ')).length;
        const newOptsCount = qObj.options.filter(o => o && !o.startsWith('Option ')).length;

        if (newOptsCount > prevOptsCount) {
          if (prev.questionText.length > 20 && !prev.questionText.startsWith('પ્રશ્ન ')) {
            if (qObj.questionText.length > 20 && !qObj.questionText.startsWith('પ્રશ્ન ') && !prev.questionText.includes(qObj.questionText.substring(0, 30))) {
              qObj.questionText = `${prev.questionText}\n${qObj.questionText}`;
            } else if (prev.questionText.length >= qObj.questionText.length) {
              qObj.questionText = prev.questionText;
            }
          }
          questionsMap.set(cur.qNum, qObj);
        } else if (qObj.questionText.length > prev.questionText.length && prevOptsCount === 0) {
          questionsMap.set(cur.qNum, qObj);
        }
      } else {
        questionsMap.set(cur.qNum, qObj);
      }

      lastSeenQ = Math.max(lastSeenQ, cur.qNum);
    }
  }

  await parser.destroy().catch(() => {});
  const result = Array.from(questionsMap.values());
  result.sort((a, b) => a.questionNo - b.questionNo);
  return result;
}

module.exports = {
  parseMcqText,
  extractAnswerKeyBlock,
  cleanText,
  repairGujaratiText,
  toAsciiDigits,
  convertGopikaToUnicode,
  isQuantumPaperOrGopika,
  parseQuantumPaperPdf,
  autoTrimCanvas,
  extractEmbeddedJpegsFromBuffer,
  extractImagesFromDocx,
  parseDocxWithImages,
  extractImagesFromPdf,
  associateImagesWithQuestions,
};
