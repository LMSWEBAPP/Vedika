'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Menu, X } from 'lucide-react';
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
  
  const [markdownChunks, setMarkdownChunks] = useState([]);
  const [loadedChunks, setLoadedChunks] = useState(0);

  useEffect(() => {
    // Fetch the markdown file from the public folder
    fetch('/src/ds-res/das-resource.md')
      .then(response => response.text())
      .then(text => {
        setMarkdown(text);
        extractHeadings(text);
      })
      .catch(error => {
        console.error('Error loading markdown file:', error);
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
    
    // Expand top-level sections
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
    return groups;
  }, [headings]);

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleHeadingClick = (id) => {
    setActiveHeading(id);
    const element = document.getElementById(id);
    const container = document.querySelector('.dsa-resources-markdown');
    
    if (element && container) {
      const offsetPosition = element.offsetTop - 80;
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
      
      const hs = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let currentHeading = '';
      
      for (let i = 0; i < hs.length; i++) {
        const heading = hs[i];
        if (heading.offsetTop - container.scrollTop <= 100) {
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

  // Lazy load content
  useEffect(() => {
    if (markdown) {
      const chunkSize = 5000;
      const chunks = [];
      for (let i = 0; i < markdown.length; i += chunkSize) {
        chunks.push(markdown.slice(i, i + chunkSize));
      }
      setMarkdownChunks(chunks);
      setLoadedChunks(Math.min(3, chunks.length));
    }
  }, [markdown]);

  const handleMarkdownScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if ((scrollTop / (scrollHeight - clientHeight)) * 100 > 70) {
      if (loadedChunks < markdownChunks.length) {
        setLoadedChunks(prev => Math.min(prev + 2, markdownChunks.length));
      }
    }
  };

  return (
    <div className="dsa-resources-page">
      <div className="dsa-resources-container">
        
        {/* Navigation header */}
        <div className="dsa-resources-header">
          <div className="dsa-resources-header-controls">
            <button
              className="dsa-resources-mobile-menu-button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
        </div>

        <div className="dsa-resources-content-wrapper">
          <div className="dsa-resources-content">
            
            {/* Sidebar (collapsible for mobile drawer) */}
            <div className={`dsa-resources-mobile-toc-drawer ${isMobileMenuOpen ? 'open' : ''}`}>
              <div className="dsa-resources-mobile-toc-menu">
                <div className="dsa-resources-mobile-toc-header">
                  <h2 className="dsa-resources-sidebar-title">Table of Contents</h2>
                  <button
                    className="dsa-resources-mobile-toc-close"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <X size={20} />
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

            {/* Desktop Sidebar */}
            <div className="dsa-resources-sidebar">
              <div className="dsa-resources-sidebar-header">
                <h2 className="dsa-resources-sidebar-title">Table of Contents</h2>
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

            {/* Main markdown content scrollbox */}
            <div className="dsa-resources-main">
              <div className="dsa-resources-markdown" onScroll={handleMarkdownScroll}>
                {markdownChunks.slice(0, loadedChunks).map((chunk, index) => (
                  <ReactMarkdown
                    key={index}
                    remarkPlugins={[remarkGfm, remarkSlug]}
                    rehypePlugins={[rehypeAutolinkHeadings]}
                    components={{
                      h1: ({ node, ...props }) => <h1 className="dsa-resources-heading-1" {...props} />,
                      h2: ({ node, ...props }) => <h2 className="dsa-resources-heading-2" {...props} />,
                      h3: ({ node, ...props }) => <h3 className="dsa-resources-heading-3" {...props} />,
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
                    {chunk}
                  </ReactMarkdown>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
