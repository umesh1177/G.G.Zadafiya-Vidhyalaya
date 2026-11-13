import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PrincipalProfile() {
  const { setHeader } = useOutletContext();
  const { user, updateUser } = useAuth();

  useEffect(() => {
    setHeader({
      title: 'Principal Profile',
      subtitle: 'Administrative executive account settings & institutional records'
    });
  }, [setHeader]);

  const [isEditing, setIsEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const [editForm, setEditForm] = useState({
    contactNo: user?.contactNo || '+91 99099 88776',
    email: user?.email || 'principal@ggzv.edu.in',
    password: user?.password || 'admin123',
  });

  useEffect(() => {
    if (user) {
      setEditForm({
        contactNo: user.contactNo || '+91 99099 88776',
        email: user.email || 'principal@ggzv.edu.in',
        password: user.password || 'admin123',
      });
    }
  }, [user]);

  const handleSave = (e) => {
    e.preventDefault();
    updateUser({
      contactNo: editForm.contactNo,
      email: editForm.email,
      password: editForm.password,
    });
    setIsEditing(false);
    setSuccessMsg('Profile contact and security credentials updated successfully!');
    setTimeout(() => setSuccessMsg(null), 3500);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', minWidth: 0 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#123B5D', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, flexShrink: 0 }}>
              {user?.initials || 'PR'}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 20, margin: 0, color: 'var(--ink)', overflowWrap: 'anywhere' }}>{user?.name || 'School Principal'}</h2>
              <div style={{ color: '#64748b', fontSize: 13.5, marginTop: 4 }}>
                Chief Academic Administrator • {user?.school || 'G.G. Zadafiya Vidhyalaya'}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="chip chip-success">Executive Authority</span>
                <span className="chip chip-neutral">Std 11 &amp; 12 Science GSEB</span>
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setIsEditing(true)}
          >
            ✏️ Edit Profile Coordinates
          </button>
        </div>
      </div>

      {/* 2. Institutional Coordinates (Read-Only) */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card__head">
          <div>
            <div className="card__title">Official Institutional Allocation (Read-Only)</div>
            <div className="card__desc">System governance records managed by school trust board</div>
          </div>
        </div>
        <div className="profile-info-grid">
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Official Full Name</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: '#0F172A' }}>{user?.name || 'Principal'}</div>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>🔒 Read-only official record</span>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>System Role</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: '#123B5D' }}>Principal / Administrator</div>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>🔒 Read-only permission level</span>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Institution</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{user?.school || 'G.G. Zadafiya Vidhyalaya'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Affiliated Stream &amp; Board</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>Higher Secondary Science (GSEB / JEE / NEET)</div>
          </div>
        </div>
      </div>

      {/* 3. Personal & Contact Coordinates (Editable) */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card__head">
          <div>
            <div className="card__title">Contact Coordinates &amp; Access (Editable)</div>
            <div className="card__desc">Personal communications and sign-in credentials</div>
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
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4, color: '#123B5D' }}>{user?.email || editForm.email}</div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Portal Login Handle
            </div>
            <div className="num" style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: '#123B5D' }}>admin</div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Password Status
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>•••••••• (Configured)</div>
          </div>
        </div>
      </div>

      {/* ── Edit Profile Modal ── */}
      {isEditing && (
        <div className="modal-overlay is-open" onClick={e => { if (e.target.classList.contains('modal-overlay')) setIsEditing(false); }}>
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <div className="modal-box__head">
              <div>
                <div className="card__title">Edit Principal Profile Coordinates</div>
                <div className="card__desc">Update your communication contacts and portal login password</div>
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
                    Used for official administrative communications and notifications.
                  </span>
                </div>

                <div>
                  <label className="field-label">Mobile Contact Number *</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    required
                    value={editForm.contactNo}
                    onChange={e => setEditForm({ ...editForm, contactNo: e.target.value })}
                  />
                </div>

                <div>
                  <label className="field-label">Portal Login Password *</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    required
                    value={editForm.password}
                    onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                  />
                  <span style={{ fontSize: 11.5, color: '#64748B', marginTop: 4, display: 'block' }}>
                    Password used to log in at the portal welcome screen.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                  Save Coordinates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
