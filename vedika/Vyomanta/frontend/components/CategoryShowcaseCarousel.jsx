'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import './CategoryShowcaseCarousel.css';

/**
 * CategoryShowcaseCarousel
 * Distinct CoverFlow / Perspective Card Carousel for Quizzes & Assignments
 */
export default function CategoryShowcaseCarousel({
  items = [],
  activeCategory = null,
  onSelectCategory,
  itemTypeLabel = 'Items'
}) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (!items || items.length === 0) return null;

  const total = items.length;

  const handlePrev = (e) => {
    e?.stopPropagation();
    setActiveIdx((prev) => (prev - 1 + total) % total);
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    setActiveIdx((prev) => (prev + 1) % total);
  };

  const currentItem = items[activeIdx] || items[0];

  return (
    <div className="showcase-carousel-container">
      {/* Title Badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(124, 58, 237, 0.12)',
        border: '1px solid rgba(124, 58, 237, 0.3)',
        color: '#A78BFA',
        padding: '5px 14px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        marginBottom: 16
      }}>
        <span>📂 {itemTypeLabel} by Category</span>
        <span style={{ opacity: 0.4 }}>•</span>
        <span>{total} Categories</span>
      </div>

      {/* 3D CoverFlow Stage */}
      <div className="showcase-stage">
        {/* Navigation Arrows */}
        {total > 1 && (
          <>
            <button
              className="showcase-nav-btn showcase-nav-prev"
              onClick={handlePrev}
              aria-label="Previous category"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="showcase-nav-btn showcase-nav-next"
              onClick={handleNext}
              aria-label="Next category"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {items.map((item, idx) => {
          // Calculate offset relative to activeIdx (-2, -1, 0, 1, 2)
          let offset = idx - activeIdx;
          if (offset < -Math.floor(total / 2)) offset += total;
          if (offset > Math.floor(total / 2)) offset -= total;

          const isCenter = offset === 0;
          const isVisible = Math.abs(offset) <= 2;

          if (!isVisible) return null;

          const translateX = offset * 210;
          const scale = isCenter ? 1.08 : Math.max(0.78, 1 - Math.abs(offset) * 0.16);
          const rotateY = offset * -25;
          const zIndex = 10 - Math.abs(offset);
          const opacity = isCenter ? 1 : Math.max(0.4, 1 - Math.abs(offset) * 0.35);

          return (
            <div
              key={item.category || idx}
              className={`showcase-card ${isCenter ? 'is-active' : ''}`}
              style={{
                transform: `translateX(${translateX}px) scale(${scale}) rotateY(${rotateY}deg)`,
                zIndex,
                opacity
              }}
              onClick={() => {
                if (isCenter) {
                  onSelectCategory && onSelectCategory(item.category);
                } else {
                  setActiveIdx(idx);
                }
              }}
            >
              <div className="showcase-card-img-wrapper">
                <img
                  src={item.artwork}
                  alt={item.category}
                  className="showcase-card-img"
                  loading="eager"
                />
                <div className="showcase-card-badge">
                  {item.count} {item.count === 1 ? itemTypeLabel.slice(0, -1) : itemTypeLabel}
                </div>
              </div>

              <div className="showcase-card-body">
                <div>
                  <h4 className="showcase-card-title">{item.category}</h4>
                  <div className="showcase-card-subtitle">
                    {item.coursesCount || 1} {(item.coursesCount || 1) === 1 ? 'Course' : 'Courses'}
                  </div>
                </div>

                {isCenter && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCategory && onSelectCategory(item.category);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '8px 14px',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      marginTop: 8,
                      boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)',
                      transition: 'transform 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    Explore {item.category} <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide dots */}
      {total > 1 && (
        <div className="showcase-dots">
          {items.map((_, idx) => (
            <button
              key={idx}
              className={`showcase-dot ${activeIdx === idx ? 'is-active' : ''}`}
              onClick={() => setActiveIdx(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
