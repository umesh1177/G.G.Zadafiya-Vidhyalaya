import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ProgressReport() {
  const { setHeader } = useOutletContext();
  const { principal } = useData();

  useEffect(() => {
    setHeader({
      title: 'Progress Report Dashboard',
      subtitle: 'Comprehensive performance intelligence: Weekly · Monthly · Advance'
    });
  }, [setHeader]);

  const [activeTab, setActiveTab] = useState('weekly');

  const reportData = principal.progressReport?.[activeTab] || principal.progressReport?.weekly || {};

  const subjectAverages = reportData.subjectAverages || [];
  const subjectChartData = {
    labels: subjectAverages.map(s => s.subject),
    datasets: [{
      label: 'Subject Average (%)',
      data: subjectAverages.map(s => s.avg),
      backgroundColor: '#123B5D',
      borderRadius: 6
    }]
  };

  const brackets = reportData.scoreBrackets || [];
  const bracketsChartData = {
    labels: brackets.map(b => b.range),
    datasets: [{
      label: 'Student Count',
      data: brackets.map(b => b.count),
      backgroundColor: '#1F9D6B',
      borderRadius: 6
    }]
  };

  return (
    <>
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button
          className={`tab-btn ${activeTab === 'weekly' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('weekly')}
        >
          Weekly Report
        </button>
        <button
          className={`tab-btn ${activeTab === 'monthly' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          Monthly Report
        </button>
        <button
          className={`tab-btn ${activeTab === 'advance' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('advance')}
        >
          Advance Performance Analytics
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__label">Class Average</div>
          <div className="kpi-card__value num">{reportData.classAverage || 0}%</div>
          <div className="kpi-card__hint">Across all subjects tested</div>
        </div>
        <div className="kpi-card is-success">
          <div className="kpi-card__label">Growth Rate</div>
          <div className="kpi-card__value num">+{reportData.growthVsLastWeek || 0}%</div>
          <div className="kpi-card__hint">Improvement vs prior cycle</div>
        </div>
        <div className="kpi-card is-warning">
          <div className="kpi-card__label">Downfall Delta</div>
          <div className="kpi-card__value num">{reportData.downfallVsLastWeek ? `-${reportData.downfallVsLastWeek}%` : '0%'}</div>
          <div className="kpi-card__hint">Fluctuation benchmark</div>
        </div>
      </div>

      {reportData.message && (
        <div className="card" style={{ background: '#E8F1F8', border: '1px solid #C8DBED', marginBottom: 16, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div>
              <strong style={{ color: '#123B5D' }}>Principal Evaluation Summary:</strong>
              <div style={{ color: '#1C2340', fontSize: 13.5, marginTop: 2 }}>{reportData.message}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card__head">
            <div className="card__title">Subject Averages ({activeTab.toUpperCase()})</div>
          </div>
          {subjectAverages.length > 0 ? (
            <div style={{ height: 210, position: 'relative' }}>
              <Bar
                data={subjectChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, max: 100, grid: { color: '#EEF0F8' }, ticks: { font: { family: 'IBM Plex Mono' } } },
                    x: { grid: { display: false } }
                  }
                }}
              />
            </div>
          ) : (
            <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 13.5 }}>
              No subject performance data recorded yet.
            </div>
          )}
        </div>

        <div className="card">
          <div className="card__head">
            <div className="card__title">Score Bracket Breakdown</div>
          </div>
          {brackets.length > 0 ? (
            <div style={{ height: 210, position: 'relative' }}>
              <Bar
                data={bracketsChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, grid: { color: '#EEF0F8' }, ticks: { font: { family: 'IBM Plex Mono' } } },
                    x: { grid: { display: false } }
                  }
                }}
              />
            </div>
          ) : (
            <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 13.5 }}>
              No score bracket data recorded yet.
            </div>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card__head">
            <div className="card__title">Top Academic Leaders</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Rank</th><th>Roll</th><th>Name</th><th>Subject</th><th>Score</th></tr>
              </thead>
              <tbody>
                {Array.isArray(reportData.top3) && reportData.top3.length > 0 ? (
                  reportData.top3.map((s, idx) => (
                    <tr key={idx}>
                      <td className="num"><strong>#{idx + 1}</strong></td>
                      <td className="num">{s.rollNo}</td>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.subject}</td>
                      <td className="num"><span className="chip chip-success">{s.score}%</span></td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#64748b', padding: '24px 0' }}>No academic assessment records yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <div className="card__title">Remedial Focus Cohort</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Roll</th><th>Name</th><th>Score</th><th>Status</th></tr>
              </thead>
              <tbody>
                {Array.isArray(reportData.bottom3) && reportData.bottom3.length > 0 ? (
                  reportData.bottom3.map((b, idx) => (
                    <tr key={idx}>
                      <td className="num">{b.rollNo}</td>
                      <td>{b.name}</td>
                      <td className="num"><span className="chip chip-danger">{b.score}%</span></td>
                      <td>Needs Counseling</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: '24px 0' }}>No remedial records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

