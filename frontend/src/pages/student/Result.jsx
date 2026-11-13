import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'

export default function StudentResult() {
  const { setHeader } = useOutletContext()
  const { user } = useAuth()
  const { studentData } = useData()
  useEffect(() => setHeader({ title: 'Result', subtitle: 'Weekly, Monthly and Annual result sheets' }), [setHeader])

  const stats = studentData.resultStats || { total: 48, weekly: 12, monthly: 24, annual: 12 }
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [stdFilter, setStdFilter] = useState('ALL')
  const [previewResult, setPreviewResult] = useState(null)

  const history = (studentData.resultHistory || []).filter(r => {
    if (typeFilter !== 'ALL' && r.type !== typeFilter) return false
    if (stdFilter !== 'ALL' && !String(r.standard || '').startsWith(stdFilter)) return false
    return true
  })

  return (
    <div className="content">
      <div className="kpi-grid">
        {[['Total Result', stats.total], ['Weekly', stats.weekly], ['Monthly', stats.monthly], ['Annual', stats.annual]].map(([l, v]) => (
          <div className="kpi-card" key={l}><div className="kpi-card__label">{l}</div><div className="kpi-card__value num">{v}</div></div>
        ))}
      </div>

      <div className="card">
        <div className="card__head"><div className="card__title">Result Sheets ({history.length})</div></div>
        <div className="filters">
          <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="ALL">All Types</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="Annual">Annual</option>
          </select>
          <select className="filter-select" value={stdFilter} onChange={e => setStdFilter(e.target.value)}>
            <option value="ALL">All Standards</option>
            <option value="11">Std 11</option>
            <option value="12">Std 12</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Sr No</th><th>Type</th><th>Standard</th><th>Date</th><th>Action</th></tr></thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--slate)' }}>No result sheets match selected filters.</td></tr>
              ) : history.map((r, i) => (
                <tr key={`${r.srNo}-${i}`}>
                  <td className="num">{i + 1}</td>
                  <td><span className="chip chip-neutral">{r.type}</span></td>
                  <td className="num">{r.standard}</td>
                  <td className="num">{r.date}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setPreviewResult(r)}>View</button>
                      <button className="btn btn-primary btn-sm" onClick={() => { setPreviewResult(r); setTimeout(() => window.print(), 150) }}>Download</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {previewResult && (
        <div className="modal-overlay is-open" onClick={e => { if (e.target.classList.contains('modal-overlay')) setPreviewResult(null) }}>
          <div className="modal-box" style={{ maxWidth: 620 }}>
            <div className="modal-box__head">
              <div>
                <div className="card__title">Result Sheet — {previewResult.type}</div>
                <div className="card__desc">Standard {previewResult.standard} · Published {previewResult.date}</div>
              </div>
              <button className="modal-close" onClick={() => setPreviewResult(null)}>✕</button>
            </div>
            <div className="detail-panel" style={{ marginBottom: 14 }}>
              <div className="detail-panel__row"><span>Student</span><strong>{user?.name || studentData.student?.name || 'Student'}</strong></div>
              <div className="detail-panel__row"><span>Roll Number</span><span className="num">#{user?.rollNo || studentData.student?.rollNo || 1}</span></div>
              <div className="detail-panel__row"><span>Class</span><span>Std {previewResult.standard}</span></div>
            </div>
            <div className="table-wrap" style={{ marginBottom: 14 }}>
              <table>
                <thead><tr><th>Subject</th><th>Score</th><th>Percentile</th><th>Rank</th></tr></thead>
                <tbody>
                  {(studentData.examResults || []).map((ex, idx) => (
                    <tr key={idx}>
                      <td><strong>{ex.subject}</strong></td>
                      <td className="num">{ex.score}%</td>
                      <td className="num">{ex.percentile}</td>
                      <td className="num">#{ex.rank}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Print / Save PDF</button>
              <button className="btn btn-primary btn-sm" onClick={() => setPreviewResult(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

