import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function StudentLtAnalysis() {
  const { setHeader } = useOutletContext()
  const { studentData } = useData()
  useEffect(() => setHeader({ title: 'LT Analysis', subtitle: 'Daily Lecture Test performance, subject by subject' }), [setHeader])

  const lt = studentData.lt || { thisWeek: [], growthRateByWeek: [], weakTopics: [], history: [] }
  const [openModal, setOpenModal] = useState(null)
  const [subjectFilter, setSubjectFilter] = useState('ALL')
  const [scoreFilter, setScoreFilter] = useState('ALL')

  const filteredHistory = (lt.history || []).filter(h => {
    if (subjectFilter !== 'ALL' && h.subject !== subjectFilter) return false
    if (scoreFilter !== 'ALL' && h.score !== scoreFilter) return false
    return true
  })

  const thisWeekChartData = {
    labels: (lt.thisWeek || []).map(t => t.subject),
    datasets: [{
      data: (lt.thisWeek || []).map(t => t.value),
      backgroundColor: (lt.thisWeek || []).map(t => t.level === 'Excellent' ? '#2F8F5B' : t.level === 'Better' ? '#3D6FE0' : '#D99A2B'),
      borderRadius: 6,
      maxBarThickness: 50
    }]
  }

  const thisWeekOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 3, ticks: { stepSize: 1, callback: v => ({ 0: '', 1: 'Good', 2: 'Better', 3: 'Excellent' })[v], font: { family: 'Manrope', size: 11 } }, grid: { color: '#EEF0F8' } },
      x: { grid: { display: false }, ticks: { font: { family: 'Manrope', weight: 600 } } }
    }
  }

  const growthChartData = {
    labels: (lt.growthRateByWeek || []).map(w => w.week),
    datasets: [{
      data: (lt.growthRateByWeek || []).map(w => w.value),
      backgroundColor: '#123B5D',
      borderRadius: 6,
      maxBarThickness: 50
    }]
  }

  const growthOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, max: 100, grid: { color: '#EEF0F8' }, ticks: { font: { family: 'IBM Plex Mono' } } },
      x: { grid: { display: false }, ticks: { font: { family: 'Manrope', weight: 600 } } }
    }
  }

  return (
    <div className="content">
      <div className="grid-2">
        <div className="card chart-card">
          <div className="card__title" style={{ marginBottom: 14 }}>This Week</div>
          <div style={{ height: 190 }}><Bar data={thisWeekChartData} options={thisWeekOptions} /></div>
        </div>
        <div className="card chart-card">
          <div className="card__title" style={{ marginBottom: 14 }}>Growth Rate (Weekly Average)</div>
          <div style={{ height: 190 }}><Bar data={growthChartData} options={growthOptions} /></div>
        </div>
      </div>

      <div className="card">
        <div className="card__head">
          <div>
            <div className="card__title">Weak Topic List</div>
            <div className="card__desc">Topics scored "Good" — worth a quick revision</div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>LT No</th><th>Subject</th><th>Date</th><th>Score</th><th>Action</th></tr></thead>
            <tbody>
              {(lt.weakTopics || []).map(w => (
                <tr key={w.ltNo}>
                  <td className="num">{w.ltNo}</td><td>{w.subject}</td><td className="num">{w.date}</td>
                  <td><span className="chip chip-warning">{w.score}</span></td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => setOpenModal(w)}>View Topic</button></td>
                </tr>
              ))}
              {(!lt.weakTopics || lt.weakTopics.length === 0) && (
                <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--slate)', padding:18 }}>No weak topics this week — great job!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card__head">
          <div><div className="card__title">LT History</div></div>
        </div>
        <div className="filters">
          <select className="filter-select" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
            <option value="ALL">All Subjects</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Maths">Maths</option>
            <option value="Biology">Biology</option>
          </select>
          <select className="filter-select" value={scoreFilter} onChange={e => setScoreFilter(e.target.value)}>
            <option value="ALL">All Scores</option>
            <option value="Excellent">Excellent</option>
            <option value="Better">Better</option>
            <option value="Good">Good</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>LT No</th><th>Subject</th><th>Date</th><th>Score</th><th>Action</th></tr></thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--slate)', padding: 18 }}>No LTs match current filters.</td></tr>
              ) : filteredHistory.map(h => (
                <tr key={h.ltNo}>
                  <td className="num">{h.ltNo}</td><td>{h.subject}</td><td className="num">{h.date}</td>
                  <td><span className={`chip ${h.score==='Excellent'?'chip-success':h.score==='Better'?'chip-neutral':'chip-warning'}`}>{h.score}</span></td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => setOpenModal(h)}>View Topic</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openModal && (
        <div className="modal-overlay is-open" onClick={e => { if(e.target.classList.contains('modal-overlay')) setOpenModal(null) }}>
          <div className="modal-box">
            <div className="modal-box__head">
              <div>
                <div className="card__title">LT #{openModal.ltNo} — {openModal.subject}</div>
                <div className="card__desc num">{openModal.date}</div>
              </div>
              <button className="modal-close" onClick={() => setOpenModal(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
              </button>
            </div>
            <div className="detail-panel__row"><span>Topic</span><span style={{ overflowWrap: 'break-word', wordBreak: 'normal' }}>{openModal.topic}</span></div>
            <div className="detail-panel__row"><span>Score</span><span>{openModal.score}</span></div>
          </div>
        </div>
      )}
    </div>
  )
}

