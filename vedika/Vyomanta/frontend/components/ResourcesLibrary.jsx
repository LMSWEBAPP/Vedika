'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, Grid, List, BookOpen, Eye, Download, ArrowLeft } from 'lucide-react';
import { T } from '@/lib/lms-data';
import PDFViewerModal from './PDFViewerModal';

export default function ResourcesLibrary({ navigateTo }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [resources, setResources] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // Categories structure from database
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  
  // Selected PDF preview state
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const itemsPerPage = 12;

  // 1. Fetch categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/resources/categories');
        const data = await res.json();
        
        if (Array.isArray(data)) {
          // Extract unique lists
          const cats = ['all', ...new Set(data.map(item => item.category))];
          const subs = ['all', ...new Set(data.map(item => item.subcategory))];
          
          setCategories(cats);
          setSubcategories(subs);
        } else {
          setErrorMsg(data?.error || 'Database connection error');
        }
      } catch (e) {
        console.error('Error fetching categories:', e);
        setErrorMsg(e.message || 'Error loading categories.');
      }
    }
    loadCategories();
  }, []);

  // 2. Fetch resources list with filters
  useEffect(() => {
    async function loadResources() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const queryParams = new URLSearchParams({
          search: searchTerm,
          category: selectedCategory,
          subcategory: selectedSubcategory,
          sortBy: sortBy
        });
        const res = await fetch(`/api/resources/list?${queryParams.toString()}`);
        const data = await res.json();
        
        if (Array.isArray(data)) {
          setResources(data);
        } else {
          setResources([]);
          setErrorMsg(data?.error || 'Database connection error');
        }
        setCurrentPage(1); // Reset to page 1 on query changes
      } catch (e) {
        console.error('Error loading resources:', e);
        setErrorMsg(e.message || 'Error loading resources.');
        setResources([]);
      } finally {
        setIsLoading(false);
      }
    }
    
    const delayDebounce = setTimeout(() => {
      loadResources();
    }, 300); // Debounce search changes

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, selectedCategory, selectedSubcategory, sortBy]);

  // Pagination safely
  const resourcesList = Array.isArray(resources) ? resources : [];
  const totalPages = Math.ceil(resourcesList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPdfs = resourcesList.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openViewer = (pdf) => {
    setSelectedPDF(pdf);
    setIsViewerOpen(true);
  };

  const getDirectDownloadLink = (viewLink) => {
    if (!viewLink) return '';
    const fileIdMatch = viewLink.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (fileIdMatch) {
      const fileId = fileIdMatch[1];
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    return viewLink;
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', fontFamily: 'var(--font-outfit), sans-serif' }}>
      {/* Back button and title */}
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
            background: `linear-gradient(to right, #60A5FA 0%, #8B5CF6 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            PDF Library
          </h1>
          <p style={{ color: T.muted, fontSize: 16, margin: 0, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
            Explore our vast collection of educational resources and find the perfect PDF for your learning journey.
          </p>
        </div>
      </div>

      {/* Filters & Search controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={18} color={T.muted} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search PDFs by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '14px 16px 14px 48px',
              background: T.s1, border: `1px solid ${T.border}`, borderRadius: 12,
              color: T.text, fontSize: 14, outline: 'none', transition: 'border-color 0.2s',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => e.target.style.borderColor = T.accent}
            onBlur={(e) => e.target.style.borderColor = T.border}
          />
        </div>

        {/* Dropdowns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          alignItems: 'center'
        }}>
          {/* Category */}
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubcategory('all'); }}
            style={{
              padding: '12px 16px', background: T.s1, border: `1px solid ${T.border}`, borderRadius: 8,
              color: T.text, fontSize: 13.5, outline: 'none', cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
            <option value="all">All Categories</option>
            {categories.filter(c => c !== 'all').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Subcategory */}
          <select
            value={selectedSubcategory}
            onChange={(e) => setSelectedSubcategory(e.target.value)}
            style={{
              padding: '12px 16px', background: T.s1, border: `1px solid ${T.border}`, borderRadius: 8,
              color: T.text, fontSize: 13.5, outline: 'none', cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
            <option value="all">All Subcategories</option>
            {subcategories.filter(s => s !== 'all').map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>

          {/* Sorting */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '12px 16px', background: T.s1, border: `1px solid ${T.border}`, borderRadius: 8,
              color: T.text, fontSize: 13.5, outline: 'none', cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
            <option value="newest">Newest First</option>
            <option value="title">Alphabetical</option>
          </select>

          {/* View mode toggle */}
          <div style={{
            display: 'flex', background: T.s1, border: `1px solid ${T.border}`, borderRadius: 8,
            padding: 4, width: 'fit-content', justifySelf: 'end'
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? T.accent : 'transparent',
                color: viewMode === 'grid' ? '#000' : T.muted,
                border: 'none', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', display: 'flex'
              }}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                background: viewMode === 'list' ? T.accent : 'transparent',
                color: viewMode === 'list' ? '#000' : T.muted,
                border: 'none', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', display: 'flex'
              }}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Results Counter */}
        <div style={{ color: T.muted, fontSize: 13 }}>
          Showing {currentPdfs.length} of {resourcesList.length} results
        </div>
      </div>

      {/* Grid or List list */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '80px 0' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: `2px solid ${T.border}`, borderTopColor: T.accent, animation: 'spin 1s linear infinite'
          }} />
          <div style={{ fontSize: 13, color: T.muted }}>Loading PDF collection...</div>
        </div>
      ) : errorMsg ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: T.s1, borderRadius: 16, border: `1px solid ${T.border}`, maxWidth: 600, margin: '20px auto' }}>
          <BookOpen size={48} color="#EF4444" style={{ marginBottom: 12 }} />
          <h3 style={{ color: T.text, fontSize: 16, fontWeight: 700, margin: '0 0 8px 0' }}>Database Connection Issue</h3>
          <p style={{ color: T.muted, fontSize: 13.5, margin: '0 0 16px 0', lineHeight: 1.5 }}>
            {errorMsg}
          </p>
          <div style={{ fontSize: 12, color: T.muted, background: 'rgba(239, 68, 68, 0.05)', padding: '12px 16px', borderRadius: 8, border: '1px dashed rgba(239, 68, 68, 0.2)', textAlign: 'left' }}>
            <strong>How to resolve:</strong> Make sure the Oregon TiDB Serverless environment variables are correctly configured on your Vercel deployment (e.g. <code>DB_HOST</code>, <code>DB_USER</code>, <code>DB_PASSWORD</code>, and <code>DB_RESOURCES_NAME="pdf_resources_db"</code>).
          </div>
        </div>
      ) : resourcesList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: T.s1, borderRadius: 16, border: `1px solid ${T.border}` }}>
          <BookOpen size={48} color={T.muted} style={{ marginBottom: 12 }} />
          <h3 style={{ color: T.text, fontSize: 16, fontWeight: 700, margin: '0 0 4px 0' }}>No PDFs Found</h3>
          <p style={{ color: T.muted, fontSize: 13, margin: 0 }}>Try adjusting your search terms or filters.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Mode */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 20,
          marginBottom: 32
        }}>
          {currentPdfs.map((pdf) => (
            <motion.div
              key={pdf.id}
              whileHover={{ y: -4 }}
              style={{
                background: T.s1, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden',
                display: 'flex', flexDirection: 'column', height: '100%'
              }}
            >
              {/* Thumbnail */}
              <div 
                onClick={() => openViewer(pdf)}
                style={{
                  aspectRatio: '3/4', background: 'rgba(91, 140, 248, 0.05)', position: 'relative',
                  cursor: 'pointer', overflow: 'hidden', borderBottom: `1px solid ${T.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {pdf.thumbnail ? (
                  <img 
                    src={pdf.thumbnail} 
                    alt={pdf.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <BookOpen size={40} color={T.muted} />
                )}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
                  fontSize: 10.5, color: T.text, fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'
                }}>
                  {pdf.category}
                </div>
              </div>

              {/* Info & Actions */}
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                <div>
                  <h3 
                    onClick={() => openViewer(pdf)}
                    style={{
                      fontSize: 14, fontWeight: 700, color: T.text, margin: '0 0 6px 0', cursor: 'pointer',
                      lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden', minHeight: 36
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = T.accent}
                    onMouseLeave={(e) => e.currentTarget.style.color = T.text}
                  >
                    {pdf.name}
                  </h3>
                  <div style={{ fontSize: 11.5, color: T.muted, marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pdf.subcategory}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => openViewer(pdf)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: T.accent, border: 'none', borderRadius: 6, padding: '7px 0',
                      color: '#000', fontSize: 12.5, fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    <Eye size={14} /> View
                  </button>
                  <button
                    onClick={() => window.open(getDirectDownloadLink(pdf.file_link), '_blank')}
                    style={{
                      background: T.s3, border: `1px solid ${T.border}`, borderRadius: 6, width: 32,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer'
                    }}
                    title="Download"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* List Mode */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {currentPdfs.map((pdf) => (
            <motion.div
              key={pdf.id}
              whileHover={{ x: 4 }}
              style={{
                background: T.s1, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14,
                display: 'flex', gap: 16, alignItems: 'center'
              }}
            >
              {/* Thumbnail */}
              <div 
                onClick={() => openViewer(pdf)}
                style={{
                  width: 48, height: 64, borderRadius: 6, background: 'rgba(255,255,255,0.03)',
                  cursor: 'pointer', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {pdf.thumbnail ? (
                  <img src={pdf.thumbnail} alt={pdf.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <BookOpen size={20} color={T.muted} />
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  onClick={() => openViewer(pdf)}
                  style={{
                    fontSize: 14.5, fontWeight: 700, color: T.text, margin: '0 0 4px 0', cursor: 'pointer',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = T.accent}
                  onMouseLeave={(e) => e.currentTarget.style.color = T.text}
                >
                  {pdf.name}
                </h3>
                <div style={{ fontSize: 11.5, color: T.muted }}>
                  {pdf.category} · {pdf.subcategory}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => openViewer(pdf)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, background: T.accent, border: 'none',
                    borderRadius: 6, padding: '7px 14px', color: '#000', fontSize: 12.5, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  <Eye size={14} /> View
                </button>
                <button
                  onClick={() => window.open(getDirectDownloadLink(pdf.file_link), '_blank')}
                  style={{
                    background: T.s3, border: `1px solid ${T.border}`, borderRadius: 6, width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer'
                  }}
                  title="Download"
                >
                  <Download size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              padding: 8, background: T.s1, border: `1px solid ${T.border}`, borderRadius: 8,
              color: currentPage === 1 ? T.dim : T.text, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex'
            }}
          >
            <ChevronLeft size={16} />
          </button>
          
          <span style={{ fontSize: 13.5, color: T.muted }}>
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              padding: 8, background: T.s1, border: `1px solid ${T.border}`, borderRadius: 8,
              color: currentPage === totalPages ? T.dim : T.text, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex'
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* PDF preview modal */}
      <PDFViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        pdfResource={selectedPDF}
      />
    </div>
  );
}
