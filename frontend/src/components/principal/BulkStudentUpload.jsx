import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RefreshCw,
  X,
  ArrowRight,
  Info,
} from 'lucide-react';
import { studentApi } from '../../services/studentApi';

export default function BulkStudentUpload({ onComplete, onShowToast }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBase64, setFileBase64] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [generalError, setGeneralError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const fileInputRef = useRef(null);

  // 1. Download Template Handler
  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    setGeneralError(null);
    try {
      await studentApi.downloadTemplate();
      if (onShowToast) onShowToast('Student Excel format template downloaded successfully!');
    } catch (err) {
      console.error('Download template error:', err);
      // Fallback: direct window download
      try {
        window.open(studentApi.getTemplateDownloadUrl(), '_blank');
      } catch (e) {
        setGeneralError('Could not download template. Please check your backend connection.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // 2. File Selection & Base64 Reader
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGeneralError(null);
    setUploadResult(null);
    setValidationResult(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = reader.result;
      setFileBase64(b64);
      // Validate & Preview immediately
      validateFile(b64, file.name);
    };
    reader.onerror = () => {
      setGeneralError('Failed to read the selected file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  // 3. Validate & Preview File
  const validateFile = async (base64Data, fileName) => {
    setIsValidating(true);
    setGeneralError(null);
    try {
      const res = await studentApi.bulkUpload({
        fileBase64: base64Data,
        fileName,
        previewOnly: true,
      });
      setValidationResult(res);
    } catch (err) {
      console.error('Validation error:', err);
      setGeneralError(err.message || 'Failed to parse Excel file. Please ensure valid format.');
      setValidationResult(null);
    } finally {
      setIsValidating(false);
    }
  };

  // 4. Perform Actual Import
  const handleImport = async () => {
    if (!fileBase64 || !selectedFile) {
      setGeneralError('Please choose an Excel file to upload.');
      return;
    }

    setIsUploading(true);
    setGeneralError(null);
    try {
      const res = await studentApi.bulkUpload({
        fileBase64,
        fileName: selectedFile.name,
        previewOnly: false,
      });
      setUploadResult(res);
      if (onShowToast) {
        onShowToast(`Import completed: ${res.createdCount} new students, ${res.updatedCount} updated.`);
      }
    } catch (err) {
      console.error('Import error:', err);
      setGeneralError(err.message || 'Failed to import students. Please review errors and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // 5. Reset
  const handleReset = () => {
    setSelectedFile(null);
    setFileBase64(null);
    setValidationResult(null);
    setUploadResult(null);
    setGeneralError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Overview Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F2B48 0%, #123B5D 100%)',
          color: '#FFFFFF',
          borderRadius: 14,
          padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(18, 59, 93, 0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ maxWidth: 680 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '6px 10px',
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <FileSpreadsheet size={20} color="#6EE7B7" />
            </span>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#FFFFFF' }}>
              Bulk Student Upload via Excel
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: '#CBD5E1' }}>
            Upload multiple student records simultaneously using an Excel spreadsheet (.xlsx, .xls, .csv).
            Download the pre-formatted template with exact column names below so students are mapped accurately
            without any errors.
          </p>
        </div>

        {/* Quick Download Button in Banner */}
        <button
          type="button"
          onClick={handleDownloadTemplate}
          disabled={isDownloading}
          className="btn"
          style={{
            background: '#047857',
            borderColor: '#047857',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 13.5,
            padding: '10px 18px',
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: isDownloading ? 'wait' : 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          {isDownloading ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Download size={16} />
              <span>Download Excel Format</span>
            </>
          )}
        </button>
      </div>

      {/* Error Banner */}
      {generalError && (
        <div
          className="banner banner-danger"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} />
            <span>{generalError}</span>
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setGeneralError(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Upload Success Banner */}
      {uploadResult && (
        <div
          style={{
            background: '#ECFDF5',
            border: '1.5px solid #6EE7B7',
            borderRadius: 12,
            padding: '18px 22px',
            color: '#065F46',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <CheckCircle2 size={24} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#065F46' }}>
                Bulk Student Import Successful!
              </h3>
              <p style={{ margin: '6px 0 12px', fontSize: 13.5, color: '#047857', lineHeight: 1.5 }}>
                {uploadResult.message || `Processed ${uploadResult.createdCount + uploadResult.updatedCount} students.`}
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <span
                  style={{
                    background: '#D1FAE5',
                    color: '#065F46',
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 700,
                  }}
                >
                  ● New Created: <strong>{uploadResult.createdCount}</strong>
                </span>
                <span
                  style={{
                    background: '#DBEAFE',
                    color: '#1E40AF',
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 700,
                  }}
                >
                  ● Records Updated: <strong>{uploadResult.updatedCount}</strong>
                </span>
                {uploadResult.errorCount > 0 && (
                  <span
                    style={{
                      background: '#FEE2E2',
                      color: '#991B1B',
                      padding: '4px 12px',
                      borderRadius: 6,
                      fontSize: 12.5,
                      fontWeight: 700,
                    }}
                  >
                    ● Skipped with Errors: <strong>{uploadResult.errorCount}</strong>
                  </span>
                )}
                {onComplete && (
                  <button
                    type="button"
                    onClick={onComplete}
                    className="btn btn-primary btn-sm"
                    style={{
                      marginLeft: 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#047857',
                      borderColor: '#047857',
                    }}
                  >
                    <span>View In Student List</span>
                    <ArrowRight size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#065F46', fontWeight: 600 }}
                >
                  Upload Another File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Step 1 (Download Format) & Step 2 (Upload File) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        {/* ── STEP 1: DOWNLOAD EXCEL FORMAT CARD ── */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: 14,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  background: '#047857',
                  color: '#FFFFFF',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                1
              </span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#123B5D' }}>
                Download Standard Format
              </h3>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
              Download our official Excel format template with predefined column headers and sample data.
              Simply open this file in Excel or Google Sheets, insert your students&apos; details, and save.
            </p>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={isDownloading}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: 10,
                border: '1px solid #059669',
                background: '#ECFDF5',
                color: '#065F46',
                fontWeight: 700,
                fontSize: 14,
                cursor: isDownloading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#059669';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ECFDF5';
                e.currentTarget.style.color = '#065F46';
              }}
            >
              {isDownloading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Preparing Template...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Download Student_Import_Template.xlsx</span>
                </>
              )}
            </button>
          </div>

          <div
            style={{
              marginTop: 18,
              background: '#F8FAFC',
              borderRadius: 8,
              padding: '10px 12px',
              border: '1px dashed #CBD5E1',
              fontSize: 12,
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Info size={16} color="#0284C7" style={{ flexShrink: 0 }} />
            <span>Includes 2 sample student rows and field instructions so no columns are misspelled.</span>
          </div>
        </div>

        {/* ── STEP 2: UPLOAD FILLED EXCEL FILE CARD ── */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: 14,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  background: '#123B5D',
                  color: '#FFFFFF',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                2
              </span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#123B5D' }}>
                Upload Completed Excel File
              </h3>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
              Select your filled spreadsheet (.xlsx, .xls, .csv). The system will automatically validate the
              records and show a live preview before inserting into MongoDB.
            </p>

            {/* Drop / Select Zone */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              id="student-excel-upload-input"
            />

            {!selectedFile ? (
              <label
                htmlFor="student-excel-upload-input"
                style={{
                  border: '2px dashed #93C5FD',
                  borderRadius: 10,
                  padding: '24px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: '#F0F7FF',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <UploadCloud size={32} color="#1D4ED8" style={{ marginBottom: 6 }} />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1D4ED8' }}>
                  Click to select Excel file
                </span>
                <span style={{ fontSize: 11.5, color: '#64748B', marginTop: 3 }}>
                  Supports .xlsx, .xls, and .csv
                </span>
              </label>
            ) : (
              <div
                style={{
                  border: '1px solid #CBD5E1',
                  borderRadius: 10,
                  padding: '12px 16px',
                  background: '#F8FAFC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <FileSpreadsheet size={24} color="#059669" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: '#0F172A',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB · Ready for validation
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-ghost btn-sm"
                  title="Remove selected file"
                  style={{ color: '#EF4444', padding: '4px 8px' }}
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Import Button */}
          {selectedFile && (
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                onClick={handleImport}
                disabled={isUploading || isValidating || (validationResult && validationResult.preview?.length === 0)}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: 10,
                  background: '#123B5D',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: isUploading || isValidating ? 'wait' : 'pointer',
                }}
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Importing into Database...</span>
                  </>
                ) : isValidating ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Validating Records...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>
                      Import {validationResult?.preview?.length ? `${validationResult.preview.length} Students` : 'Now'}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── VALIDATION SUMMARY & PREVIEW ── */}
      {isValidating && (
        <div style={{ padding: 24, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
          <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block', color: '#123B5D' }} />
          <span>Reading Excel file and checking student records...</span>
        </div>
      )}

      {validationResult && !uploadResult && (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 14,
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#123B5D' }}>
                Pre-Import File Verification
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748B' }}>
                Total rows detected: <strong>{validationResult.totalRows}</strong> · Valid students ready for import: <strong>{validationResult.preview?.length || 0}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <span
                style={{
                  background: '#ECFDF5',
                  color: '#065F46',
                  border: '1px solid #A7F3D0',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <CheckCircle2 size={13} />
                <span>{validationResult.preview?.length || 0} Valid</span>
              </span>

              {validationResult.errorCount > 0 && (
                <span
                  style={{
                    background: '#FEF2F2',
                    color: '#991B1B',
                    border: '1px solid #FECACA',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <AlertTriangle size={13} />
                  <span>{validationResult.errorCount} Issues</span>
                </span>
              )}
            </div>
          </div>

          {/* Error Warnings List if any */}
          {validationResult.errors?.length > 0 && (
            <div
              style={{
                background: '#FFFBEB',
                border: '1px solid #FCD34D',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#92400E', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} />
                <span>The following rows have errors and will be skipped:</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#B45309' }}>
                {validationResult.errors.map((err, i) => (
                  <li key={i} style={{ marginBottom: 3 }}>
                    Row {err.row}: <strong>{err.student}</strong> — {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          {validationResult.preview?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                Sample Preview (First {Math.min(10, validationResult.preview.length)} of {validationResult.preview.length} rows):
              </div>
              <div className="table-wrap" style={{ maxHeight: 300, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Roll No</th>
                      <th>Full Name</th>
                      <th>Standard</th>
                      <th>Division</th>
                      <th>Stream Group</th>
                      <th>Contact No</th>
                      <th>Email</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResult.preview.slice(0, 10).map((st, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 800, color: '#123B5D' }}>{st.rollNo}</td>
                        <td style={{ fontWeight: 600 }}>{st.fullName}</td>
                        <td>{st.standard.replace('STD_', 'Std ')}</td>
                        <td>{st.division}</td>
                        <td>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              background: st.streamGroup === 'GROUP_B' ? '#ECFDF5' : '#EFF6FF',
                              color: st.streamGroup === 'GROUP_B' ? '#047857' : '#1D4ED8',
                            }}
                          >
                            {st.streamGroup === 'GROUP_B' ? 'PCB' : st.streamGroup === 'GROUP_AB' ? 'PCMB' : 'PCM'}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{st.contactNo}</td>
                        <td style={{ fontSize: 12, color: '#64748B' }}>{st.email}</td>
                        <td>
                          <span className={`chip ${st.status === 'ACTIVE' ? 'chip-success' : 'chip-neutral'}`}>
                            {st.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 3. DETAILED COLUMN REFERENCE GUIDE ── */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 14,
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <FileText size={18} color="#123B5D" />
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#123B5D' }}>
            Excel Column Reference &amp; Format Specifications
          </h4>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#64748B', lineHeight: 1.5 }}>
          Your Excel file must contain these header columns. The parser is case-insensitive and supports
          standard aliases.
        </p>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: '18%' }}>Column Name</th>
                <th style={{ width: '14%' }}>Requirement</th>
                <th style={{ width: '32%' }}>Accepted Values / Format</th>
                <th style={{ width: '36%' }}>Description &amp; Behavior</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 800, color: '#123B5D' }}>Roll No</td>
                <td>
                  <span className="chip chip-danger" style={{ fontSize: 11 }}>REQUIRED</span>
                </td>
                <td><code>1, 2, 3, 101...</code> (Positive integer)</td>
                <td>Must be unique per Standard and Division. Auto-used as default login password.</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 800, color: '#123B5D' }}>First Name</td>
                <td>
                  <span className="chip chip-danger" style={{ fontSize: 11 }}>REQUIRED</span>
                </td>
                <td><code>Aarav, Priya, Rohan...</code></td>
                <td>Student given legal first name.</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 800, color: '#123B5D' }}>Middle Name</td>
                <td>
                  <span className="chip chip-neutral" style={{ fontSize: 11 }}>OPTIONAL</span>
                </td>
                <td><code>Rajeshbhai, Kiritbhai...</code></td>
                <td>Father, mother or guardian name.</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 800, color: '#123B5D' }}>Last Name</td>
                <td>
                  <span className="chip chip-danger" style={{ fontSize: 11 }}>REQUIRED</span>
                </td>
                <td><code>Patel, Shah, Mehta...</code></td>
                <td>Family surname.</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 800, color: '#123B5D' }}>Standard</td>
                <td>
                  <span className="chip chip-danger" style={{ fontSize: 11 }}>REQUIRED</span>
                </td>
                <td><code>STD_11, 11, STD_12, 12</code></td>
                <td>Academic standard / class.</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 800, color: '#123B5D' }}>Division</td>
                <td>
                  <span className="chip chip-danger" style={{ fontSize: 11 }}>REQUIRED</span>
                </td>
                <td><code>A, B, C, D</code></td>
                <td>Class division section.</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 800, color: '#123B5D' }}>Stream Group</td>
                <td>
                  <span className="chip chip-danger" style={{ fontSize: 11 }}>REQUIRED</span>
                </td>
                <td><code>GROUP_A (PCM), GROUP_B (PCB), GROUP_AB (PCMB)</code></td>
                <td>Science stream subject bundle (accepts PCM, PCB, PCMB).</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 800, color: '#123B5D' }}>Contact No</td>
                <td>
                  <span className="chip chip-danger" style={{ fontSize: 11 }}>REQUIRED</span>
                </td>
                <td><code>9876543210</code> (10-digit telephone)</td>
                <td>Primary parent / student contact phone for communications.</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 800, color: '#123B5D' }}>Email</td>
                <td>
                  <span className="chip chip-neutral" style={{ fontSize: 11 }}>OPTIONAL</span>
                </td>
                <td><code>name@student.edu.in</code></td>
                <td>Student login email. Auto-generated from name if left blank.</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 800, color: '#123B5D' }}>Status</td>
                <td>
                  <span className="chip chip-neutral" style={{ fontSize: 11 }}>OPTIONAL</span>
                </td>
                <td><code>ACTIVE</code> (default) or <code>ALUMNI</code></td>
                <td>Enrollment state in school records.</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 800, color: '#123B5D' }}>Admission Date</td>
                <td>
                  <span className="chip chip-neutral" style={{ fontSize: 11 }}>OPTIONAL</span>
                </td>
                <td><code>YYYY-MM-DD</code> (e.g. <code>2026-06-15</code>)</td>
                <td>Defaults to current date if not specified.</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 800, color: '#123B5D' }}>Password</td>
                <td>
                  <span className="chip chip-neutral" style={{ fontSize: 11 }}>OPTIONAL</span>
                </td>
                <td>Any string or numeric code</td>
                <td>Defaults to student Roll Number for seamless student login.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
