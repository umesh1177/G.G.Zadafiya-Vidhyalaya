import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useData } from '../../context/DataContext'

export default function HallTicket() {
  const { setHeader } = useOutletContext()
  const { assistantData, publishHallTicket } = useData()
  useEffect(() => setHeader({ title: 'Hall Ticket Generation', subtitle: 'Generate, publish, download and view hall ticket generation records' }), [setHeader])

  const [activeTab, setActiveTab] = useState('generate-new')
  const [standard, setStandard] = useState('12')
  const [type, setType] = useState('Board')
  const [subjects, setSubjects] = useState([
    { subject: 'Physics', date: '19 May 2026' },
    { subject: 'Chemistry', date: '20 May 2026' },
    { subject: 'Maths', date: '21 May 2026' },
  ])
  const [newSubject, setNewSubject] = useState('')
  const [newDate, setNewDate] = useState('')
  const [generated, setGenerated] = useState(false)
  const [bannerMsg, setBannerMsg] = useState(null)
  const [viewBatch, setViewBatch] = useState(null)

  const generatedList = assistantData.hallTicketGeneratedList || []
  const history = assistantData.hallTicketHistory || []

  function addSubject() {
    if (!newSubject) return
    setSubjects(p => [...p, { subject: newSubject, date: newDate || '—' }])
    setNewSubject(''); setNewDate('')
  }

  function handlePublishAll() {
    publishHallTicket({ standard, type })
    setBannerMsg(`Hall Tickets for Std ${standard} (${type}) published to History & Student Portal!`)
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

      <div className="tabs">
        {[['generate-new','Generate New Hall Ticket'],['history','Hall Ticket History']].map(([k,l]) => (
          <button key={k} className={`tab-btn${activeTab===k?' is-active':''}`} onClick={() => setActiveTab(k)}>{l}</button>
        ))}
      </div>

      {activeTab === 'generate-new' && (
        <>
          <div className="card">
            <div className="card__title" style={{ marginBottom: 16 }}>Hall Ticket Setup</div>
            <div className="form-grid" style={{ marginBottom: 16 }}>
              <div>
                <label className="field-label">Standard</label>
                <select className="filter-select w-full" value={standard} onChange={e => setStandard(e.target.value)}>
                  <option value="11">11</option>
                  <option value="12">12</option>
                </select>
              </div>
              <div>
                <label className="field-label">Exam Type</label>
                <select className="filter-select w-full" value={type} onChange={e => setType(e.target.value)}>
                  <option value="Board">Board</option>
                  <option value="GUJCET">GUJCET</option>
                  <option value="JEE">JEE</option>
                  <option value="NEET">NEET</option>
                </select>
              </div>
            </div>
            <label className="field-label">Add Subject in Hall Ticket</label>
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
            <div className="form-grid" style={{ margin:'16px 0' }}>
              <div><label className="field-label">Upload Format</label><div className="upload-box">Click or drag a file here</div></div>
            </div>
            <button className="btn btn-primary" onClick={() => setGenerated(true)}>Generate Hall Ticket</button>
          </div>

          {generated && (
            <div className="card">
              <div className="card__head">
                <div className="card__title">Generated Hall Ticket List (Std {standard} · {type})</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary btn-sm" onClick={handlePublishAll}>Publish All</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Download All</button>
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
                            <button className="btn btn-ghost btn-sm" onClick={() => setBannerMsg(`Published hall ticket for ${r.name} (Roll #${r.rollNo}).`)}>Publish</button>
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

      {activeTab === 'history' && (
        <div className="card">
          <div className="card__head"><div className="card__title">Hall Ticket History Records ({history.length})</div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Sr No</th><th>Standard</th><th>Date</th><th>Exam Type</th><th>Action</th></tr></thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={`${h.srNo}-${i}`}>
                    <td className="num">{i + 1}</td><td className="num">Std {h.standard}</td>
                    <td className="num">{h.date}</td><td><span className="chip chip-neutral">{h.type}</span></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => setViewBatch(h)}>View All</button></td>
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
                <div className="card__title">Hall Ticket Batch – Std {viewBatch.standard}</div>
                <div className="card__desc">{viewBatch.type} Examination · {viewBatch.date}</div>
              </div>
              <button className="modal-close" onClick={() => setViewBatch(null)}>✕</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate)', marginBottom: 6 }}>Scheduled Subjects</div>
              <div className="added-list" style={{ marginBottom: 0 }}>
                {subjects.map((s, i) => (
                  <span key={i} className="added-chip">{s.subject} – {s.date}</span>
                ))}
              </div>
            </div>
            <div className="table-wrap" style={{ marginBottom: 14 }}>
              <table>
                <thead><tr><th>Roll No</th><th>Student Name</th><th>Status</th></tr></thead>
                <tbody>
                  {generatedList.map(r => (
                    <tr key={r.rollNo}>
                      <td className="num">{r.rollNo}</td>
                      <td><strong>{r.name}</strong></td>
                      <td><span className="chip chip-success">Issued</span></td>
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

