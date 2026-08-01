'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Check, FileText } from 'lucide-react';
import { T } from '@/lib/lms-data';

export default function ResourcesMarkdownCheatSheet({ navigateTo, cheatSheetId }) {
  const [cheatSheet, setCheatSheet] = useState(null);
  const [sections, setSections] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCheatSheet() {
      if (!cheatSheetId) {
        navigateTo('cheatsheets');
        return;
      }
      
      setLoading(true);
      try {
        const response = await fetch(`/src/markdown-cheatsheets/${cheatSheetId}.md`);
        if (!response.ok) {
          navigateTo('cheatsheets');
          return;
        }
        
        const text = await response.text();
        
        // Parse frontmatter
        const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
        const match = text.match(frontmatterRegex);
        
        let contentText = text;
        const metadata = { id: cheatSheetId };
        
        if (match) {
          const frontmatter = match[1];
          contentText = text.substring(match[0].length);
          
          frontmatter.split('\n').forEach(line => {
            if (line.includes(':') && !line.startsWith('  -')) {
              const [key, ...valueParts] = line.split(':');
              const currentKey = key.trim();
              const value = valueParts.join(':').trim();
              if (value) {
                if (currentKey === 'tags') {
                  metadata[currentKey] = value.split(' -').filter(tag => tag.trim()).map(tag => tag.trim());
                } else if (currentKey === 'categories') {
                  metadata[currentKey] = [value];
                } else {
                  metadata[currentKey] = value;
                }
              }
            }
          });
        }
        
        if (!metadata.title) {
          metadata.title = cheatSheetId.replace(/-/g, ' ');
        }
        
        setCheatSheet(metadata);
        parseContent(contentText);
      } catch (error) {
        console.error('Error loading cheat sheet:', error);
        navigateTo('cheatsheets');
      } finally {
        setLoading(false);
      }
    }
    
    loadCheatSheet();
  }, [cheatSheetId]);

  const parseContent = (content) => {
    const sectionMatches = content.split(/(^##\s.*)/gm).filter(s => s.trim() !== '');
    const parsedSections = [];
    let currentSection = null;
    
    sectionMatches.forEach((part) => {
      if (part.startsWith('## ')) {
        if (currentSection) {
          parsedSections.push(currentSection);
        }
        currentSection = {
          title: part.substring(3).trim(),
          subsections: []
        };
      } else if (currentSection) {
        const subSections = part.split(/(^###\s.*)/gm).filter(s => s.trim() !== '');
        let currentSubSection = null;
        
        subSections.forEach((subPart) => {
          if (subPart.startsWith('### ')) {
            if (currentSubSection) {
              currentSection.subsections.push(currentSubSection);
            }
            currentSubSection = {
              title: subPart.substring(4).trim(),
              content: ''
            };
          } else if (currentSubSection) {
            currentSubSection.content += subPart;
          }
        });
        
        if (currentSubSection) {
          currentSection.subsections.push(currentSubSection);
        }
      }
    });
    
    if (currentSection) {
      parsedSections.push(currentSection);
    }
    setSections(parsedSections);
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(index);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const renderContent = (content) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.split('\n');
        const code = lines.slice(1, -1).join('\n');
        const codeIndex = `${index}`;
        
        return (
          <div key={index} style={{ position: 'relative', marginTop: 8, marginBottom: 8 }}>
            <pre style={{
              background: '#07080F', border: `1px solid ${T.border}`, padding: 12, borderRadius: 8,
              overflowX: 'auto', margin: 0, fontFamily: 'monospace', fontSize: 12.5, color: '#A7F3D0'
            }}>
              <code>{code}</code>
            </pre>
            <button
              onClick={() => copyToClipboard(code, codeIndex)}
              style={{
                position: 'absolute', top: 6, right: 6, padding: 6, background: T.s3, border: `1px solid ${T.border}`,
                color: '#fff', borderRadius: 4, cursor: 'pointer', display: 'flex'
              }}
            >
              {copiedCode === codeIndex ? <Check size={13} color={T.green} /> : <Copy size={13} />}
            </button>
          </div>
        );
      } else if (part.trim() !== '') {
        const lines = part.split('\n').filter(line => line.trim() !== '');
        return lines.map((line, idx) => {
          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            return (
              <li key={idx} style={{ fontSize: 13, color: T.text, marginLeft: 16, marginBottom: 4 }}>
                {line.substring(2).trim()}
              </li>
            );
          }
          return (
            <p key={idx} style={{ fontSize: 13, color: T.muted, margin: '4px 0', lineHeight: 1.4 }}>
              {line}
            </p>
          );
        });
      }
      return null;
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '80px 0', fontFamily: 'var(--font-outfit), sans-serif' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: `2px solid ${T.border}`, borderTopColor: T.accent, animation: 'spin 1s linear infinite'
        }} />
        <div style={{ fontSize: 13, color: T.muted }}>Loading cheat sheet...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', fontFamily: 'var(--font-outfit), sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
        <button
          onClick={() => navigateTo('cheatsheets')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'transparent', border: 'none', color: T.muted,
            fontSize: 14, cursor: 'pointer', fontWeight: 500, width: 'fit-content'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = T.text}
          onMouseLeave={(e) => e.currentTarget.style.color = T.muted}
        >
          <ArrowLeft size={16} /> Back to Cheat Sheets
        </button>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: T.text, margin: '0 0 6px 0', textTransform: 'capitalize' }}>
            {cheatSheet?.title}
          </h1>
          {cheatSheet?.intro && (
            <p style={{ color: T.muted, fontSize: 15, margin: '0 auto', maxWidth: 700, lineHeight: 1.5 }}>
              {cheatSheet.intro}
            </p>
          )}
          
          {cheatSheet?.tags && (
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 }}>
              {cheatSheet.tags.map(tag => (
                <span key={tag} style={{ fontSize: 11, background: 'rgba(59, 130, 246, 0.12)', color: T.accent, padding: '4px 10px', borderRadius: 20 }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid of Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {sections.map((section, sIdx) => (
          <div key={sIdx} style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 16, padding: '24px 20px' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: T.accent, margin: '0 0 16px 0', borderBottom: `1px solid ${T.border}`, paddingBottom: 6 }}>
              {section.title}
            </h2>

            {/* Subsection Cards inside grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 16
            }}>
              {section.subsections.map((sub, subIdx) => (
                <div key={subIdx} style={{
                  background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, borderRadius: 10, padding: 16,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14.5, fontWeight: 700, color: T.text, margin: 0 }}>{sub.title}</h3>
                    <FileText size={14} color={T.muted} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {renderContent(sub.content)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
