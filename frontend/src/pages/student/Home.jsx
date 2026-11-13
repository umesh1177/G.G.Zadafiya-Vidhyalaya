import { useState, useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { noticeApi } from '../../services/noticeApi'

export default function StudentHome() {
  const { setHeader } = useOutletContext()
  const { user } = useAuth()
  const { studentData } = useData()
  const [liveNotices, setLiveNotices] = useState(null)
  const s = studentData?.student || {}
  const stats = studentData?.homeStats || {}

  useEffect(() => {
    noticeApi.getNotices({ viewerRole: 'student', viewerId: user?.id || '', viewerEmail: user?.email || '' })
      .then((list) => setLiveNotices(Array.isArray(list) ? list : []))
      .catch(() => {})
  }, [user])

  useEffect(() => {
    const displayName = user?.name || s.name || 'Student'
    const firstName = displayName.split(' ')[0]
    setHeader({
      title: `Hi ${firstName} 👋`,
      subtitle: `Std ${String(user?.standard || s.standard || '11').replace('STD_', '')}-${user?.division || 'A'} Science • Today's Academic Summary`
    })
  }, [user, s.name, s.standard, setHeader])

  return (
    <div className="content">
      <div className="kpi-grid">
        <div className="kpi-card is-success">
          <div className="kpi-card__label">Overall Percentile</div>
          <div className="kpi-card__value num">{stats.overallPercentile}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__label">Current Rank</div>
          <div className="kpi-card__value num">#{stats.currentRank}</div>
          <div className="kpi-card__hint">of {s.totalStudentsInClass} students</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__label">This Week's Average</div>
          <div className="kpi-card__value num">{stats.thisWeekAverage}%</div>
        </div>
        <div className="kpi-card is-success">
          <div className="kpi-card__label">Growth vs Last Week</div>
          <div className="kpi-card__value num text-success">+{stats.growthVsLastWeek}%</div>
        </div>
      </div>

      <div className="banner banner-success">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12.5 4.2 4.2L19 6.8"/></svg>
        <span>{studentData.progressReport?.weekly?.message || 'Strong performance this week!'}</span>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Recent Exam Results</div>
              <div className="card__desc">Latest marks across subjects</div>
            </div>
            <Link to="/student/exam-result" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Subject</th><th>Date</th><th>Score</th><th>Rank</th></tr></thead>
              <tbody>
                {(studentData.examResults || []).slice(0, 4).map((e, idx) => (
                  <tr key={idx}>
                    <td>{e.subject}</td>
                    <td className="num">{e.examDate}</td>
                    <td className="num">{e.score}%</td>
                    <td className="num">#{e.rank}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Recent Notices</div>
              <div className="card__desc">From your school</div>
            </div>
            <Link to="/student/notice-message" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          <ul style={{ listStyle:'none', padding:0, margin:0 }}>
            {(liveNotices !== null ? liveNotices : (studentData.notices || [])).slice(0, 4).map((n, idx) => (
              <li key={n.id || idx} style={{ padding:'10px 0', borderBottom:'1px solid var(--line-soft)' }}>
                <div className="text-slate num" style={{ fontSize:'11.5px', marginBottom:4 }}>
                  {n.date ? new Date(n.date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                </div>
                <div style={{ fontSize:'13px', color:'var(--ink-soft)', overflowWrap:'anywhere' }}>
                  {n.message.length > 90 ? n.message.slice(0,90) + '…' : n.message}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

