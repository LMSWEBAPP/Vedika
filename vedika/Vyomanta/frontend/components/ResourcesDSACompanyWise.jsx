'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Building, Search, ExternalLink } from 'lucide-react';
import { T } from '@/lib/lms-data';

export default function ResourcesDSACompanyWise({ navigateTo }) {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [questionSearchTerm, setQuestionSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [questionsCurrentPage, setQuestionsCurrentPage] = useState(1);

  const companiesPerPage = 9;
  const questionsPerPage = 10;

  useEffect(() => {
    async function loadCompanyData() {
      try {
        setLoading(true);
        const response = await fetch('/src/DSA-comapny-wise-questions/questions-data.json');
        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.status}`);
        }
        const data = await response.json();
        
        const companyList = data.map(item => ({
          name: item.company,
          questionCount: item["leetcode data"].length,
          data: item["leetcode data"]
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        setCompanies(companyList);
      } catch (error) {
        console.error('Error loading company data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadCompanyData();
  }, []);

  const filteredCompanies = useMemo(() => {
    return companies.filter(company => 
      company.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [companies, searchTerm]);

  const totalPages = Math.ceil(filteredCompanies.length / companiesPerPage);
  const startIndex = (currentPage - 1) * companiesPerPage;
  const paginatedCompanies = filteredCompanies.slice(startIndex, startIndex + companiesPerPage);

  const filteredQuestions = useMemo(() => {
    if (!questionSearchTerm) return questions;
    const term = questionSearchTerm.toLowerCase();
    return questions.filter(q => 
      q.Title.toLowerCase().includes(term) ||
      q.Difficulty.toLowerCase().includes(term)
    );
  }, [questions, questionSearchTerm]);

  const questionsTotalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  const questionsStartIndex = (questionsCurrentPage - 1) * questionsPerPage;
  const paginatedQuestions = filteredQuestions.slice(questionsStartIndex, questionsStartIndex + questionsPerPage);

  useEffect(() => {
    setCurrentPage(1);
    setQuestionsCurrentPage(1);
  }, [searchTerm, questionSearchTerm]);

  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
    setQuestions(company.data || []);
    setQuestionSearchTerm('');
    setQuestionsCurrentPage(1);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return '#10B981';
      case 'Medium': return '#F5A95B';
      case 'Hard': return '#EF4444';
      default: return T.muted;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '80px 0', fontFamily: 'var(--font-outfit), sans-serif' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: `2px solid ${T.border}`, borderTopColor: T.accent, animation: 'spin 1s linear infinite'
        }} />
        <div style={{ fontSize: 13, color: T.muted }}>Loading company questions...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto', fontFamily: 'var(--font-outfit), sans-serif' }}>
      {/* Back button and title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
        <button
          onClick={() => {
            if (selectedCompany) {
              setSelectedCompany(null);
            } else {
              navigateTo('dsa');
            }
          }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'transparent', border: 'none', color: T.muted,
            fontSize: 14, cursor: 'pointer', fontWeight: 500, width: 'fit-content'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = T.text}
          onMouseLeave={(e) => e.currentTarget.style.color = T.muted}
        >
          <ArrowLeft size={16} /> {selectedCompany ? 'Back to Companies' : 'Back to DSA'}
        </button>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: 32, fontWeight: 800, color: T.text, margin: '0 0 6px 0', letterSpacing: '-0.03em',
            background: `linear-gradient(to right, #60A5FA 0%, #A7F3D0 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            {selectedCompany ? `${selectedCompany.name} Questions` : 'Company-Wise Questions'}
          </h1>
          <p style={{ color: T.muted, fontSize: 15, margin: 0 }}>
            Practice coding interview questions asked by top tech companies.
          </p>
        </div>
      </div>

      {!selectedCompany ? (
        /* Company Selection view */
        <div>
          {/* Search */}
          <div style={{ position: 'relative', maxWidth: 400, margin: '0 auto 24px auto' }}>
            <Search size={18} color={T.muted} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px 12px 42px',
                background: T.s1, border: `1px solid ${T.border}`, borderRadius: 10,
                color: T.text, fontSize: 13.5, outline: 'none', fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Grid of Companies */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 28
          }}>
            {paginatedCompanies.map((company) => (
              <motion.div
                key={company.name}
                whileHover={{ y: -4 }}
                onClick={() => handleCompanySelect(company)}
                style={{
                  background: T.s1, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20,
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', background: 'rgba(91, 140, 248, 0.12)',
                    display: 'flex', alignItems: 'center', justifyCenter: 'center', color: T.accent, flexShrink: 0, paddingLeft: 10
                  }}>
                    <Building size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>{company.name}</h3>
                    <p style={{ fontSize: 12, color: T.muted, margin: '2px 0 0 0' }}>{company.questionCount} questions</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(c => c - 1)}
                style={{
                  padding: '8px 16px', background: T.s1, border: `1px solid ${T.border}`, borderRadius: 8,
                  color: currentPage === 1 ? T.dim : T.text, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: 13.5, color: T.muted }}>Page {currentPage} of {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(c => c + 1)}
                style={{
                  padding: '8px 16px', background: T.s1, border: `1px solid ${T.border}`, borderRadius: 8,
                  color: currentPage === totalPages ? T.dim : T.text, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Questions View list */
        <div>
          {/* Search within company questions */}
          <div style={{ position: 'relative', maxWidth: 400, margin: '0 auto 24px auto' }}>
            <Search size={18} color={T.muted} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search questions..."
              value={questionSearchTerm}
              onChange={(e) => setQuestionSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px 12px 42px',
                background: T.s1, border: `1px solid ${T.border}`, borderRadius: 10,
                color: T.text, fontSize: 13.5, outline: 'none', fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{
            background: T.s1, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden',
            display: 'flex', flexDirection: 'column'
          }}>
            {filteredQuestions.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: T.muted }}>No questions found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {paginatedQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '16px 20px', borderBottom: idx === paginatedQuestions.length - 1 ? 'none' : `1px solid ${T.border}`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: '0 0 6px 0' }}>{q.Title}</h4>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: getDifficultyColor(q.Difficulty) }}>
                          {q.Difficulty}
                        </span>
                        <span style={{ color: T.dim }}>|</span>
                        <span style={{ fontSize: 11.5, color: T.muted }}>
                          Acceptance: {q["Acceptance %"]}
                        </span>
                        <span style={{ color: T.dim }}>|</span>
                        <span style={{ fontSize: 11.5, color: T.accent, fontWeight: 600 }}>
                          Freq: {q["Frequency %"]}
                        </span>
                      </div>
                    </div>

                    <a
                      href={q.URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: T.s3, border: `1px solid ${T.border}`, color: T.text,
                        textDecoration: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12.5,
                        fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = T.accent; e.currentTarget.style.color = '#000'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = T.s3; e.currentTarget.style.color = T.text; }}
                    >
                      Solve <ExternalLink size={13} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {questionsTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24 }}>
              <button
                disabled={questionsCurrentPage === 1}
                onClick={() => setQuestionsCurrentPage(c => c - 1)}
                style={{
                  padding: '8px 16px', background: T.s1, border: `1px solid ${T.border}`, borderRadius: 8,
                  color: questionsCurrentPage === 1 ? T.dim : T.text, cursor: questionsCurrentPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: 13.5, color: T.muted }}>Page {questionsCurrentPage} of {questionsTotalPages}</span>
              <button
                disabled={questionsCurrentPage === questionsTotalPages}
                onClick={() => setQuestionsCurrentPage(c => c + 1)}
                style={{
                  padding: '8px 16px', background: T.s1, border: `1px solid ${T.border}`, borderRadius: 8,
                  color: questionsCurrentPage === questionsTotalPages ? T.dim : T.text, cursor: questionsCurrentPage === questionsTotalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
