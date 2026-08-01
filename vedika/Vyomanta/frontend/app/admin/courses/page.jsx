'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, GraduationCap, BookOpen, Upload, Download } from 'lucide-react';
import { T } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import { getCourses, createCourse, updateCourse, deleteCourse } from '@/lib/frappe';

export default function AdminCoursesPage() {
  const router = useRouter();
  const isMobile = useMediaQuery(isMobileMQ);
  
  // State variables
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [currentCourse, setCurrentCourse] = useState({ id: '', title: '', instructor: '', category: 'Web Development', enrolled: 0, status: 'Draft', date: '', description: '', image: '', pdf: '' });

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState(null);

  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
    setImportFile(null);
    setImportLoading(false);
    setImportError('');
    setImportResult(null);
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) return;

    setImportLoading(true);
    setImportError('');
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await fetch('/api/admin/courses/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import CSV syllabus.');
      }

      if (data.success) {
        if (data.localFallback) {
          // Parse JSON and write to localStorage fallback
          const importedCourses = data.data;
          
          const savedCoursesList = localStorage.getItem('admin_courses_list') || JSON.stringify([]);
          let coursesList = JSON.parse(savedCoursesList);

          const today = new Date();
          const formattedDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

          const results = [];

          for (const course of importedCourses) {
            const courseId = Date.now().toString() + '_' + Math.floor(Math.random() * 10000);
            
            // Add Course Header
            const newCourseHeader = {
              id: courseId,
              title: course.title,
              instructor: 'Administrator',
              category: course.category,
              enrolled: 0,
              status: course.status,
              date: formattedDate
            };
            coursesList.unshift(newCourseHeader);

            // Construct and Save Syllabus Details
            const syllabus = {
              id: courseId,
              title: course.title,
              tagline: course.short_introduction || `${course.title} tagline.`,
              modules: course.chapters.map((ch, chIdx) => {
                const chapterId = `ch_${courseId}_${chIdx}`;
                return {
                  id: chapterId,
                  title: ch.title,
                  emoji: '📖',
                  accent: '#5B8CF8',
                  lessons: ch.lessons.map((les, lesIdx) => {
                    const lessonId = `les_${chapterId}_${lesIdx}`;
                    return {
                      id: lessonId,
                      title: les.title,
                      dur: les.dur,
                      vid: les.vid,
                      overview: les.overview,
                      pts: les.pts,
                      quizQuestions: []
                    };
                  })
                };
              })
            };
            localStorage.setItem(`admin_course_details_${courseId}`, JSON.stringify(syllabus));

            results.push({
              id: courseId,
              title: course.title,
              chaptersCount: course.chapters.length,
              lessonsCount: course.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0)
            });
          }

          localStorage.setItem('admin_courses_list', JSON.stringify(coursesList));
          
          // Trigger updates checklist
          updateChecklist(coursesList);
          
          setImportResult({
            localFallback: true,
            imported: results
          });
        } else {
          setImportResult({
            localFallback: false,
            imported: data.imported
          });
        }

        // Reload courses on the page
        getCourses().then(setCourses);
      }
    } catch (err) {
      setImportError(err.message || 'An error occurred during import.');
    } finally {
      setImportLoading(false);
    }
  };

  // Load courses via unified API client
  useEffect(() => {
    getCourses().then(setCourses);
  }, []);

  const updateChecklist = (newList) => {
    // Update Getting Started checklist 'course' step automatically if list is not empty
    const savedChecklist = localStorage.getItem('admin_getting_started');
    if (savedChecklist) {
      try {
        const checklist = JSON.parse(savedChecklist);
        if (newList.length > 0 && !checklist.course) {
          checklist.course = true;
          localStorage.setItem('admin_getting_started', JSON.stringify(checklist));
          window.dispatchEvent(new Event('admin_checklist_update'));
        }
      } catch (e) {}
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setCurrentCourse({ id: '', title: '', instructor: 'Administrator', category: 'Web Development', enrolled: 0, status: 'Draft', date: formattedDate, description: '', image: '', pdf: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (course) => {
    setModalMode('edit');
    setCurrentCourse({
      id: course.id,
      title: course.title,
      instructor: course.instructor,
      category: course.category,
      enrolled: course.enrolled,
      status: course.status,
      date: course.date,
      description: course.description || '',
      image: course.image || '',
      pdf: course.pdf || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteCourse = async (id) => {
    // 1. Immediately remove from local state
    setCourses(prev => prev.filter(c => c.id !== id));

    // 2. Write to local storage deleted cache to hide on student side instantly
    try {
      const locallyDeleted = JSON.parse(localStorage.getItem('locally_deleted_courses') || '[]');
      if (!locallyDeleted.includes(id)) {
        locallyDeleted.push(id);
        localStorage.setItem('locally_deleted_courses', JSON.stringify(locallyDeleted));
      }
    } catch (e) {
      console.error('Failed to update locally_deleted_courses:', e);
    }

    // 3. Delete in background
    deleteCourse(id).then(success => {
      if (success) {
        getCourses().then(fresh => {
          updateChecklist(fresh);
        });
      } else {
        console.error('Failed to delete course from DB in background');
      }
    }).catch(e => {
      console.error('Error during background course deletion:', e);
    });
  };

  const handleSaveCourseSubmit = async (e) => {
    e.preventDefault();
    if (!currentCourse.title.trim()) return;

    if (modalMode === 'create') {
      await createCourse(currentCourse);
    } else {
      await updateCourse(currentCourse.id, currentCourse);
    }
    
    const fresh = await getCourses();
    setCourses(fresh);
    updateChecklist(fresh);
    setIsModalOpen(false);
  };

  // Filter courses
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          course.instructor.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || course.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Pagination setup
  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage) || 1;
  const paginatedCourses = filteredCourses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const containerPadding = isMobile ? '70px 16px 32px 16px' : '40px';

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
        marginBottom: 24
      }}>
        <div>
          <h1 style={{ color: T.text, fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: 0, letterSpacing: '-0.04em' }}>Courses</h1>
          <p style={{ color: T.muted, fontSize: 13.5, margin: '4px 0 0' }}>Manage the system curricula, check enrollees, and modify status.</p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => setIsImportModalOpen(true)}
            style={{
              background: 'transparent',
              color: T.text,
              border: `1px solid ${T.border}`,
              padding: '9px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${T.purple}10`;
              e.currentTarget.style.borderColor = T.purple;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = T.border;
            }}
          >
            <Upload size={16} /> Import Syllabus
          </button>

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
            <Plus size={16} /> New Course
          </button>
        </div>
      </div>

      {/* Filters Area */}
      <div style={{
        background: T.s1,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
            <Search size={16} color={T.muted} />
          </span>
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{
              width: '100%',
              background: T.s2,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: '8px 12px 8px 36px',
              color: T.text,
              fontSize: 13,
              fontFamily: 'inherit',
              outline: 'none'
            }}
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
          style={{
            background: T.s2,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            padding: '8px 12px',
            color: T.text,
            fontSize: 13,
            outline: 'none',
            fontFamily: 'inherit',
            minWidth: 140
          }}
        >
          <option value="All">All Categories</option>
          <option value="Personal Development">Personal Development</option>
          <option value="Design">Design</option>
          <option value="Business">Business</option>
          <option value="Finance">Finance</option>
          <option value="Web Development">Web Development</option>
          <option value="Frontend">Frontend</option>
          <option value="Framework">Framework</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
          style={{
            background: T.s2,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            padding: '8px 12px',
            color: T.text,
            fontSize: 13,
            outline: 'none',
            fontFamily: 'inherit',
            minWidth: 120
          }}
        >
          <option value="All">All Statuses</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
        </select>
      </div>

      {/* Courses List Container */}
      {filteredCourses.length === 0 ? (
        <div style={{
          background: T.s1,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: '64px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <GraduationCap size={48} color={T.muted} style={{ marginBottom: 16 }} />
          <h3 style={{ color: T.text, fontSize: 16, margin: '0 0 6px 0' }}>No courses yet</h3>
          <p style={{ color: T.muted, fontSize: 13, maxWidth: 300, margin: '0 0 16px 0' }}>
            There are no courses matching your filter criteria.
          </p>
          <button
            onClick={handleOpenCreateModal}
            style={{
              background: T.purple,
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Plus size={14} /> Create Course
          </button>
        </div>
      ) : (
        <>
          {/* Table Container */}
          <div style={{
            background: T.s1,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            overflowX: 'auto',
            marginBottom: 20
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}`, color: T.muted, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Course Title</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Instructor</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Enrolled Students</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Created Date</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: 13 }}>
                {paginatedCourses.map((course) => {
                  const isPublished = course.status === 'Published';
                  return (
                    <tr key={course.id} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.01)' } }}>
                      {/* Title */}
                      <td style={{ padding: '16px 20px', color: T.text, fontWeight: 600 }}>
                        {course.title}
                      </td>
                      
                      {/* Instructor */}
                      <td style={{ padding: '16px 20px', color: T.muted }}>
                        {course.instructor}
                      </td>
                      
                      {/* Category */}
                      <td style={{ padding: '16px 20px', color: T.muted }}>
                        {course.category}
                      </td>
                      
                      {/* Enrolled */}
                      <td style={{ padding: '16px 20px', color: T.text, fontWeight: 500 }}>
                        {course.enrolled}
                      </td>
                      
                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          display: 'inline-block',
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: 20,
                          textTransform: 'capitalize',
                          background: isPublished ? 'rgba(34, 197, 160, 0.12)' : 'rgba(100, 114, 152, 0.15)',
                          color: isPublished ? T.green : T.muted,
                          border: `1px solid ${isPublished ? 'rgba(34, 197, 160, 0.25)' : 'rgba(100, 114, 152, 0.3)'}`
                        }}>
                          {course.status}
                        </span>
                      </td>
                      
                      {/* Created Date */}
                      <td style={{ padding: '16px 20px', color: T.muted }}>
                        {course.date}
                      </td>
                      
                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => router.push(`/admin/courses/${course.id}`)}
                            style={{
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              color: T.muted, padding: 4, borderRadius: 4, transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = T.accent}
                            onMouseLeave={(e) => e.currentTarget.style.color = T.muted}
                            title="Manage Course Syllabus (chapters & lessons)"
                          >
                            <BookOpen size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(course)}
                            style={{
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              color: T.muted, padding: 4, borderRadius: 4, transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = T.purple}
                            onMouseLeave={(e) => e.currentTarget.style.color = T.muted}
                            title="Edit course details"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(course.id)}
                            style={{
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              color: T.muted, padding: 4, borderRadius: 4, transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = T.red}
                            onMouseLeave={(e) => e.currentTarget.style.color = T.muted}
                            title="Delete course"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12.5,
            color: T.muted
          }}>
            <span>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCourses.length)} of {filteredCourses.length} courses
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: currentPage === 1 ? T.dim : T.text,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              
              <span style={{
                background: `${T.purple}20`,
                border: `1px solid ${T.purple}40`,
                color: T.purple,
                fontWeight: 700,
                width: 28,
                height: 28,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {currentPage}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: currentPage === totalPages ? T.dim : T.text,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Interactive Modal Dialog for Create/Edit */}
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
                {modalMode === 'create' ? 'Create New Course' : 'Edit Course Details'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.muted, padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCourseSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Title Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Course Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced Python Patterns"
                  value={currentCourse.title}
                  onChange={(e) => setCurrentCourse({ ...currentCourse, title: e.target.value })}
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

              {/* Grid: Instructor and Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Instructor</label>
                  <input
                    type="text"
                    required
                    placeholder="Instructor Name"
                    value={currentCourse.instructor}
                    onChange={(e) => setCurrentCourse({ ...currentCourse, instructor: e.target.value })}
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
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Category</label>
                  <select
                    value={currentCourse.category}
                    onChange={(e) => setCurrentCourse({ ...currentCourse, category: e.target.value })}
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
                    <option value="Personal Development">Personal Development</option>
                    <option value="Design">Design</option>
                    <option value="Business">Business</option>
                    <option value="Finance">Finance</option>
                    <option value="Web Development">Web Development</option>
                    <option value="Frontend">Frontend</option>
                    <option value="Framework">Framework</option>
                  </select>
                </div>
              </div>

              {/* Grid: Enrolled and Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Enrolled Students</label>
                  <input
                    type="number"
                    min="0"
                    value={currentCourse.enrolled}
                    onChange={(e) => setCurrentCourse({ ...currentCourse, enrolled: e.target.value })}
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
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Status</label>
                  <select
                    value={currentCourse.status}
                    onChange={(e) => setCurrentCourse({ ...currentCourse, status: e.target.value })}
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
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                  </select>
                </div>
              </div>

              {/* Course Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Course Description</label>
                <textarea
                  placeholder="Detailed course curriculum explanation..."
                  value={currentCourse.description}
                  onChange={(e) => setCurrentCourse({ ...currentCourse, description: e.target.value })}
                  rows={3}
                  style={{
                    background: T.s2,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: '9px 12px',
                    color: T.text,
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Course Image URL */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Course Image URL (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. https://images.unsplash.com/photo-..."
                  value={currentCourse.image}
                  onChange={(e) => setCurrentCourse({ ...currentCourse, image: e.target.value })}
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

              {/* Course Materials PDF URL */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Course Materials PDF URL (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. https://drive.google.com/file/d/..."
                  value={currentCourse.pdf}
                  onChange={(e) => setCurrentCourse({ ...currentCourse, pdf: e.target.value })}
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

              {/* Action Buttons */}
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
                  {modalMode === 'create' ? 'Add Course' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {isImportModalOpen && (
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
            maxWidth: 550,
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={18} color={T.purple} />
                <h3 style={{ margin: 0, color: T.text, fontSize: 16, fontWeight: 700 }}>
                  Import Courses Syllabus
                </h3>
              </div>
              <button
                onClick={handleCloseImportModal}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.muted, padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: 20 }}>
              {!importResult ? (
                <form onSubmit={handleImportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p style={{ color: T.muted, fontSize: 13, margin: 0, lineHeight: '1.5' }}>
                    Upload a syllabus CSV file containing courses, chapters, and lessons. 
                    The importer will map them hierarchically and create them in the system.
                  </p>

                  {/* Template download link */}
                  <div style={{
                    background: `${T.purple}08`,
                    border: `1px dashed ${T.purple}30`,
                    borderRadius: 10,
                    padding: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>Syllabus CSV Template</div>
                      <div style={{ color: T.muted, fontSize: 11.5 }}>Download the formatted template for reference.</div>
                    </div>
                    <a
                      href="/api/admin/courses/import"
                      download="sample_syllabus.csv"
                      style={{
                        background: T.s2,
                        color: T.purple,
                        border: `1px solid ${T.border}`,
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${T.purple}10`;
                        e.currentTarget.style.borderColor = T.purple;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = T.s2;
                        e.currentTarget.style.borderColor = T.border;
                      }}
                    >
                      <Download size={14} /> Template
                    </a>
                  </div>

                  {/* Dropzone / Upload area */}
                  <div 
                    style={{
                      border: `2px dashed ${importFile ? T.purple : T.border}`,
                      borderRadius: 12,
                      padding: '30px 20px',
                      textAlign: 'center',
                      background: importFile ? `${T.purple}04` : T.s2,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s'
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = T.purple;
                      e.currentTarget.style.background = `${T.purple}08`;
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = importFile ? T.purple : T.border;
                      e.currentTarget.style.background = importFile ? `${T.purple}04` : T.s2;
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setImportFile(e.dataTransfer.files[0]);
                      }
                    }}
                  >
                    <input 
                      type="file" 
                      accept=".csv"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setImportFile(e.target.files[0]);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                    
                    {!importFile ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <Upload size={32} color={T.muted} />
                        <div>
                          <span style={{ color: T.purple, fontWeight: 600, fontSize: 13 }}>Click to upload</span>
                          <span style={{ color: T.muted, fontSize: 13 }}> or drag & drop CSV file</span>
                        </div>
                        <div style={{ color: T.dim, fontSize: 11 }}>Only CSV files are supported.</div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          background: `${T.purple}15`,
                          padding: 10,
                          borderRadius: 8,
                          color: T.purple
                        }}>
                          <Upload size={24} />
                        </div>
                        <div style={{ color: T.text, fontWeight: 600, fontSize: 13.5, maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {importFile.name}
                        </div>
                        <div style={{ color: T.muted, fontSize: 12 }}>
                          {(importFile.size / 1024).toFixed(1)} KB
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setImportFile(null);
                          }}
                          style={{
                            background: 'transparent',
                            color: T.red,
                            border: 'none',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginTop: 4
                          }}
                        >
                          Remove file
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Error Alert */}
                  {importError && (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: 8,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      color: T.red,
                      fontSize: 12.5,
                      lineHeight: '1.4'
                    }}>
                      <X size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <strong style={{ display: 'block', fontWeight: 600, marginBottom: 2 }}>Import Failed</strong>
                        {importError}
                      </div>
                    </div>
                  )}

                  {/* Buttons */}
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
                      disabled={importLoading}
                      onClick={handleCloseImportModal}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${T.border}`,
                        color: T.text,
                        padding: '8px 16px',
                        borderRadius: 8,
                        fontSize: 12.5,
                        cursor: importLoading ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!importFile || importLoading}
                      style={{
                        background: T.purple,
                        color: '#fff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: 8,
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: (!importFile || importLoading) ? 'not-allowed' : 'pointer',
                        opacity: (!importFile || importLoading) ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      {importLoading ? 'Processing...' : 'Process Import'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Success/Result View */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                    padding: '16px 0',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      background: 'rgba(34, 197, 160, 0.12)',
                      color: T.green,
                      padding: 12,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <BookOpen size={32} />
                    </div>
                    <div>
                      <h4 style={{ color: T.text, fontSize: 16, fontWeight: 700, margin: '0 0 4px 0' }}>
                        Syllabus Imported Successfully!
                      </h4>
                      <p style={{ color: T.muted, fontSize: 13, margin: 0 }}>
                        {importResult.localFallback 
                          ? 'CSV syllabus parsed and saved to local storage fallback.' 
                          : 'Syllabus structure sync\'d successfully.'}
                      </p>
                    </div>
                  </div>

                  {/* Summary of imported courses */}
                  <div style={{
                    background: T.s2,
                    border: `1px solid ${T.border}`,
                    borderRadius: 12,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      padding: '10px 14px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderBottom: `1px solid ${T.border}`,
                      color: T.text,
                      fontSize: 12,
                      fontWeight: 600
                    }}>
                      Import Details ({importResult.imported.length} {importResult.imported.length === 1 ? 'Course' : 'Courses'})
                    </div>
                    <div style={{ maxHeight: 180, overflowY: 'auto', padding: '6px 0' }}>
                      {importResult.imported.map((item, idx) => (
                        <div 
                          key={item.id || idx}
                          style={{
                            padding: '8px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: idx === importResult.imported.length - 1 ? 'none' : `1px solid ${T.border}30`
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: '70%' }}>
                            <div style={{ color: T.text, fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.title}
                            </div>
                            <div style={{ color: T.dim, fontSize: 11 }}>
                              ID: {item.id}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <span style={{
                              fontSize: 10.5,
                              color: T.purple,
                              background: `${T.purple}15`,
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontWeight: 600
                            }}>
                              {item.chaptersCount} {item.chaptersCount === 1 ? 'chapter' : 'chapters'}
                            </span>
                            <span style={{
                              fontSize: 10.5,
                              color: T.accent,
                              background: `${T.accent}15`,
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontWeight: 600
                            }}>
                              {item.lessonsCount} {item.lessonsCount === 1 ? 'lesson' : 'lessons'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Close button */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    borderTop: `1px solid ${T.border}`,
                    paddingTop: 16,
                    marginTop: 8
                  }}>
                    <button
                      onClick={handleCloseImportModal}
                      style={{
                        background: T.purple,
                        color: '#fff',
                        border: 'none',
                        padding: '8px 24px',
                        borderRadius: 8,
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
