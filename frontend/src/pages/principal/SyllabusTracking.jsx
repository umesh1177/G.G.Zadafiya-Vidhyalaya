import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { syllabusApi } from '../../services/syllabusApi';
import {
  collectChapterExamples,
  collectChapterExercises,
  compareSyllabusCodes,
  hasDistinctGujarati,
  normalizeBaseSubject,
  isTopicCompleted,
  isSubtopicCompleted,
} from '../../utils/syllabusUtils';
import PaginationBar from '../../components/common/PaginationBar';

const DAY_LABELS = {
  all: 'All Time (Full Syllabus)',
  today: 'Completed Today',
  week: 'Completed This Week',
  month: 'Completed This Month',
};

function fmtDateTime(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CompletionBadge({ status, partialCount = null }) {
  if (status === 'done') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 9px',
          borderRadius: 999,
          background: '#DCFCE7',
          color: '#15803D',
          border: '1px solid #86EFAC',
          fontSize: 11.5,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        <span>✓</span>
        <span>Completed</span>
      </span>
    );
  }
  if (status === 'partial') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 9px',
          borderRadius: 999,
          background: '#E8F1F8',
          color: '#123B5D',
          border: '1px solid #C8DBED',
          fontSize: 11.5,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        <span>◐</span>
        <span>{partialCount ? `In Progress (${partialCount})` : 'In Progress'}</span>
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 9px',
        borderRadius: 999,
        background: '#FFFBEB',
        color: '#92400E',
        border: '1px solid #FDE68A',
        fontSize: 11.5,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      <span>○</span>
      <span>Uncompleted</span>
    </span>
  );
}

function FacultyContributorBadges({ completedBy = [], maxShow = 3 }) {
  if (!Array.isArray(completedBy) || completedBy.length === 0) return null;
  const shown = completedBy.slice(0, maxShow);
  const extra = completedBy.length - shown.length;

  return (
    <div style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
      {shown.map((c) => (
        <span
          key={`${c.facultyId}-${c.facultyEmpCode}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 999,
            background: '#F0F7FC',
            color: '#123B5D',
            border: '1px solid #C8DBED',
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
          title={`${c.facultyName}${c.facultySubject ? ` · ${c.facultySubject}` : ''}${c.completedAt ? ` · ${fmtDateTime(c.completedAt)}` : ''}`}
        >
          <span>👤</span>
          <span>Completed by: {c.facultyName}</span>
          {c.facultySubject && (
            <span style={{ color: '#475569', fontWeight: 600 }}>({c.facultySubject})</span>
          )}
        </span>
      ))}
      {extra > 0 && (
        <span
          style={{
            padding: '2px 7px',
            borderRadius: 999,
            background: '#E2E8F0',
            color: '#334155',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          +{extra} more
        </span>
      )}
    </div>
  );
}

export default function SyllabusTracking() {
  const { setHeader } = useOutletContext();

  useEffect(() => {
    setHeader({
      title: 'All-Subject Syllabus Tracking',
      subtitle: 'Combined non-isolated curriculum coverage, faculty contributions, and completion analytics',
    });
  }, [setHeader]);

  // Top Filters
  const [standard, setStandard] = useState('ALL');
  const [division, setDivision] = useState('ALL');
  const [subject, setSubject] = useState('ALL');
  const [facultyId, setFacultyId] = useState('ALL');
  const [day, setDay] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'done' | 'pending'
  const [searchTerm, setSearchTerm] = useState('');

  // Overview Payload from Backend
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Accordion & Browser Pagination
  const [expandedChapters, setExpandedChapters] = useState({});
  const [expandedTopics, setExpandedTopics] = useState({});
  const [expandedExamples, setExpandedExamples] = useState({});
  const [expandedExercises, setExpandedExercises] = useState({});
  const [chaptersPage, setChaptersPage] = useState(1);
  const CHAPTERS_PAGE_SIZE = 6;

  // Activity Log Pagination
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PAGE_SIZE = 8;

  // Inspect Modal
  const [viewingItem, setViewingItem] = useState(null);

  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setErrorMsg(null);
    }
    try {
      const data = await syllabusApi.getPrincipalOverview({
        standard,
        division,
        subject,
        facultyId,
        day,
      });
      setOverview(data);

      // Expand first chapter by default on first load
      if (!silent && data?.chapters?.length > 0) {
        const firstKey = data.chapters[0].id || data.chapters[0]._id || String(data.chapters[0].chapterNo);
        setExpandedChapters((prev) =>
          Object.keys(prev).length === 0 ? { [firstKey]: true } : prev
        );
      }
    } catch (err) {
      console.error('Failed to load principal syllabus overview:', err);
      if (!silent) {
        setErrorMsg(err.message || 'Failed to load syllabus tracking overview from server.');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [standard, division, subject, facultyId, day]);

  useEffect(() => {
    loadOverview(false);
    const handleFocus = () => loadOverview(true);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadOverview(true);
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadOverview]);

  const summary = overview?.summary || {
    overallPercent: 0,
    totalUnits: 0,
    doneUnits: 0,
    completedChapters: 0,
    pendingChapters: 0,
    topics: { done: 0, total: 0, percent: 0 },
    examples: { done: 0, total: 0, percent: 0 },
    exercises: { done: 0, total: 0, percent: 0 },
  };

  const subjectStats = overview?.subjectStats || [];
  const allFacultyOptions = overview?.facultyOptions || [];
  const activityLog = overview?.activityLog || [];
  const chapters = overview?.chapters || [];

  // Narrow faculty dropdown choices by selected base subject cleanly
  const visibleFacultyOptions = useMemo(() => {
    if (subject === 'ALL') return allFacultyOptions;
    const base = normalizeBaseSubject(subject);
    return allFacultyOptions.filter((f) => normalizeBaseSubject(f.subject) === base);
  }, [allFacultyOptions, subject]);

  const handleSubjectChange = (nextSubj) => {
    setSubject(nextSubj);
    setChaptersPage(1);
    setActivityPage(1);
    if (facultyId !== 'ALL' && nextSubj !== 'ALL') {
      const base = normalizeBaseSubject(nextSubj);
      const selectedFac = allFacultyOptions.find(
        (f) => f.id === facultyId || f.empCode === facultyId
      );
      if (selectedFac && normalizeBaseSubject(selectedFac.subject) !== base) {
        setFacultyId('ALL');
      }
    }
  };

  const resetFilters = () => {
    setStandard('ALL');
    setDivision('ALL');
    setSubject('ALL');
    setFacultyId('ALL');
    setDay('all');
    setStatusFilter('all');
    setSearchTerm('');
    setChaptersPage(1);
    setActivityPage(1);
  };

  // Client-side search + completion status filtering on top of backend filters
  const filteredChapters = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const matchesNodeStatus = (doneBool) => {
      if (statusFilter === 'done') return doneBool;
      if (statusFilter === 'pending') return !doneBool;
      return true;
    };

    const matchText = (text = '') => String(text).toLowerCase().includes(q);
    const matchContrib = (list = []) =>
      list.some(
        (c) =>
          matchText(c.facultyName) ||
          matchText(c.facultySubject) ||
          matchText(c.facultyEmpCode)
      );

    return chapters.filter((ch) => {
      const stats = ch.stats || { totalUnits: 0, doneUnits: 0, percent: 0 };
      const chFullyDone = stats.totalUnits > 0 && stats.doneUnits === stats.totalUnits;

      if (statusFilter === 'done' && stats.doneUnits === 0 && !chFullyDone) return false;
      if (statusFilter === 'pending' && chFullyDone) return false;

      if (!q) return true;

      if (
        matchText(ch.chapterName) ||
        matchText(ch.chapterNameGujarati) ||
        matchText(ch.subject) ||
        matchText(ch.standard) ||
        matchText(`ch ${ch.chapterNo}`) ||
        matchText(`chapter ${ch.chapterNo}`) ||
        matchContrib(ch.completedBy)
      ) {
        return true;
      }

      const topics = ch.topics || [];
      const hasTopicHit = topics.some((t) => {
        if (
          matchText(t.topicNo) ||
          matchText(t.title) ||
          matchText(t.titleGujarati) ||
          matchContrib(t.completedBy)
        ) {
          return matchesNodeStatus(isTopicCompleted(t));
        }
        const subHit = (t.subtopics || []).some((st) => {
          if (
            matchText(st.subtopicNo) ||
            matchText(st.title) ||
            matchText(st.titleGujarati) ||
            matchContrib(st.completedBy)
          ) {
            return matchesNodeStatus(isSubtopicCompleted(st));
          }
          return (st.subSubtopics || []).some(
            (sst) =>
              (matchText(sst.subSubtopicNo) ||
                matchText(sst.title) ||
                matchText(sst.titleGujarati) ||
                matchContrib(sst.completedBy)) &&
              matchesNodeStatus(sst.status === 'done')
          );
        });
        if (subHit) return true;
        return false;
      });
      if (hasTopicHit) return true;

      const exHit = collectChapterExamples(ch).some(
        (ex) =>
          (matchText(ex.exampleNo) ||
            matchText(ex.title) ||
            matchText(ex.titleGujarati) ||
            matchContrib(ex.completedBy)) &&
          matchesNodeStatus(ex.status === 'done')
      );
      if (exHit) return true;

      const swHit = collectChapterExercises(ch).some(
        (sw) =>
          (matchText(sw.exerciseNo) ||
            matchText(sw.title) ||
            matchText(sw.titleGujarati) ||
            matchContrib(sw.completedBy)) &&
          matchesNodeStatus(sw.status === 'done')
      );
      return swHit;
    });
  }, [chapters, searchTerm, statusFilter]);

  const safeChaptersPage = Math.min(
    chaptersPage,
    Math.max(1, Math.ceil(filteredChapters.length / CHAPTERS_PAGE_SIZE))
  );
  const paginatedChapters = filteredChapters.slice(
    (safeChaptersPage - 1) * CHAPTERS_PAGE_SIZE,
    safeChaptersPage * CHAPTERS_PAGE_SIZE
  );

  const safeActivityPage = Math.min(
    activityPage,
    Math.max(1, Math.ceil(activityLog.length / ACTIVITY_PAGE_SIZE))
  );
  const paginatedActivity = activityLog.slice(
    (safeActivityPage - 1) * ACTIVITY_PAGE_SIZE,
    safeActivityPage * ACTIVITY_PAGE_SIZE
  );

  const toggleExpandAllOnPage = (expand) => {
    const nextCh = {};
    const nextTopics = {};
    paginatedChapters.forEach((ch) => {
      const chKey = ch.id || ch._id || String(ch.chapterNo);
      nextCh[chKey] = expand;
      (ch.topics || []).forEach((t) => {
        nextTopics[`${chKey}::${t.topicNo}`] = expand;
      });
    });
    setExpandedChapters(nextCh);
    setExpandedTopics(nextTopics);
  };

  return (
    <div style={{ paddingBottom: 36 }}>
      {errorMsg && (
        <div className="banner banner-warning" style={{ marginBottom: 16 }}>
          <span>⚠️ {errorMsg}</span>
        </div>
      )}

      {/* ── 1. TOP MULTI-FILTER TOOLBAR ── */}
      <div className="card lt-filters-card">
        <div className="lt-search-row">
          <span className="lt-search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="field-input lt-search-input"
            placeholder="Search chapters, topics, subtopics, examples, questions, or faculty name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setChaptersPage(1);
            }}
          />
          {searchTerm && (
            <button
              type="button"
              className="lt-search-clear"
              aria-label="Clear search"
              onClick={() => {
                setSearchTerm('');
                setChaptersPage(1);
              }}
            >
              ✕
            </button>
          )}
        </div>

        <div className="lt-filters-grid">
          <div className="lt-filter-field">
            <label className="field-label" htmlFor="p-syl-std">Standard</label>
            <select
              id="p-syl-std"
              className="filter-select"
              value={standard}
              onChange={(e) => {
                setStandard(e.target.value);
                setChaptersPage(1);
                setActivityPage(1);
              }}
            >
              <option value="ALL">All Standards (11 &amp; 12)</option>
              <option value="Standard 11">Standard 11</option>
              <option value="Standard 12">Standard 12</option>
            </select>
          </div>

          <div className="lt-filter-field">
            <label className="field-label" htmlFor="p-syl-div">Division</label>
            <select
              id="p-syl-div"
              className="filter-select"
              value={division}
              onChange={(e) => {
                setDivision(e.target.value);
                setChaptersPage(1);
                setActivityPage(1);
              }}
            >
              <option value="ALL">All Divisions (A &amp; B)</option>
              <option value="Division A">Division A</option>
              <option value="Division B">Division B</option>
            </select>
          </div>

          <div className="lt-filter-field">
            <label className="field-label" htmlFor="p-syl-subj">Subject</label>
            <select
              id="p-syl-subj"
              className="filter-select"
              value={subject}
              onChange={(e) => handleSubjectChange(e.target.value)}
            >
              <option value="ALL">All Subjects (Phy / Chem / Math / Bio)</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Biology">Biology</option>
            </select>
          </div>

          <div className="lt-filter-field">
            <label className="field-label" htmlFor="p-syl-fac">Faculty</label>
            <select
              id="p-syl-fac"
              className="filter-select"
              value={facultyId}
              onChange={(e) => {
                setFacultyId(e.target.value);
                setChaptersPage(1);
                setActivityPage(1);
              }}
            >
              <option value="ALL">All Faculty (Combined / Union)</option>
              {visibleFacultyOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.fullName} — {f.subject}
                </option>
              ))}
            </select>
          </div>

          <div className="lt-filter-field">
            <label className="field-label" htmlFor="p-syl-day">Day / Time Window</label>
            <select
              id="p-syl-day"
              className="filter-select"
              value={day}
              onChange={(e) => {
                setDay(e.target.value);
                setChaptersPage(1);
                setActivityPage(1);
              }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <div className="lt-filter-field">
            <label className="field-label" htmlFor="p-syl-status">Completion Badge</label>
            <select
              id="p-syl-status"
              className="filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setChaptersPage(1);
              }}
            >
              <option value="all">All (Completed + Uncompleted)</option>
              <option value="done">Completed Only</option>
              <option value="pending">Uncompleted Only</option>
            </select>
          </div>

          <div className="lt-filter-reset-wrap">
            {(standard !== 'ALL' || division !== 'ALL' || subject !== 'ALL' || facultyId !== 'ALL' || day !== 'all' || statusFilter !== 'all' || searchTerm) ? (
              <button type="button" className="btn btn-ghost btn-sm w-full" onClick={resetFilters}>
                ↺ Reset Filters
              </button>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm w-full" onClick={() => loadOverview(false)} disabled={isLoading}>
                {isLoading ? 'Syncing...' : '↻ Refresh Live'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. KPI SUMMARY CARDS ── */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__label">Overall Completion</div>
          <div className="kpi-card__value num">{summary.overallPercent}%</div>
          <div className="kpi-card__hint">
            {summary.doneUnits} / {summary.totalUnits} total syllabus units
          </div>
        </div>
        <div className="kpi-card is-success">
          <div className="kpi-card__label">Completed Units</div>
          <div className="kpi-card__value num">{summary.doneUnits}</div>
          <div className="kpi-card__hint">
            Topics: {summary.topics.done}/{summary.topics.total} · Ex: {summary.examples.done}/{summary.examples.total} · Sw: {summary.exercises.done}/{summary.exercises.total}
          </div>
        </div>
        <div className="kpi-card is-warning">
          <div className="kpi-card__label">Uncompleted Units</div>
          <div className="kpi-card__value num">{Math.max(0, summary.totalUnits - summary.doneUnits)}</div>
          <div className="kpi-card__hint">Remaining topics, examples &amp; exercises</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__label">Chapters Covered</div>
          <div className="kpi-card__value num">
            {summary.completedChapters}/{chapters.length}
          </div>
          <div className="kpi-card__hint">Fully completed across active filters</div>
        </div>
      </div>

      {/* ── 3. SUBJECT METER CARDS WITH MULTI-FACULTY CONTRIBUTORS ── */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card__head">
          <div>
            <div className="card__title">Subject-Wise Coverage &amp; Assigned Contributors</div>
            <div className="card__desc">Click any faculty badge to filter their exact completed units across standards</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(245px, 1fr))', gap: 14, marginTop: 12 }}>
          {subjectStats.map((s) => (
            <div
              key={s.subject}
              style={{
                background: '#FAFBFD',
                border: '1px solid #E4E7F2',
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{s.subject}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--slate)' }}>
                    {s.chapterCount} Chapter{s.chapterCount === 1 ? '' : 's'} • {s.doneUnits}/{s.totalUnits} Units
                  </div>
                </div>
                <span className="num" style={{ fontSize: 18, fontWeight: 800, color: '#123B5D' }}>
                  {s.overallPercent}%
                </span>
              </div>

              <div className="progress-track" style={{ background: '#E2E8F0', borderRadius: 6, height: 9, overflow: 'hidden' }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${s.overallPercent}%`,
                    background: s.overallPercent === 100 ? '#16A34A' : '#123B5D',
                    height: '100%',
                    borderRadius: 6,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11, color: '#475569' }}>
                <span className="chip chip-neutral" style={{ fontSize: 11 }}>Topics: {s.topics.done}/{s.topics.total}</span>
                <span className="chip chip-neutral" style={{ fontSize: 11 }}>Ex: {s.examples.done}/{s.examples.total}</span>
                <span className="chip chip-neutral" style={{ fontSize: 11 }}>Sw: {s.exercises.done}/{s.exercises.total}</span>
              </div>

              {Array.isArray(s.contributors) && s.contributors.length > 0 && (
                <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {s.contributors.map((c) => {
                    const isSelected = facultyId === c.facultyId || facultyId === c.facultyEmpCode;
                    return (
                      <button
                        key={`${s.subject}-${c.facultyId}`}
                        type="button"
                        onClick={() => {
                          setSubject(s.subject);
                          setFacultyId(isSelected ? 'ALL' : c.facultyId);
                          setChaptersPage(1);
                          setActivityPage(1);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '3px 9px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: isSelected ? '1px solid #123B5D' : '1px solid #CBD5E1',
                          background: isSelected ? '#123B5D' : c.doneUnits > 0 ? '#F0FDF4' : '#FFFFFF',
                          color: isSelected ? '#FFFFFF' : c.doneUnits > 0 ? '#166534' : '#475569',
                        }}
                        title="Click to toggle filter by this faculty member"
                      >
                        <span>{c.facultyName}</span>
                        <span>({c.facultySubject})</span>
                        <span className="num">• {c.doneUnits}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. UNIFIED ALL-SUBJECT SYLLABUS HIERARCHY BROWSER ── */}
      <div className="card" style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            background: '#F8FAFC',
            borderBottom: '1px solid var(--line-soft)',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <div className="card__title">
              All-Subject Curriculum Browser ({filteredChapters.length} Chapters)
            </div>
            <div className="card__desc">
              Every chapter, topic, subtopic, example &amp; exercise displays Completed/Uncompleted status and completing faculty name
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleExpandAllOnPage(true)}>
              Expand Page
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleExpandAllOnPage(false)}>
              Collapse Page
            </button>
          </div>
        </div>

        {isLoading && chapters.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>
            Loading unified curriculum tree from database...
          </div>
        ) : filteredChapters.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>
            No chapters match the current filter combination. Try resetting filters or switching Standard / Division.
          </div>
        ) : (
          <div>
            {paginatedChapters.map((chapter, chIdx) => {
              const chKey = chapter.id || chapter._id || `${chapter.subject}-${chapter.standard}-${chapter.division}-${chapter.chapterNo}`;
              const isChOpen = !!expandedChapters[chKey];
              const chStats = chapter.stats || { totalUnits: 0, doneUnits: 0, percent: 0 };
              const chBadgeStatus =
                chStats.totalUnits > 0 && chStats.doneUnits === chStats.totalUnits
                  ? 'done'
                  : chStats.doneUnits > 0
                    ? 'partial'
                    : 'pending';

              const chapterExamples = collectChapterExamples(chapter).filter((ex) => {
                if (statusFilter === 'done' && ex.status !== 'done') return false;
                if (statusFilter === 'pending' && ex.status === 'done') return false;
                return true;
              });
              const chapterExercises = collectChapterExercises(chapter).filter((sw) => {
                if (statusFilter === 'done' && sw.status !== 'done') return false;
                if (statusFilter === 'pending' && sw.status === 'done') return false;
                return true;
              });

              const sortedTopics = [...(chapter.topics || [])]
                .sort((a, b) => compareSyllabusCodes(a.topicNo, b.topicNo))
                .filter((t) => {
                  const tDone = isTopicCompleted(t);
                  if (statusFilter === 'done') {
                    return (
                      tDone ||
                      (t.subtopics || []).some(
                        (st) =>
                          isSubtopicCompleted(st) ||
                          (st.subSubtopics || []).some((sst) => sst.status === 'done')
                      )
                    );
                  }
                  if (statusFilter === 'pending') {
                    return !tDone;
                  }
                  return true;
                });

              const isExOpen = !!expandedExamples[chKey];
              const isSwOpen = !!expandedExercises[chKey];

              return (
                <div
                  key={chKey}
                  style={{
                    borderBottom: chIdx < paginatedChapters.length - 1 ? '1.5px solid #E2E8F0' : 'none',
                  }}
                >
                  {/* Chapter Accordion Header */}
                  <div
                    onClick={() => setExpandedChapters((prev) => ({ ...prev, [chKey]: !prev[chKey] }))}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 20px',
                      background: isChOpen ? '#F1F5F9' : '#FFFFFF',
                      cursor: 'pointer',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: '1 1 280px', minWidth: 0 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          background: chBadgeStatus === 'done' ? '#15803D' : '#123B5D',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 13.5,
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        {chBadgeStatus === 'done' ? '✓' : chapter.chapterNo}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', overflowWrap: 'anywhere' }}>
                            Ch {chapter.chapterNo}: {chapter.chapterName}
                            {hasDistinctGujarati(chapter.chapterName, chapter.chapterNameGujarati) && (
                              <span style={{ color: '#475569', fontWeight: 600, marginLeft: 6 }}>
                                ({chapter.chapterNameGujarati})
                              </span>
                            )}
                          </span>
                          <span className="chip chip-neutral" style={{ fontSize: 11 }}>
                            {chapter.subject} • {chapter.standard === 'Standard 11' ? 'Std 11' : 'Std 12'} • {chapter.division}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 6 }}>
                          <CompletionBadge
                            status={chBadgeStatus}
                            partialCount={`${chStats.doneUnits}/${chStats.totalUnits}`}
                          />
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 80, height: 6, background: '#CBD5E1', borderRadius: 4, overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${chStats.percent}%`,
                                  height: '100%',
                                  background: chBadgeStatus === 'done' ? '#16A34A' : '#123B5D',
                                }}
                              />
                            </div>
                            <span className="num" style={{ fontSize: 12, fontWeight: 800, color: '#123B5D' }}>
                              {chStats.percent}%
                            </span>
                          </div>
                          <FacultyContributorBadges completedBy={chapter.completedBy} maxShow={4} />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--slate)', fontWeight: 600 }}>
                        {isChOpen ? 'Hide ▲' : 'Inspect ▼'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Chapter Content */}
                  {isChOpen && (
                    <div style={{ padding: '14px 18px', background: '#FAFBFD', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {sortedTopics.map((topic) => {
                        const topicKey = `${chKey}::${topic.topicNo}`;
                        const isTopicOpen = expandedTopics[topicKey] !== false;
                        const tDone = isTopicCompleted(topic);
                        const tHasAnyContrib = (topic.completedBy || []).length > 0 && !tDone;
                        const tBadge = tDone ? 'done' : tHasAnyContrib ? 'partial' : 'pending';

                        const filteredSubtopics = [...(topic.subtopics || [])]
                          .sort((a, b) => compareSyllabusCodes(a.subtopicNo, b.subtopicNo))
                          .filter((st) => {
                            const stDone = isSubtopicCompleted(st);
                            if (statusFilter === 'done') {
                              return stDone || (st.subSubtopics || []).some((sst) => sst.status === 'done');
                            }
                            if (statusFilter === 'pending') return !stDone;
                            return true;
                          });

                        return (
                          <div
                            key={topicKey}
                            style={{
                              background: '#FFFFFF',
                              border: tDone ? '1.5px solid #86EFAC' : '1.5px solid #E2E8F0',
                              borderRadius: 11,
                              overflow: 'hidden',
                            }}
                          >
                            {/* Topic Header */}
                            <div
                              onClick={() => setExpandedTopics((prev) => ({ ...prev, [topicKey]: !isTopicOpen }))}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 14px',
                                background: tDone ? '#F0FDF4' : '#FFFFFF',
                                borderBottom: isTopicOpen ? '1px solid #E2E8F0' : 'none',
                                cursor: 'pointer',
                                flexWrap: 'wrap',
                                gap: 10,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 220px', minWidth: 0 }}>
                                <span
                                  className="num"
                                  style={{
                                    padding: '2px 8px',
                                    background: tDone ? '#DCFCE7' : '#E8F1F8',
                                    color: tDone ? '#15803D' : '#123B5D',
                                    borderRadius: 6,
                                    fontWeight: 800,
                                    fontSize: 12,
                                    flexShrink: 0,
                                  }}
                                >
                                  {topic.topicNo}
                                </span>
                                <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0F172A', minWidth: 0, overflowWrap: 'anywhere' }}>
                                  <span>{topic.title}</span>
                                  {hasDistinctGujarati(topic.title, topic.titleGujarati) && (
                                    <span style={{ color: '#475569', fontWeight: 500, marginLeft: 6 }}>
                                      ({topic.titleGujarati})
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div
                                style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <CompletionBadge status={tBadge} />
                                <FacultyContributorBadges completedBy={topic.completedBy} maxShow={2} />
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() =>
                                    setViewingItem({
                                      itemType: 'TOPIC',
                                      code: topic.topicNo,
                                      title: topic.title,
                                      titleGujarati: topic.titleGujarati,
                                      imageUrl: topic.imageUrl,
                                      figureNote: topic.figureNote,
                                      status: tDone ? 'done' : 'pending',
                                      completedBy: topic.completedBy || [],
                                      chapter,
                                    })
                                  }
                                >
                                  👁️ View
                                </button>
                              </div>
                            </div>

                            {/* Subtopics */}
                            {isTopicOpen && (
                              <div style={{ padding: '10px 12px', background: '#FAFBFD', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {filteredSubtopics.length > 0 ? (
                                  filteredSubtopics.map((st) => {
                                    const stDone = isSubtopicCompleted(st);
                                    const stPartial = !stDone && (st.completedBy || []).length > 0;
                                    const stBadge = stDone ? 'done' : stPartial ? 'partial' : 'pending';
                                    const sortedSst = [...(st.subSubtopics || [])]
                                      .sort((a, b) => compareSyllabusCodes(a.subSubtopicNo, b.subSubtopicNo))
                                      .filter((sst) => {
                                        if (statusFilter === 'done') return sst.status === 'done';
                                        if (statusFilter === 'pending') return sst.status !== 'done';
                                        return true;
                                      });

                                    return (
                                      <div
                                        key={`${topicKey}::${st.subtopicNo}`}
                                        style={{
                                          background: stDone ? '#F0FDF4' : '#FFFFFF',
                                          border: stDone ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                                          borderRadius: 8,
                                          overflow: 'hidden',
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '8px 12px',
                                            gap: 10,
                                            flexWrap: 'wrap',
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 200px', minWidth: 0 }}>
                                            <span
                                              className="num"
                                              style={{
                                                padding: '2px 7px',
                                                background: '#E8F1F8',
                                                color: '#123B5D',
                                                borderRadius: 5,
                                                fontWeight: 800,
                                                fontSize: 11.5,
                                                flexShrink: 0,
                                              }}
                                            >
                                              {st.subtopicNo}
                                            </span>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', minWidth: 0, overflowWrap: 'anywhere' }}>
                                              <span>{st.title}</span>
                                              {hasDistinctGujarati(st.title, st.titleGujarati) && (
                                                <span style={{ color: '#64748B', marginLeft: 5, fontSize: 12, fontWeight: 500 }}>
                                                  ({st.titleGujarati})
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            <CompletionBadge status={stBadge} />
                                            <FacultyContributorBadges completedBy={st.completedBy} maxShow={2} />
                                            <button
                                              type="button"
                                              className="btn btn-ghost btn-sm"
                                              onClick={() =>
                                                setViewingItem({
                                                  itemType: 'SUBTOPIC',
                                                  code: st.subtopicNo,
                                                  title: st.title,
                                                  titleGujarati: st.titleGujarati,
                                                  imageUrl: st.imageUrl,
                                                  figureNote: st.figureNote,
                                                  status: stDone ? 'done' : 'pending',
                                                  completedBy: st.completedBy || [],
                                                  parentTopicTitle: `${topic.topicNo} ${topic.title}`,
                                                  chapter,
                                                })
                                              }
                                            >
                                              👁️ View
                                            </button>
                                          </div>
                                        </div>

                                        {/* Sub-subtopics (Level 4) */}
                                        {sortedSst.length > 0 && (
                                          <div
                                            style={{
                                              borderTop: '1px dashed #E2E8F0',
                                              background: '#F8FAFC',
                                              padding: '7px 10px 7px 18px',
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: 5,
                                            }}
                                          >
                                            {sortedSst.map((sst) => {
                                              const sstDone = sst.status === 'done';
                                              return (
                                                <div
                                                  key={`${topicKey}::${st.subtopicNo}::${sst.subSubtopicNo}`}
                                                  style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '6px 10px',
                                                    background: sstDone ? '#F0FDF4' : '#FFFFFF',
                                                    border: sstDone ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                                                    borderRadius: 6,
                                                    gap: 8,
                                                    flexWrap: 'wrap',
                                                  }}
                                                >
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 180px', minWidth: 0 }}>
                                                    <span style={{ color: '#94A3B8' }}>↳</span>
                                                    <span
                                                      className="num"
                                                      style={{
                                                        padding: '1px 6px',
                                                        background: '#F1F5F9',
                                                        color: '#334155',
                                                        borderRadius: 4,
                                                        fontWeight: 700,
                                                        fontSize: 11,
                                                        flexShrink: 0,
                                                      }}
                                                    >
                                                      {sst.subSubtopicNo}
                                                    </span>
                                                    <span style={{ fontSize: 12.5, color: '#334155', overflowWrap: 'anywhere' }}>
                                                      {sst.title}
                                                    </span>
                                                  </div>

                                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <CompletionBadge status={sstDone ? 'done' : 'pending'} />
                                                    <FacultyContributorBadges completedBy={sst.completedBy} maxShow={2} />
                                                    <button
                                                      type="button"
                                                      className="btn btn-ghost btn-sm"
                                                      onClick={() =>
                                                        setViewingItem({
                                                          itemType: 'SUBSUBTOPIC',
                                                          code: sst.subSubtopicNo,
                                                          title: sst.title,
                                                          titleGujarati: sst.titleGujarati,
                                                          imageUrl: sst.imageUrl,
                                                          figureNote: sst.figureNote,
                                                          status: sstDone ? 'done' : 'pending',
                                                          completedBy: sst.completedBy || [],
                                                          parentTopicTitle: `${topic.topicNo} ${topic.title} / ${st.subtopicNo}`,
                                                          chapter,
                                                        })
                                                      }
                                                    >
                                                      👁️ View
                                                    </button>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div style={{ textAlign: 'center', padding: 8, fontSize: 12, color: 'var(--slate)' }}>
                                    No matching subtopics under this topic.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Examples Dropdown */}
                      <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 10, overflow: 'hidden' }}>
                        <div
                          onClick={() => setExpandedExamples((prev) => ({ ...prev, [chKey]: !isExOpen }))}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 14px',
                            cursor: 'pointer',
                            background: isExOpen ? '#F3E8FF' : '#FAF5FF',
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#6B21A8' }}>
                            💡 Examples ({chapterExamples.filter((e) => e.status === 'done').length}/{chapterExamples.length} completed)
                          </span>
                          <span style={{ fontSize: 12, color: '#6B21A8', fontWeight: 700 }}>
                            {isExOpen ? 'Hide ▲' : 'Show ▼'}
                          </span>
                        </div>
                        {isExOpen && (
                          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {chapterExamples.map((ex, idx) => (
                              <div
                                key={`${chKey}-ex-${ex.exampleNo}-${idx}`}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '8px 12px',
                                  background: ex.status === 'done' ? '#F0FDF4' : '#FFFFFF',
                                  border: ex.status === 'done' ? '1px solid #BBF7D0' : '1px solid #E9D5FF',
                                  borderRadius: 8,
                                  gap: 10,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 200px', minWidth: 0, flexWrap: 'wrap' }}>
                                  <span style={{ padding: '2px 8px', background: '#F3E8FF', color: '#7C3AED', borderRadius: 5, fontWeight: 800, fontSize: 11.5, flexShrink: 0 }}>
                                    {ex.exampleNo}
                                  </span>
                                  <span style={{ fontSize: 13, color: '#334155', overflowWrap: 'anywhere' }}>{ex.title}</span>
                                  {ex.imageUrl && (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '2px 7px',
                                        background: '#EFF6FF',
                                        border: '1px solid #BFDBFE',
                                        borderRadius: 5,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: '#1D4ED8',
                                      }}
                                    >
                                      🖼️ {ex.figureNote || 'આકૃતિ'}
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <CompletionBadge status={ex.status === 'done' ? 'done' : 'pending'} />
                                  <FacultyContributorBadges completedBy={ex.completedBy} maxShow={2} />
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() =>
                                      setViewingItem({
                                        itemType: 'EXAMPLE',
                                        code: ex.exampleNo,
                                        title: ex.title,
                                        titleGujarati: ex.titleGujarati,
                                        imageUrl: ex.imageUrl,
                                        figureNote: ex.figureNote,
                                        status: ex.status === 'done' ? 'done' : 'pending',
                                        completedBy: ex.completedBy || [],
                                        parentTopicTitle: ex.parentTopicTitle,
                                        chapter,
                                      })
                                    }
                                  >
                                    👁️ View
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Swadhyay Exercises Dropdown */}
                      <div style={{ background: '#FFFDF0', border: '1px solid #FDE68A', borderRadius: 10, overflow: 'hidden' }}>
                        <div
                          onClick={() => setExpandedExercises((prev) => ({ ...prev, [chKey]: !isSwOpen }))}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 14px',
                            cursor: 'pointer',
                            background: isSwOpen ? '#FEF3C7' : '#FFFDF0',
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#92400E' }}>
                            📝 Swadhyay Exercises ({chapterExercises.filter((s) => s.status === 'done').length}/{chapterExercises.length} completed)
                          </span>
                          <span style={{ fontSize: 12, color: '#92400E', fontWeight: 700 }}>
                            {isSwOpen ? 'Hide ▲' : 'Show ▼'}
                          </span>
                        </div>
                        {isSwOpen && (
                          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {chapterExercises.map((sw, idx) => (
                              <div
                                key={`${chKey}-sw-${sw.exerciseNo}-${idx}`}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '8px 12px',
                                  background: sw.status === 'done' ? '#F0FDF4' : '#FFFFFF',
                                  border: sw.status === 'done' ? '1px solid #BBF7D0' : '1px solid #FDE68A',
                                  borderRadius: 8,
                                  gap: 10,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 200px', minWidth: 0 }}>
                                  <span
                                    className="num"
                                    style={{
                                      minWidth: 42,
                                      height: 24,
                                      padding: '2px 7px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      background: '#FEF08A',
                                      color: '#854D0E',
                                      borderRadius: 5,
                                      fontWeight: 800,
                                      fontSize: 11.5,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {sw.exerciseNo}
                                  </span>
                                  <span style={{ fontSize: 13, color: '#451A03', overflowWrap: 'anywhere' }}>{sw.title}</span>
                                  {sw.imageUrl && (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '2px 7px',
                                        background: '#FEF3C7',
                                        border: '1px solid #FDE68A',
                                        borderRadius: 5,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: '#92400E',
                                      }}
                                    >
                                      🖼️ {sw.figureNote || 'આકૃતિ'}
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <CompletionBadge status={sw.status === 'done' ? 'done' : 'pending'} />
                                  <FacultyContributorBadges completedBy={sw.completedBy} maxShow={2} />
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() =>
                                      setViewingItem({
                                        itemType: 'SWADHYAY',
                                        code: `Q.${sw.exerciseNo}`,
                                        title: sw.title,
                                        titleGujarati: sw.titleGujarati,
                                        imageUrl: sw.imageUrl,
                                        figureNote: sw.figureNote,
                                        status: sw.status === 'done' ? 'done' : 'pending',
                                        completedBy: sw.completedBy || [],
                                        parentTopicTitle: sw.parentTopicTitle,
                                        chapter,
                                      })
                                    }
                                  >
                                    👁️ View
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <PaginationBar
          currentPage={safeChaptersPage}
          totalItems={filteredChapters.length}
          pageSize={CHAPTERS_PAGE_SIZE}
          onPageChange={setChaptersPage}
          itemLabel="chapters"
        />
      </div>

      {/* ── 6. RECENT FACULTY COMPLETION ACTIVITY LOG ── */}
      <div className="card" style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-soft)' }}>
          <div className="card__title">Faculty Syllabus Completion Log ({activityLog.length})</div>
          <div className="card__desc">Exact audit trail of who completed each topic, example, or exercise ({DAY_LABELS[day]})</div>
        </div>
        <div className="table-wrap" style={{ margin: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Completed At</th>
                <th>Faculty</th>
                <th>Subject Track</th>
                <th>Batch</th>
                <th>Chapter</th>
                <th>Completed Unit</th>
              </tr>
            </thead>
            <tbody>
              {activityLog.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 26, color: 'var(--slate)' }}>
                    No syllabus units completed matching the current Standard / Division / Subject / Faculty / Day filters.
                  </td>
                </tr>
              ) : (
                paginatedActivity.map((log) => (
                  <tr key={log.id}>
                    <td className="num" style={{ fontSize: 12 }}>{fmtDateTime(log.completedAt)}</td>
                    <td><strong>{log.facultyName}</strong></td>
                    <td><span className="chip chip-neutral">{log.facultySubject || log.subject}</span></td>
                    <td>{log.standard === 'Standard 11' ? 'Std 11' : 'Std 12'} · {log.division}</td>
                    <td>Ch {log.chapterNo}: {log.chapterName}</td>
                    <td>
                      <span className="chip chip-success" style={{ marginRight: 6, fontSize: 11 }}>{log.itemCode}</span>
                      <span>{log.itemTitle}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar
          currentPage={safeActivityPage}
          totalItems={activityLog.length}
          pageSize={ACTIVITY_PAGE_SIZE}
          onPageChange={setActivityPage}
          itemLabel="completion events"
        />
      </div>

      {/* ── INSPECT ITEM MODAL ── */}
      {viewingItem && (
        <div
          className="modal-overlay is-open"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setViewingItem(null);
          }}
        >
          <div className="modal-box" style={{ maxWidth: 640 }}>
            <div className="modal-box__head">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="chip chip-neutral">{viewingItem.itemType}</span>
                  <span className="chip chip-neutral num">{viewingItem.code}</span>
                </div>
                <div className="card__title">Curriculum Unit &amp; Attribution Details</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setViewingItem(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: '18px 0' }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: '#475569' }}>
                <div><strong>Subject &amp; Class:</strong> {viewingItem.chapter.subject} • {viewingItem.chapter.standard} • {viewingItem.chapter.division}</div>
                <div><strong>Chapter {viewingItem.chapter.chapterNo}:</strong> {viewingItem.chapter.chapterName}</div>
                {viewingItem.parentTopicTitle && (
                  <div><strong>Parent Topic:</strong> {viewingItem.parentTopicTitle}</div>
                )}
              </div>

              <div style={{ background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', marginBottom: 6, textTransform: 'uppercase' }}>
                  Unit Content
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {viewingItem.title}
                </div>
                {hasDistinctGujarati(viewingItem.title, viewingItem.titleGujarati) && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #CBD5E1', fontSize: 14, color: '#334155', whiteSpace: 'pre-wrap' }}>
                    {viewingItem.titleGujarati}
                  </div>
                )}
              </div>

              {/* Full Figure / Diagram Section */}
              {viewingItem.imageUrl && (
                <div style={{
                  background: '#FFFFFF',
                  border: '1.5px solid #BAE6FD',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #F0F9FF',
                    paddingBottom: 8,
                    flexWrap: 'wrap',
                    gap: 8,
                  }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0369A1', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>🖼️ Question Diagram / Figure</span>
                      {viewingItem.figureNote && (
                        <span style={{
                          background: '#E0F2FE',
                          color: '#0369A1',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11.5,
                          fontWeight: 800,
                        }}>
                          {viewingItem.figureNote}
                        </span>
                      )}
                    </div>
                    <a
                      href={viewingItem.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 12,
                        color: '#0284C7',
                        textDecoration: 'none',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>🔍 Full Size ↗</span>
                    </a>
                  </div>
                  <div style={{
                    textAlign: 'center',
                    background: '#F8FAFC',
                    padding: 14,
                    borderRadius: 8,
                    border: '1px solid #E2E8F0',
                  }}>
                    <img
                      src={viewingItem.imageUrl}
                      alt={viewingItem.figureNote || viewingItem.title}
                      style={{
                        maxWidth: '100%',
                        maxHeight: 420,
                        objectFit: 'contain',
                        borderRadius: 6,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ background: '#F0F7FC', border: '1px solid #C8DBED', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: '#123B5D' }}>Faculty Completion Attribution</span>
                  <CompletionBadge status={viewingItem.status} />
                </div>
                {viewingItem.completedBy && viewingItem.completedBy.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {viewingItem.completedBy.map((c) => (
                      <div
                        key={c.facultyId}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 6,
                          padding: '6px 10px',
                          background: '#FFFFFF',
                          borderRadius: 7,
                          border: '1px solid #D1E1EF',
                          fontSize: 12.5,
                        }}
                      >
                        <span>
                          <strong>{c.facultyName}</strong> ({c.facultySubject})
                        </span>
                        <span className="num" style={{ fontSize: 11.5, color: 'var(--slate)' }}>
                          {fmtDateTime(c.completedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: '#92400E' }}>
                    No faculty has marked this unit completed under the active filters yet.
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: 12 }}>
              <button type="button" className="btn btn-primary" onClick={() => setViewingItem(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
