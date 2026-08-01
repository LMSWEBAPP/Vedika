'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search as SearchIcon, BookOpen, Users, CheckSquare, FileText, Briefcase, ArrowRight, CornerDownRight } from 'lucide-react';
import { T } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import { searchLMS } from '@/lib/frappe';

export default function AdminSearchPage() {
  const router = useRouter();
  const isMobile = useMediaQuery(isMobileMQ);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({
    courses: [],
    batches: [],
    quizzes: [],
    assignments: [],
    jobs: []
  });

  useEffect(() => {
    if (!query.trim()) {
      setResults({ courses: [], batches: [], quizzes: [], assignments: [], jobs: [] });
      return;
    }

    setLoading(true);
    const debounce = setTimeout(() => {
      searchLMS(query).then(res => {
        setResults(res);
        setLoading(false);
      });
    }, 250);

    return () => clearTimeout(debounce);
  }, [query]);

  const totalResults = 
    results.courses.length + 
    results.batches.length + 
    results.quizzes.length + 
    results.assignments.length + 
    results.jobs.length;

  const renderResultSection = (title, items, icon, routePrefix, subtitleExtractor) => {
    if (items.length === 0) return null;
    const Icon = icon;

    return (
      <div style={{
        background: T.s1,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: 20,
        marginBottom: 20
      }}>
        <h3 style={{
          color: T.text,
          fontSize: 14,
          fontWeight: 700,
          margin: '0 0 16px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: T.purple
        }}>
          <Icon size={16} /> {title} ({items.length})
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => router.push(`${routePrefix}/${item.id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: T.s2,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = T.purple;
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = T.border;
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ color: T.text, fontSize: 13.5, fontWeight: 600 }}>
                  {item.title}
                </div>
                <div style={{ color: T.muted, fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CornerDownRight size={12} color={T.dim} />
                  ID: {item.id} {subtitleExtractor && ` • ${subtitleExtractor(item)}`}
                </div>
              </div>
              <ArrowRight size={14} color={T.muted} />
            </div>
          ))}
        </div>
      </div>
    );
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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: T.text, fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: 0, letterSpacing: '-0.04em' }}>Search Portal</h1>
        <p style={{ color: T.muted, fontSize: 13.5, margin: '4px 0 0' }}>Search across all platform items like courses, modules, batches, quizzes, assignments, and jobs.</p>
      </div>

      {/* Search Bar Input */}
      <div style={{
        position: 'relative',
        marginBottom: 28
      }}>
        <span style={{
          position: 'absolute',
          left: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center'
        }}>
          <SearchIcon size={20} color={T.muted} />
        </span>
        <input
          type="text"
          placeholder="Type keywords to search courses, batches, quizzes, assignments..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          style={{
            width: '100%',
            background: T.s1,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            padding: '14px 16px 14px 48px',
            color: T.text,
            fontSize: 14.5,
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
          onFocus={(e) => e.target.style.borderColor = T.purple}
          onBlur={(e) => e.target.style.borderColor = T.border}
        />
        {loading && (
          <div style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: `2px solid ${T.border}`,
            borderTopColor: T.purple,
            animation: 'spin 0.8s linear infinite'
          }} />
        )}
      </div>

      {/* Results rendering */}
      {query.trim() === '' ? (
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
          <SearchIcon size={48} color={T.muted} style={{ marginBottom: 16 }} />
          <h3 style={{ color: T.text, fontSize: 16, margin: '0 0 6px 0' }}>Start searching</h3>
          <p style={{ color: T.muted, fontSize: 13, maxWidth: 300, margin: 0, lineHeight: 1.5 }}>
            Type keywords in the search bar above to look up system resources.
          </p>
        </div>
      ) : totalResults === 0 && !loading ? (
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
          <SearchIcon size={48} color={T.muted} style={{ marginBottom: 16 }} />
          <h3 style={{ color: T.text, fontSize: 16, margin: '0 0 6px 0' }}>No results found</h3>
          <p style={{ color: T.muted, fontSize: 13, maxWidth: 300, margin: 0, lineHeight: 1.5 }}>
            No records matched "{query}". Try checking your spelling or search terms.
          </p>
        </div>
      ) : (
        <div>
          {renderResultSection("Courses", results.courses, BookOpen, "/admin/courses", (item) => item.category)}
          {renderResultSection("Batches", results.batches, Users, "/admin/batches", (item) => item.medium)}
          {renderResultSection("Quizzes", results.quizzes, CheckSquare, "/admin/quizzes", (item) => `Course: ${item.course}`)}
          {renderResultSection("Assignments", results.assignments, FileText, "/admin/assignments", (item) => `Course: ${item.course}`)}
          {renderResultSection("Jobs", results.jobs, Briefcase, "/admin/jobs", (item) => `${item.company} (${item.status})`)}
        </div>
      )}
    </div>
  );
}
