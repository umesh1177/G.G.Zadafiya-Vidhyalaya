import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useData } from '../../context/DataContext'

export default function StudentExamResult() {
  const { setHeader } = useOutletContext()
  const { studentData } = useData()
  useEffect(() => setHeader({ title: 'Exam Result', subtitle: 'Every exam, with your rank and percentile' }), [setHeader])

  const [subjectFilter, setSubjectFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')

  const exams = (studentData.examResults || []).filter(e => {
    if (subjectFilter !== 'ALL' && e.subject !== subjectFilter) return false
    if (typeFilter !== 'ALL' && e.type !== typeFilter) return false
    return true
  })

  return (
    <div className="content">
      <div className="card">
        <div className="card__head"><div className="card__title">All Exam Marks ({exams.length})</div></div>
        <div className="filters">
          <select className="filter-select" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
            <option value="ALL">All Subjects</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Maths">Maths</option>
            <option value="Biology">Biology</option>
          </select>
          <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="ALL">All Types</option>
            <option value="Board">Board</option>
            <option value="GUJCET">GUJCET</option>
            <option value="JEE">JEE</option>
            <option value="NEET">NEET</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Sr No</th><th>Subject</th><th>Exam Date</th><th>Rank</th><th>Percentile</th><th>Score</th><th>Type</th></tr>
            </thead>
            <tbody>
              {exams.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--slate)' }}>No exam marks match current filters.</td></tr>
              ) : exams.map((e, i) => (
                <tr key={e.srNo || i}>
                  <td className="num">{i + 1}</td>
                  <td>{e.subject}</td>
                  <td className="num">{e.examDate}</td>
                  <td className="num">#{e.rank}</td>
                  <td className="num">{e.percentile}</td>
                  <td className="num">{e.score}%</td>
                  <td><span className="chip chip-neutral">{e.type}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

