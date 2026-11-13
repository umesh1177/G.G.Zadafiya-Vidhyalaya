import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { Bar, Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend)

export default function StudentProgressReport() {
  const { setHeader } = useOutletContext()
  const { studentData } = useData()
  useEffect(() => setHeader({ title: 'Progress Report', subtitle: 'Your personal trend, weekly and monthly' }), [setHeader])

  const [activeTab, setActiveTab] = useState('monthly-report')
  const report = studentData.progressReport || {}
  const weekly = report.weekly || {}
  const monthly = report.monthly || {}
  const principal = report.principal || {}

  const weeklySubjectData = {
    labels: (weekly.subjectAverages || []).map(s => s.subject),
    datasets: [{
      data: (weekly.subjectAverages || []).map(s => s.avg),
      backgroundColor: '#123B5D', borderRadius: 6, maxBarThickness: 42
    }]
  }

  const monthlyTrendData = {
    labels: (monthly.trend || []).map(t => t.week),
    datasets: [{
      data: (monthly.trend || []).map(t => t.avg),
      borderColor: '#123B5D', backgroundColor: 'rgba(59,79,224,0.08)', fill: true, tension: 0.35, pointRadius: 4, pointBackgroundColor: '#123B5D'
    }]
  }

  const monthCompData = {
    labels: ['Last Month', 'This Month'],
    datasets: [{
      data: [monthly.monthComparison?.lastMonth || 0, monthly.monthComparison?.thisMonth || 0],
      backgroundColor: ['#98A0BC', '#123B5D'], borderRadius: 6, maxBarThickness: 50
    }]
  }

  const poorStudentData = {
    labels: (principal.poorStudentGraph || []).map(s => s.subject),
    datasets: [{
      data: (principal.poorStudentGraph || []).map(s => s.percentWeak),
      backgroundColor: '#E0473D', borderRadius: 6, maxBarThickness: 42
    }]
  }

  const chartOpts = (max = 100) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, max, grid: { color: '#EEF0F8' }, ticks: { font: { family: 'IBM Plex Mono' } } },
      x: { grid: { display: false }, ticks: { font: { family: 'Manrope', weight: 600 } } }
    }
  })

  const lineOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: false, grid: { color: '#EEF0F8' }, ticks: { font: { family: 'IBM Plex Mono' } } },
      x: { grid: { display: false }, ticks: { font: { family: 'Manrope', weight: 600 } } }
    }
  }

  return (
    <div className="content">
      <div className="tabs">
        {[
          ['weekly-report', 'Weekly'],
          ['monthly-report', 'Monthly (Student/Parent)'],
          ['principal-report', 'Principal View']
        ].map(([k, l]) => (
          <button key={k} className={`tab-btn${activeTab === k ? ' is-active' : ''}`} onClick={() => setActiveTab(k)}>{l}</button>
        ))}
      </div>

      {activeTab === 'weekly-report' && (
        <>
          <div className="banner banner-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12.5 4.2 4.2L19 6.8"/></svg>
            <span>{weekly.message}</span>
          </div>
          <div className="kpi-grid">
            <div className="kpi-card"><div className="kpi-card__label">My Average (This Week)</div><div className="kpi-card__value num">{weekly.average}%</div></div>
            <div className="kpi-card is-success"><div className="kpi-card__label">Growth vs Last Week</div><div className="kpi-card__value num text-success">+{weekly.growthVsLastWeek}%</div></div>
            <div className="kpi-card"><div className="kpi-card__label">Rank</div><div className="kpi-card__value num">#{weekly.rank}</div><div className="kpi-card__hint text-success num">{weekly.rankChange} positions</div></div>
            <div className="kpi-card is-success"><div className="kpi-card__label">Percentile</div><div className="kpi-card__value num">{weekly.percentile}</div></div>
          </div>
          <div className="card chart-card">
            <div className="card__title" style={{ marginBottom: 14 }}>Subject-wise Average</div>
            <div style={{ height: 180 }}><Bar data={weeklySubjectData} options={chartOpts()} /></div>
          </div>
        </>
      )}

      {activeTab === 'monthly-report' && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card"><div className="kpi-card__label">Month Average</div><div className="kpi-card__value num">{monthly.average}%</div><div className="kpi-card__hint">Class avg: {monthly.classAverage}%</div></div>
            <div className="kpi-card"><div className="kpi-card__label">Exam Average (This Month)</div><div className="kpi-card__value num">{monthly.examAverage}%</div></div>
            <div className="kpi-card is-success"><div className="kpi-card__label">Growth vs Last Month</div><div className="kpi-card__value num text-success">+{monthly.momGrowth}%</div></div>
            <div className="kpi-card"><div className="kpi-card__label">Rank</div><div className="kpi-card__value num">#{monthly.rank}</div><div className="kpi-card__hint text-success num">{monthly.rankChange} positions</div></div>
            <div className="kpi-card"><div className="kpi-card__label">Peer Benchmark</div><div className="kpi-card__value num">{monthly.peerBenchmark}</div></div>
          </div>
          <div className="grid-2">
            <div className="card chart-card">
              <div className="card__title" style={{ marginBottom: 14 }}>4-Week Trend</div>
              <div style={{ height: 170 }}><Line data={monthlyTrendData} options={lineOpts} /></div>
            </div>
            <div className="card chart-card">
              <div className="card__title" style={{ marginBottom: 14 }}>Month Comparison</div>
              <div style={{ height: 170 }}><Bar data={monthCompData} options={chartOpts()} /></div>
            </div>
          </div>
          <div className="grid-2">
            <div className="card">
              <div className="card__title" style={{ marginBottom: 14 }}>Performance Summary</div>
              <p style={{ fontSize: '13.4px', color: 'var(--ink-soft)', marginBottom: 14 }}>{monthly.overallPerformance}</p>
              <div className="detail-panel">
                <div className="detail-panel__row"><span>Top in Subjects:</span><span>{(monthly.topInSubjects || []).join(', ') || 'N/A'}</span></div>
                <div className="detail-panel__row"><span>Consistency Score:</span><span>{monthly.consistencyScore}</span></div>
                <div className="detail-panel__row"><span>LT Average:</span><span>{monthly.ltAverage}%</span></div>
              </div>
            </div>
            <div className="card">
              <div className="card__title" style={{ marginBottom: 14 }}>Focus Areas</div>
              <p style={{ fontSize: '13.4px', color: 'var(--ink-soft)', marginBottom: 14 }}>Areas where focused practice will yield quick rank jumps:</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {(monthly.weakAreas || []).map((w, idx) => (
                  <li key={`wa-${idx}`} style={{ padding: '8px 0', borderBottom: '1px solid var(--line-soft)', fontSize: '13px' }}>
                    <strong>{w.subject}:</strong> {w.topic} <span className="chip chip-warning" style={{ marginLeft: 8 }}>{w.tag}</span>
                  </li>
                ))}
                {(monthly.recurringWeakTopics || []).map((topicStr, idx) => (
                  <li key={`rwt-${idx}`} style={{ padding: '8px 0', borderBottom: '1px solid var(--line-soft)', fontSize: '13px' }}>
                    <strong>Recurring Focus:</strong> {topicStr} <span className="chip chip-warning" style={{ marginLeft: 8 }}>Needs Revision</span>
                  </li>
                ))}
                {(monthly.weakAreas || []).length === 0 && (monthly.recurringWeakTopics || []).length === 0 && (
                  <li style={{ padding: '8px 0', fontSize: '13px', color: 'var(--slate)' }}>
                    No recurring weak areas flagged this month.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}

      {activeTab === 'principal-report' && (
        <div className="grid-2">
          <div className="card chart-card">
            <div className="card__title" style={{ marginBottom: 6 }}>Subject-wise Poor Student Distribution</div>
            <div className="card__desc" style={{ marginBottom: 14 }}>Percentage of weak students per subject</div>
            <div style={{ height: 200 }}><Bar data={poorStudentData} options={chartOpts(50)} /></div>
          </div>
          <div className="card">
            <div className="card__title" style={{ marginBottom: 14 }}>Student Percentile Leaderboard</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Rank</th><th>Student Name</th><th>Percentile</th></tr>
                </thead>
                <tbody>
                  {(principal.studentPercentiles || []).map(s => (
                    <tr key={s.rank}>
                      <td className="num">#{s.rank}</td>
                      <td>{s.name}</td>
                      <td className="num">{s.percentile}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

