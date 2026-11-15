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

module.exports = {
  parseMcqText,
  extractAnswerKeyBlock,
  cleanText,
  repairGujaratiText,
  toAsciiDigits,
  extractEmbeddedJpegsFromBuffer,
  extractImagesFromDocx,
  parseDocxWithImages,
  extractImagesFromPdf,
  associateImagesWithQuestions,
};
