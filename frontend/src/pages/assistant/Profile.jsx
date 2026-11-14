import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { facultyApi } from '../../services/facultyApi';
import { CheckCircle2, Pencil, Lock, X } from 'lucide-react';

export default function AssistantProfile() {
  const { setHeader } = useOutletContext();
  const { user, updateUser } = useAuth();

  useEffect(() => {
    setHeader({
      title: 'Assistant Faculty Profile',
      subtitle: 'Laboratory administration, exam evaluation, and personnel coordinates'
    });
  }, [setHeader]);

  const [isEditing, setIsEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Editable Form State
  const [editForm, setEditForm] = useState({
    contactNo: user?.contactNo || '+91 98222 33445',
    email: user?.email || 'assistant@ggzv.edu.in',
    qualification: user?.qualification || 'B.Sc. Chemistry, DMLT',
    experience: user?.experience || '5 Years in Higher Secondary Lab',
    password: user?.password || 'asst123',
  });

  useEffect(() => {
    if (user) {
      setEditForm({
        contactNo: user.contactNo || '+91 98222 33445',
        email: user.email || 'assistant@ggzv.edu.in',
        qualification: user.qualification || 'B.Sc. Chemistry, DMLT',
        experience: user.experience || '5 Years in Higher Secondary Lab',
        password: user.password || 'asst123',
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
      qualification: editForm.qualification,
      experience: editForm.experience,
      password: editForm.password,
    };

    try {
      if (user?.id || user?._id) {
        await facultyApi.updateFaculty(user.id || user._id, payload);
      }
      updateUser(payload);
      setIsEditing(false);
      setSuccessMsg('Assistant faculty coordinates updated successfully in database!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      updateUser(payload);
      setIsEditing(false);
      setSuccessMsg('Coordinates updated in active session.');
      setTimeout(() => setSuccessMsg(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      {successMsg && (
        <div className="banner banner-success" style={{ marginBottom: 18 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </span>
        </div>
      )}

      {/* 1. Header Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', minWidth: 0 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, flexShrink: 0 }}>
              {user?.initials || 'RM'}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 'clamp(18px, 3vw, 22px)', margin: 0, color: 'var(--ink)' }}>{user?.name || 'Rajiv Mehta'}</h2>
              <div style={{ color: '#64748b', fontSize: 13.5, marginTop: 4 }}>
                Assistant Faculty • {user?.subject || 'Laboratory & Evaluation'} Department
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="chip chip-success">Lab &amp; Marks Administration</span>
                <span className="num" style={{ fontWeight: 800, padding: '3px 10px', background: '#ECFDF5', borderRadius: 6, fontSize: 12, color: '#047857', border: '1px solid #A7F3D0' }}>
                  Emp Code #{user?.empCode || 'FAC102'}
                </span>
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setIsEditing(true)}
          >
            <Pencil size={14} />
            <span>Edit Profile Coordinates</span>
          </button>
        </div>
      </div>

      {/* 2. Official Academic Allocation (Read-Only) */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card__head">
          <div>
            <div className="card__title">Official Administrative Allocation (Read-Only)</div>
            <div className="card__desc">Designation &amp; Lab Allocation governed by School Principal</div>
          </div>
        </div>
        <div className="profile-info-grid">
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Official Full Name</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: '#0F172A' }}>{user?.name || 'Rajiv Mehta'}</div>
            <span style={{ fontSize: 11, color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Lock size={11} /> Read-only official record
            </span>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Faculty Role</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: '#059669' }}>Assistant Faculty (Lab &amp; Marks Entry)</div>
            <span style={{ fontSize: 11, color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Lock size={11} /> Read-only role
            </span>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Assigned Department / Lab</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: '#123B5D' }}>{user?.subject || 'Lab — Physics/Chemistry'}</div>
            <span style={{ fontSize: 11, color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Lock size={11} /> Read-only lab stream
            </span>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Employee Code</div>
            <div className="num" style={{ fontSize: 15, fontWeight: 800, marginTop: 4, color: '#047857' }}>{user?.empCode || 'FAC102'}</div>
            <span style={{ fontSize: 11, color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Lock size={11} /> Read-only ID
            </span>
          </div>
        </div>
      </div>

      {/* 3. Personal & Contact Coordinates (Editable) */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card__head">
          <div>
            <div className="card__title">Professional Credentials &amp; Contact (Editable)</div>
            <div className="card__desc">Fields you are permitted to edit directly</div>
          </div>
        </div>
        <div className="profile-info-grid">
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Primary Mobile <span style={{ color: '#059669', fontSize: 10.5 }}>● EDITABLE</span>
            </div>
            <div className="num" style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{user?.contactNo || editForm.contactNo}</div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Official Email <span style={{ color: '#059669', fontSize: 10.5 }}>● EDITABLE</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4, color: '#123B5D', overflowWrap: 'break-word', wordBreak: 'normal' }}>{user?.email || editForm.email}</div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Academic Qualification <span style={{ color: '#059669', fontSize: 10.5 }}>● EDITABLE</span>
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 600, marginTop: 4 }}>{user?.qualification || editForm.qualification}</div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Laboratory Experience <span style={{ color: '#059669', fontSize: 10.5 }}>● EDITABLE</span>
            </div>
            <div className="num" style={{ fontSize: 14.5, fontWeight: 600, marginTop: 4 }}>{user?.experience || editForm.experience}</div>
          </div>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {isEditing && (
        <div className="modal-overlay is-open" onClick={e => { if (e.target.classList.contains('modal-overlay')) setIsEditing(false); }}>
          <div className="modal-box" style={{ maxWidth: 600 }}>
            <div className="modal-box__head">
              <div>
                <div className="card__title">Edit Assistant Faculty Coordinates</div>
                <div className="card__desc">Update personal communications and qualifications</div>
              </div>
              <button className="modal-close" onClick={() => setIsEditing(false)} aria-label="Close modal">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-grid-2" style={{ margin: '18px 0' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label">Official Portal Login Email *</label>
                  <input
                    type="email"
                    className="field-input w-full"
                    required
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  />
                  <span style={{ fontSize: 11.5, color: '#64748B', marginTop: 3, display: 'block' }}>
                    Used for signing in to assistant portal.
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
                  <label className="field-label">Portal Login Password *</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    required
                    value={editForm.password}
                    onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label">Highest Academic Qualification</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    value={editForm.qualification}
                    onChange={e => setEditForm({ ...editForm, qualification: e.target.value })}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label">Prior Laboratory Experience</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    value={editForm.experience}
                    onChange={e => setEditForm({ ...editForm, experience: e.target.value })}
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

