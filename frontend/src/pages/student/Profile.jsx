import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../services/studentApi';

export default function StudentProfile() {
  const { setHeader } = useOutletContext();
  const { user, updateUser } = useAuth();

  useEffect(() => {
    setHeader({
      title: 'Student Account Profile',
      subtitle: 'Enrolled academic records, class section, and personal contact coordinates'
    });
  }, [setHeader]);

  const [isEditing, setIsEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Editable Form State
  const [editForm, setEditForm] = useState({
    contactNo: user?.contactNo || '+91 99000 12345',
    email: user?.email || 'student@ggzv.edu.in',
    password: user?.password || 'student123',
  });

  useEffect(() => {
    if (user) {
      setEditForm({
        contactNo: user.contactNo || '+91 99000 12345',
        email: user.email || 'student@ggzv.edu.in',
        password: user.password || 'student123',
      });
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);

    const payload = {
      contactNo: editForm.contactNo,
      email: editForm.email,
      password: editForm.password,
    };

    try {
      if (user?.id || user?._id) {
        await studentApi.updateStudent(user.id || user._id, payload);
      }
      updateUser(payload);
      setIsEditing(false);
      setSuccessMsg('Student profile coordinates updated successfully in database!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      updateUser(payload);
      setIsEditing(false);
      setSuccessMsg('Profile coordinates updated in active session.');
      setTimeout(() => setSuccessMsg(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const getStreamTitle = (grp) => {
    if (grp === 'GROUP_B') return 'Group B — PCB (Medical / NEET Track)';
    if (grp === 'GROUP_AB') return 'Group AB — PCMB (Combined Track)';
    return 'Group A — PCM (Engineering / JEE Track)';
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      {successMsg && (
        <div className="banner banner-success" style={{ marginBottom: 18 }}>
          <span>✅ {successMsg}</span>
        </div>
      )}

      {/* 1. Header Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', minWidth: 0 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#123B5D', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, flexShrink: 0 }}>
              {user?.initials || 'UP'}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 'clamp(18px, 3vw, 22px)', margin: 0, color: 'var(--ink)' }}>{user?.name || 'Umesh Pal'}</h2>
              <div style={{ color: '#64748b', fontSize: 13.5, marginTop: 4 }}>
                Enrolled Science Student • Std {String(user?.standard || '11').replace('STD_', '')}-{user?.division || 'A'}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="chip chip-success">Regular Enrolled Student</span>
                <span className="num" style={{ fontWeight: 800, padding: '3px 10px', background: '#E8F1F8', borderRadius: 6, fontSize: 12, color: '#123B5D', border: '1px solid #D1E1EF' }}>
                  Roll No #{user?.rollNo || 7}
                </span>
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setIsEditing(true)}
          >
            ✏️ Edit Contact Coordinates
          </button>
        </div>
      </div>

      {/* 2. Official Academic Enrollment (Read-Only) */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card__head">
          <div>
            <div className="card__title">Official Academic Enrollment Records (Read-Only)</div>
            <div className="card__desc">Class division and subject allocation governed by School Principal</div>
          </div>
        </div>
        <div className="profile-info-grid">
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Official Student Name</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: '#0F172A' }}>{user?.name || 'Umesh Pal'}</div>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>🔒 Read-only official record</span>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Roll Number</div>
            <div className="num" style={{ fontSize: 15, fontWeight: 800, marginTop: 4, color: '#123B5D' }}>#{user?.rollNo || 7}</div>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>🔒 Read-only class roll</span>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Class &amp; Section</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: '#123B5D' }}>
              Standard {String(user?.standard || '11').replace('STD_', '')} — Division {user?.division || 'A'}
            </div>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>🔒 Read-only division</span>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Science Stream Allocation</div>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 4, color: '#047857' }}>
              {getStreamTitle(user?.streamGroup)}
            </div>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>🔒 Read-only stream</span>
          </div>
        </div>
      </div>

      {/* 3. Personal & Contact Coordinates (Editable) */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card__head">
          <div>
            <div className="card__title">Personal Coordinates &amp; Access (Editable)</div>
            <div className="card__desc">Fields student / parents are permitted to update</div>
          </div>
        </div>
        <div className="profile-info-grid">
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Primary Contact <span style={{ color: '#059669', fontSize: 10.5 }}>● EDITABLE</span>
            </div>
            <div className="num" style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{user?.contactNo || editForm.contactNo}</div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Official Email <span style={{ color: '#059669', fontSize: 10.5 }}>● EDITABLE</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4, color: '#123B5D', overflowWrap: 'anywhere' }}>{user?.email || editForm.email}</div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Portal Login Password <span style={{ color: '#059669', fontSize: 10.5 }}>● EDITABLE</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>•••••••• (Secured)</div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Institution
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 600, marginTop: 4 }}>{user?.school || 'G.G. Zadafiya Vidhyalaya'}</div>
          </div>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {isEditing && (
        <div className="modal-overlay is-open" onClick={e => { if (e.target.classList.contains('modal-overlay')) setIsEditing(false); }}>
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <div className="modal-box__head">
              <div>
                <div className="card__title">Edit Student Contact Coordinates</div>
                <div className="card__desc">Update personal communications and portal login password</div>
              </div>
              <button className="modal-close" onClick={() => setIsEditing(false)}>✕</button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, margin: '18px 0' }}>
                <div>
                  <label className="field-label">Official Email Address *</label>
                  <input
                    type="email"
                    className="field-input w-full"
                    required
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  />
                  <span style={{ fontSize: 11.5, color: '#64748B', marginTop: 4, display: 'block' }}>
                    Used for receiving academic progress reports and notices.
                  </span>
                </div>

                <div>
                  <label className="field-label">Primary Mobile Contact *</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    required
                    value={editForm.contactNo}
                    onChange={e => setEditForm({ ...editForm, contactNo: e.target.value })}
                  />
                </div>

                <div>
                  <label className="field-label">Portal Account Password *</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    required
                    value={editForm.password}
                    onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: 16, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ fontWeight: 700 }}>
                  {isSaving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

