import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useData } from '../../context/DataContext'

export default function AssistantResult() {
  const { setHeader } = useOutletContext()
  const { assistantData, publishResult } = useData()
  useEffect(() => setHeader({ title: 'Result Generation', subtitle: 'Weekly, Monthly and Annual result sheets' }), [setHeader])

  const [activeTab, setActiveTab] = useState('generate-result')
  const [standard, setStandard] = useState('12')
  const [type, setType] = useState('Weekly')
  const [division, setDivision] = useState('A')
  const [subjects, setSubjects] = useState([
    { subject: 'Physics', date: '19 May 2026' },
    { subject: 'Chemistry', date: '20 May 2026' },
  ])
  const [newSubject, setNewSubject] = useState('')
  const [newDate, setNewDate] = useState('')
  const [generated, setGenerated] = useState(false)
  const [bannerMsg, setBannerMsg] = useState(null)
  const [viewBatch, setViewBatch] = useState(null)

  const [filterType, setFilterType] = useState('ALL')
  const [filterStd, setFilterStd] = useState('ALL')
  const [filterDiv, setFilterDiv] = useState('ALL')

  const stats = assistantData.resultStats || { total: 48, weekly: 12, monthly: 24, annual: 12 }
  const generatedList = assistantData.resultGeneratedList || []
  const history = (assistantData.resultHistory || []).filter(r => {
    if (filterType !== 'ALL' && r.type !== filterType) return false
    if (filterStd !== 'ALL' && String(r.standard) !== filterStd) return false
    if (filterDiv !== 'ALL' && r.division !== filterDiv) return false
    return true
  })

  function addSubject() {
    if (!newSubject) return
    setSubjects(p => [...p, { subject: newSubject, date: newDate || '—' }])
    setNewSubject(''); setNewDate('')
  }

  function handlePublishAll() {
    publishResult({ standard, division, type })
    setBannerMsg(`Result batch for Std ${standard}-${division} (${type}) published to Result History & Student Portal!`)
    setTimeout(() => setBannerMsg(null), 5000)
  }

  return (
    <div className="content">
      {bannerMsg && (
        <div className="banner banner-success" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span>✅ {bannerMsg}</span>
          <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => setBannerMsg(null)}>✕</button>
        </div>
      )}

      <div className="kpi-grid">
        {[['Total Result', stats.total], ['Weekly', stats.weekly], ['Monthly', stats.monthly], ['Annual', stats.annual]].map(([l,v]) => (
          <div className="kpi-card" key={l}><div className="kpi-card__label">{l}</div><div className="kpi-card__value num">{v}</div></div>
        ))}
      </div>

      <div className="tabs">
        {[['generate-result','Generate New Result'],['result-history','Result History']].map(([k,l]) => (
          <button key={k} className={`tab-btn${activeTab===k?' is-active':''}`} onClick={() => setActiveTab(k)}>{l}</button>
        ))}
      </div>

      {activeTab === 'generate-result' && (
        <>
          <div className="card">
            <div className="card__title" style={{ marginBottom: 16 }}>Result Setup</div>
            <div className="form-grid" style={{ marginBottom: 16 }}>
              <div>
                <label className="field-label">Standard</label>
                <select className="filter-select w-full" value={standard} onChange={e => setStandard(e.target.value)}>
                  <option value="11">11</option>
                  <option value="12">12</option>
                </select>
              </div>
              <div>
                <label className="field-label">Type</label>
                <select className="filter-select w-full" value={type} onChange={e => setType(e.target.value)}>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Annual">Annual</option>
                </select>
              </div>
              <div>
                <label className="field-label">Division</label>
                <select className="filter-select w-full" value={division} onChange={e => setDivision(e.target.value)}>
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
              </div>
              <div><label className="field-label">Upload Format</label><div className="upload-box">Click or drag a file here</div></div>
            </div>
            <label className="field-label">Add Subject</label>
            <div className="step-row">
              <select className="filter-select" style={{ flex: '1 1 160px', minWidth: 0 }} value={newSubject} onChange={e => setNewSubject(e.target.value)}>
                <option value="">Select Subject</option>
                {['Physics','Chemistry','Maths','Biology','English','Computer'].map(s => <option key={s}>{s}</option>)}
              </select>
              <input type="date" className="field-input" style={{ flex: '1 1 150px', minWidth: 0 }} value={newDate} onChange={e => setNewDate(e.target.value)} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={addSubject}>+ Add</button>
            </div>
            <div className="added-list">
              {subjects.map((s,i) => (
                <div className="added-chip" key={i}>
                  <span>{s.subject} – {s.date}</span>
                  <button type="button" aria-label="Remove" onClick={() => setSubjects(p => p.filter((_,j) => j!==i))}>×</button>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={() => setGenerated(true)}>Generate Result</button>
          </div>

          {generated && (
            <div className="card">
              <div className="card__head">
                <div className="card__title">Generated Result List (Std {standard}-{division} · {type})</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary btn-sm" onClick={handlePublishAll}>Publish All</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Print All</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setBannerMsg(`Prepared result download sheet for Std ${standard}-${division}.`); }}>Download All</button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Roll No</th><th>Name</th><th>Action</th></tr></thead>
                  <tbody>
                    {generatedList.map(r => (
                      <tr key={r.rollNo}>
                        <td className="num">{r.rollNo}</td><td>{r.name}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setBannerMsg(`Published individual result for ${r.name} (Roll #${r.rollNo}).`); }}>Publish</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Download</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'result-history' && (
        <div className="card">
          <div className="card__head"><div className="card__title">Result History ({history.length})</div></div>
          <div className="filters">
            <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="ALL">All Types</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Annual">Annual</option>
            </select>
            <select className="filter-select" value={filterStd} onChange={e => setFilterStd(e.target.value)}>
              <option value="ALL">All Standards</option>
              <option value="11">11</option>
              <option value="12">12</option>
            </select>
            <select className="filter-select" value={filterDiv} onChange={e => setFilterDiv(e.target.value)}>
              <option value="ALL">All Divisions</option>
              <option value="A">A</option>
              <option value="B">B</option>
            </select>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Sr No</th><th>Standard</th><th>Division</th><th>Date</th><th>Type</th><th>Action</th></tr></thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--slate)' }}>No results match current filters.</td></tr>
                ) : history.map((r, i) => (
                  <tr key={`${r.srNo}-${i}`}>
                    <td className="num">{i + 1}</td><td className="num">{r.standard}</td><td className="num">{r.division}</td>
                    <td className="num">{r.date}</td><td><span className="chip chip-neutral">{r.type}</span></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => setViewBatch(r)}>View All</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewBatch && (
        <div className="modal-overlay is-open" onClick={e => { if (e.target.classList.contains('modal-overlay')) setViewBatch(null) }}>
          <div className="modal-box" style={{ maxWidth: 640 }}>
            <div className="modal-box__head">
              <div>
                <div className="card__title">Result Batch – Std {viewBatch.standard}-{viewBatch.division}</div>
                <div className="card__desc">{viewBatch.type} Result · {viewBatch.date}</div>
              </div>
              <button className="modal-close" onClick={() => setViewBatch(null)}>✕</button>
            </div>
            <div className="table-wrap" style={{ marginBottom: 14 }}>
              <table>
                <thead><tr><th>Roll No</th><th>Student Name</th><th>Status</th></tr></thead>
                <tbody>
                  {generatedList.map(r => (
                    <tr key={r.rollNo}>
                      <td className="num">{r.rollNo}</td>
                      <td><strong>{r.name}</strong></td>
                      <td><span className="chip chip-success">Published</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Print Batch</button>
              <button className="btn btn-primary btn-sm" onClick={() => setViewBatch(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

