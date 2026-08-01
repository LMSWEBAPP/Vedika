'use client';

import { useState, useEffect } from 'react';
import { Award, Plus, Trash2, X, Check, Save, ShieldCheck } from 'lucide-react';
import { T } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import { getCertificates, createCertificate, deleteCertificate, getCertificateConfig, saveCertificateConfig, getCourses } from '@/lib/frappe';

export default function AdminCertsPage() {
  const isMobile = useMediaQuery(isMobileMQ);
  const [activeTab, setActiveTab] = useState('issued'); // 'issued' or 'settings'
  const [certificates, setCertificates] = useState([]);
  const [courses, setCourses] = useState([]);
  const [config, setConfig] = useState({
    signer_name: '',
    signer_title: '',
    require_passing_quiz: true,
    require_assignments_submitted: true,
    theme_color: '#9B6EF8'
  });
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCert, setNewCert] = useState({ student_name: '', course_title: '', issue_date: '' });
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getCertificates(),
      getCertificateConfig(),
      getCourses()
    ]).then(([certsData, configData, coursesData]) => {
      setCertificates(certsData);
      setConfig(configData);
      setCourses(coursesData);
      if (coursesData.length > 0) {
        setNewCert(prev => ({ ...prev, course_title: coursesData[0].title }));
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCertSubmit = async (e) => {
    e.preventDefault();
    if (!newCert.student_name.trim()) return;

    try {
      const hash = 'cert-' + Math.random().toString(36).substr(2, 8).toUpperCase();
      await createCertificate({
        ...newCert,
        cert_hash: hash
      });
      setIsModalOpen(false);
      setNewCert({ student_name: '', course_title: courses[0]?.title || '', issue_date: '' });
      loadData();
    } catch (e) {
      alert("Failed to issue certificate: " + e.message);
    }
  };

  const handleRevokeCert = async (id) => {
    if (confirm('Are you sure you want to revoke/delete this certificate?')) {
      const success = await deleteCertificate(id);
      if (success) {
        loadData();
      }
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    await saveCertificateConfig(config);
    setSaveLoading(false);
    alert('Certificate configuration saved successfully.');
  };

  const containerPadding = isMobile ? '70px 16px 32px 16px' : '40px';

  return (
    <div style={{
      padding: containerPadding,
      maxWidth: 1000,
      margin: '0 auto',
      fontFamily: 'var(--font-outfit), sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <div>
          <h1 style={{ color: T.text, fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: 0, letterSpacing: '-0.04em' }}>Certifications</h1>
          <p style={{ color: T.muted, fontSize: 13.5, margin: '4px 0 0' }}>Issue curriculum certificates, adjust passing parameters, and customize signatures.</p>
        </div>

        {activeTab === 'issued' && (
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              background: T.purple,
              color: '#fff',
              border: 'none',
              padding: '9px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(155, 110, 248, 0.2)'
            }}
          >
            <Plus size={16} /> Issue Certificate
          </button>
        )}
      </div>

      {/* Tabs Menu */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${T.border}`,
        marginBottom: 24,
        gap: 16
      }}>
        <button
          onClick={() => setActiveTab('issued')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'issued' ? `2px solid ${T.purple}` : '2px solid transparent',
            color: activeTab === 'issued' ? T.text : T.muted,
            padding: '8px 12px 12px 12px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          Issued Certificates
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'settings' ? `2px solid ${T.purple}` : '2px solid transparent',
            color: activeTab === 'settings' ? T.text : T.muted,
            padding: '8px 12px 12px 12px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          Rules & Templates
        </button>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: `2px solid ${T.border}`,
            borderTopColor: T.purple,
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      ) : activeTab === 'issued' ? (
        /* ISSUED CERTIFICATES TAB */
        certificates.length === 0 ? (
          <div style={{
            background: T.s1,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: '64px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Award size={48} color={T.muted} style={{ marginBottom: 16 }} />
            <h3 style={{ color: T.text, fontSize: 16, margin: '0 0 6px 0' }}>No certificates issued</h3>
            <p style={{ color: T.muted, fontSize: 13, maxWidth: 320, margin: '0 0 16px 0', lineHeight: 1.5 }}>
              There are no student certificates issued yet. You can manually issue one using the button above.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                background: T.purple,
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Plus size={14} /> Issue Certificate
            </button>
          </div>
        ) : (
          <div style={{
            background: T.s1,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            overflowX: 'auto'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}`, color: T.muted, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Student Name</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Course</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Issue Date</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Certificate ID / Hash</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: 13 }}>
                {certificates.map((cert) => (
                  <tr key={cert.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: '16px 20px', color: T.text, fontWeight: 600 }}>
                      {cert.student_name}
                    </td>
                    <td style={{ padding: '16px 20px', color: T.muted }}>
                      {cert.course_title}
                    </td>
                    <td style={{ padding: '16px 20px', color: T.muted }}>
                      {cert.issue_date}
                    </td>
                    <td style={{ padding: '16px 20px', color: T.dim, fontFamily: 'monospace' }}>
                      {cert.cert_hash}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: 20,
                        background: 'rgba(34, 197, 160, 0.12)',
                        color: T.green,
                        border: `1px solid rgba(34, 197, 160, 0.25)`
                      }}>
                        {cert.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleRevokeCert(cert.id)}
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: T.muted, padding: 4, borderRadius: 4, transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = T.red}
                        onMouseLeave={(e) => e.currentTarget.style.color = T.muted}
                        title="Revoke / Delete Certificate"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* DESIGN & RULES SETTINGS TAB */
        <form onSubmit={handleSaveConfig} style={{
          background: T.s1,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}>
          <h3 style={{
            fontSize: 15,
            fontWeight: 700,
            color: T.text,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <ShieldCheck size={18} color={T.purple} /> Certificate Criteria & Design
          </h3>

          {/* Grid fields */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Authority Signatory Name</label>
              <input
                type="text"
                required
                value={config.signer_name}
                onChange={(e) => setConfig({ ...config, signer_name: e.target.value })}
                style={{
                  background: T.s2,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: '9px 12px',
                  color: T.text,
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Authority Signatory Title</label>
              <input
                type="text"
                required
                value={config.signer_title}
                onChange={(e) => setConfig({ ...config, signer_title: e.target.value })}
                style={{
                  background: T.s2,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: '9px 12px',
                  color: T.text,
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: `1px solid ${T.border}`, margin: '8px 0' }} />

          {/* Validation Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ color: T.text, fontSize: 13, fontWeight: 700, margin: '0 0 2px 0' }}>Completion Parameters</div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: T.muted }}>
              <input
                type="checkbox"
                checked={config.require_passing_quiz}
                onChange={(e) => setConfig({ ...config, require_passing_quiz: e.target.checked })}
                style={{ accentColor: T.purple, width: 16, height: 16 }}
              />
              <span style={{ color: config.require_passing_quiz ? T.text : T.muted }}>Require passing score on all quizzes before auto-generation</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: T.muted }}>
              <input
                type="checkbox"
                checked={config.require_assignments_submitted}
                onChange={(e) => setConfig({ ...config, require_assignments_submitted: e.target.checked })}
                style={{ accentColor: T.purple, width: 16, height: 16 }}
              />
              <span style={{ color: config.require_assignments_submitted ? T.text : T.muted }}>Require all course assignments to be graded & complete</span>
            </label>
          </div>

          {/* Action Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            borderTop: `1px solid ${T.border}`,
            paddingTop: 16,
            marginTop: 8
          }}>
            <button
              type="submit"
              disabled={saveLoading}
              style={{
                background: T.purple,
                color: '#fff',
                border: 'none',
                padding: '9px 20px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Save size={15} /> {saveLoading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      )}

      {/* Manual Issue Certificate Modal Dialog */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(7, 8, 15, 0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16
        }}>
          <div style={{
            background: T.s1,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            width: '100%',
            maxWidth: 500,
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${T.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, color: T.text, fontSize: 16, fontWeight: 700 }}>
                Issue Student Certificate
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.muted, padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateCertSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Student Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Student Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Mehta"
                  value={newCert.student_name}
                  onChange={(e) => setNewCert({ ...newCert, student_name: e.target.value })}
                  style={{
                    background: T.s2,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: '9px 12px',
                    color: T.text,
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Course Title Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Course Completed</label>
                <select
                  value={newCert.course_title}
                  onChange={(e) => setNewCert({ ...newCert, course_title: e.target.value })}
                  style={{
                    background: T.s2,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: '9px 12px',
                    color: T.text,
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                >
                  {courses.length === 0 ? (
                    <option>No Courses Available</option>
                  ) : (
                    courses.map(c => (
                      <option key={c.id} value={c.title}>{c.title}</option>
                    ))
                  )}
                </select>
              </div>

              {/* Optional Issue Date override */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Issue Date (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Jun 14, 2026 (defaults to today)"
                  value={newCert.issue_date}
                  onChange={(e) => setNewCert({ ...newCert, issue_date: e.target.value })}
                  style={{
                    background: T.s2,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: '9px 12px',
                    color: T.text,
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                borderTop: `1px solid ${T.border}`,
                paddingTop: 16,
                marginTop: 8
              }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${T.border}`,
                    color: T.text,
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: T.purple,
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Issue Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
