'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, BookOpen, Tag, FolderOpen, ArrowLeft, ArrowRight } from 'lucide-react';
import { T } from '@/lib/lms-data';
import cheatSheets from '@/lib/all-cheatsheets';

export default function ResourcesCheatSheets({ navigateTo }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupedCheatSheets, setGroupedCheatSheets] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  useEffect(() => {
    // Group cheat sheets by category
    const grouped = {};
    cheatSheets.forEach(sheet => {
      const category = sheet.categories[0] || 'General';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(sheet);
    });
    
    // Sort categories - priority categories first, then alphabetically
    const priorityCategories = ['Programming', 'Python', 'Database'];
    const sortedGrouped = {};
    
    // Add priority categories first
    priorityCategories.forEach(category => {
      if (grouped[category]) {
        sortedGrouped[category] = grouped[category];
      }
    });
    
    // Add remaining categories alphabetically
    Object.keys(grouped)
      .sort()
      .forEach(key => {
        if (!priorityCategories.includes(key)) {
          sortedGrouped[key] = grouped[key];
        }
      });
    
    setGroupedCheatSheets(sortedGrouped);
  }, []);

  const handleCheatSheetClick = (id) => {
    navigateTo('cheatsheet', { id });
  };

  const getFilteredSheets = () => {
    let filtered = cheatSheets;
    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter(sheet => sheet.categories.includes(selectedCategory));
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(sheet => 
        sheet.title.toLowerCase().includes(term) ||
        sheet.intro.toLowerCase().includes(term) ||
        sheet.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }
    return filtered;
  };

  const allCategories = ['All Categories', ...Object.keys(groupedCheatSheets)];
  const displayGrouped = searchTerm === '' && selectedCategory === 'All Categories';
  const filteredSheets = getFilteredSheets();

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', fontFamily: 'var(--font-outfit), sans-serif' }}>
      {/* Back button and header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
        <button
          onClick={() => navigateTo('home')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'transparent', border: 'none', color: T.muted,
            fontSize: 14, cursor: 'pointer', fontWeight: 500, width: 'fit-content'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = T.text}
          onMouseLeave={(e) => e.currentTarget.style.color = T.muted}
        >
          <ArrowLeft size={16} /> Back to Hub
        </button>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: 36, fontWeight: 800, color: T.text, margin: '0 0 10px 0', letterSpacing: '-0.03em',
            background: `linear-gradient(to right, #34D399 0%, #059669 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Cheat Sheets
          </h1>
          <p style={{ color: T.muted, fontSize: 16, margin: 0, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
            Quick reference guides for developers and learners. Find the most important commands and concepts in one place.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 28, maxWidth: 800, marginLeft: 'auto', marginRight: 'auto'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search size={18} color={T.muted} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search cheat sheets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '12px 14px 12px 42px',
              background: T.s1, border: `1px solid ${T.border}`, borderRadius: 10,
              color: T.text, fontSize: 13.5, outline: 'none', fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Categories Dropdown */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '12px 16px', background: T.s1, border: `1px solid ${T.border}`, borderRadius: 10,
            color: T.text, fontSize: 13.5, outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
            minWidth: 180
          }}
        >
          {allCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Stats Counter */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 36
      }}>
        <div style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: '#3B82F6', flexShrink: 0, paddingLeft: 10 }}>
            <BookOpen size={20} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>{cheatSheets.length}</div>
            <div style={{ fontSize: 12, color: T.muted }}>Total Sheets</div>
          </div>
        </div>

        <div style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: '#10B981', flexShrink: 0, paddingLeft: 10 }}>
            <Tag size={20} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>{new Set(cheatSheets.flatMap(s => s.tags)).size}</div>
            <div style={{ fontSize: 12, color: T.muted }}>Unique Tags</div>
          </div>
        </div>

        <div style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.12)', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: '#8B5CF6', flexShrink: 0, paddingLeft: 10 }}>
            <FolderOpen size={20} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>{Object.keys(groupedCheatSheets).length}</div>
            <div style={{ fontSize: 12, color: T.muted }}>Categories</div>
          </div>
        </div>
      </div>

      {/* Main categories listing */}
      {displayGrouped ? (
        Object.entries(groupedCheatSheets).map(([category, sheets]) => (
          <div key={category} style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>
              <FolderOpen size={18} color={T.accent} />
              <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: 0 }}>{category}</h2>
              <span style={{ fontSize: 11.5, background: `${T.accent}15`, color: T.accent, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                {sheets.length} sheets
              </span>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16
            }}>
              {sheets.map(sheet => (
                <motion.div
                  key={sheet.id}
                  whileHover={{ y: -4 }}
                  onClick={() => handleCheatSheetClick(sheet.id)}
                  style={{
                    background: T.s1, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18,
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    minHeight: 160
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: '0 0 6px 0' }}>{sheet.title}</h3>
                    <p style={{ fontSize: 12.5, color: T.muted, margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {sheet.intro}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                    {sheet.tags.slice(0, 2).map(tag => (
                      <span key={tag} style={{ fontSize: 10, background: T.s3, color: T.text, padding: '2px 8px', borderRadius: 4 }}>
                        {tag}
                      </span>
                    ))}
                    {sheet.tags.length > 2 && (
                      <span style={{ fontSize: 10, background: T.s3, color: T.muted, padding: '2px 6px', borderRadius: 4 }}>
                        +{sheet.tags.length - 2}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))
      ) : (
        /* Searched / Filtered list */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>
            <BookOpen size={18} color={T.accent} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: 0 }}>
              {selectedCategory !== 'All Categories' ? selectedCategory : 'Search Results'}
            </h2>
            <span style={{ fontSize: 11.5, background: `${T.accent}15`, color: T.accent, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
              {filteredSheets.length} sheets
            </span>
          </div>

          {filteredSheets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>
              No cheat sheets match your filters.
            </div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16
            }}>
              {filteredSheets.map(sheet => (
                <motion.div
                  key={sheet.id}
                  whileHover={{ y: -4 }}
                  onClick={() => handleCheatSheetClick(sheet.id)}
                  style={{
                    background: T.s1, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18,
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    minHeight: 160
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: '0 0 6px 0' }}>{sheet.title}</h3>
                    <p style={{ fontSize: 12.5, color: T.muted, margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {sheet.intro}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                    {sheet.tags.slice(0, 2).map(tag => (
                      <span key={tag} style={{ fontSize: 10, background: T.s3, color: T.text, padding: '2px 8px', borderRadius: 4 }}>
                        {tag}
                      </span>
                    ))}
                    {sheet.tags.length > 2 && (
                      <span style={{ fontSize: 10, background: T.s3, color: T.muted, padding: '2px 6px', borderRadius: 4 }}>
                        +{sheet.tags.length - 2}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
