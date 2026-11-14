const mongoose = require('mongoose');
const Syllabus = require('../models/Syllabus');
const SyllabusProgress = require('../models/SyllabusProgress');
const Faculty = require('../models/Faculty');
const { getStd11ChemistryPart1Chapters } = require('../data/std11ChemistryPart1');
const { getStd11ChemistryPart2Chapters } = require('../data/std11ChemistryPart2');
const { getStd11PhysicsPart1Chapters } = require('../data/std11PhysicsPart1');
const { getStd11BiologyChapters } = require('../data/std11Biology');
const { getStd11MathsChapters } = require('../data/std11Maths');

const ROMAN_VALUES = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
};

function compareSegment(a, b) {
  const sA = String(a || '').trim();
  const sB = String(b || '').trim();
  if (sA === sB) return 0;

  const rA = sA.match(/^\(([ivx]+)\)$/i);
  const rB = sB.match(/^\(([ivx]+)\)$/i);
  if (rA && rB) {
    const vA = ROMAN_VALUES[rA[1].toLowerCase()];
    const vB = ROMAN_VALUES[rB[1].toLowerCase()];
    if (vA && vB && vA !== vB) return vA - vB;
  }

  return sA.localeCompare(sB, undefined, { numeric: true, sensitivity: 'base' });
}

function compareCodes(codeA, codeB) {
  const cleanA = String(codeA || '').replace(/^ઉદા\.\s*/i, '').replace(/^Swadhyay Q\.\s*/i, '').trim();
  const cleanB = String(codeB || '').replace(/^ઉદા\.\s*/i, '').replace(/^Swadhyay Q\.\s*/i, '').trim();
  const partsA = cleanA.split('.');
  const partsB = cleanB.split('.');
  const maxLen = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLen; i++) {
    if (i >= partsA.length) return -1;
    if (i >= partsB.length) return 1;
    const cmp = compareSegment(partsA[i], partsB[i]);
    if (cmp !== 0) return cmp;
  }
  return 0;
}

function normalizeStandardValue(standard) {
  if (!standard) return 'Standard 12';
  const s = String(standard).trim();
  if (s === 'ALL' || s.toUpperCase() === 'ALL') return 'ALL';
  if (s === 'STD_11' || /11/.test(s)) return 'Standard 11';
  if (s === 'STD_12' || /12/.test(s)) return 'Standard 12';
  return s;
}

function normalizeDivisionValue(division) {
  if (!division) return 'Division A';
  const d = String(division).trim();
  if (d.toUpperCase() === 'ALL') return 'ALL';
  if (d.toUpperCase() === 'A') return 'Division A';
  if (d.toUpperCase() === 'B') return 'Division B';
  if (d.toUpperCase() === 'C') return 'Division C';
  if (d.toUpperCase() === 'D') return 'Division D';
  return d;
}

function normalizeBaseSubject(subject = '') {
  const s = String(subject || '').trim().toLowerCase();
  if (!s || s === 'all') return 'ALL';
  if (s.includes('chem')) return 'Chemistry';
  if (s.includes('phys')) return 'Physics';
  if (s.includes('math')) return 'Mathematics';
  if (s.includes('bio')) return 'Biology';
  return String(subject || '').trim();
}

function buildSubjectRegex(subject) {
  const base = normalizeBaseSubject(subject);
  if (base === 'Chemistry') return /^chem/i;
  if (base === 'Physics') return /^phys/i;
  if (base === 'Mathematics') return /^math/i;
  if (base === 'Biology') return /^bio/i;
  return new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

function getLeafKey(item, itemType, fallbackCode = '') {
  if (item && item._id) return String(item._id);
  return `${itemType}:${fallbackCode}`;
}

function toPlainObject(doc) {
  if (!doc) return null;
  if (typeof doc.toObject === 'function') {
    const obj = doc.toObject({ virtuals: true });
    obj.id = obj._id ? String(obj._id) : obj.id;
    return obj;
  }
  return JSON.parse(JSON.stringify(doc));
}

function parseYmdWindow(day = 'all', localDate = null, tzOffsetMinutes = null) {
  const mode = String(day || 'all').trim().toLowerCase();
  if (!mode || mode === 'all') return null;

  const offsetMin = Number.isFinite(Number(tzOffsetMinutes))
    ? Number(tzOffsetMinutes)
    : new Date().getTimezoneOffset();

  let year;
  let month;
  let dateNum;

  if (localDate && /^\d{4}-\d{2}-\d{2}$/.test(String(localDate))) {
    const parts = String(localDate).split('-').map(Number);
    [year, month, dateNum] = parts;
  } else {
    // Shift UTC "now" by -offsetMin minutes to read client's local calendar YYYY-MM-DD
    const shifted = new Date(Date.now() - offsetMin * 60000);
    year = shifted.getUTCFullYear();
    month = shifted.getUTCMonth() + 1;
    dateNum = shifted.getUTCDate();
  }

  // UTC timestamp corresponding to client's local midnight 00:00:00
  const todayStartUtcMs = Date.UTC(year, month - 1, dateNum, 0, 0, 0, 0) + offsetMin * 60000;
  const endUtcMs = todayStartUtcMs + 86400000 - 1;

  if (mode === 'today') {
    return { start: new Date(todayStartUtcMs), end: new Date(endUtcMs) };
  }

  if (mode === 'week' || mode === 'this_week') {
    // Monday-based local week start
    const localDayOfWeek = new Date(Date.UTC(year, month - 1, dateNum)).getUTCDay(); // 0=Sun..6=Sat
    const daysSinceMonday = (localDayOfWeek + 6) % 7;
    const weekStartUtcMs = todayStartUtcMs - daysSinceMonday * 86400000;
    return { start: new Date(weekStartUtcMs), end: new Date(endUtcMs) };
  }

  if (mode === 'month' || mode === 'this_month') {
    const monthStartUtcMs = Date.UTC(year, month - 1, 1, 0, 0, 0, 0) + offsetMin * 60000;
    return { start: new Date(monthStartUtcMs), end: new Date(endUtcMs) };
  }

  return null;
}

class SyllabusService {
  constructor() {
    this._chemEnsurePromise = null;
    this._physEnsurePromise = null;
    this._mathEnsurePromise = null;
    this._bioEnsurePromise = null;
  }

  normalizeStandard(standard) {
    return normalizeStandardValue(standard);
  }

  normalizeDivision(division) {
    return normalizeDivisionValue(division);
  }

  normalizeBaseSubject(subject) {
    return normalizeBaseSubject(subject);
  }

  compareCodes(a, b) {
    return compareCodes(a, b);
  }

  parseDayWindow(day, localDate, tzOffset) {
    return parseYmdWindow(day, localDate, tzOffset);
  }

  /**
   * Default chapters by subject & standard.
   * All leaf statuses start as 'pending' because completion is tracked per faculty in SyllabusProgress.
   */
  getDefaultChapters(standard = 'Standard 12', division = 'Division A', subject = 'Physics') {
    const normStd = normalizeStandardValue(standard);
    const normDiv = normalizeDivisionValue(division);
    const baseSubj = normalizeBaseSubject(subject);

    if (normStd === 'Standard 11' && baseSubj === 'Chemistry') {
      return [
        ...getStd11ChemistryPart1Chapters(normDiv),
        ...getStd11ChemistryPart2Chapters(normDiv),
      ];
    }

    if (normStd === 'Standard 11' && baseSubj === 'Physics') {
      return getStd11PhysicsPart1Chapters(normDiv);
    }

    if (normStd === 'Standard 11' && baseSubj === 'Mathematics') {
      return getStd11MathsChapters(normDiv);
    }

    if (normStd === 'Standard 11' && baseSubj === 'Biology') {
      return getStd11BiologyChapters(normDiv);
    }

    if (baseSubj === 'Physics') {
      return [
        {
          standard: normStd,
          division: normDiv,
          subject: 'Physics',
          chapterNo: 1,
          chapterName: 'Electric Charges and Fields',
          chapterNameGujarati: 'વિદ્યુતભારો અને ક્ષેત્રો',
          order: 1,
          topics: [
            {
              topicNo: '1.1',
              title: 'Electrostatics Basics',
              titleGujarati: 'સ્થિતવિદ્યુતના મૂળભૂત ખ્યાલો',
              status: 'pending',
              subtopics: [
                {
                  subtopicNo: '1.1.1',
                  title: "Coulomb's Law & Superposition Principle",
                  titleGujarati: 'કૂલોમ્બનો નિયમ અને સંપાતપણાનો સિદ્ધાંત',
                  type: 'SUBTOPIC',
                  status: 'pending',
                  subSubtopics: [
                    {
                      subSubtopicNo: '1.1.1.a',
                      title: 'Vector form of Coulomb Force',
                      titleGujarati: 'કૂલોમ્બ બળનું સદિશ સ્વરૂપ',
                      status: 'pending',
                    },
                    {
                      subSubtopicNo: '1.1.1.b',
                      title: 'Dielectric Medium Constant (k)',
                      titleGujarati: 'ડાઇઇલેક્ટ્રિક માધ્યમ અચળાંક',
                      status: 'pending',
                    },
                  ],
                },
                {
                  subtopicNo: '1.1.2',
                  title: 'Electric Dipole in Uniform Field',
                  titleGujarati: 'સમાન ક્ષેત્રમાં વિદ્યુત ડાઇપોલ',
                  type: 'SUBTOPIC',
                  status: 'pending',
                  subSubtopics: [],
                },
              ],
              examples: [
                {
                  exampleNo: 'ઉદા. 1.1',
                  title: 'Calculations on Coulombic forces between two charges',
                  titleGujarati: 'બે બિંદુવત વિદ્યુતભારો વચ્ચે લાગતા કૂલોમ્બ બળની ગણતરી',
                  status: 'pending',
                },
                {
                  exampleNo: 'ઉદા. 1.2',
                  title: 'Electric field due to a point charge distribution',
                  titleGujarati: 'બિંદુવત વિદ્યુતભાર વિતરણને લીધે વિદ્યુતક્ષેત્ર',
                  status: 'pending',
                },
              ],
              swadhyay: [
                {
                  exerciseNo: '1',
                  title: 'What is the force between two small charged spheres having charges of 2x10^-7 C and 3x10^-7 C placed 30 cm apart?',
                  titleGujarati: '30 સેમી અંતરે રહેલા બે વિદ્યુતભારિત ગોળાઓ વચ્ચે લાગતું બળ શોધો',
                  status: 'pending',
                },
                {
                  exerciseNo: '2',
                  title: 'The electrostatic force on a small sphere of charge 0.4 uC due to another small sphere of charge -0.8 uC in air is 0.2 N.',
                  titleGujarati: '0.4 uC વિદ્યુતભાર ધરાવતા ગોળા પર -0.8 uC વિદ્યુતભારને લીધે લાગતું બળ',
                  status: 'pending',
                },
                {
                  exerciseNo: '3',
                  title: 'Check that the ratio k*e^2 / G*m_e*m_p is dimensionless.',
                  titleGujarati: 'ચકાસો કે k*e^2 / G*m_e*m_p ગુણોત્તર પરિમાણરહિત છે',
                  status: 'pending',
                },
              ],
            },
            {
              topicNo: '1.2',
              title: 'Electric Flux & Gauss Theorem',
              titleGujarati: 'વિદ્યુત ફ્લક્સ અને ગોસનો પ્રમેય',
              status: 'pending',
              subtopics: [
                {
                  subtopicNo: '1.2.1',
                  title: 'Definition of Flux & Closed Surface Integration',
                  titleGujarati: 'ફ્લક્સની વ્યાખ્યા અને બંધ પૃષ્ઠ સંકલન',
                  type: 'SUBTOPIC',
                  status: 'pending',
                  subSubtopics: [],
                },
                {
                  subtopicNo: '1.2.2',
                  title: 'Applications: Infinitely Long Wire and Sheet',
                  titleGujarati: 'ગોસના નિયમના ઉપયોગો: અનંત લંબાઈનો તાર અને સમતલ',
                  type: 'SUBTOPIC',
                  status: 'pending',
                  subSubtopics: [],
                },
              ],
              examples: [
                {
                  exampleNo: 'ઉદા. 1.3',
                  title: 'Flux through a cubical box enclosing charge',
                  titleGujarati: 'ઘન પેટીમાંથી પસાર થતું વિદ્યુત ફ્લક્સ',
                  status: 'pending',
                },
              ],
              swadhyay: [
                {
                  exerciseNo: '4',
                  title: 'A point charge of 2.0 uC is at the centre of a cubic Gaussian surface of 9.0 cm edge.',
                  titleGujarati: 'સમઘન ગોસિયન સપાટીના કેન્દ્ર પર મૂકેલા વિદ્યુતભારનું ફ્લક્સ',
                  status: 'pending',
                },
              ],
            },
          ],
        },
        {
          standard: normStd,
          division: normDiv,
          subject: 'Physics',
          chapterNo: 2,
          chapterName: 'Electrostatic Potential and Capacitance',
          chapterNameGujarati: 'સ્થિત વિદ્યુતસ્થિતિમાન અને કેપેસિટન્સ',
          order: 2,
          topics: [
            {
              topicNo: '2.1',
              title: 'Electric Potential & Equipotential Surfaces',
              titleGujarati: 'વિદ્યુતસ્થિતિમાન અને સમસ્થિતિમાન પૃષ્ઠો',
              status: 'pending',
              subtopics: [
                {
                  subtopicNo: '2.1.1',
                  title: 'Potential due to a Point Charge and System of Charges',
                  titleGujarati: 'બિંદુવત વિદ્યુતભાર અને તંત્રને કારણે સ્થિતિમાન',
                  type: 'SUBTOPIC',
                  status: 'pending',
                  subSubtopics: [],
                },
              ],
              examples: [
                {
                  exampleNo: 'ઉદા. 2.1',
                  title: 'Work done in bringing charge from infinity to point',
                  titleGujarati: 'અનંત અંતરેથી વિદ્યુતભાર લાવવા માટે થતું કાર્ય',
                  status: 'pending',
                },
              ],
              swadhyay: [
                {
                  exerciseNo: '1',
                  title: 'Two charges 5x10^-8 C and -3x10^-8 C are located 16 cm apart.',
                  titleGujarati: '16 સેમી અંતરે રહેલા બે વિદ્યુતભારો વચ્ચે શૂન્ય સ્થિતિમાનનું બિંદુ',
                  status: 'pending',
                },
              ],
            },
          ],
        },
      ];
    }

    return [];
  }

  /**
   * Build a quick lookup map of (itemType, itemCode) -> subdocument _id string on a keeper chapter
   * so SyllabusProgress records migrated from duplicate chapter docs keep valid itemKeys.
   */
  _buildChapterSubdocKeyMap(chapterDoc) {
    const map = new Map();
    for (const t of chapterDoc.topics || []) {
      if (t._id) map.set(`TOPIC::${t.topicNo}`, String(t._id));
      for (const st of t.subtopics || []) {
        if (st._id) map.set(`SUBTOPIC::${st.subtopicNo}`, String(st._id));
        for (const sst of st.subSubtopics || []) {
          if (sst._id) map.set(`SUBSUBTOPIC::${sst.subSubtopicNo}`, String(sst._id));
        }
      }
      for (const ex of t.examples || []) {
        if (ex._id) map.set(`EXAMPLE::${ex.exampleNo}`, String(ex._id));
      }
      for (const sw of t.swadhyay || []) {
        if (sw._id) map.set(`SWADHYAY::${sw.exerciseNo}`, String(sw._id));
      }
    }
    for (const ex of chapterDoc.examples || []) {
      if (ex._id) map.set(`EXAMPLE::${ex.exampleNo}`, String(ex._id));
    }
    for (const sw of chapterDoc.swadhyay || []) {
      if (sw._id) map.set(`SWADHYAY::${sw.exerciseNo}`, String(sw._id));
    }
    return map;
  }

  /**
   * Single-flight mutex ensure & deduplicate Standard 11 Chemistry (Part 1: Ch 1-6, Part 2: Ch 7-9)
   * across Division A & Division B under canonical subject 'Chemistry'
   * (shared across Chemistry (Board), Chemistry (JEE), Chemistry (NEET), and Chemistry).
   */
  async ensureStd11ChemCurriculum(divisions = ['Division A', 'Division B']) {
    const targetDivisions = Array.from(
      new Set(['Division A', 'Division B', ...(Array.isArray(divisions) ? divisions : [divisions])].filter(Boolean))
    );
    if (!this._chemEnsurePromise) {
      this._chemEnsurePromise = this._runEnsureStd11ChemCurriculum(targetDivisions).finally(() => {
        this._chemEnsurePromise = null;
      });
    }
    return this._chemEnsurePromise;
  }

  async ensureStd11ChemPart2(divisions = ['Division A', 'Division B']) {
    return this.ensureStd11ChemCurriculum(divisions);
  }

  async _runEnsureStd11ChemCurriculum(divisions = ['Division A', 'Division B']) {
    // Remove accidental Physics placeholder chapters previously seeded under Chemistry in earlier sessions
    await Syllabus.deleteMany({
      standard: 'Standard 11',
      subject: /^chem/i,
      $or: [
        { chapterNo: { $in: [1, 2] }, chapterName: { $in: ['Electric Charges and Fields', 'Electrostatic Potential and Capacitance'] } },
        { chapterName: /gravitation/i },
      ],
    });

    for (const div of divisions) {
      const existing = await Syllabus.find({
        standard: 'Standard 11',
        division: div,
        subject: /^chem/i,
      }).sort({ createdAt: 1, _id: 1 });

      // Deduplicate any chapterNo that was inserted multiple times (e.g. redundant Part-2 Ch 7, 8, 9 docs)
      const byChapterNo = new Map();
      for (const doc of existing) {
        const chNo = Number(doc.chapterNo);
        if (!byChapterNo.has(chNo)) byChapterNo.set(chNo, []);
        byChapterNo.get(chNo).push(doc);
      }

      const existingNos = new Set();

      for (const [chNo, docs] of byChapterNo.entries()) {
        let keeper = docs[0];

        if (docs.length > 1) {
          const allIds = docs.map((d) => d._id);
          const progDocs = await SyllabusProgress.find({ chapterId: { $in: allIds } });
          const progCounts = new Map();
          for (const p of progDocs) {
            const k = String(p.chapterId);
            progCounts.set(k, (progCounts.get(k) || 0) + 1);
          }

          // Prefer doc with most faculty progress, then exact canonical subject 'Chemistry', then earliest created
          docs.sort((a, b) => {
            const ca = progCounts.get(String(a._id)) || 0;
            const cb = progCounts.get(String(b._id)) || 0;
            if (cb !== ca) return cb - ca;
            const sa = a.subject === 'Chemistry' ? 1 : 0;
            const sb = b.subject === 'Chemistry' ? 1 : 0;
            if (sb !== sa) return sb - sa;
            return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
          });

          keeper = docs[0];
          const redundant = docs.slice(1);
          const keeperKeyMap = this._buildChapterSubdocKeyMap(keeper);

          for (const dup of redundant) {
            const dupProgs = progDocs.filter((p) => String(p.chapterId) === String(dup._id));
            for (const p of dupProgs) {
              const mappedKey = keeperKeyMap.get(`${p.itemType}::${p.itemCode}`) || p.itemKey;
              const conflict = await SyllabusProgress.findOne({
                facultyId: p.facultyId,
                chapterId: keeper._id,
                itemType: p.itemType,
                itemKey: mappedKey,
              });
              if (conflict) {
                await SyllabusProgress.deleteOne({ _id: p._id });
              } else {
                p.chapterId = keeper._id;
                p.itemKey = mappedKey;
                p.subject = 'Chemistry';
                await p.save();
              }
            }
            await Syllabus.deleteOne({ _id: dup._id });
          }
        }

        if (keeper.subject !== 'Chemistry' || Number(keeper.order) !== chNo) {
          keeper.subject = 'Chemistry';
          keeper.order = chNo;
          await keeper.save();
        }

        const allTemplates = [
          ...getStd11ChemistryPart1Chapters(div),
          ...getStd11ChemistryPart2Chapters(div),
        ];
        const template = allTemplates.find((c) => c.chapterNo === chNo);
        if (template) {
          const hasImageInTemplate = (template.examples || []).some((e) => e.imageUrl) || (template.swadhyay || []).some((s) => s.imageUrl);
          const hasImageInKeeper = (keeper.examples || []).some((e) => e.imageUrl) || (keeper.swadhyay || []).some((s) => s.imageUrl);
          const countDiff = (template.examples || []).length !== (keeper.examples || []).length;
          const needsUpdate =
            !keeper.chapterNameGujarati ||
            (hasImageInTemplate && !hasImageInKeeper) ||
            countDiff;

          if (needsUpdate) {
            keeper.chapterName = template.chapterName;
            keeper.chapterNameGujarati = template.chapterNameGujarati;
            keeper.topics = template.topics;
            keeper.examples = template.examples;
            keeper.swadhyay = template.swadhyay;
            await keeper.save();
          }
        }

        existingNos.add(chNo);
      }

      const templates = [
        ...getStd11ChemistryPart1Chapters(div),
        ...getStd11ChemistryPart2Chapters(div),
      ];
      const toInsert = templates.filter((ch) => !existingNos.has(Number(ch.chapterNo)));
      if (toInsert.length > 0) {
        await Syllabus.insertMany(toInsert);
      }
    }
  }

  /**
   * Single-flight mutex ensure & deduplicate Standard 11 Physics (Part 1: Ch 1-7)
   * across Division A & Division B under canonical subject 'Physics'
   * (shared across Physics (Board), Physics (JEE), Physics (NEET), and Physics faculty).
   */
  async ensureStd11PhysicsCurriculum(divisions = ['Division A', 'Division B']) {
    const targetDivisions = Array.from(
      new Set(['Division A', 'Division B', ...(Array.isArray(divisions) ? divisions : [divisions])].filter(Boolean))
    );
    if (!this._physEnsurePromise) {
      this._physEnsurePromise = this._runEnsureStd11PhysicsCurriculum(targetDivisions).finally(() => {
        this._physEnsurePromise = null;
      });
    }
    return this._physEnsurePromise;
  }

  async _runEnsureStd11PhysicsCurriculum(divisions = ['Division A', 'Division B']) {
    for (const div of divisions) {
      const existing = await Syllabus.find({
        standard: 'Standard 11',
        division: div,
        subject: /^phys/i,
      }).sort({ createdAt: 1, _id: 1 });

      const byChapterNo = new Map();
      for (const doc of existing) {
        const chNo = Number(doc.chapterNo);
        if (!byChapterNo.has(chNo)) byChapterNo.set(chNo, []);
        byChapterNo.get(chNo).push(doc);
      }

      const existingNos = new Set();

      for (const [chNo, docs] of byChapterNo.entries()) {
        let keeper = docs[0];

        if (docs.length > 1) {
          const allIds = docs.map((d) => d._id);
          const progDocs = await SyllabusProgress.find({ chapterId: { $in: allIds } });
          const progCounts = new Map();
          for (const p of progDocs) {
            const k = String(p.chapterId);
            progCounts.set(k, (progCounts.get(k) || 0) + 1);
          }

          docs.sort((a, b) => {
            const cA = progCounts.get(String(a._id)) || 0;
            const cB = progCounts.get(String(b._id)) || 0;
            if (cB !== cA) return cB - cA;
            const tA = (a.topics || []).length + (a.examples || []).length + (a.swadhyay || []).length;
            const tB = (b.topics || []).length + (b.examples || []).length + (b.swadhyay || []).length;
            return tB - tA;
          });
          keeper = docs[0];
          const redundant = docs.slice(1);
          const redundantIds = redundant.map((d) => d._id);

          const keeperSubdocMap = this._buildChapterSubdocKeyMap(keeper);
          const redundantProgs = await SyllabusProgress.find({ chapterId: { $in: redundantIds } });

          for (const prog of redundantProgs) {
            const lookupKey = `${prog.itemType}::${prog.itemCode}`;
            const keeperSubdocId = keeperSubdocMap.get(lookupKey);
            const targetItemKey = keeperSubdocId || prog.itemKey;

            const duplicateProg = await SyllabusProgress.findOne({
              facultyId: prog.facultyId,
              chapterId: keeper._id,
              itemKey: targetItemKey,
            });

            if (!duplicateProg) {
              prog.chapterId = keeper._id;
              prog.chapterNo = keeper.chapterNo;
              prog.chapterName = keeper.chapterName;
              prog.itemKey = targetItemKey;
              await prog.save();
            } else {
              await SyllabusProgress.deleteOne({ _id: prog._id });
            }
          }

          await Syllabus.deleteMany({ _id: { $in: redundantIds } });
        }

        const template = getStd11PhysicsPart1Chapters(div).find((c) => c.chapterNo === chNo);
        if (template) {
          const hasImageInTemplate = (template.examples || []).some((e) => e.imageUrl) || (template.swadhyay || []).some((s) => s.imageUrl);
          const hasImageInKeeper = (keeper.examples || []).some((e) => e.imageUrl) || (keeper.swadhyay || []).some((s) => s.imageUrl);
          const needsUpdate =
            !keeper.chapterNameGujarati ||
            (keeper.topics || []).length !== template.topics.length ||
            (hasImageInTemplate && !hasImageInKeeper);

          if (needsUpdate) {
            keeper.chapterName = template.chapterName;
            keeper.chapterNameGujarati = template.chapterNameGujarati;
            keeper.topics = template.topics;
            keeper.examples = template.examples;
            keeper.swadhyay = template.swadhyay;
            await keeper.save();
          }
        }

        existingNos.add(chNo);
      }

      const templates = getStd11PhysicsPart1Chapters(div);
      const toInsert = templates.filter((ch) => !existingNos.has(Number(ch.chapterNo)));
      if (toInsert.length > 0) {
        await Syllabus.insertMany(toInsert);
      }
    }
  }

  /**
   * Single-flight mutex ensure & deduplicate Standard 11 Mathematics (Part 1 & 2: Ch 1-14)
   * across Division A & Division B under canonical subject 'Mathematics'.
   */
  async ensureStd11MathsCurriculum(divisions = ['Division A', 'Division B']) {
    const targetDivisions = Array.from(
      new Set(['Division A', 'Division B', ...(Array.isArray(divisions) ? divisions : [divisions])].filter(Boolean))
    );
    if (!this._mathEnsurePromise) {
      this._mathEnsurePromise = this._runEnsureStd11MathsCurriculum(targetDivisions).finally(() => {
        this._mathEnsurePromise = null;
      });
    }
    return this._mathEnsurePromise;
  }

  async _runEnsureStd11MathsCurriculum(divisions = ['Division A', 'Division B']) {
    for (const div of divisions) {
      const existing = await Syllabus.find({
        standard: 'Standard 11',
        division: div,
        subject: /^math/i,
      }).sort({ createdAt: 1, _id: 1 });

      const byChapterNo = new Map();
      for (const doc of existing) {
        const chNo = Number(doc.chapterNo);
        if (!byChapterNo.has(chNo)) byChapterNo.set(chNo, []);
        byChapterNo.get(chNo).push(doc);
      }

      const existingNos = new Set();

      for (const [chNo, docs] of byChapterNo.entries()) {
        let keeper = docs[0];

        if (docs.length > 1) {
          const allIds = docs.map((d) => d._id);
          const progDocs = await SyllabusProgress.find({ chapterId: { $in: allIds } });
          const progCounts = new Map();
          for (const p of progDocs) {
            const k = String(p.chapterId);
            progCounts.set(k, (progCounts.get(k) || 0) + 1);
          }

          docs.sort((a, b) => {
            const cA = progCounts.get(String(a._id)) || 0;
            const cB = progCounts.get(String(b._id)) || 0;
            if (cB !== cA) return cB - cA;
            const tA = (a.topics || []).length + (a.examples || []).length + (a.swadhyay || []).length;
            const tB = (b.topics || []).length + (b.examples || []).length + (b.swadhyay || []).length;
            return tB - tA;
          });
          keeper = docs[0];
          const redundant = docs.slice(1);
          const redundantIds = redundant.map((d) => d._id);

          const keeperSubdocMap = this._buildChapterSubdocKeyMap(keeper);
          const redundantProgs = await SyllabusProgress.find({ chapterId: { $in: redundantIds } });

          for (const prog of redundantProgs) {
            const lookupKey = `${prog.itemType}::${prog.itemCode}`;
            const keeperSubdocId = keeperSubdocMap.get(lookupKey);
            const targetItemKey = keeperSubdocId || prog.itemKey;

            const duplicateProg = await SyllabusProgress.findOne({
              facultyId: prog.facultyId,
              chapterId: keeper._id,
              itemKey: targetItemKey,
            });

            if (!duplicateProg) {
              prog.chapterId = keeper._id;
              prog.chapterNo = keeper.chapterNo;
              prog.chapterName = keeper.chapterName;
              prog.itemKey = targetItemKey;
              await prog.save();
            } else {
              await SyllabusProgress.deleteOne({ _id: prog._id });
            }
          }

          await Syllabus.deleteMany({ _id: { $in: redundantIds } });
        }

        const template = getStd11MathsChapters(div).find((c) => c.chapterNo === chNo);
        if (template) {
          const hasImageInTemplate = (template.examples || []).some((e) => e.imageUrl) || (template.swadhyay || []).some((s) => s.imageUrl);
          const hasImageInKeeper = (keeper.examples || []).some((e) => e.imageUrl) || (keeper.swadhyay || []).some((s) => s.imageUrl);
          const needsUpdate =
            !keeper.chapterNameGujarati ||
            (keeper.topics || []).length !== template.topics.length ||
            (keeper.examples || []).length !== template.examples.length ||
            (keeper.swadhyay || []).length !== template.swadhyay.length ||
            (hasImageInTemplate && !hasImageInKeeper);

          if (needsUpdate) {
            keeper.chapterName = template.chapterName;
            keeper.chapterNameGujarati = template.chapterNameGujarati;
            keeper.topics = template.topics;
            keeper.examples = template.examples;
            keeper.swadhyay = template.swadhyay;
            await keeper.save();
          }
        }

        existingNos.add(chNo);
      }

      const templates = getStd11MathsChapters(div);
      const toInsert = templates.filter((ch) => !existingNos.has(Number(ch.chapterNo)));
      if (toInsert.length > 0) {
        await Syllabus.insertMany(toInsert);
      }
    }
  }

  /**
   * Single-flight mutex ensure & deduplicate Standard 11 Biology (Part 1 & 2: Ch 1-19)
   * across Division A & Division B under canonical subject 'Biology'.
   */
  async ensureStd11BiologyCurriculum(divisions = ['Division A', 'Division B']) {
    const targetDivisions = Array.from(
      new Set(['Division A', 'Division B', ...(Array.isArray(divisions) ? divisions : [divisions])].filter(Boolean))
    );
    if (!this._bioEnsurePromise) {
      this._bioEnsurePromise = this._runEnsureStd11BiologyCurriculum(targetDivisions).finally(() => {
        this._bioEnsurePromise = null;
      });
    }
    return this._bioEnsurePromise;
  }

  async _runEnsureStd11BiologyCurriculum(divisions = ['Division A', 'Division B']) {
    for (const div of divisions) {
      const existing = await Syllabus.find({
        standard: 'Standard 11',
        division: div,
        subject: /^bio/i,
      }).sort({ createdAt: 1, _id: 1 });

      const byChapterNo = new Map();
      for (const doc of existing) {
        const chNo = Number(doc.chapterNo);
        if (!byChapterNo.has(chNo)) byChapterNo.set(chNo, []);
        byChapterNo.get(chNo).push(doc);
      }

      const existingNos = new Set();

      for (const [chNo, docs] of byChapterNo.entries()) {
        let keeper = docs[0];

        if (docs.length > 1) {
          const allIds = docs.map((d) => d._id);
          const progDocs = await SyllabusProgress.find({ chapterId: { $in: allIds } });
          const progCounts = new Map();
          for (const p of progDocs) {
            const k = String(p.chapterId);
            progCounts.set(k, (progCounts.get(k) || 0) + 1);
          }

          docs.sort((a, b) => {
            const cA = progCounts.get(String(a._id)) || 0;
            const cB = progCounts.get(String(b._id)) || 0;
            if (cB !== cA) return cB - cA;
            const tA = (a.topics || []).length + (a.examples || []).length + (a.swadhyay || []).length;
            const tB = (b.topics || []).length + (b.examples || []).length + (b.swadhyay || []).length;
            return tB - tA;
          });
          keeper = docs[0];
          const redundant = docs.slice(1);
          const redundantIds = redundant.map((d) => d._id);

          const keeperSubdocMap = this._buildChapterSubdocKeyMap(keeper);
          const redundantProgs = await SyllabusProgress.find({ chapterId: { $in: redundantIds } });

          for (const prog of redundantProgs) {
            const lookupKey = `${prog.itemType}::${prog.itemCode}`;
            const keeperSubdocId = keeperSubdocMap.get(lookupKey);
            const targetItemKey = keeperSubdocId || prog.itemKey;

            const duplicateProg = await SyllabusProgress.findOne({
              facultyId: prog.facultyId,
              chapterId: keeper._id,
              itemKey: targetItemKey,
            });

            if (!duplicateProg) {
              prog.chapterId = keeper._id;
              prog.chapterNo = keeper.chapterNo;
              prog.chapterName = keeper.chapterName;
              prog.itemKey = targetItemKey;
              await prog.save();
            } else {
              await SyllabusProgress.deleteOne({ _id: prog._id });
            }
          }

          await Syllabus.deleteMany({ _id: { $in: redundantIds } });
        }

        const template = getStd11BiologyChapters(div).find((c) => c.chapterNo === chNo);
        if (template) {
          const needsUpdate =
            !keeper.chapterNameGujarati ||
            (keeper.topics || []).length !== template.topics.length ||
            (keeper.swadhyay || []).length !== template.swadhyay.length;

          if (needsUpdate) {
            keeper.chapterName = template.chapterName;
            keeper.chapterNameGujarati = template.chapterNameGujarati;
            keeper.topics = template.topics;
            keeper.examples = template.examples;
            keeper.swadhyay = template.swadhyay;
            await keeper.save();
          }
        }

        existingNos.add(chNo);
      }

      const templates = getStd11BiologyChapters(div);
      const toInsert = templates.filter((ch) => !existingNos.has(Number(ch.chapterNo)));
      if (toInsert.length > 0) {
        await Syllabus.insertMany(toInsert);
      }
    }
  }

  /**
   * Pure tree projection: projects Syllabus chapters using an arbitrary list of SyllabusProgress docs.
   * Does NOT read mutable node.status on shared Syllabus docs so multi-faculty isolation is strict.
   */
  projectChapter(chapterInput, progressDocs = [], role = 'faculty') {
    const ch = toPlainObject(chapterInput);
    if (!ch) return null;

    const chId = String(ch._id || ch.id || ch.chapterNo);

    // Index matching progress docs by itemType::itemKey and itemType::CODE::itemCode
    const byKey = new Map();
    const byCode = new Map();

    const addContributor = (map, key, entry) => {
      if (!map.has(key)) map.set(key, []);
      const arr = map.get(key);
      if (!arr.some((x) => x.facultyId === entry.facultyId)) {
        arr.push(entry);
      }
    };

    for (const p of progressDocs) {
      if (String(p.chapterId) !== chId) continue;
      const entry = {
        facultyId: String(p.facultyId),
        facultyName: p.facultyName || 'Faculty',
        facultyEmpCode: p.facultyEmpCode || '',
        facultySubject: p.facultySubject || ch.subject || '',
        completedAt: p.completedAt || new Date(),
      };
      addContributor(byKey, `${p.itemType}::${p.itemKey}`, entry);
      if (p.itemCode) {
        const prefix = p.parentTopicNo ? `${p.itemType}::${p.parentTopicNo}::${p.itemCode}` : `${p.itemType}::${p.itemCode}`;
        addContributor(byCode, prefix, entry);
        addContributor(byCode, `${p.itemType}::*::${p.itemCode}`, entry);
      }
    }

    const isPrincipal = String(role || '').toLowerCase() === 'principal';

    const resolveLeaf = (item, itemType, code, parentTopicNo = '') => {
      const idKey = item && item._id ? `${itemType}::${String(item._id)}` : `${itemType}::${itemType}:${code}`;
      let contributors = byKey.get(idKey);
      if (!contributors || contributors.length === 0) {
        const scopedCodeKey = parentTopicNo ? `${itemType}::${parentTopicNo}::${code}` : `${itemType}::${code}`;
        contributors = byCode.get(scopedCodeKey) || byCode.get(`${itemType}::*::${code}`) || [];
      }
      const sorted = [...contributors].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
      const isDone = sorted.length > 0;
      return {
        status: isDone ? 'done' : 'pending',
        completedAt: isDone ? sorted[0].completedAt : null,
        // Only Principal can see which faculty completed the topic; other faculty only see Finished status
        completedBy: isPrincipal ? sorted : [],
      };
    };

    const mergeContributorArrays = (lists) => {
      const map = new Map();
      for (const list of lists) {
        for (const c of list || []) {
          const prev = map.get(c.facultyId);
          if (!prev || new Date(c.completedAt) > new Date(prev.completedAt)) {
            map.set(c.facultyId, c);
          }
        }
      }
      return Array.from(map.values()).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    };

    const allChContributors = [];

    ch.topics = (ch.topics || []).map((topic) => {
      const t = { ...topic };
      if (Array.isArray(t.subtopics) && t.subtopics.length > 0) {
        t.subtopics = t.subtopics.map((stItem) => {
          const st = { ...stItem };
          if (Array.isArray(st.subSubtopics) && st.subSubtopics.length > 0) {
            st.subSubtopics = st.subSubtopics.map((sstItem) => {
              const res = resolveLeaf(sstItem, 'SUBSUBTOPIC', sstItem.subSubtopicNo, t.topicNo);
              allChContributors.push(res.completedBy);
              return { ...sstItem, ...res };
            });
            st.subSubtopics.sort((a, b) => compareCodes(a.subSubtopicNo, b.subSubtopicNo));

            const stContrib = mergeContributorArrays(st.subSubtopics.map((x) => x.completedBy));
            const allSstDone = st.subSubtopics.every((x) => x.status === 'done');
            st.status = allSstDone ? 'done' : 'pending';
            st.completedBy = stContrib;
            st.completedAt = allSstDone && stContrib[0] ? stContrib[0].completedAt : null;
          } else {
            const res = resolveLeaf(st, 'SUBTOPIC', st.subtopicNo, t.topicNo);
            allChContributors.push(res.completedBy);
            Object.assign(st, res);
          }
          return st;
        });
        t.subtopics.sort((a, b) => compareCodes(a.subtopicNo, b.subtopicNo));

        const tContrib = mergeContributorArrays(t.subtopics.map((x) => x.completedBy));
        const allSubDone = t.subtopics.every((x) => x.status === 'done');
        t.status = allSubDone ? 'done' : 'pending';
        t.completedBy = tContrib;
        t.completedAt = allSubDone && tContrib[0] ? tContrib[0].completedAt : null;
      } else {
        const res = resolveLeaf(t, 'TOPIC', t.topicNo, t.topicNo);
        allChContributors.push(res.completedBy);
        Object.assign(t, res);
      }

      t.examples = (t.examples || []).map((ex) => {
        const res = resolveLeaf(ex, 'EXAMPLE', ex.exampleNo, t.topicNo);
        allChContributors.push(res.completedBy);
        return { ...ex, ...res };
      });
      t.examples.sort((a, b) => compareCodes(a.exampleNo, b.exampleNo));

      t.swadhyay = (t.swadhyay || []).map((sw) => {
        const res = resolveLeaf(sw, 'SWADHYAY', sw.exerciseNo, t.topicNo);
        allChContributors.push(res.completedBy);
        return { ...sw, ...res };
      });
      t.swadhyay.sort((a, b) => compareCodes(a.exerciseNo, b.exerciseNo));

      return t;
    });
    ch.topics.sort((a, b) => compareCodes(a.topicNo, b.topicNo));

    ch.examples = (ch.examples || []).map((ex) => {
      const res = resolveLeaf(ex, 'EXAMPLE', ex.exampleNo, '');
      allChContributors.push(res.completedBy);
      return { ...ex, ...res };
    });
    ch.examples.sort((a, b) => compareCodes(a.exampleNo, b.exampleNo));

    ch.swadhyay = (ch.swadhyay || []).map((sw) => {
      const res = resolveLeaf(sw, 'SWADHYAY', sw.exerciseNo, '');
      allChContributors.push(res.completedBy);
      return { ...sw, ...res };
    });
    ch.swadhyay.sort((a, b) => compareCodes(a.exerciseNo, b.exerciseNo));

    ch.completedBy = mergeContributorArrays(allChContributors);
    return ch;
  }

  /**
   * Collect all trackable target leaf descriptors for any clicked node in a chapter.
   */
  collectTargetLeaves(chapterObj, itemNo, itemType = 'SUBTOPIC', itemId = null, parentTopicNo = null) {
    const matches = (item, noField) => {
      if (itemId && item._id && String(item._id) === String(itemId)) return true;
      return item[noField] === itemNo;
    };

    const leaves = [];

    if (itemType === 'EXAMPLE') {
      for (const ex of chapterObj.examples || []) {
        if (matches(ex, 'exampleNo')) {
          leaves.push({
            itemType: 'EXAMPLE',
            itemKey: getLeafKey(ex, 'EXAMPLE', ex.exampleNo),
            itemCode: ex.exampleNo,
            itemTitle: ex.title,
            itemTitleGujarati: ex.titleGujarati || '',
            parentTopicNo: '',
            parentTopicTitle: 'Chapter Level',
          });
          return leaves;
        }
      }
      for (const t of chapterObj.topics || []) {
        if (parentTopicNo && t.topicNo !== parentTopicNo && !itemId) continue;
        for (const ex of t.examples || []) {
          if (matches(ex, 'exampleNo')) {
            leaves.push({
              itemType: 'EXAMPLE',
              itemKey: getLeafKey(ex, 'EXAMPLE', ex.exampleNo),
              itemCode: ex.exampleNo,
              itemTitle: ex.title,
              itemTitleGujarati: ex.titleGujarati || '',
              parentTopicNo: t.topicNo,
              parentTopicTitle: t.title,
            });
            return leaves;
          }
        }
      }
      return leaves;
    }

    if (itemType === 'SWADHYAY') {
      for (const sw of chapterObj.swadhyay || []) {
        if (matches(sw, 'exerciseNo')) {
          leaves.push({
            itemType: 'SWADHYAY',
            itemKey: getLeafKey(sw, 'SWADHYAY', sw.exerciseNo),
            itemCode: sw.exerciseNo,
            itemTitle: sw.title,
            itemTitleGujarati: sw.titleGujarati || '',
            parentTopicNo: '',
            parentTopicTitle: 'Chapter Level',
          });
          return leaves;
        }
      }
      for (const t of chapterObj.topics || []) {
        if (parentTopicNo && t.topicNo !== parentTopicNo && !itemId) continue;
        for (const sw of t.swadhyay || []) {
          if (matches(sw, 'exerciseNo')) {
            leaves.push({
              itemType: 'SWADHYAY',
              itemKey: getLeafKey(sw, 'SWADHYAY', sw.exerciseNo),
              itemCode: sw.exerciseNo,
              itemTitle: sw.title,
              itemTitleGujarati: sw.titleGujarati || '',
              parentTopicNo: t.topicNo,
              parentTopicTitle: t.title,
            });
            return leaves;
          }
        }
      }
      return leaves;
    }

    for (const t of chapterObj.topics || []) {
      if (itemType === 'TOPIC' && matches(t, 'topicNo')) {
        if (Array.isArray(t.subtopics) && t.subtopics.length > 0) {
          for (const st of t.subtopics) {
            if (Array.isArray(st.subSubtopics) && st.subSubtopics.length > 0) {
              for (const sst of st.subSubtopics) {
                leaves.push({
                  itemType: 'SUBSUBTOPIC',
                  itemKey: getLeafKey(sst, 'SUBSUBTOPIC', sst.subSubtopicNo),
                  itemCode: sst.subSubtopicNo,
                  itemTitle: sst.title,
                  itemTitleGujarati: sst.titleGujarati || '',
                  parentTopicNo: t.topicNo,
                  parentTopicTitle: st.title,
                });
              }
            } else {
              leaves.push({
                itemType: 'SUBTOPIC',
                itemKey: getLeafKey(st, 'SUBTOPIC', st.subtopicNo),
                itemCode: st.subtopicNo,
                itemTitle: st.title,
                itemTitleGujarati: st.titleGujarati || '',
                parentTopicNo: t.topicNo,
                parentTopicTitle: t.title,
              });
            }
          }
        } else {
          leaves.push({
            itemType: 'TOPIC',
            itemKey: getLeafKey(t, 'TOPIC', t.topicNo),
            itemCode: t.topicNo,
            itemTitle: t.title,
            itemTitleGujarati: t.titleGujarati || '',
            parentTopicNo: t.topicNo,
            parentTopicTitle: t.title,
          });
        }
        return leaves;
      }

      if (itemType === 'SUBTOPIC') {
        for (const st of t.subtopics || []) {
          if (matches(st, 'subtopicNo')) {
            if (Array.isArray(st.subSubtopics) && st.subSubtopics.length > 0) {
              for (const sst of st.subSubtopics) {
                leaves.push({
                  itemType: 'SUBSUBTOPIC',
                  itemKey: getLeafKey(sst, 'SUBSUBTOPIC', sst.subSubtopicNo),
                  itemCode: sst.subSubtopicNo,
                  itemTitle: sst.title,
                  itemTitleGujarati: sst.titleGujarati || '',
                  parentTopicNo: t.topicNo,
                  parentTopicTitle: st.title,
                });
              }
            } else {
              leaves.push({
                itemType: 'SUBTOPIC',
                itemKey: getLeafKey(st, 'SUBTOPIC', st.subtopicNo),
                itemCode: st.subtopicNo,
                itemTitle: st.title,
                itemTitleGujarati: st.titleGujarati || '',
                parentTopicNo: t.topicNo,
                parentTopicTitle: t.title,
              });
            }
            return leaves;
          }
        }
      }

      if (itemType === 'SUBSUBTOPIC') {
        for (const st of t.subtopics || []) {
          for (const sst of st.subSubtopics || []) {
            if (matches(sst, 'subSubtopicNo')) {
              leaves.push({
                itemType: 'SUBSUBTOPIC',
                itemKey: getLeafKey(sst, 'SUBSUBTOPIC', sst.subSubtopicNo),
                itemCode: sst.subSubtopicNo,
                itemTitle: sst.title,
                itemTitleGujarati: sst.titleGujarati || '',
                parentTopicNo: t.topicNo,
                parentTopicTitle: st.title,
              });
              return leaves;
            }
          }
        }
      }
    }

    return leaves;
  }

  /**
   * Fetch all chapters matching filters with strict faculty isolation (when role !== 'principal')
   * or un-isolated union progress (when role === 'principal').
   */
  async getSyllabus(filters = {}) {
    const standard = normalizeStandardValue(filters.standard || 'Standard 12');
    const division = normalizeDivisionValue(filters.division || 'Division A');
    const role = String(filters.role || '').trim().toLowerCase();
    const facultyId = filters.facultyId ? String(filters.facultyId).trim() : '';

    let effectiveSubject = filters.subject || 'Physics';
    if (facultyId && (role === 'faculty' || role === 'subject faculty')) {
      const facDoc = await Faculty.findOne({
        $or: [
          mongoose.Types.ObjectId.isValid(facultyId) ? { _id: facultyId } : null,
          { empCode: facultyId.toUpperCase() },
          { email: facultyId.toLowerCase() },
        ].filter(Boolean),
      });
      if (facDoc && facDoc.role === 'Subject Faculty' && facDoc.subject) {
        effectiveSubject = facDoc.subject;
      }
    }

    const baseSubj = normalizeBaseSubject(effectiveSubject);

    if (standard === 'Standard 11' && baseSubj === 'Chemistry') {
      await this.ensureStd11ChemCurriculum([division]);
    }
    if (standard === 'Standard 11' && baseSubj === 'Physics') {
      await this.ensureStd11PhysicsCurriculum([division]);
    }
    if (standard === 'Standard 11' && baseSubj === 'Mathematics') {
      await this.ensureStd11MathsCurriculum([division]);
    }
    if (standard === 'Standard 11' && baseSubj === 'Biology') {
      await this.ensureStd11BiologyCurriculum([division]);
    }

    const query = {
      standard,
      division,
      subject: buildSubjectRegex(baseSubj),
    };

    let chapters = await Syllabus.find(query).sort({ chapterNo: 1 });

    // Seed default curriculum on first load for empty Physics / Std 11 Chemistry queries
    if (!chapters || chapters.length === 0) {
      const defaults = this.getDefaultChapters(standard, division, baseSubj);
      if (defaults.length > 0) {
        await Syllabus.insertMany(defaults);
        chapters = await Syllabus.find(query).sort({ chapterNo: 1 });
      }
    }

    const chapterIds = chapters.map((c) => c._id);
    if (chapterIds.length === 0) return [];

    let progressDocs = [];
    const pQuery = { chapterId: { $in: chapterIds } };
    if (role === 'principal' && facultyId && facultyId !== 'ALL') {
      pQuery.facultyId = facultyId;
    }
    // Consistent across all faculty: retrieves all completed topics so all faculty see consistent progress
    progressDocs = await SyllabusProgress.find(pQuery);

    return chapters.map((ch) => this.projectChapter(ch, progressDocs, role));
  }

  /**
   * Add a new Chapter (shared master curriculum under canonical base subject)
   */
  async addChapter(data) {
    const standard = normalizeStandardValue(data.standard || 'Standard 12');
    const division = normalizeDivisionValue(data.division || 'Division A');
    const baseSubj = normalizeBaseSubject(data.subject || 'Physics');

    const chapterNo = Number(data.chapterNo);
    const chapterName = (data.chapterName || '').trim();
    const chapterNameGujarati = (data.chapterNameGujarati || '').trim();

    const duplicate = await Syllabus.findOne({
      standard,
      division,
      subject: buildSubjectRegex(baseSubj),
      chapterNo,
    });
    if (duplicate) {
      throw new Error(`Chapter ${chapterNo} already exists for ${standard} ${division} (${baseSubj}).`);
    }

    const newChapter = await Syllabus.create({
      standard,
      division,
      subject: baseSubj,
      chapterNo,
      chapterName,
      chapterNameGujarati,
      order: chapterNo,
      topics: data.topics || [],
    });

    return this.projectChapter(newChapter, []);
  }

  /**
   * Add a new Topic, Subtopic, Sub-subtopic, Example, or Swadhyay into shared master curriculum
   */
  async addTopic(data) {
    const {
      chapterId,
      chapterNo,
      entryType = 'TOPIC',
      parentTopicNo,
      parentSubtopicNo,
      number,
      title,
      titleGujarati = '',
      standard,
      division,
      subject,
      facultyId,
    } = data;

    let chapter = null;
    if (chapterId) {
      chapter = await Syllabus.findById(chapterId);
    } else if (chapterNo) {
      const chQuery = {
        chapterNo: Number(chapterNo),
        subject: buildSubjectRegex(subject || 'Physics'),
      };
      if (standard) chQuery.standard = normalizeStandardValue(standard);
      if (division) chQuery.division = normalizeDivisionValue(division);
      chapter = await Syllabus.findOne(chQuery);
    }

    if (!chapter) {
      throw new Error('Chapter not found to add topic into.');
    }

    if (entryType === 'TOPIC') {
      const topicNo = number || `${chapter.chapterNo}.${chapter.topics.length + 1}`;
      chapter.topics.push({
        topicNo,
        title,
        titleGujarati,
        status: 'pending',
        subtopics: [],
        examples: [],
        swadhyay: [],
      });
      chapter.topics.sort((a, b) => compareCodes(a.topicNo, b.topicNo));
    } else if (entryType === 'SUBTOPIC') {
      const topic = chapter.topics.find((t) => t.topicNo === parentTopicNo);
      if (!topic) {
        throw new Error(`Parent topic ${parentTopicNo} not found.`);
      }
      const subtopicNo = number || `${parentTopicNo}.${topic.subtopics.length + 1}`;
      topic.subtopics.push({
        subtopicNo,
        title,
        titleGujarati,
        type: 'SUBTOPIC',
        status: 'pending',
        subSubtopics: [],
      });
      topic.subtopics.sort((a, b) => compareCodes(a.subtopicNo, b.subtopicNo));
    } else if (entryType === 'EXAMPLE') {
      const topic =
        parentTopicNo && parentTopicNo !== 'CHAPTER'
          ? chapter.topics.find((t) => t.topicNo === parentTopicNo)
          : null;
      const totalExamples =
        (chapter.examples?.length || 0) +
        chapter.topics.reduce((acc, t) => acc + (t.examples?.length || 0), 0);
      const exampleNo = number || `ઉદા. ${chapter.chapterNo}.${totalExamples + 1}`;

      if (topic) {
        topic.examples.push({ exampleNo, title, titleGujarati, status: 'pending' });
        topic.examples.sort((a, b) => compareCodes(a.exampleNo, b.exampleNo));
      } else {
        if (!chapter.examples) chapter.examples = [];
        chapter.examples.push({ exampleNo, title, titleGujarati, status: 'pending' });
        chapter.examples.sort((a, b) => compareCodes(a.exampleNo, b.exampleNo));
      }
    } else if (entryType === 'SWADHYAY') {
      const topic =
        parentTopicNo && parentTopicNo !== 'CHAPTER'
          ? chapter.topics.find((t) => t.topicNo === parentTopicNo)
          : null;
      const totalExercises =
        (chapter.swadhyay?.length || 0) +
        chapter.topics.reduce((acc, t) => acc + (t.swadhyay?.length || 0), 0);
      const exerciseNo = number || `${totalExercises + 1}`;

      if (topic) {
        topic.swadhyay.push({ exerciseNo, title, titleGujarati, status: 'pending' });
        topic.swadhyay.sort((a, b) => compareCodes(a.exerciseNo, b.exerciseNo));
      } else {
        if (!chapter.swadhyay) chapter.swadhyay = [];
        chapter.swadhyay.push({ exerciseNo, title, titleGujarati, status: 'pending' });
        chapter.swadhyay.sort((a, b) => compareCodes(a.exerciseNo, b.exerciseNo));
      }
    } else if (entryType === 'SUBSUBTOPIC') {
      const topic = chapter.topics.find((t) => t.topicNo === parentTopicNo);
      if (!topic) throw new Error(`Parent topic ${parentTopicNo} not found.`);
      const subtopic = topic.subtopics.find((st) => st.subtopicNo === parentSubtopicNo);
      if (!subtopic) throw new Error(`Parent subtopic ${parentSubtopicNo} not found.`);
      const subSubtopicNo =
        number || `${parentSubtopicNo}.${String.fromCharCode(97 + (subtopic.subSubtopics?.length || 0))}`;
      subtopic.subSubtopics.push({
        subSubtopicNo,
        title,
        titleGujarati,
        status: 'pending',
      });
      subtopic.subSubtopics.sort((a, b) => compareCodes(a.subSubtopicNo, b.subSubtopicNo));
    }

    await chapter.save();

    const progressDocs = facultyId
      ? await SyllabusProgress.find({ chapterId: chapter._id, facultyId: String(facultyId).trim() })
      : [];
    return this.projectChapter(chapter, progressDocs);
  }

  /**
   * Toggle completion status ONLY for the requesting facultyId inside SyllabusProgress.
   * Sibling faculty teaching the same subject are completely unaffected.
   */
  async toggleStatus({
    chapterId,
    itemNo,
    itemType = 'SUBTOPIC',
    itemId = null,
    parentTopicNo = null,
    facultyId = '',
    facultyName = '',
    facultyEmpCode = '',
    facultySubject = '',
  } = {}) {
    const resolvedFacultyId = String(facultyId || facultyEmpCode || '').trim();
    if (!resolvedFacultyId) {
      throw new Error('facultyId is required to toggle isolated syllabus progress.');
    }

    const chapter = await Syllabus.findById(chapterId);
    if (!chapter) throw new Error('Chapter not found.');

    // Verify subject faculty isolation: subject faculty can ONLY toggle topics for their assigned subject
    let assignedSubject = facultySubject;
    if (!assignedSubject) {
      const facDoc = await Faculty.findOne({
        $or: [
          mongoose.Types.ObjectId.isValid(resolvedFacultyId) ? { _id: resolvedFacultyId } : null,
          { empCode: resolvedFacultyId.toUpperCase() },
          { email: resolvedFacultyId.toLowerCase() },
        ].filter(Boolean),
      });
      if (facDoc && facDoc.role === 'Subject Faculty' && facDoc.subject) {
        assignedSubject = facDoc.subject;
      }
    }

    if (assignedSubject) {
      const facBase = normalizeBaseSubject(assignedSubject);
      const chBase = normalizeBaseSubject(chapter.subject);
      if (facBase !== chBase) {
        throw new Error(
          `Unauthorized: Subject Faculty assigned to ${assignedSubject} cannot modify syllabus for ${chapter.subject}.`
        );
      }
    }

    const chapterObj = toPlainObject(chapter);
    const leaves = this.collectTargetLeaves(chapterObj, itemNo, itemType, itemId, parentTopicNo);
    if (leaves.length === 0) {
      throw new Error(`Syllabus item "${itemNo}" (${itemType}) not found in chapter.`);
    }

    const existingProgress = await SyllabusProgress.find({
      chapterId: chapter._id,
    });

    const existingSet = new Set(existingProgress.map((p) => `${p.itemType}::${p.itemKey}`));
    const existingCodeSet = new Set(existingProgress.map((p) => `${p.itemType}::${p.itemCode}`));

    const isLeafDone = (leaf) =>
      existingSet.has(`${leaf.itemType}::${leaf.itemKey}`) ||
      existingCodeSet.has(`${leaf.itemType}::${leaf.itemCode}`);

    const allDone = leaves.every(isLeafDone);
    if (allDone) {
      throw new Error('This topic has already been marked as finished and cannot be unmarked.');
    }

    const now = new Date();
    // Mark missing target leaves as done
    const canonicalSubj = normalizeBaseSubject(chapter.subject);
    const ops = leaves
      .filter((leaf) => !isLeafDone(leaf))
      .map((leaf) => ({
        updateOne: {
            filter: {
              facultyId: resolvedFacultyId,
              chapterId: chapter._id,
              itemType: leaf.itemType,
              itemKey: leaf.itemKey,
            },
            update: {
              $set: {
                facultyId: resolvedFacultyId,
                facultyName: (facultyName || '').trim() || resolvedFacultyId,
                facultyEmpCode: (facultyEmpCode || '').trim(),
                facultySubject: (facultySubject || chapter.subject || '').trim(),
                chapterId: chapter._id,
                chapterNo: chapter.chapterNo,
                chapterName: chapter.chapterName,
                chapterNameGujarati: chapter.chapterNameGujarati || '',
                standard: chapter.standard,
                division: chapter.division,
                subject: canonicalSubj,
                itemType: leaf.itemType,
                itemKey: leaf.itemKey,
                itemCode: leaf.itemCode,
                itemTitle: leaf.itemTitle,
                itemTitleGujarati: leaf.itemTitleGujarati || '',
                parentTopicNo: leaf.parentTopicNo || '',
                parentTopicTitle: leaf.parentTopicTitle || '',
                completedAt: now,
              },
            },
            upsert: true,
          },
        }));

    if (ops.length > 0) {
      await SyllabusProgress.bulkWrite(ops);
    }

    const updatedProgress = await SyllabusProgress.find({
      chapterId: chapter._id,
    });
    return this.projectChapter(chapter, updatedProgress);
  }

  /**
   * Hierarchical Syllabus Completion Algorithm
   * Prevents double-counting parent + child nodes while accurately weighting every leaf topic, example, and exercise.
   */
  calculateCompletion(chapters = []) {
    let totalTopicsUnits = 0;
    let doneTopicsUnits = 0;
    let totalExamples = 0;
    let doneExamples = 0;
    let totalExercises = 0;
    let doneExercises = 0;
    let completedChapters = 0;

    const chapterStats = {};

    for (const ch of chapters) {
      let chTopicTotal = 0;
      let chTopicDone = 0;
      let chExTotal = 0;
      let chExDone = 0;
      let chSwTotal = 0;
      let chSwDone = 0;

      for (const t of ch.topics || []) {
        if (t.subtopics && t.subtopics.length > 0) {
          for (const st of t.subtopics) {
            if (st.subSubtopics && st.subSubtopics.length > 0) {
              for (const sst of st.subSubtopics) {
                chTopicTotal++;
                if (sst.status === 'done') chTopicDone++;
              }
            } else {
              chTopicTotal++;
              if (st.status === 'done') chTopicDone++;
            }
          }
        } else {
          chTopicTotal++;
          if (t.status === 'done') chTopicDone++;
        }

        for (const ex of t.examples || []) {
          chExTotal++;
          if (ex.status === 'done') chExDone++;
        }
        for (const sw of t.swadhyay || []) {
          chSwTotal++;
          if (sw.status === 'done') chSwDone++;
        }
      }

      for (const ex of ch.examples || []) {
        chExTotal++;
        if (ex.status === 'done') chExDone++;
      }
      for (const sw of ch.swadhyay || []) {
        chSwTotal++;
        if (sw.status === 'done') chSwDone++;
      }

      const chTotal = chTopicTotal + chExTotal + chSwTotal;
      const chDone = chTopicDone + chExDone + chSwDone;
      const chPct = chTotal > 0 ? Math.round((chDone / chTotal) * 100) : 0;

      if (chTotal > 0 && chDone === chTotal) {
        completedChapters++;
      }

      totalTopicsUnits += chTopicTotal;
      doneTopicsUnits += chTopicDone;
      totalExamples += chExTotal;
      doneExamples += chExDone;
      totalExercises += chSwTotal;
      doneExercises += chSwDone;

      chapterStats[ch.id || ch._id || ch.chapterNo] = {
        totalUnits: chTotal,
        doneUnits: chDone,
        percent: chPct,
        topics: { done: chTopicDone, total: chTopicTotal },
        examples: { done: chExDone, total: chExTotal },
        exercises: { done: chSwDone, total: chSwTotal },
      };
    }

    const totalUnits = totalTopicsUnits + totalExamples + totalExercises;
    const doneUnits = doneTopicsUnits + doneExamples + doneExercises;

    return {
      overallPercent: totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100) : 0,
      totalUnits,
      doneUnits,
      completedChapters,
      pendingChapters: Math.max(0, chapters.length - completedChapters),
      topics: {
        done: doneTopicsUnits,
        total: totalTopicsUnits,
        percent: totalTopicsUnits > 0 ? Math.round((doneTopicsUnits / totalTopicsUnits) * 100) : 0,
      },
      examples: {
        done: doneExamples,
        total: totalExamples,
        percent: totalExamples > 0 ? Math.round((doneExamples / totalExamples) * 100) : 0,
      },
      exercises: {
        done: doneExercises,
        total: totalExercises,
        percent: totalExercises > 0 ? Math.round((doneExercises / totalExercises) * 100) : 0,
      },
      chapterStats,
    };
  }

  /**
   * Fetch all syllabus items finished TODAY strictly isolated to facultyId (when non-principal).
   */
  async getTodayFinished({ subject, localDate, tzOffset, facultyId, role } = {}) {
    const win = parseYmdWindow('today', localDate, tzOffset);
    const query = {};
    if (win) {
      query.completedAt = { $gte: win.start, $lte: win.end };
    }

    let targetSubject = subject;
    const isPrincipal = String(role || '').toLowerCase() === 'principal';
    if (!isPrincipal) {
      if (!facultyId) return [];
      query.facultyId = String(facultyId).trim();
      const facDoc = await Faculty.findOne({
        $or: [
          mongoose.Types.ObjectId.isValid(facultyId) ? { _id: facultyId } : null,
          { empCode: String(facultyId).toUpperCase() },
          { email: String(facultyId).toLowerCase() },
        ].filter(Boolean),
      });
      if (facDoc && facDoc.role === 'Subject Faculty' && facDoc.subject) {
        targetSubject = facDoc.subject;
      }
    } else if (facultyId && facultyId !== 'ALL') {
      query.facultyId = String(facultyId).trim();
    }

    if (targetSubject && normalizeBaseSubject(targetSubject) !== 'ALL') {
      query.subject = buildSubjectRegex(targetSubject);
    }

    const rows = await SyllabusProgress.find(query).sort({ completedAt: -1 });
    return rows.map((r) => ({
      id: r._id.toString(),
      chapterId: r.chapterId.toString(),
      chapterNo: r.chapterNo,
      chapterName: r.chapterName,
      chapterNameGujarati: r.chapterNameGujarati || '',
      standard: r.standard,
      division: r.division,
      subject: r.subject,
      code: r.itemType === 'SWADHYAY' ? `Swadhyay Q.${r.itemCode}` : r.itemCode,
      title: r.itemTitle,
      titleGujarati: r.itemTitleGujarati || '',
      parentTopicTitle: r.parentTopicTitle || '',
      itemType: r.itemType,
      facultyId: r.facultyId,
      facultyName: r.facultyName,
      completedAt: r.completedAt,
    }));
  }

  /**
   * Pure builder for Principal Overview (shared by DB query & offline verification).
   */
  buildPrincipalOverview({
    chapters = [],
    progressDocs = [],
    facultyDocs = [],
    filters = {},
  }) {
    const subjectFilter = normalizeBaseSubject(filters.subject || 'ALL');
    const selectedFacultyId = String(filters.facultyId || 'ALL').trim();

    // Index Subject Faculty list cleanly
    const activeSubjectFaculty = facultyDocs.map((f) => ({
      id: String(f._id || f.id || f.empCode),
      empCode: f.empCode || '',
      fullName: f.fullName || [f.firstName, f.lastName].filter(Boolean).join(' ') || 'Faculty',
      subject: f.subject || 'Physics',
      baseSubject: normalizeBaseSubject(f.subject || 'Physics'),
    }));

    const selectedFacObj =
      selectedFacultyId !== 'ALL'
        ? activeSubjectFaculty.find(
            (f) => f.id === selectedFacultyId || (f.empCode && f.empCode === selectedFacultyId)
          )
        : null;

    // Project every chapter using filtered progressDocs (UNION across all faculty when Faculty === 'ALL' -> NO isolation!)
    const projectedChapters = chapters.map((ch) => {
      const projected = this.projectChapter(ch, progressDocs);
      const stats = this.calculateCompletion([projected]);
      return {
        ...projected,
        stats: stats.chapterStats[projected.id || projected._id || projected.chapterNo] || {
          totalUnits: 0,
          doneUnits: 0,
          percent: 0,
          topics: { done: 0, total: 0 },
          examples: { done: 0, total: 0 },
          exercises: { done: 0, total: 0 },
        },
      };
    });

    projectedChapters.sort((a, b) => {
      const sa = normalizeBaseSubject(a.subject);
      const sb = normalizeBaseSubject(b.subject);
      if (sa !== sb) return sa.localeCompare(sb);
      if (a.standard !== b.standard) return a.standard.localeCompare(b.standard);
      if (a.division !== b.division) return a.division.localeCompare(b.division);
      return Number(a.chapterNo) - Number(b.chapterNo);
    });

    const summary = this.calculateCompletion(projectedChapters);

    // Subject-wise full union stats
    const subjectOrder = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
    const subjectGroups = new Map();
    for (const sName of subjectOrder) {
      if (subjectFilter !== 'ALL' && subjectFilter !== sName) continue;
      if (selectedFacObj && subjectFilter === 'ALL' && selectedFacObj.baseSubject !== sName) continue;
      subjectGroups.set(sName, []);
    }
    for (const ch of projectedChapters) {
      const base = normalizeBaseSubject(ch.subject);
      if (!subjectGroups.has(base)) subjectGroups.set(base, []);
      subjectGroups.get(base).push(ch);
    }

    const chapterSubjectById = new Map();
    const chapterTotalUnitsById = new Map();
    for (const ch of projectedChapters) {
      const id = String(ch.id || ch._id || ch.chapterNo);
      chapterSubjectById.set(id, normalizeBaseSubject(ch.subject));
      chapterTotalUnitsById.set(id, ch.stats?.totalUnits || 0);
    }

    // Subject stats with contributors list
    const subjectStats = [];
    for (const [subjName, chList] of subjectGroups.entries()) {
      const calc = this.calculateCompletion(chList);
      const assignedFac = activeSubjectFaculty.filter((f) => f.baseSubject === subjName);
      const contributorsMap = new Map();
      for (const f of assignedFac) {
        contributorsMap.set(f.id, {
          facultyId: f.id,
          facultyName: f.fullName,
          facultyEmpCode: f.empCode,
          facultySubject: f.subject,
          doneUnits: 0,
        });
      }
      // Count progress contributions for this subject
      for (const p of progressDocs) {
        const chSubj = chapterSubjectById.get(String(p.chapterId)) || normalizeBaseSubject(p.subject);
        if (chSubj !== subjName) continue;
        const matchedFac = activeSubjectFaculty.find(
          (f) => f.id === String(p.facultyId) || (f.empCode && f.empCode === p.facultyEmpCode)
        );
        const key = matchedFac ? matchedFac.id : String(p.facultyId);
        if (!contributorsMap.has(key)) {
          contributorsMap.set(key, {
            facultyId: key,
            facultyName: matchedFac ? matchedFac.fullName : p.facultyName || 'Faculty',
            facultyEmpCode: matchedFac ? matchedFac.empCode : p.facultyEmpCode || '',
            facultySubject: matchedFac ? matchedFac.subject : p.facultySubject || subjName,
            doneUnits: 0,
          });
        }
        contributorsMap.get(key).doneUnits += 1;
      }

      subjectStats.push({
        subject: subjName,
        chapterCount: chList.length,
        totalUnits: calc.totalUnits,
        doneUnits: calc.doneUnits,
        overallPercent: calc.overallPercent,
        completedChapters: calc.completedChapters,
        topics: calc.topics,
        examples: calc.examples,
        exercises: calc.exercises,
        contributors: Array.from(contributorsMap.values()),
      });
    }

    // Per-Faculty individual contribution stats (compared side-by-side in Principal Chart)
    const facTotals = new Map();
    for (const f of activeSubjectFaculty) {
      if (subjectFilter !== 'ALL' && f.baseSubject !== subjectFilter) continue;
      if (selectedFacObj && f.id !== selectedFacObj.id) continue;
      facTotals.set(f.id, {
        facultyId: f.id,
        facultyEmpCode: f.empCode,
        facultyName: f.fullName,
        facultySubject: f.subject,
        baseSubject: f.baseSubject,
        doneUnits: 0,
        topicsDone: 0,
        examplesDone: 0,
        exercisesDone: 0,
        lastCompletedAt: null,
      });
    }

    for (const p of progressDocs) {
      const matchedFac = activeSubjectFaculty.find(
        (f) => f.id === String(p.facultyId) || (f.empCode && f.empCode === p.facultyEmpCode)
      );
      const key = matchedFac ? matchedFac.id : String(p.facultyId);
      if (selectedFacObj && key !== selectedFacObj.id) continue;
      const base = matchedFac
        ? matchedFac.baseSubject
        : chapterSubjectById.get(String(p.chapterId)) || normalizeBaseSubject(p.subject);
      if (subjectFilter !== 'ALL' && base !== subjectFilter) continue;

      if (!facTotals.has(key)) {
        facTotals.set(key, {
          facultyId: key,
          facultyEmpCode: matchedFac?.empCode || p.facultyEmpCode || '',
          facultyName: matchedFac?.fullName || p.facultyName || 'Faculty',
          facultySubject: matchedFac?.subject || p.facultySubject || base,
          baseSubject: base,
          doneUnits: 0,
          topicsDone: 0,
          examplesDone: 0,
          exercisesDone: 0,
          lastCompletedAt: null,
        });
      }
      const stat = facTotals.get(key);
      stat.doneUnits += 1;
      if (p.itemType === 'EXAMPLE') stat.examplesDone += 1;
      else if (p.itemType === 'SWADHYAY') stat.exercisesDone += 1;
      else stat.topicsDone += 1;

      if (!stat.lastCompletedAt || new Date(p.completedAt) > new Date(stat.lastCompletedAt)) {
        stat.lastCompletedAt = p.completedAt;
      }
    }

    const subjTotalLookup = new Map(subjectStats.map((s) => [s.subject, s.totalUnits]));
    const facultyStats = Array.from(facTotals.values()).map((fs) => {
      const totalForSubj = subjTotalLookup.get(fs.baseSubject) || 0;
      return {
        ...fs,
        subjectTotalUnits: totalForSubj,
        percent: totalForSubj > 0 ? Math.min(100, Math.round((fs.doneUnits / totalForSubj) * 100)) : 0,
      };
    });

    // Activity Log sorted newest first
    const activityLog = [...progressDocs]
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 120)
      .map((p) => ({
        id: String(p._id || p.id || `${p.facultyId}-${p.itemKey}`),
        facultyId: p.facultyId,
        facultyName: p.facultyName || 'Faculty',
        facultyEmpCode: p.facultyEmpCode || '',
        facultySubject: p.facultySubject || p.subject,
        subject: p.subject,
        standard: p.standard,
        division: p.division,
        chapterNo: p.chapterNo,
        chapterName: p.chapterName,
        chapterNameGujarati: p.chapterNameGujarati || '',
        itemType: p.itemType,
        itemCode: p.itemType === 'SWADHYAY' ? `Q.${p.itemCode}` : p.itemCode,
        itemTitle: p.itemTitle,
        itemTitleGujarati: p.itemTitleGujarati || '',
        completedAt: p.completedAt,
      }));

    return {
      summary,
      subjectStats,
      facultyStats,
      facultyOptions: activeSubjectFaculty,
      activityLog,
      chapters: projectedChapters,
    };
  }

  /**
   * Principal All-Subject Un-Isolated Syllabus Tracking Overview with Multi-Filter Support
   */
  async getPrincipalOverview(filters = {}) {
    await this.ensureStd11ChemCurriculum();
    await this.ensureStd11PhysicsCurriculum();
    await this.ensureStd11MathsCurriculum();
    await this.ensureStd11BiologyCurriculum();

    // Ensure baseline Physics Std 12 Division A chapters exist if DB is empty for Physics
    const physicsCount = await Syllabus.countDocuments({ subject: /^phys/i });
    if (physicsCount === 0) {
      const defaults = this.getDefaultChapters('Standard 12', 'Division A', 'Physics');
      if (defaults.length > 0) await Syllabus.insertMany(defaults);
    }

    const normStd = filters.standard ? normalizeStandardValue(filters.standard) : 'ALL';
    const normDiv = filters.division ? normalizeDivisionValue(filters.division) : 'ALL';
    const normSubj = filters.subject ? normalizeBaseSubject(filters.subject) : 'ALL';
    const facultyFilter = String(filters.facultyId || 'ALL').trim();
    const day = filters.day || 'all';
    const dayWindow = parseYmdWindow(day, filters.localDate, filters.tzOffset);

    const facultyDocs = await Faculty.find({
      role: 'Subject Faculty',
      status: { $ne: 'DEACTIVATED' },
    }).sort({ subject: 1, fullName: 1 });

    // Resolve faculty match IDs (both Mongo _id and empCode for seamless compatibility)
    let targetFacultyKeys = null;
    let impliedSubject = null;
    if (facultyFilter && facultyFilter !== 'ALL') {
      const matched = facultyDocs.find(
        (f) =>
          String(f._id) === facultyFilter ||
          (f.empCode && f.empCode.toUpperCase() === facultyFilter.toUpperCase())
      );
      if (matched) {
        targetFacultyKeys = [String(matched._id), matched.empCode].filter(Boolean);
        if (normSubj === 'ALL') impliedSubject = normalizeBaseSubject(matched.subject);
      } else {
        targetFacultyKeys = [facultyFilter];
      }
    }

    const chapterQuery = {};
    if (normStd !== 'ALL') chapterQuery.standard = normStd;
    if (normDiv !== 'ALL') chapterQuery.division = normDiv;
    if (normSubj !== 'ALL') {
      chapterQuery.subject = buildSubjectRegex(normSubj);
    } else if (impliedSubject) {
      chapterQuery.subject = buildSubjectRegex(impliedSubject);
    }

    const chapters = await Syllabus.find(chapterQuery).sort({ subject: 1, standard: 1, division: 1, chapterNo: 1 });
    const chapterIds = chapters.map((c) => c._id);

    let progressDocs = [];
    if (chapterIds.length > 0) {
      const pQuery = { chapterId: { $in: chapterIds } };
      if (targetFacultyKeys) {
        pQuery.$or = [
          { facultyId: { $in: targetFacultyKeys } },
          { facultyEmpCode: { $in: targetFacultyKeys } },
        ];
      }
      if (dayWindow) {
        pQuery.completedAt = { $gte: dayWindow.start, $lte: dayWindow.end };
      }
      progressDocs = await SyllabusProgress.find(pQuery).sort({ completedAt: -1 });
    }

    return this.buildPrincipalOverview({
      chapters,
      progressDocs,
      facultyDocs,
      filters: {
        standard: normStd,
        division: normDiv,
        subject: normSubj,
        facultyId: facultyFilter,
        day,
      },
    });
  }

  /**
   * Delete chapter + clean up associated faculty progress records
   */
  async deleteChapter(chapterId) {
    await SyllabusProgress.deleteMany({ chapterId });
    return await Syllabus.findByIdAndDelete(chapterId);
  }
}

module.exports = new SyllabusService();
module.exports.compareCodes = compareCodes;
module.exports.normalizeBaseSubject = normalizeBaseSubject;
module.exports.normalizeStandardValue = normalizeStandardValue;
module.exports.normalizeDivisionValue = normalizeDivisionValue;
module.exports.parseYmdWindow = parseYmdWindow;
