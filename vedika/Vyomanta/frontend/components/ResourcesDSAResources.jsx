'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Menu, X, Search, Sparkles, BookOpen, Layers } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkSlug from 'remark-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import TOCSection from './TOCSection';

export default function ResourcesDSAResources({ navigateTo }) {
  const [markdown, setMarkdown] = useState('');
  const [headings, setHeadings] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [activeHeading, setActiveHeading] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [tocFilter, setTocFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch the markdown file from the public folder
    setIsLoading(true);
    fetch('/src/ds-res/das-resource.md')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then(text => {
        setMarkdown(text);
        extractHeadings(text);
      })
      .catch(error => {
        console.warn('Could not load markdown file from static server:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const extractHeadings = (text) => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headingsList = [];
    let match;

    while ((match = headingRegex.exec(text)) !== null) {
      const level = match[1].length;
      const title = match[2]
        .replace(/\*\*(.*?)\*\*/g, '$1')  
        .replace(/\*(.*?)\*/g, '$1')      
        .replace(/\[(.*?)\]\(.*?\)/g, '$1'); 
      
      const id = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')  
        .replace(/\s+/g, '-')      
        .replace(/-+/g, '-');      

      headingsList.push({ id, title, level });
    }

    setHeadings(headingsList);
    
    // Expand top-level sections by default
    const initialExpanded = {};
    headingsList.forEach(h => {
      if (h.level <= 2) {
        initialExpanded[h.id] = true;
      }
    });
    setExpandedSections(initialExpanded);
  };

  const groupedHeadings = useMemo(() => {
    const groups = [];
    let currentGroup = null;

    headings.forEach(heading => {
      if (heading.level === 1) {
        currentGroup = { ...heading, children: [] };
        groups.push(currentGroup);
      } else if (currentGroup && heading.level > 1) {
        currentGroup.children.push(heading);
      }
    });

    if (!tocFilter.trim()) return groups;

    // Filter TOC by search term
    const filter = tocFilter.toLowerCase();
    return groups.filter(g => 
      g.title.toLowerCase().includes(filter) || 
      g.children.some(c => c.title.toLowerCase().includes(filter))
    ).map(g => ({
      ...g,
      children: g.children.filter(c => 
        c.title.toLowerCase().includes(filter) || g.title.toLowerCase().includes(filter)
      )
    }));
  }, [headings, tocFilter]);

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleHeadingClick = (id) => {
    setActiveHeading(id);
    const element = document.getElementById(id);
    const container = document.querySelector('.dsa-resources-markdown');
    
    if (element && container) {
      const offsetPosition = element.offsetTop - 30;
      container.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      
      setTimeout(() => {
        setActiveHeading(id);
        setIsMobileMenuOpen(false);
      }, 100);
    }
  };

  // Active section highlight on scroll
  useEffect(() => {
    const handleScroll = () => {
      const container = document.querySelector('.dsa-resources-markdown');
      if (!container) return;
      
      const hs = document.querySelectorAll('h1[id], h2[id], h3[id]');
      let currentHeading = '';
      
      for (let i = 0; i < hs.length; i++) {
        const heading = hs[i];
        if (heading.offsetTop - container.scrollTop <= 120) {
          currentHeading = heading.id;
        }
      }
      
      if (container.scrollTop === 0 && hs.length > 0) {
        currentHeading = hs[0].id;
      }
      if (currentHeading && currentHeading !== activeHeading) {
        setActiveHeading(currentHeading);
      }
    };

    const container = document.querySelector('.dsa-resources-markdown');
    if (container) {
      setTimeout(handleScroll, 100);
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [activeHeading, markdown]);

  // Helper to create reliable slug ID from heading node
  const getHeadingId = (children) => {
    const text = Array.isArray(children) 
      ? children.map(c => (typeof c === 'string' ? c : (c?.props?.children || ''))).join('')
      : String(children || '');
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  return (
    <div className="dsa-resources-page">
      <div className="dsa-resources-container">
        
        {/* Navigation header */}
        <div className="dsa-resources-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="dsa-resources-header-controls" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              className="dsa-resources-mobile-menu-button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Table of Contents"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            <button
              onClick={() => navigateTo('dsa')}
              className="dsa-resources-back-button"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to DSA Practice
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 8 }}>
            <span style={{ 
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', 
              fontSize: 12.5, fontWeight: 700, padding: '5px 12px', borderRadius: 6,
              border: '1px solid rgba(16, 185, 129, 0.25)'
            }}>
              <Sparkles size={13} /> DSA Master Roadmap
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)', display: 'none', smDisplay: 'inline' }}>
              8 Stages • 14 Core Patterns
            </span>
          </div>
        </div>

        <div className="dsa-resources-content-wrapper">
          <div className="dsa-resources-content">
            
            {/* Mobile Drawer (rendered only when user opens mobile menu) */}
            {isMobileMenuOpen && (
              <div className="dsa-resources-mobile-toc-drawer open">
                <div className="dsa-resources-mobile-toc-menu">
                  <div className="dsa-resources-mobile-toc-header">
                    <h2 className="dsa-resources-sidebar-title">Roadmap Sections</h2>
                    <button
                      className="dsa-resources-mobile-toc-close"
                      onClick={() => setIsMobileMenuOpen(false)}
                      aria-label="Close menu"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="dsa-resources-toc-container">
                    <ul className="dsa-resources-toc">
                      {groupedHeadings.map((section) => (
                        <TOCSection
                          key={section.id}
                          section={section}
                          activeHeading={activeHeading}
                          expandedSections={expandedSections}
                          handleHeadingClick={handleHeadingClick}
                          toggleSection={toggleSection}
                        />
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Desktop Sidebar */}
            <div className="dsa-resources-sidebar">
              <div className="dsa-resources-sidebar-header" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={15} color="var(--accent)" />
                  <h2 className="dsa-resources-sidebar-title">Table of Contents</h2>
                </div>
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input
                    type="text"
                    placeholder="Search topics..."
                    value={tocFilter}
                    onChange={(e) => setTocFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px 6px 30px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      color: 'var(--text)',
                      fontSize: 12,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
              <div className="dsa-resources-toc-container">
                <ul className="dsa-resources-toc">
                  {groupedHeadings.map((section) => (
                    <TOCSection
                      key={section.id}
                      section={section}
                      activeHeading={activeHeading}
                      expandedSections={expandedSections}
                      handleHeadingClick={handleHeadingClick}
                      toggleSection={toggleSection}
                    />
                  ))}
                </ul>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="dsa-resources-main">
              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--muted)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Loading DSA Master Roadmap...</span>
                </div>
              ) : (
                <div className="dsa-resources-markdown">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkSlug]}
                    rehypePlugins={[rehypeAutolinkHeadings]}
                    components={{
                      h1: ({ node, ...props }) => {
                        const id = getHeadingId(props.children);
                        return <h1 id={id} className="dsa-resources-heading-1" {...props} />;
                      },
                      h2: ({ node, ...props }) => {
                        const id = getHeadingId(props.children);
                        return <h2 id={id} className="dsa-resources-heading-2" {...props} />;
                      },
                      h3: ({ node, ...props }) => {
                        const id = getHeadingId(props.children);
                        return <h3 id={id} className="dsa-resources-heading-3" {...props} />;
                      },
                      h4: ({ node, ...props }) => <h4 className="dsa-resources-heading-4" {...props} />,
                      h5: ({ node, ...props }) => <h5 className="dsa-resources-heading-5" {...props} />,
                      h6: ({ node, ...props }) => <h6 className="dsa-resources-heading-6" {...props} />,
                      p: ({ node, ...props }) => <p className="dsa-resources-paragraph" {...props} />,
                      a: ({ node, ...props }) => <a className="dsa-resources-link" target="_blank" rel="noopener noreferrer" {...props} />,
                      ul: ({ node, ...props }) => <ul className="dsa-resources-list" {...props} />,
                      ol: ({ node, ...props }) => <ol className="dsa-resources-list ordered" {...props} />,
                      li: ({ node, ...props }) => <li className="dsa-resources-list-item" {...props} />,
                      blockquote: ({ node, ...props }) => <blockquote className="dsa-resources-blockquote" {...props} />,
                      code: ({ node, ...props }) => <code className="dsa-resources-code" {...props} />,
                      pre: ({ node, ...props }) => <pre className="dsa-resources-pre" {...props} />,
                      table: ({ node, ...props }) => <table className="dsa-resources-table" {...props} />,
                      th: ({ node, ...props }) => <th className="dsa-resources-table-header" {...props} />,
                      td: ({ node, ...props }) => <td className="dsa-resources-table-cell" {...props} />,
                    }}
                  >
                    {markdown}
                  </ReactMarkdown>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
