'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, X, Calendar, MapPin, DollarSign, CheckCircle2 } from 'lucide-react';
import { T } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import { getBatches, createBatch, updateBatch, deleteBatch, getCourses } from '@/lib/frappe';

export default function AdminBatchesPage() {
  const isMobile = useMediaQuery(isMobileMQ);

  // States
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [currentBatch, setCurrentBatch] = useState({
    id: '',
    title: '',
    start_date: '',
    end_date: '',
    medium: 'Online',
    seat_count: 50,
    published: true,
    amount: 0,
    currency: 'USD'
  });

  // Load batches and courses
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [batchList, courseList] = await Promise.all([getBatches(), getCourses()]);
        setBatches(batchList);
        setCourses(courseList);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const updateChecklist = (newList) => {
    const savedChecklist = localStorage.getItem('admin_getting_started');
    if (savedChecklist) {
      try {
        const checklist = JSON.parse(savedChecklist);
        if (newList.length > 0 && !checklist.batch) {
          checklist.batch = true;
          localStorage.setItem('admin_getting_started', JSON.stringify(checklist));
          window.dispatchEvent(new Event('admin_checklist_update'));
        }
      } catch (e) {}
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    const today = new Date().toISOString().split('T')[0];
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    const endDateStr = threeMonthsLater.toISOString().split('T')[0];

    setCurrentBatch({
      id: '',
      title: '',
      start_date: today,
      end_date: endDateStr,
      medium: 'Online',
      seat_count: 50,
      published: true,
      amount: 199,
      currency: 'USD'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (batch, e) => {
    e.stopPropagation();
    setModalMode('edit');
    setCurrentBatch({ ...batch });
    setIsModalOpen(true);
  };

  const handleDeleteBatch = async (id, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this batch?')) {
      const success = await deleteBatch(id);
      if (success) {
        const fresh = await getBatches();
        setBatches(fresh);
        updateChecklist(fresh);
      }
    }
  };

  const handleSaveBatchSubmit = async (e) => {
    e.preventDefault();
    if (!currentBatch.title.trim()) return;

    if (modalMode === 'create') {
      await createBatch(currentBatch);
    } else {
      await updateBatch(currentBatch.id, currentBatch);
    }

    const fresh = await getBatches();
    setBatches(fresh);
    updateChecklist(fresh);
    setIsModalOpen(false);
  };

  const containerPadding = isMobile ? '70px 16px 32px 16px' : '40px';
  const gridColumns = isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))';

  return (
    <div style={{
      padding: containerPadding,
      maxWidth: 1200,
      margin: '0 auto',
      fontFamily: 'var(--font-outfit), sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 28
      }}>
        <div>
          <h1 style={{ color: T.text, fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: 0, letterSpacing: '-0.04em' }}>
            Batches & Cohorts
          </h1>
          <p style={{ color: T.muted, fontSize: 13.5, margin: '4px 0 0' }}>
            Manage cohort groups, scheduled courses, medium of delivery, and enrollment seats.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
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
          <Plus size={16} /> Create Batch
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '2px solid rgba(155, 110, 248, 0.2)',
            borderTopColor: T.purple,
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      ) : batches.length === 0 ? (
        <div style={{
          background: T.s1,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: '64px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: 320
        }}>
          <Users size={48} color={T.muted} style={{ marginBottom: 16 }} />
          <h3 style={{ color: T.text, fontSize: 16, margin: '0 0 6px 0' }}>No Batches Scheduled</h3>
          <p style={{ color: T.muted, fontSize: 13, maxWidth: 320, margin: '0 0 16px 0' }}>
            Organize learners into batch cohorts for group discussions, timelines, and virtual sessions.
          </p>
          <button
            onClick={handleOpenCreateModal}
            style={{
              background: T.purple,
              color: '#fff',
              border: 'none',
              padding: '9px 16px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Plus size={14} /> Schedule First Batch
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: gridColumns,
          gap: 20
        }}>
          {batches.map((batch) => (
            <div
              key={batch.id}
              style={{
                background: T.s1,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s',
                position: 'relative'
              }}
            >
              <div>
                {/* Title and Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                  <h3 style={{ color: T.text, fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                    {batch.title}
                  </h3>
                  
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={(e) => handleOpenEditModal(batch, e)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.muted, padding: 3, borderRadius: 4 }}
                      onMouseEnter={(e) => e.currentTarget.style.color = T.purple}
                      onMouseLeave={(e) => e.currentTarget.style.color = T.muted}
                      title="Edit Batch"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteBatch(batch.id, e)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.muted, padding: 3, borderRadius: 4 }}
                      onMouseEnter={(e) => e.currentTarget.style.color = T.red}
                      onMouseLeave={(e) => e.currentTarget.style.color = T.muted}
                      title="Delete Batch"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{
                    fontSize: 10,
                    background: batch.medium === 'Online' ? `${T.accent}18` : `${T.green}18`,
                    border: `1px solid ${batch.medium === 'Online' ? T.accent : T.green}25`,
                    color: batch.medium === 'Online' ? T.accent : T.green,
                    padding: '2px 8px',
                    borderRadius: 20,
                    fontWeight: 700
                  }}>
                    {batch.medium.toUpperCase()}
                  </span>
                  
                  {!batch.published && (
                    <span style={{ fontSize: 10, background: `${T.muted}18`, border: `1px solid ${T.muted}25`, color: T.muted, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                      DRAFT
                    </span>
                  )}
                </div>

                {/* Details info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: T.muted }}>
                    <Calendar size={13} color={T.muted} />
                    <span>{batch.start_date} to {batch.end_date}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: T.muted }}>
                    <Users size={13} color={T.muted} />
                    <span>{batch.seat_count} seats capacity</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: T.muted }}>
                    <DollarSign size={13} color={T.muted} />
                    <span>{batch.amount > 0 ? `${batch.amount} ${batch.currency}` : 'Free Batch'}</span>
                  </div>
                </div>
              </div>

              {/* Footer status check */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: T.muted,
                borderTop: `1px solid ${T.border}`,
                paddingTop: 12,
                marginTop: 4
              }}>
                <CheckCircle2 size={12} color={batch.published ? T.green : T.muted} />
                <span>{batch.published ? 'Visible to guest/students' : 'Hidden draft cohort'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Modal Form */}
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
            maxWidth: 480,
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
                {modalMode === 'create' ? 'Create New Cohort Batch' : 'Edit Cohort Batch'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.muted, padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveBatchSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Batch Title */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Batch / Cohort Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Python Cohort - Summer 2026"
                  value={currentBatch.title}
                  onChange={(e) => setCurrentBatch({ ...currentBatch, title: e.target.value })}
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

              {/* Start & End Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Start Date</label>
                  <input
                    type="date"
                    required
                    value={currentBatch.start_date}
                    onChange={(e) => setCurrentBatch({ ...currentBatch, start_date: e.target.value })}
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
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>End Date</label>
                  <input
                    type="date"
                    required
                    value={currentBatch.end_date}
                    onChange={(e) => setCurrentBatch({ ...currentBatch, end_date: e.target.value })}
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

              {/* Medium & Seat Count */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Medium</label>
                  <select
                    value={currentBatch.medium}
                    onChange={(e) => setCurrentBatch({ ...currentBatch, medium: e.target.value })}
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
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Seat Capacity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={currentBatch.seat_count}
                    onChange={(e) => setCurrentBatch({ ...currentBatch, seat_count: parseInt(e.target.value) || 0 })}
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

              {/* Pricing Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Price (Amount)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={currentBatch.amount}
                    onChange={(e) => setCurrentBatch({ ...currentBatch, amount: parseFloat(e.target.value) || 0 })}
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
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Currency</label>
                  <input
                    type="text"
                    required
                    placeholder="USD"
                    value={currentBatch.currency}
                    onChange={(e) => setCurrentBatch({ ...currentBatch, currency: e.target.value })}
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

              {/* Publish Toggle Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="published"
                  checked={currentBatch.published}
                  onChange={(e) => setCurrentBatch({ ...currentBatch, published: e.target.checked })}
                  style={{ accentColor: T.purple, width: 16, height: 16 }}
                />
                <label htmlFor="published" style={{ fontSize: 12.5, color: T.text, cursor: 'pointer' }}>
                  Publish Batch (visible to students)
                </label>
              </div>

              {/* Action buttons */}
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
                  {modalMode === 'create' ? 'Create Batch' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
