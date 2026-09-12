'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  CheckCircle, Circle, Clock, Play, GraduationCap, ChevronRight, ChevronLeft, ArrowLeft, Users, Tag, BookOpen, Terminal, X, Award, Search, Grid, Layers
} from 'lucide-react';
import { T } from '@/lib/lms-data';
import { getCourses, getCourseSyllabus, checkStudentEnrollment, enrollStudentInCourse, getStudentEnrollments, saveProgressToRedis, getProgressFromRedis } from '@/lib/frappe';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import dynamic from 'next/dynamic';
import PDFViewerModal from './PDFViewerModal';
import ZimCarousel3D from './ZimCarousel3D';
import PacmanPagination from './PacmanPagination';
import PracticePlaygroundModal from './PracticePlaygroundModal';
import { getSubjectArtwork } from '@/lib/artwork';
const Playground = dynamic(() => import('./Playground'), { ssr: false });

const DECK_ROTATIONS = ['4deg', '-2deg', '-9deg', '7deg', '3deg', '-5deg', '6deg'];

const DEFAULT_THUMBNAILS = [
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'https://images.unsplash.com/photo-1542831371-29b0f74f9713?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600'
];

const CATEGORY_IMAGES = {
  'Web Development': 'https://images.unsplash.com/photo-1547658719-da2b51169166?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'Frontend': 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'Framework': 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'Programming': 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'Python Programming': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'Data Structures & Algorithms': 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'Design': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'Business': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'Finance': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'Personal Development': 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'Data Science': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'Artificial Intelligence': 'https://images.unsplash.com/photo-1677442136019-21780efad99a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'Cybersecurity': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'Cloud Computing': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600'
};

function InteractiveParticles() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const syncCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    syncCanvasSize();

    const resizeObserver = new ResizeObserver(() => {
      syncCanvasSize();
    });
    resizeObserver.observe(container);

    const particleCount = 95;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * (canvas.width || 700),
        y: Math.random() * (canvas.height || 360),
        vx: (Math.random() - 0.5) * 1.25,
        vy: (Math.random() - 0.5) * 1.25,
        radius: Math.random() * 2.3 + 1.2
      });
    }

    const mouse = { x: null, y: null, radius: 160 };

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
      const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
      const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const handlePointerMove = (e) => {
      const pos = getPos(e);
      mouse.x = pos.x;
      mouse.y = pos.y;
    };

    const handlePointerLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('mouseleave', handlePointerLeave);
    canvas.addEventListener('touchmove', handlePointerMove, { passive: true });

    const animate = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        // Background white particle left fade calculation
        const pFade = Math.min(1, Math.max(0.08, p.x / (w * 0.38)));

        // Draw particle dot with smooth left fade
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * pFade})`;
        ctx.fill();

        // Connect nearby nodes with left fade
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 135) {
            const alpha = 1 - dist / 135;
            const lineFade = Math.min(1, Math.max(0.05, Math.min(p.x, p2.x) / (w * 0.38)));
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.4 * lineFade})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Mouse Grab & Vibrant Un-masked Orange Accent Link
        if (mouse.x !== null && mouse.y !== null) {
          const mdx = p.x - mouse.x;
          const mdy = p.y - mouse.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

          if (mdist < mouse.radius) {
            const mAlpha = 1 - mdist / mouse.radius;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(249, 115, 22, ${mAlpha * 0.92})`;
            ctx.lineWidth = 1.4;
            ctx.stroke();
          }
        }
      }

      // Render exact, 100% sharp orange focal cursor point right at (mouse.x, mouse.y)
      if (mouse.x !== null && mouse.y !== null) {
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 7.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(249, 115, 22, 0.4)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 3.8, 0, Math.PI * 2);
        ctx.fillStyle = '#F97316';
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      resizeObserver.disconnect();
      if (canvas) {
        canvas.removeEventListener('mousemove', handlePointerMove);
        canvas.removeEventListener('mouseleave', handlePointerLeave);
        canvas.removeEventListener('touchmove', handlePointerMove);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'transparent',
        maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 15%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,1) 60%, rgba(0,0,0,1) 85%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 15%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,1) 60%, rgba(0,0,0,1) 85%, transparent 100%)',
        cursor: 'default'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          background: 'transparent'
        }}
      />
    </div>
  );
}

function CourseDeckWidget({
  mode = 'courses', // 'categories' | 'courses'
  items,
  activeDrilldownCategory,
  onSelectCategory,
  onBackToCategories,
  handleSelectCourse,
  handleEnrollFromCard,
  enrolledCourseIds = [],
  isMobile
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [coursePage, setCoursePage] = useState(1);
  const COURSES_PER_PAGE = 3;

  useEffect(() => {
    setActiveIdx(0);
  }, [items?.length, mode, activeDrilldownCategory]);

  useEffect(() => {
    setCoursePage(1);
  }, [items?.length, activeDrilldownCategory]);

  if (!items || items.length === 0) return null;

  const currentItem = items[activeIdx] || items[0];

  if (mode === 'categories') {
    return (
      <div style={{
        background: 'transparent',
        border: 'none',
        borderRadius: 0,
        padding: isMobile ? '12px 0' : '20px 0',
        marginBottom: 32,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        gap: isMobile ? 18 : 26
      }}>
        {/* Category Carousel Title Pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: `${T.accent}14`,
          border: `1px solid ${T.accent}30`,
          color: T.accent,
          padding: '6px 14px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase'
        }}>
          <span>📂 Course Categories</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span>{items.length} {items.length === 1 ? 'Category' : 'Categories'} Available</span>
        </div>

        {/* Centered ZIM 3D Cylindrical Carousel for Categories */}
        <div style={{
          width: '100%',
          maxWidth: 880,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: isMobile ? 270 : 330,
          margin: '0 auto'
        }}>
          <ZimCarousel3D
            courses={items}
            activeIdx={activeIdx}
            onActiveIdxChange={setActiveIdx}
            onSelectCourse={(catItem) => onSelectCategory && onSelectCategory(catItem.title)}
            isMobile={isMobile}
          />
        </div>

        {/* Active Category Details Centered Below the Carousel */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 12,
          maxWidth: 720,
          width: '100%',
          margin: '0 auto'
        }}>
          <h2 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 900, color: T.text, margin: 0, lineHeight: 1.2, letterSpacing: '-0.03em' }}>
            {currentItem.title}
          </h2>

          <p style={{ fontSize: isMobile ? 13.5 : 15, color: T.muted, margin: 0, lineHeight: 1.6, maxWidth: 640 }}>
            {currentItem.tagline || `Explore all specialized courses under ${currentItem.title}. Select this category to browse the complete curriculum.`}
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11.5, color: T.purple, background: `${T.purple}15`, padding: '3px 10px', borderRadius: 6, fontWeight: 700 }}>
              {currentItem.badge}
            </span>
            <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>
              📚 {currentItem.totalLessons || 0} lessons total
            </span>
            {currentItem.instructorsCount > 0 && (
              <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>
                👤 {currentItem.instructorsCount} {currentItem.instructorsCount === 1 ? 'Instructor' : 'Instructors'}
              </span>
            )}
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 6 }}>
            <button
              onClick={() => onSelectCategory && onSelectCategory(currentItem.title)}
              style={{
                background: T.accent,
                color: '#FFFFFF',
                border: 'none',
                padding: '11px 28px',
                borderRadius: 12,
                fontSize: 13.5,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(59, 130, 246, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Explore {currentItem.title} Courses <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Course mode (when a category is selected or searching)
  const totalPages = Math.max(1, Math.ceil((items?.length || 0) / COURSES_PER_PAGE));
  const currentCourses = (items || []).slice((coursePage - 1) * COURSES_PER_PAGE, coursePage * COURSES_PER_PAGE);

  return (
    <div style={{
      background: 'transparent',
      border: 'none',
      borderRadius: 0,
      padding: isMobile ? '12px 0' : '16px 0',
      marginBottom: 24,
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      gap: isMobile ? 16 : 20
    }}>
      {/* Top Breadcrumb & Return Bar when inside a category */}
      {activeDrilldownCategory && (
        <div style={{
          width: '100%',
          maxWidth: 1120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 18px',
          background: T.s2,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          flexWrap: 'wrap',
          gap: 10
        }}>
          <button
            onClick={onBackToCategories}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: `${T.accent}14`,
              border: `1px solid ${T.accent}40`,
              color: T.accent,
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = `${T.accent}24`}
            onMouseLeave={(e) => e.currentTarget.style.background = `${T.accent}14`}
          >
            <ArrowLeft size={16} /> Back to All Categories
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: T.muted }}>
              Categories <span style={{ opacity: 0.5 }}>›</span> <strong style={{ color: T.text }}>{activeDrilldownCategory}</strong>
            </span>
            <span style={{
              fontSize: 11.5,
              background: `${T.purple}18`,
              color: T.purple,
              padding: '3px 10px',
              borderRadius: 12,
              fontWeight: 700
            }}>
              {items.length} {items.length === 1 ? 'Course' : 'Courses'}
            </span>
          </div>
        </div>
      )}

      {/* Exactly 3 courses shown at a time */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: 18,
        width: '100%',
        maxWidth: 1120,
        margin: '0 auto',
        alignItems: 'stretch'
      }}>
        {currentCourses.map((c) => {
          const totalLessons = c.lessonsCount || (c.lessons ? c.lessons.length : 0);
          const isEnrolled = enrolledCourseIds.includes(c.id);
          const totalMins = totalLessons * 10;
          const hours = Math.floor(totalMins / 60);
          const mins = totalMins % 60;
          const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
          const level = c.title?.toLowerCase().includes('advanced') || c.title?.toLowerCase().includes('expert')
            ? 'Advanced'
            : (c.title?.toLowerCase().includes('intermediate') ? 'Intermediate' : 'Beginner');
          const thumb = c.thumbnail || c.image || getSubjectArtwork(c.category) || DEFAULT_THUMBNAILS[0];

          return (
            <div
              key={c.id}
              style={{
                background: T.s1,
                border: `1px solid ${T.border}`,
                borderRadius: 16,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${T.accent}60`;
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = T.border;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.2)';
              }}
              onClick={() => handleSelectCourse(c)}
            >
              <div>
                {/* Course Thumbnail */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: 135,
                  borderRadius: 12,
                  overflow: 'hidden',
                  marginBottom: 12
                }}>
                  <img
                    src={thumb}
                    alt={c.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(6px)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#FFF'
                  }}>
                    {level}
                  </div>
                </div>

                {/* Category & Instructor */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 11,
                    color: T.purple,
                    background: `${T.purple}16`,
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontWeight: 700
                  }}>
                    {c.category || 'General'}
                  </span>
                  <span style={{ fontSize: 11.5, color: T.muted }}>
                    By {c.instructor || 'Vedika'}
                  </span>
                </div>

                {/* Course Title */}
                <h3 style={{
                  fontSize: 15.5,
                  fontWeight: 800,
                  color: T.text,
                  margin: '0 0 6px 0',
                  lineHeight: 1.3,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {c.title}
                </h3>

                {/* Course Tagline */}
                <p style={{
                  fontSize: 12.5,
                  color: T.muted,
                  margin: '0 0 12px 0',
                  lineHeight: 1.45,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {c.tagline || 'Master core subject concepts with interactive modules, coding labs, and AI mentorship.'}
                </p>
              </div>

              {/* Card Footer: Metadata & Action Button */}
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 10,
                  borderTop: `1px solid ${T.border}`,
                  marginBottom: 12,
                  fontSize: 11.5,
                  color: T.muted
                }}>
                  <span>📚 {totalLessons} lessons</span>
                  <span>⏱️ {durationStr}</span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectCourse(c);
                    }}
                    style={{
                      flex: 1,
                      background: isEnrolled ? `${T.accent}20` : T.accent,
                      color: isEnrolled ? T.accent : '#FFFFFF',
                      border: isEnrolled ? `1px solid ${T.accent}50` : 'none',
                      padding: '9px 12px',
                      borderRadius: 10,
                      fontSize: 12.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: isEnrolled ? 'none' : '0 4px 14px rgba(59, 130, 246, 0.3)',
                      transition: 'transform 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {isEnrolled ? 'Open Course' : 'View Syllabus'} <ChevronRight size={14} />
                  </button>

                  {!isEnrolled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEnrollFromCard(c.id, e);
                      }}
                      style={{
                        background: T.s2,
                        color: T.text,
                        border: `1px solid ${T.border}`,
                        padding: '9px 14px',
                        borderRadius: 10,
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = T.accent}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = T.border}
                    >
                      Enroll
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pacman Pagination: rendered only when items > 3 */}
      {totalPages > 1 && (
        <div style={{ marginTop: 14 }}>
          <PacmanPagination
            currentPage={coursePage}
            totalPages={totalPages}
            onPageChange={setCoursePage}
          />
        </div>
      )}
    </div>
  );
}

export default function CoursePage() {
  const isMobile = useMediaQuery(isMobileMQ);
  const isTabletOrSmallDesktop = useMediaQuery('(max-width: 1150px)');
  const rPad = isMobile ? 16 : 36;
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);

  const outerStyle = { padding: isMobile ? '20px 16px' : '32px 36px', fontFamily: 'var(--font-outfit), sans-serif' };

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseDetails, setCourseDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [completed, setCompleted] = useState({});
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);

  // Category, Search, Carousel & Modal States
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeDrilldownCategory, setActiveDrilldownCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('deck'); // 'deck' or 'grid'
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [selectedPdfResource, setSelectedPdfResource] = useState(null);
  const carouselRef = useRef(null);
  const categoriesContainerRef = useRef(null);

  // Group published courses into category cards for the initial Category Carousel
  const categoryDeckItems = useMemo(() => {
    const map = new Map();
    courses.forEach((c) => {
      let locallyDeleted = [];
      try { locallyDeleted = JSON.parse(localStorage.getItem('locally_deleted_courses') || '[]').map(String); } catch (e) { }
      if (locallyDeleted.includes(String(c.id))) return;

      const cat = (c.category || 'General').trim();
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat).push(c);
    });

    const list = [];
    let idx = 0;
    map.forEach((catCourses, catName) => {
      const totalLessons = catCourses.reduce((sum, c) => sum + (c.lessonsCount || (c.lessons ? c.lessons.length : 0)), 0);
      const instructors = new Set(catCourses.map(c => c.instructor).filter(Boolean));
      const thumb = catCourses.find(c => c.image)?.image || getSubjectArtwork(catName);

      list.push({
        id: `cat-${catName}`,
        title: catName,
        category: 'Category',
        badge: `${catCourses.length} ${catCourses.length === 1 ? 'Course' : 'Courses'}`,
        thumbnail: thumb,
        courses: catCourses,
        totalLessons,
        instructorsCount: instructors.size,
        tagline: `Explore ${catCourses.length} ${catCourses.length === 1 ? 'specialized course' : 'specialized courses'} in ${catName} with comprehensive modules and hands-on practice.`
      });
      idx++;
    });
    return list;
  }, [courses]);

  // Dynamic unique categories list for pill navigation
  const allCategories = useMemo(() => {
    const set = new Set();
    courses.forEach(c => {
      let locallyDeleted = [];
      try { locallyDeleted = JSON.parse(localStorage.getItem('locally_deleted_courses') || '[]').map(String); } catch (e) { }
      if (locallyDeleted.includes(String(c.id))) return;
      if (c.category) set.add(c.category.trim());
    });
    return ['All', ...Array.from(set)];
  }, [courses]);

  const handleScrollCarousel = (dir) => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const scrollAmount = container.clientWidth * 0.75;
    container.scrollBy({
      left: dir === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const handleScrollCategories = (dir) => {
    if (!categoriesContainerRef.current) return;
    categoriesContainerRef.current.scrollBy({
      left: dir === 'left' ? -260 : 260,
      behavior: 'smooth'
    });
  };

  // Fetch courses and load completion progress
  useEffect(() => {
    let email = '';
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('frappe_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          if (user && user.email) {
            email = user.email;
            setUserEmail(user.email);
          }
        } catch (e) { }
      }
    }

    async function loadData() {
      try {
        const [list, enrollments] = await Promise.all([
          getCourses({ forceRefresh: true }),
          email ? getStudentEnrollments(email) : Promise.resolve([])
        ]);
        let locallyDeleted = [];
        try {
          locallyDeleted = JSON.parse(localStorage.getItem('locally_deleted_courses') || '[]').map(String);
        } catch (e) {}

        // Students see Published courses and newly created local courses
        const isCourseVisible = (c) => {
          if (!c) return false;
          if (locallyDeleted.includes(String(c.id))) return false;
          if (c.status === 'Published' || c.status === 'published' || !c.status) return true;
          if (/^\d{10,}$/.test(String(c.id)) || String(c.id).startsWith('local_') || String(c.id).startsWith('course_') || String(c.id).startsWith('ch_')) return true;
          return false;
        };
        const published = list.filter(isCourseVisible);
        setCourses(published);
        setEnrolledCourseIds(enrollments || []);

        // Restore UX memory of last viewed course on mount
        if (typeof window !== 'undefined') {
          const lastCourseId = localStorage.getItem('selected_course_id');
          if (lastCourseId) {
            const found = published.find(c => String(c.id) === String(lastCourseId));
            if (found) {
              handleSelectCourse(found);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Listen for cross-tab or cross-component course updates
    const handleCoursesUpdated = () => {
      loadData();
    };
    window.addEventListener('courses_updated', handleCoursesUpdated);
    window.addEventListener('storage', handleCoursesUpdated);
    window.addEventListener('focus', handleCoursesUpdated);

    let key = 'completed_lessons';
    if (email) {
      key = `completed_lessons_${email}`;
    }
    const savedCompleted = localStorage.getItem(key);
    let localCompleted = {};
    if (savedCompleted) {
      try {
        localCompleted = JSON.parse(savedCompleted);
        setCompleted(localCompleted);
      } catch (e) { }
    }

    if (email) {
      getProgressFromRedis(email).then(async (remoteCompleted) => {
        if (remoteCompleted) {
          const merged = { ...localCompleted, ...remoteCompleted };
          setCompleted(merged);
          localStorage.setItem(`completed_lessons_${email}`, JSON.stringify(merged));

          const remoteKeys = Object.keys(remoteCompleted).length;
          const mergedKeys = Object.keys(merged).length;
          if (mergedKeys > remoteKeys) {
            await saveProgressToRedis(email, merged);
          }
        }
      }).catch(err => console.error("Error synchronizing progress:", err));
    }

    return () => {
      window.removeEventListener('courses_updated', handleCoursesUpdated);
      window.removeEventListener('storage', handleCoursesUpdated);
      window.removeEventListener('focus', handleCoursesUpdated);
    };
  }, []);

  async function handleSelectCourse(course) {
    setSelectedCourse(course);
    if (typeof window !== 'undefined' && course) {
      localStorage.setItem('selected_course_id', course.id);
    }
    setDetailsLoading(true);
    try {
      // Retrieve stored user email directly in case it changed
      let email = userEmail;
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('frappe_user');
        if (stored) {
          try {
            const user = JSON.parse(stored);
            if (user && user.email) {
              email = user.email;
              setUserEmail(user.email);
            }
          } catch (e) { }
        }
      }

      const enrolledStatus = enrolledCourseIds.includes(course.id) || await checkStudentEnrollment(course.id, email);
      setIsEnrolled(enrolledStatus);

      const details = await getCourseSyllabus(course.id);
      setCourseDetails(details);
    } catch (e) {
      console.error("Failed to load course details", e);
    } finally {
      setDetailsLoading(false);
    }
  }

  const handleEnroll = async () => {
    if (!selectedCourse || !userEmail) return;
    setIsEnrolling(true);
    try {
      await enrollStudentInCourse(selectedCourse.id, userEmail);
      setIsEnrolled(true);
      // Refresh enrollments list
      const enrollments = await getStudentEnrollments(userEmail);
      setEnrolledCourseIds(enrollments || []);
    } catch (e) {
      console.error("Failed to enroll student", e);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleEnrollFromCard = async (courseId, e) => {
    e.stopPropagation(); // Prevent opening the outline page
    if (!userEmail) return;
    try {
      await enrollStudentInCourse(courseId, userEmail);
      // Refresh enrollments list
      const enrollments = await getStudentEnrollments(userEmail);
      setEnrolledCourseIds(enrollments || []);
    } catch (err) {
      console.error("Failed to enroll student from card", err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Loading courses...</div>
        </div>
      </div>
    );
  }

  if (detailsLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Loading course syllabus...</div>
        </div>
      </div>
    );
  }

  // Render course outline if a specific course is selected
  if (selectedCourse && courseDetails) {
    const details = courseDetails;
    const modules = details.modules || [];

    // Compile all lessons in this course
    const courseLessons = modules.flatMap(m => m.lessons.map(l => ({ ...l, module: m })));
    const total = courseLessons.length;
    const done = courseLessons.filter(l => completed[l.id]).length;
    const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0;

    return (
      <div
        className="no-scrollbar"
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          maxHeight: '100%',
          overflowY: isEnrolled ? 'auto' : 'hidden',
          background: T.bg,
          boxSizing: 'border-box'
        }}
      >
        <div style={{
          width: '100%',
          maxWidth: 1200,
          margin: '0 auto',
          padding: isMobile ? '20px 16px' : '28px 36px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }} className="no-scrollbar">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            {/* Back button */}
            <button
              onClick={() => {
                setSelectedCourse(null);
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('selected_course_id');
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                color: T.muted,
                cursor: 'pointer',
                fontSize: 13,
                padding: 0,
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = T.text}
              onMouseLeave={(e) => e.currentTarget.style.color = T.muted}
            >
              <ArrowLeft size={15} /> Back to Courses
            </button>

            <button
              data-practice-trigger="true"
              onClick={(e) => {
                if (typeof window !== 'undefined') {
                  const r = e.currentTarget.getBoundingClientRect();
                  window.__lastPracticeTriggerRect = { left: r.left, top: r.top, width: r.width, height: r.height };
                }
                setIsPlaygroundOpen(!isPlaygroundOpen);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: isPlaygroundOpen ? `${T.accent}15` : 'transparent',
                border: `1px solid ${isPlaygroundOpen ? T.accent : 'var(--border)'}`,
                color: isPlaygroundOpen ? T.accent : 'var(--text)',
                cursor: 'pointer',
                fontSize: 12.5,
                fontWeight: 600,
                padding: '6px 14px',
                borderRadius: 8,
                transition: 'all 0.15s'
              }}
            >
              <Terminal size={14} />
              {isPlaygroundOpen ? 'Close Playground' : 'Practice Playground'}
            </button>
          </div>

          {/* Course Detail Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11.5, color: T.accent, background: `${T.accent}15`, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                {selectedCourse.category}
              </span>
              <span style={{ fontSize: 11.5, color: T.muted }}>
                By {selectedCourse.instructor}
              </span>
            </div>

            <h2 style={{ color: T.text, fontSize: 24, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.03em' }}>
              {details.title}
            </h2>

            <p style={{ color: T.muted, margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              {details.tagline}
            </p>

            {selectedCourse.pdf && (
              <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                <button
                  onClick={() => {
                    setSelectedPdfResource({ file_link: selectedCourse.pdf, name: `${selectedCourse.title} Reference Materials` });
                    setIsPdfViewerOpen(true);
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: `${T.accent}12`, border: `1px solid ${T.accent}40`,
                    color: T.accent, padding: '7px 14px', borderRadius: 8,
                    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  📄 View Course PDF Materials
                </button>
              </div>
            )}
          </div>

          {/* Enrollment CTA Card or Outline List */}
          {!isEnrolled ? (
            <div style={{
              background: T.s1,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              padding: '40px 24px',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${T.accent} 0%, #3B82F6 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(59, 130, 246, 0.2)',
                marginBottom: 8
              }}>
                <GraduationCap size={30} color="#fff" />
              </div>
              <h3 style={{ color: T.text, fontSize: 18, fontWeight: 700, margin: 0 }}>Enroll in Course</h3>
              <p style={{ color: T.muted, fontSize: 13.5, maxWidth: 420, margin: 0, lineHeight: 1.5 }}>
                Enroll now to gain complete access to modules, lesson transcripts, hands-on assignments, and start learning with your personalized AI tutor!
              </p>
              <button
                onClick={handleEnroll}
                disabled={isEnrolling}
                style={{
                  background: isEnrolling ? T.dim : T.accent,
                  color: '#000',
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: isEnrolling ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(91, 140, 248, 0.3)',
                  transition: 'all 0.2s',
                  marginTop: 8
                }}
              >
                {isEnrolling ? 'Enrolling...' : 'Confirm Enrollment'}
              </button>
            </div>
          ) : (
            <div>
              {progressPercent === 100 && (
                <div style={{
                  background: `linear-gradient(135deg, ${T.purple}12 0%, ${T.accent}12 100%)`,
                  border: `1px solid ${T.purple}30`,
                  borderRadius: 16,
                  padding: '24px 20px',
                  textAlign: 'center',
                  marginBottom: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <div style={{ fontSize: 32 }}>🏆</div>
                  <h3 style={{ color: T.text, fontSize: 16, fontWeight: 700, margin: 0 }}>Congratulations! You completed the course!</h3>
                  <p style={{ color: T.muted, fontSize: 13, margin: 0, maxWidth: 460 }}>
                    You have successfully completed all lessons in this course. You can now view and download your verified completion certificate!
                  </p>
                  <button
                    onClick={() => setIsCertModalOpen(true)}
                    style={{
                      background: `linear-gradient(135deg, ${T.purple} 0%, ${T.accent} 100%)`,
                      color: '#fff',
                      border: 'none',
                      padding: '8px 20px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(155, 110, 248, 0.2)'
                    }}
                  >
                    View Completion Certificate
                  </button>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, color: T.muted }}>
                  <span>Progress: {done}/{total} lessons completed</span>
                  <span style={{ fontWeight: 600, color: T.accent }}>{progressPercent}% Complete</span>
                </div>

                <div style={{ background: T.s3, borderRadius: 99, height: 6, marginTop: 8, width: '100%', overflow: 'hidden' }}>
                  <div style={{
                    background: T.accent, height: '100%', borderRadius: 99,
                    width: `${progressPercent}%`, transition: 'width 0.4s'
                  }} />
                </div>
              </div>

              {/* Modules list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {modules.map((mod, mi) => {
                  const modDone = mod.lessons.filter(l => completed[l.id]).length;
                  return (
                    <div key={mod.id} style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
                      {/* Module header */}
                      <div style={{
                        padding: '16px 20px', borderBottom: `1px solid ${T.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 9,
                            background: `${mod.accent || T.accent}18`, border: `1px solid ${mod.accent || T.accent}30`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                          }}>{mod.emoji}</div>
                          <div>
                            <div style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>{mi + 1}. {mod.title}</div>
                            <div style={{ color: T.muted, fontSize: 12 }}>{mod.lessons.length} lessons · {modDone} completed</div>
                          </div>
                        </div>
                        {/* Circular progress */}
                        <div style={{ width: 36, height: 36, borderRadius: '50%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="36" height="36" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
                            <circle cx="18" cy="18" r="14" fill="none" stroke={T.s3} strokeWidth="3" />
                            <circle cx="18" cy="18" r="14" fill="none" stroke={mod.accent || T.accent} strokeWidth="3"
                              strokeDasharray={`${2 * Math.PI * 14}`}
                              strokeDashoffset={`${2 * Math.PI * 14 * (1 - (mod.lessons.length > 0 ? modDone / mod.lessons.length : 0))}`}
                              strokeLinecap="round" />
                          </svg>
                          <span style={{ fontSize: 10, color: mod.accent || T.accent, fontWeight: 700, position: 'relative' }}>
                            {mod.lessons.length > 0 ? Math.round((modDone / mod.lessons.length) * 100) : 0}%
                          </span>
                        </div>
                      </div>

                      {/* Lessons */}
                      <div>
                        {mod.lessons.map((lesson, li) => (
                          <a
                            key={lesson.id}
                            href={`/lesson/${lesson.id}`}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center',
                              justifyContent: 'space-between', padding: '13px 20px',
                              background: 'transparent', border: 'none',
                              borderBottom: li < mod.lessons.length - 1 ? `1px solid ${T.border}` : 'none',
                              cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                              textDecoration: 'none'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = T.s2}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {completed[lesson.id]
                                ? <CheckCircle size={16} color={T.green} />
                                : <Circle size={16} color={T.dim} />}
                              <div>
                                <div style={{ color: T.text, fontSize: 13.5, fontWeight: 500 }}>{lesson.title}</div>
                                <div style={{ color: T.muted, fontSize: 12, marginTop: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <Clock size={11} />{lesson.dur}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {completed[lesson.id] && (
                                <span style={{ fontSize: 11, color: T.green, background: `${T.green}18`, padding: '2px 8px', borderRadius: 20 }}>Done</span>
                              )}
                              <Play size={14} color={T.muted} />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <PracticePlaygroundModal
            isOpen={isPlaygroundOpen}
            onClose={() => setIsPlaygroundOpen(false)}
            title={`Practice: ${selectedCourse.title}`}
            badge={selectedCourse.category || 'Python'}
            initialCode={`# Practice for: ${selectedCourse.title}\n# Write your code here\n\n`}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      background: T.bg
    }}>
      <div style={{
        width: '100%',
        padding: isMobile ? '20px 16px' : '32px 36px',
        display: 'flex',
        flexDirection: 'column'
      }} className="no-scrollbar">
        {/* Top Hero Section with 2-Column Layout & Prominent Left Faded Particle Canvas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1.25fr',
          gap: isMobile ? 20 : 16,
          alignItems: 'center',
          marginBottom: 32
        }}>
          {/* Left Side: Exact Text & Search / Playground Controls */}
          <div>
            <h1 style={{
              fontSize: isMobile ? 32 : 46,
              fontWeight: 900,
              color: T.text,
              lineHeight: 1.12,
              letterSpacing: '-0.04em',
              margin: '0 0 16px 0',
              fontFamily: 'var(--font-outfit), sans-serif'
            }}>
              Learn. Practice.<br />
              Master with <span style={{ color: '#F97316' }}>Vedika.</span>
            </h1>
            <p style={{
              fontSize: isMobile ? 14 : 15.5,
              color: T.muted,
              lineHeight: 1.6,
              maxWidth: 540,
              margin: '0 0 24px 0'
            }}>
              Your all-in-one learning platform to explore courses, practice coding, and build real-world skills.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* Real-Time Course Search Bar */}
              <div style={{ position: 'relative', width: isMobile ? '100%' : 300 }}>
                <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search courses, instructors, tags..."
                  style={{
                    width: '100%',
                    padding: '10px 36px 10px 38px',
                    borderRadius: 12,
                    background: T.s2,
                    border: `1px solid ${T.border}`,
                    color: T.text,
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = T.accent}
                  onBlur={(e) => e.target.style.borderColor = T.border}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: T.muted, cursor: 'pointer', display: 'flex', alignItems: 'center'
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                data-practice-trigger="true"
                onClick={(e) => {
                  if (typeof window !== 'undefined') {
                    const r = e.currentTarget.getBoundingClientRect();
                    window.__lastPracticeTriggerRect = { left: r.left, top: r.top, width: r.width, height: r.height };
                  }
                  setIsPlaygroundOpen(!isPlaygroundOpen);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: isPlaygroundOpen ? `${T.accent}15` : T.s2,
                  border: `1px solid ${isPlaygroundOpen ? T.accent : T.border}`,
                  color: isPlaygroundOpen ? T.accent : T.text,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '9.5px 16px',
                  borderRadius: 12,
                  transition: 'all 0.15s'
                }}
              >
                <Terminal size={14} />
                {isPlaygroundOpen ? 'Close Playground' : 'Practice Playground'}
              </button>
            </div>
          </div>

          {/* Right Side: Prominent Faded Interactive Particles Component */}
          <div style={{ height: isMobile ? 250 : 310, width: '100%' }}>
            <InteractiveParticles />
          </div>
        </div>

        {/* 100% Width Category Pills Carousel */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 8, marginBottom: 24, position: 'relative' }}>
          <button
            onClick={() => handleScrollCategories('left')}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: T.s2,
              border: `1px solid ${T.border}`,
              color: T.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text; }}
          >
            <ChevronLeft size={16} />
          </button>

          <div
            ref={categoriesContainerRef}
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              width: '100%',
              padding: '4px 0'
            }}
            className="no-scrollbar"
          >
            {allCategories.map(cat => {
              const isSelected = (!activeDrilldownCategory && selectedCategory === cat) || (activeDrilldownCategory === cat);
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    if (cat === 'All') {
                      setActiveDrilldownCategory(null);
                    } else {
                      setActiveDrilldownCategory(cat);
                    }
                  }}
                  style={{
                    background: isSelected ? T.accent : T.s2,
                    color: isSelected ? '#fff' : T.text,
                    border: isSelected ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
                    padding: '6px 16px',
                    borderRadius: 20,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s'
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handleScrollCategories('right')}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: T.s2,
              border: `1px solid ${T.border}`,
              color: T.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text; }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Dynamic Category / Course Carousel Drilldown Presentation */}
        {(() => {
          // If searching: show filtered courses directly matching search query
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const searchResults = courses.filter(c => {
              let locallyDeleted = [];
              try { locallyDeleted = JSON.parse(localStorage.getItem('locally_deleted_courses') || '[]').map(String); } catch (e) { }
              if (locallyDeleted.includes(String(c.id))) return false;

              return (
                c.title?.toLowerCase().includes(q) ||
                c.category?.toLowerCase().includes(q) ||
                c.instructor?.toLowerCase().includes(q) ||
                c.tagline?.toLowerCase().includes(q)
              );
            });

            if (searchResults.length === 0) {
              return (
                <div style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 16, padding: '48px 20px', textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                  <h3 style={{ color: T.text, fontSize: 16, fontWeight: 600, margin: '0 0 6px 0' }}>No matching courses found</h3>
                  <p style={{ color: T.muted, fontSize: 13, maxWidth: 360, margin: '0 auto 16px auto' }}>
                    No courses match "{searchQuery}".
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ background: T.accent, color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Clear Search
                  </button>
                </div>
              );
            }

            return (
              <div>
                <CourseDeckWidget
                  mode="courses"
                  items={searchResults}
                  handleSelectCourse={handleSelectCourse}
                  handleEnrollFromCard={handleEnrollFromCard}
                  enrolledCourseIds={enrolledCourseIds}
                  isMobile={isMobile}
                />
              </div>
            );
          }

          // If student has selected a specific category: show that category's courses carousel with breadcrumbs
          if (activeDrilldownCategory) {
            const categoryCourses = courses.filter(c => {
              let locallyDeleted = [];
              try { locallyDeleted = JSON.parse(localStorage.getItem('locally_deleted_courses') || '[]').map(String); } catch (e) { }
              if (locallyDeleted.includes(String(c.id))) return false;

              return (c.category || 'General').trim().toLowerCase() === activeDrilldownCategory.trim().toLowerCase();
            });

            if (categoryCourses.length === 0) {
              return (
                <div style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 16, padding: '48px 20px', textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
                  <h3 style={{ color: T.text, fontSize: 16, fontWeight: 600, margin: '0 0 6px 0' }}>No courses in {activeDrilldownCategory} yet</h3>
                  <p style={{ color: T.muted, fontSize: 13, maxWidth: 360, margin: '0 auto 16px auto' }}>
                    No published courses are currently assigned to this category.
                  </p>
                  <button
                    onClick={() => { setActiveDrilldownCategory(null); setSelectedCategory('All'); }}
                    style={{ background: T.accent, color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    ← Back to All Categories
                  </button>
                </div>
              );
            }

            return (
              <div>
                <CourseDeckWidget
                  mode="courses"
                  items={categoryCourses}
                  activeDrilldownCategory={activeDrilldownCategory}
                  onBackToCategories={() => {
                    setActiveDrilldownCategory(null);
                    setSelectedCategory('All');
                  }}
                  handleSelectCourse={handleSelectCourse}
                  handleEnrollFromCard={handleEnrollFromCard}
                  enrolledCourseIds={enrolledCourseIds}
                  isMobile={isMobile}
                />
              </div>
            );
          }

          // Initial Landing: Show Category Carousel (grouped categories with ZimCarousel3D)
          if (categoryDeckItems.length === 0) {
            return (
              <div style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 16, padding: '48px 20px', textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
                <h3 style={{ color: T.text, fontSize: 16, fontWeight: 600, margin: '0 0 6px 0' }}>No categories available</h3>
                <p style={{ color: T.muted, fontSize: 13, maxWidth: 360, margin: '0 auto 16px auto' }}>
                  There are currently no published courses or categories to display.
                </p>
              </div>
            );
          }

          return (
            <div>
              <CourseDeckWidget
                mode="categories"
                items={categoryDeckItems}
                onSelectCategory={(catName) => {
                  setActiveDrilldownCategory(catName);
                  setSelectedCategory(catName);
                }}
                handleSelectCourse={handleSelectCourse}
                handleEnrollFromCard={handleEnrollFromCard}
                enrolledCourseIds={enrolledCourseIds}
                isMobile={isMobile}
              />
            </div>
          );
        })()}
        <PracticePlaygroundModal
          isOpen={isPlaygroundOpen}
          onClose={() => setIsPlaygroundOpen(false)}
          title="Python Practice Playground"
          badge="Interactive Sandbox"
          initialCode={`# General Coding Playground\n# Write your code here\n\n`}
        />
      </div>

      {/* Course Completion Certificate Modal */}
      {isCertModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(7, 8, 15, 0.85)', backdropFilter: 'blur(8px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div style={{
            background: '#faf7f7ff', border: '15px double #7C3AED',
            borderRadius: 8, width: '100%', maxWidth: 700, padding: '40px 48px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative',
            color: '#0F1D30', fontFamily: 'serif', textAlign: 'center'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setIsCertModalOpen(false)}
              style={{
                position: 'absolute', top: 16, right: 16, background: 'transparent',
                border: 'none', cursor: 'pointer', color: '#647298'
              }}
            >
              <X size={20} />
            </button>

            {/* Certificate Content */}
            <div style={{ border: '2px solid #7C3AED', padding: '30px 20px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#7C3AED', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>
                Certificate of Completion
              </div>
              <div style={{ fontSize: 12, fontStyle: 'italic', color: '#4B5E7D', marginBottom: 24 }}>
                This is proudly presented to
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#0F1D30', borderBottom: '2px solid #E1EBF5', display: 'inline-block', paddingBottom: 6, marginBottom: 18, minWidth: 260 }}>
                {userEmail ? (userEmail.split('@')[0].replace(/\d+/g, '').replace(/[\._]/g, ' ').toUpperCase()) : 'AARAV MEHTA'}
              </div>
              <div style={{ fontSize: 13, color: '#4B5E7D', lineHeight: 1.6, maxWidth: 500, margin: '0 auto 28px' }}>
                for successfully fulfilling all requirements and completing the certified curriculum for the course
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F1D30', marginTop: 8, fontFamily: 'var(--font-outfit), sans-serif' }}>
                  {selectedCourse?.title}
                </div>
              </div>

              {/* Signatures & Date */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 20, padding: '0 30px' }}>
                <div style={{ textAlign: 'center', width: 140 }}>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', fontStyle: 'italic', color: '#7C3AED', marginBottom: 4 }}>AI Tutor Academy</div>
                  <div style={{ borderTop: '1px solid #C4CFE5', paddingTop: 4, fontSize: 10, color: '#8CA2C0', textTransform: 'uppercase' }}>Authorized Entity</div>
                </div>
                <div style={{ fontSize: 11, color: '#8CA2C0' }}>
                  Issued on: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div style={{ textAlign: 'center', width: 140 }}>
                  <div style={{ fontSize: 14, fontFamily: 'cursive', color: '#2563EB', marginBottom: 4 }}>Seshu Yashu</div>
                  <div style={{ borderTop: '1px solid #C4CFE5', paddingTop: 4, fontSize: 10, color: '#8CA2C0', textTransform: 'uppercase' }}>Lead Instructor</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        isOpen={isPdfViewerOpen}
        onClose={() => { setIsPdfViewerOpen(false); setSelectedPdfResource(null); }}
        pdfResource={selectedPdfResource}
      />

    </div>
  );
}
