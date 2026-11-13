import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'

export default function StudentHallTicket() {
  const { setHeader } = useOutletContext()
  const { user } = useAuth()
  const { studentData } = useData()
  useEffect(() => setHeader({ title: 'Hall Ticket', subtitle: 'Download your hall ticket for upcoming exams' }), [setHeader])

  const hallTickets = studentData.hallTickets || []
  const [previewTicket, setPreviewTicket] = useState(null)

  return (
    <div className="content">
      <div className="card">
        <div className="card__head"><div className="card__title">Hall Ticket Table ({hallTickets.length})</div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Sr No</th><th>Standard</th><th>Date</th><th>Exam Type</th><th>Action</th></tr></thead>
            <tbody>
              {hallTickets.map((h, i) => (
                <tr key={`${h.srNo}-${i}`}>
                  <td className="num">{i + 1}</td>
                  <td className="num">{h.standard}</td>
                  <td className="num">{h.date}</td>
                  <td><span className="chip chip-neutral">{h.examType}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setPreviewTicket(h)}>View</button>
                      <button className="btn btn-primary btn-sm" onClick={() => window.print()}>Download</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {previewTicket && (
        <div className="modal-overlay is-open" onClick={e => { if (e.target.classList.contains('modal-overlay')) setPreviewTicket(null) }}>
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <div className="modal-box__head">
              <div>
                <div className="card__title">Admit Card / Hall Ticket</div>
                <div className="card__desc">{user?.school || studentData.student?.school || 'G.G. Zadafiya Vidhyalaya'}</div>
              </div>
              <button className="modal-close" onClick={() => setPreviewTicket(null)}>✕</button>
            </div>
            <div className="detail-panel" style={{ marginBottom: 16 }}>
              <div className="detail-panel__row"><span>Candidate Name</span><strong>{user?.name || studentData.student?.name || 'Student'}</strong></div>
              <div className="detail-panel__row"><span>Roll Number</span><strong className="num">#{user?.rollNo || studentData.student?.rollNo || 1}</strong></div>
              <div className="detail-panel__row"><span>Standard</span><span className="num">{previewTicket.standard}</span></div>
              <div className="detail-panel__row"><span>Examination Type</span><span className="chip chip-neutral">{previewTicket.examType}</span></div>
              <div className="detail-panel__row"><span>Commencement Date</span><span className="num">{previewTicket.date}</span></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Print Hall Ticket</button>
              <button className="btn btn-primary btn-sm" onClick={() => setPreviewTicket(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

