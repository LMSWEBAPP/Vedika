'use client';

import { useId, useState, useEffect, useRef, Fragment } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './PacmanPagination.css';

/**
 * Authentic Pacman Pagination Component
 * - Aligned vertically on 6px square pellet dots
 * - Pacman faces exclusively to the right
 * - Controlled via arrow buttons or direct pellet clicks
 * - Chomps mouth ONLY during page transitions
 */
export default function PacmanPagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange
}) {
  const instanceId = useId().replace(/[:]/g, '');
  const [isMoving, setIsMoving] = useState(false);
  const [facing, setFacing] = useState('right');
  const prevPageRef = useRef(currentPage);

  useEffect(() => {
    if (currentPage !== prevPageRef.current) {
      setIsMoving(true);
      if (currentPage < prevPageRef.current) {
        setFacing('left');
      } else if (currentPage > prevPageRef.current) {
        setFacing('right');
      }

      const timer = setTimeout(() => {
        setIsMoving(false);
      }, 350);

      prevPageRef.current = currentPage;
      return () => clearTimeout(timer);
    }
  }, [currentPage]);

  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const DOT_PITCH = 30; // 6px dot + 24px margins
  const translateX = (currentPage - 1) * DOT_PITCH;
  const scaleX = facing === 'left' ? -1 : 1;

  return (
    <div className="pacman-pagination-wrapper">
      {/* Previous Arrow */}
      <button
        type="button"
        className="pacman-arrow-btn"
        onClick={() => onPageChange && onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
        aria-label="Previous page"
        title="Previous page"
      >
        <ChevronLeft size={15} />
      </button>

      {/* Pellets Track */}
      <div className="pagination" role="navigation" aria-label="Pacman Pagination">
        {pages.map((p) => {
          const inputId = `dot-${instanceId}-${p}`;
          return (
            <Fragment key={p}>
              <input
                id={inputId}
                type="radio"
                name={`dots-${instanceId}`}
                checked={currentPage === p}
                onChange={() => onPageChange && onPageChange(p)}
              />
              <label
                htmlFor={inputId}
                title={`Page ${p}`}
                onClick={() => onPageChange && onPageChange(p)}
              />
            </Fragment>
          );
        })}
        {/* Pacman turns to face left when coming back, right when going forward */}
        <div
          className={`pacman ${isMoving ? 'is-moving' : ''}`}
          style={{
            transform: `translateX(${translateX}px) scaleX(${scaleX})`
          }}
          aria-hidden="true"
        />
      </div>

      {/* Next Arrow */}
      <button
        type="button"
        className="pacman-arrow-btn"
        onClick={() => onPageChange && onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
        title="Next page"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}
