/**
 * Hierarchical Syllabus Completion & Aggregation Utilities
 * Mirrors backend completion logic without double counting parent + child nodes.
 */

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

export function compareSyllabusCodes(codeA, codeB) {
  const cleanA = String(codeA || '')
    .replace(/^ઉદા\.\s*/i, '')
    .replace(/^Swadhyay Q\.\s*/i, '')
    .replace(/^પ્રશ્ન\s*/i, '')
    .trim();
  const cleanB = String(codeB || '')
    .replace(/^ઉદા\.\s*/i, '')
    .replace(/^Swadhyay Q\.\s*/i, '')
    .replace(/^પ્રશ્ન\s*/i, '')
    .trim();
  const partsA = cleanA.split('.');
  const partsB = cleanB.split('.');
  const maxLen = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLen; i += 1) {
    if (i >= partsA.length) return -1;
    if (i >= partsB.length) return 1;
    const cmp = compareSegment(partsA[i], partsB[i]);
    if (cmp !== 0) return cmp;
  }
  return 0;
}

export function normalizeBaseSubject(subject = '') {
  const s = String(subject || '').trim().toLowerCase();
  if (!s || s === 'all') return 'ALL';
  if (s.includes('chem')) return 'Chemistry';
  if (s.includes('phys')) return 'Physics';
  if (s.includes('math')) return 'Mathematics';
  if (s.includes('bio')) return 'Biology';
  return String(subject || '').trim();
}

export function hasDistinctGujarati(title, titleGujarati) {
  const t = String(title || '').trim();
  const g = String(titleGujarati || '').trim();
  return Boolean(g && g !== t);
}

export function collectChapterExamples(chapter) {
  const list = [];
  if (Array.isArray(chapter?.topics)) {
    chapter.topics.forEach(t => {
      (t.examples || []).forEach(ex => {
        list.push({
          ...ex,
          parentTopicNo: t.topicNo,
          parentTopicTitle: t.title,
        });
      });
    });
  }
  if (Array.isArray(chapter?.examples)) {
    chapter.examples.forEach(ex => {
      list.push({
        ...ex,
        parentTopicNo: null,
        parentTopicTitle: 'Chapter Level',
      });
    });
  }
  return list.sort((a, b) => compareSyllabusCodes(a.exampleNo, b.exampleNo));
}

export function collectChapterExercises(chapter) {
  const list = [];
  if (Array.isArray(chapter?.topics)) {
    chapter.topics.forEach(t => {
      (t.swadhyay || []).forEach(sw => {
        list.push({
          ...sw,
          parentTopicNo: t.topicNo,
          parentTopicTitle: t.title,
        });
      });
    });
  }
  if (Array.isArray(chapter?.swadhyay)) {
    chapter.swadhyay.forEach(sw => {
      list.push({
        ...sw,
        parentTopicNo: null,
        parentTopicTitle: 'Chapter Level',
      });
    });
  }
  return list.sort((a, b) => compareSyllabusCodes(a.exerciseNo, b.exerciseNo));
}

export function isSubtopicCompleted(st) {
  if (st.subSubtopics && st.subSubtopics.length > 0) {
    return st.subSubtopics.every(sst => sst.status === 'done');
  }
  return st.status === 'done';
}

export function isTopicCompleted(topic) {
  if (topic.subtopics && topic.subtopics.length > 0) {
    return topic.subtopics.every(st => isSubtopicCompleted(st));
  }
  return topic.status === 'done';
}

export function calculateChapterCompletion(chapter) {
  let topicsTotal = 0;
  let topicsDone = 0;

  for (const t of chapter?.topics || []) {
    if (t.subtopics && t.subtopics.length > 0) {
      for (const st of t.subtopics) {
        if (st.subSubtopics && st.subSubtopics.length > 0) {
          for (const sst of st.subSubtopics) {
            topicsTotal++;
            if (sst.status === 'done') topicsDone++;
          }
        } else {
          topicsTotal++;
          if (st.status === 'done') topicsDone++;
        }
      }
    } else {
      topicsTotal++;
      if (t.status === 'done') topicsDone++;
    }
  }

  const examples = collectChapterExamples(chapter);
  const examplesTotal = examples.length;
  const examplesDone = examples.filter(ex => ex.status === 'done').length;

  const exercises = collectChapterExercises(chapter);
  const exercisesTotal = exercises.length;
  const exercisesDone = exercises.filter(sw => sw.status === 'done').length;

  const totalUnits = topicsTotal + examplesTotal + exercisesTotal;
  const doneUnits = topicsDone + examplesDone + exercisesDone;
  const percent = totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100) : 0;

  return {
    totalUnits,
    doneUnits,
    percent,
    topics: {
      done: topicsDone,
      total: topicsTotal,
      percent: topicsTotal > 0 ? Math.round((topicsDone / topicsTotal) * 100) : 0,
    },
    examples: {
      done: examplesDone,
      total: examplesTotal,
      percent: examplesTotal > 0 ? Math.round((examplesDone / examplesTotal) * 100) : 0,
    },
    exercises: {
      done: exercisesDone,
      total: exercisesTotal,
      percent: exercisesTotal > 0 ? Math.round((exercisesDone / exercisesTotal) * 100) : 0,
    },
  };
}

export function calculateSyllabusCompletion(chapters = []) {
  let topicsDone = 0;
  let topicsTotal = 0;
  let examplesDone = 0;
  let examplesTotal = 0;
  let exercisesDone = 0;
  let exercisesTotal = 0;
  let completedChapters = 0;

  const chapterMap = {};
  const completedItemsList = [];

  for (const ch of chapters) {
    const chStats = calculateChapterCompletion(ch);
    chapterMap[ch.id || ch._id || ch.chapterNo] = chStats;

    topicsDone += chStats.topics.done;
    topicsTotal += chStats.topics.total;
    examplesDone += chStats.examples.done;
    examplesTotal += chStats.examples.total;
    exercisesDone += chStats.exercises.done;
    exercisesTotal += chStats.exercises.total;

    if (chStats.totalUnits > 0 && chStats.doneUnits === chStats.totalUnits) {
      completedChapters++;
    }

    // Gather recently finished items
    for (const t of ch.topics || []) {
      if (t.subtopics && t.subtopics.length > 0) {
        for (const st of t.subtopics) {
          if (st.subSubtopics && st.subSubtopics.length > 0) {
            for (const sst of st.subSubtopics) {
              if (sst.status === 'done') {
                completedItemsList.push({
                  no: sst.subSubtopicNo,
                  title: sst.title,
                  titleGujarati: sst.titleGujarati,
                  chapter: ch.chapterName,
                });
              }
            }
          } else if (st.status === 'done') {
            completedItemsList.push({
              no: st.subtopicNo,
              title: st.title,
              titleGujarati: st.titleGujarati,
              chapter: ch.chapterName,
            });
          }
        }
      } else if (t.status === 'done') {
        completedItemsList.push({
          no: t.topicNo,
          title: t.title,
          titleGujarati: t.titleGujarati,
          chapter: ch.chapterName,
        });
      }
    }
  }

  const totalUnits = topicsTotal + examplesTotal + exercisesTotal;
  const doneUnits = topicsDone + examplesDone + exercisesDone;
  const overallPercent = totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100) : 0;

  return {
    overallPercent,
    totalUnits,
    doneUnits,
    completedChapters,
    pendingChapters: Math.max(0, chapters.length - completedChapters),
    topics: {
      done: topicsDone,
      total: topicsTotal,
      percent: topicsTotal > 0 ? Math.round((topicsDone / topicsTotal) * 100) : 0,
    },
    examples: {
      done: examplesDone,
      total: examplesTotal,
      percent: examplesTotal > 0 ? Math.round((examplesDone / examplesTotal) * 100) : 0,
    },
    exercises: {
      done: exercisesDone,
      total: exercisesTotal,
      percent: exercisesTotal > 0 ? Math.round((exercisesDone / exercisesTotal) * 100) : 0,
    },
    chapterMap,
    completedItemsList,
  };
}

