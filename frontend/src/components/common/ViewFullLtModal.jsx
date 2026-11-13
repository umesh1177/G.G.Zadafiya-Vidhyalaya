import React from 'react';

export default function ViewFullLtModal({ lt, onClose, onStartTimer, onFinishLt, footerExtra }) {
  if (!lt) return null;

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const stdLabel = lt.standard === 'STD_11' || lt.standard === 'Standard 11' ? 'Standard 11' : 'Standard 12';
  const divLabel = lt.division && lt.division !== 'ALL' ? `Division ${lt.division}` : 'All Divisions';
  const mins = lt.duration !== undefined ? lt.duration : 15;
  const secs = lt.durationSeconds || 0;
  const durationLabel = secs > 0 ? `${mins} min ${String(secs).padStart(2, '0')} sec` : `${mins} min`;

  const questions = (lt.questions && lt.questions.length > 0)
    ? lt.questions
    : (lt.topicsCovered || []).map((t, i) => ({ questionNo: i + 1, questionText: t }));

  return (
    <div
      className="modal-overlay is-open"
      onClick={(e) => {
        if (e.target.classList.contains('modal-overlay')) onClose();
      }}
    >
      <div
        className="modal-box"
        style={{
          maxWidth: 680,
          padding: 0,
          borderRadius: 18,
          border: '1px solid #D1DDE8',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92dvh',
        }}
      >
        {/* ── Attractive STS Navy Header Banner ── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #123B5D 0%, #1B4E78 100%)',
            padding: '18px 22px',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            borderRadius: '18px 18px 0 0',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span
                style={{
                  background: 'rgba(255,255,255,0.16)',
                  border: '1px solid rgba(255,255,255,0.28)',
                  color: '#FFFFFF',
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: 11.5,
                  fontWeight: 700,
                }}
              >
                LT #{lt.ltNo || 1} • Daily LT
              </span>
              <span
                style={{
                  background:
                    lt.status === 'EVALUATED' ? '#1F9D6B' :
                    lt.status === 'CONDUCTED' ? '#D99A2B' : 'rgba(142, 197, 255, 0.25)',
                  color: '#FFFFFF',
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: 11.5,
                  fontWeight: 700,
                }}
              >
                {lt.status === 'EVALUATED' ? '✓ Evaluated' : lt.status === 'CONDUCTED' ? 'Pending Marks' : 'Scheduled'}
              </span>
            </div>
            <h2 style={{ fontSize: 21, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              LT — {lt.subject}
            </h2>
            <div style={{ fontSize: 13, color: '#BEDBFF', marginTop: 4 }}>
              {stdLabel} ({divLabel}){lt.facultyName ? ` • Set by ${lt.facultyName}` : ''}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#FFFFFF',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* ── Modal Body ── */}
        <div style={{ padding: '18px 22px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
          {/* 4 Metric Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 10 }}>
            <div style={{ background: '#F6F7FB', border: '1px solid #E4E7F2', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7290', textTransform: 'uppercase' }}>Date</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1C2340', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                {formatDate(lt.examDate)}
              </div>
            </div>

            <div style={{ background: '#F6F7FB', border: '1px solid #E4E7F2', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7290', textTransform: 'uppercase' }}>Standard</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#123B5D', marginTop: 3 }}>
                {stdLabel}
              </div>
            </div>

            <div style={{ background: '#F6F7FB', border: '1px solid #E4E7F2', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7290', textTransform: 'uppercase' }}>Duration</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1C2340', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                {durationLabel}
              </div>
            </div>

            <div style={{ background: '#F6F7FB', border: '1px solid #E4E7F2', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7290', textTransform: 'uppercase' }}>Questions</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1F9D6B', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                {questions.length} {questions.length === 1 ? 'Question' : 'Questions'}
              </div>
            </div>
          </div>

          {/* Questions List */}
          <div style={{ background: '#FAFBFD', border: '1px solid #E4E7F2', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#123B5D', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📝</span>
              <span>Lecture Test Questions &amp; Covered Topics</span>
            </div>

            {questions.length === 0 ? (
              <div style={{ color: '#6B7290', fontSize: 13 }}>No questions listed for this LT.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {questions.map((q, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E4E7F2',
                      borderRadius: 9,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        background: '#E8F1F8',
                        color: '#123B5D',
                        border: '1px solid #C8DBED',
                        borderRadius: 6,
                        padding: '2px 8px',
                        fontSize: 11.5,
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        marginTop: 1,
                      }}
                    >
                      Question {q.questionNo || idx + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.8, fontWeight: 600, color: '#1C2340', lineHeight: 1.5 }}>
                        {q.questionText}
                      </div>
                      {q.sourceTopicCode && q.sourceTopicCode !== 'MANUAL' && (
                        <div style={{ fontSize: 11.5, color: '#6B7290', marginTop: 3 }}>
                          Source Topic: {q.sourceTopicCode}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {lt.note && (
            <div style={{ background: '#FBF2E1', border: '1px solid #EED5A3', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#78350F' }}>
              <strong>Evaluator Instructions:</strong> {lt.note}
            </div>
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div
          style={{
            padding: '14px 22px',
            background: '#FAFBFD',
            borderTop: '1px solid #E4E7F2',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            borderRadius: '0 0 18px 18px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {onStartTimer && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose();
                  onStartTimer(lt);
                }}
              >
                ▶ Start LT Timer
              </button>
            )}
            {onFinishLt && lt.status === 'SCHEDULED' && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ borderColor: '#1F9D6B', color: '#1F9D6B' }}
                onClick={() => {
                  onClose();
                  onFinishLt(lt);
                }}
              >
                ✓ Finish LT (Move to Pending)
              </button>
            )}
            {footerExtra}
          </div>

          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

