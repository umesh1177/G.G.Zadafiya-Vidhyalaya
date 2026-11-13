const fs = require('fs');
const path = require('path');

const p1 = JSON.parse(fs.readFileSync(path.join(__dirname, 'bio_part1_dump.json'), 'utf8'));
const p2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'bio_part2_dump.json'), 'utf8'));

const ENG_NAMES = {
  1: 'The Living World',
  2: 'Biological Classification',
  3: 'Plant Kingdom',
  4: 'Animal Kingdom',
  5: 'Morphology of Flowering Plants',
  6: 'Anatomy of Flowering Plants',
  7: 'Structural Organisation in Animals',
  8: 'Cell: The Unit of Life',
  9: 'Biomolecules',
  10: 'Cell Cycle and Cell Division',
  11: 'Photosynthesis in Higher Plants',
  12: 'Respiration in Plants',
  13: 'Plant Growth and Development',
  14: 'Breathing and Exchange of Gases',
  15: 'Body Fluids and Circulation',
  16: 'Excretory Products and their Elimination',
  17: 'Locomotion and Movement',
  18: 'Neural Control and Coordination',
  19: 'Chemical Coordination and Integration',
};

function buildPart(dump) {
  const hRows = dump.hierarchyRows.slice(1).map(r => r.data);
  const swRows = dump.swadhyayRows.slice(1).map(r => r.data);

  // Group by chapter
  const chaptersMap = new Map();

  hRows.forEach(row => {
    const chNo = parseInt(row.B);
    if (!chNo) return;
    if (!chaptersMap.has(chNo)) {
      chaptersMap.set(chNo, {
        chapterNo: chNo,
        chapterName: ENG_NAMES[chNo] || `Chapter ${chNo}`,
        chapterNameGujarati: (row.C || '').trim(),
        order: chNo,
        topics: [],
        examples: [],
        swadhyay: [],
        _idToNode: new Map(),
      });
    }

    const chObj = chaptersMap.get(chNo);
    const rowId = String(row.A);
    const level = (row.D || '').trim();
    const code = (row.E || '').trim();
    const title = (row.F || '').trim();
    const parentId = row.G ? String(row.G).trim() : '';

    const node = {
      rowId,
      level,
      code,
      title,
      parentId,
    };
    chObj._idToNode.set(rowId, node);
  });

  // Attach swadhyay exercises
  swRows.forEach(row => {
    const chNo = parseInt(row.B);
    const chObj = chaptersMap.get(chNo);
    if (!chObj) return;

    const exNo = (row.C || '').trim();
    const qText = (row.D || '').trim();
    const optText = (row.E || '').trim();
    const fullText = optText ? `${qText} [${optText}]` : qText;

    chObj.swadhyay.push({
      exerciseNo: exNo,
      title: fullText,
      titleGujarati: '',
      status: 'pending',
    });
  });

  // Assemble hierarchy: Chapter -> Topic -> Subtopic -> SubSubtopic
  const resultChapters = [];
  for (const [chNo, chObj] of chaptersMap.entries()) {
    const nodes = Array.from(chObj._idToNode.values());

    const topics = [];
    const topicsMap = new Map();
    const subtopicsMap = new Map();

    // 1. Find Level 'વિષય' (Topics)
    nodes.filter(n => n.level === 'વિષય').forEach(tNode => {
      const topicObj = {
        topicNo: tNode.code,
        title: tNode.title,
        titleGujarati: '',
        status: 'pending',
        subtopics: [],
        examples: [],
        swadhyay: [],
      };
      topics.push(topicObj);
      topicsMap.set(tNode.rowId, topicObj);
    });

    // 2. Find Level 'ઉપવિષય' (Subtopics)
    nodes.filter(n => n.level === 'ઉપવિષય').forEach(stNode => {
      const parentTopic = topicsMap.get(stNode.parentId);
      const subtopicObj = {
        subtopicNo: stNode.code,
        title: stNode.title,
        titleGujarati: '',
        type: 'SUBTOPIC',
        status: 'pending',
        subSubtopics: [],
      };
      if (parentTopic) {
        parentTopic.subtopics.push(subtopicObj);
      } else {
        // Fallback: match by code prefix e.g. "1.2.1" belongs to "1.2"
        const dotIdx = stNode.code.lastIndexOf('.');
        const parentCode = dotIdx > 0 ? stNode.code.slice(0, dotIdx) : '';
        const foundT = topics.find(t => t.topicNo === parentCode);
        if (foundT) foundT.subtopics.push(subtopicObj);
      }
      subtopicsMap.set(stNode.rowId, subtopicObj);
    });

    // 3. Find Level 'ઉપ-ઉપવિષય' (Sub-subtopics)
    nodes.filter(n => n.level === 'ઉપ-ઉપવિષય').forEach(sstNode => {
      const parentSubtopic = subtopicsMap.get(sstNode.parentId);
      const sstObj = {
        subSubtopicNo: sstNode.code,
        title: sstNode.title,
        titleGujarati: '',
        status: 'pending',
      };
      if (parentSubtopic) {
        parentSubtopic.subSubtopics.push(sstObj);
      } else {
        // Fallback by code prefix e.g. "4.2.11.1" -> "4.2.11"
        const dotIdx = sstNode.code.lastIndexOf('.');
        const parentCode = dotIdx > 0 ? sstNode.code.slice(0, dotIdx) : '';
        for (const t of topics) {
          const st = t.subtopics.find(s => s.subtopicNo === parentCode);
          if (st) {
            st.subSubtopics.push(sstObj);
            break;
          }
        }
      }
    });

    delete chObj._idToNode;
    chObj.topics = topics;
    resultChapters.push(chObj);
  }

  return resultChapters;
}

const ch1To10 = buildPart(p1);
const ch11To19 = buildPart(p2);
const allBioChapters = [...ch1To10, ...ch11To19];

console.log(`Built ${allBioChapters.length} Biology chapters:`);
allBioChapters.forEach(c => {
  let subCount = 0;
  let sstCount = 0;
  c.topics.forEach(t => {
    subCount += (t.subtopics || []).length;
    t.subtopics.forEach(st => {
      sstCount += (st.subSubtopics || []).length;
    });
  });
  console.log(`Ch ${c.chapterNo}: ${c.chapterName} (${c.chapterNameGujarati}) | Topics: ${c.topics.length}, Subtopics: ${subCount}, SST: ${sstCount}, Swadhyay: ${c.swadhyay.length}`);
});

const fileContent = `/**
 * Standard 11 Biology (NCERT / GSEB Complete Curriculum)
 * Chapters 1 to 19 with complete Topics, Subtopics, Sub-subtopics and Swadhyay Exercises.
 * Total 19 Chapters, 206 Exercises. Complete Gujarati Medium Syllabus.
 */

const BASE_STD11_BIOLOGY = ${JSON.stringify(allBioChapters, null, 2)};

function cloneItems(items = []) {
  return items.map((it) => ({
    ...it,
    imageUrl: it.imageUrl || null,
    figureNote: it.figureNote || '',
    status: 'pending',
  }));
}

function getStd11BiologyChapters(division = 'Division A') {
  return BASE_STD11_BIOLOGY.map((ch) => ({
    standard: 'Standard 11',
    division,
    subject: 'Biology',
    chapterNo: ch.chapterNo,
    chapterName: ch.chapterName,
    chapterNameGujarati: ch.chapterNameGujarati,
    order: ch.order,
    topics: (ch.topics || []).map((t) => ({
      topicNo: t.topicNo,
      title: t.title,
      titleGujarati: t.titleGujarati || '',
      imageUrl: t.imageUrl || null,
      figureNote: t.figureNote || '',
      status: 'pending',
      subtopics: (t.subtopics || []).map((st) => ({
        subtopicNo: st.subtopicNo,
        title: st.title,
        titleGujarati: st.titleGujarati || '',
        type: st.type || 'SUBTOPIC',
        imageUrl: st.imageUrl || null,
        figureNote: st.figureNote || '',
        status: 'pending',
        subSubtopics: cloneItems(st.subSubtopics || []),
      })),
      examples: cloneItems(t.examples || []),
      swadhyay: cloneItems(t.swadhyay || []),
    })),
    examples: cloneItems(ch.examples || []),
    swadhyay: cloneItems(ch.swadhyay || []),
  }));
}

module.exports = {
  BASE_STD11_BIOLOGY,
  getStd11BiologyChapters,
};
`;

fs.writeFileSync(path.join(__dirname, 'src/data/std11Biology.js'), fileContent, 'utf8');
console.log('Saved backend/src/data/std11Biology.js successfully!');

