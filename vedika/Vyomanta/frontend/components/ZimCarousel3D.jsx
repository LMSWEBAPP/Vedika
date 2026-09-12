'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getSubjectArtwork } from '@/lib/artwork';
import './ZimCarousel3D.css';

const DEFAULT_THUMBNAILS = [
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'https://images.unsplash.com/photo-1542831371-29b0f74f9713?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600'
];

/**
 * ZIM 3D Cylindrical Carousel (Dex / Carousel3D)
 * Mathematical cylinder projection & continuous wrap matching ZIM 018 Carousel3D algorithm.
 */
export default function ZimCarousel3D({
  courses = [],
  activeIdx = 0,
  onActiveIdxChange,
  onSelectCourse,
  isMobile = false
}) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);

  // Build items array (ensure at least 6-8 items for a full, rich 3D cylinder curve)
  const items = (() => {
    if (!courses || courses.length === 0) return [];
    if (courses.length === 1) return [{ ...courses[0], originalIndex: 0 }];
    let list = [];
    const minSlots = 7;
    const repeats = Math.max(1, Math.ceil(minSlots / courses.length));
    for (let r = 0; r < repeats; r++) {
      courses.forEach((c, idx) => {
        list.push({
          ...c,
          originalIndex: idx,
          slotKey: `${c.id || idx}-slot-${r}`
        });
      });
    }
    return list;
  })();

  const numPages = items.length;

  // Animation and physics refs
  const amountRef = useRef(0);
  const desiredValueRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartAmountRef = useRef(0);
  const lastPointerXRef = useRef(0);
  const lastPointerTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const hasMovedRef = useRef(false);
  const [renderTick, setRenderTick] = useState(0);

  // Responsive stage dimensions
  const [dimensions, setDimensions] = useState({ width: 440, height: 260 });

  useEffect(() => {
    const updateSize = () => {
      if (stageRef.current) {
        const w = stageRef.current.clientWidth || (isMobile ? 320 : 440);
        const h = isMobile ? 220 : 260;
        setDimensions({ width: w, height: h });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isMobile]);

  const { width, height } = dimensions;
  const r = height / 2;
  const shift = numPages > 0 ? (height / numPages) : 1;

  // External activeIdx sync (e.g. when right-side arrows are clicked)
  useEffect(() => {
    if (numPages <= 1 || isDraggingRef.current) return;
    // Find closest slot representing activeIdx
    const currentActiveSlot = Math.round(-amountRef.current / shift);
    let bestSlot = 0;
    let minDistance = Infinity;

    for (let i = -numPages * 2; i <= numPages * 2; i++) {
      const wrappedIdx = ((i % courses.length) + courses.length) % courses.length;
      if (wrappedIdx === activeIdx) {
        const dist = Math.abs(i - currentActiveSlot);
        if (dist < minDistance) {
          minDistance = dist;
          bestSlot = i;
        }
      }
    }
    desiredValueRef.current = -bestSlot * shift;
  }, [activeIdx, courses.length, numPages, shift]);

  // Main physics loop (smooth lerp + snap)
  useEffect(() => {
    let animId;
    let lastTime = performance.now();

    const tick = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!isDraggingRef.current) {
        // ZIM Swiper damping toward desiredValue
        const diff = desiredValueRef.current - amountRef.current;
        if (Math.abs(diff) > 0.05) {
          amountRef.current += diff * 0.14;
          setRenderTick((t) => (t + 1) % 10000);
        } else {
          amountRef.current = desiredValueRef.current;
        }
      } else {
        setRenderTick((t) => (t + 1) % 10000);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [shift]);

  // ZIM Dex Navigation controls
  const next = useCallback(() => {
    desiredValueRef.current -= shift;
  }, [shift]);

  const prev = useCallback(() => {
    desiredValueRef.current += shift;
  }, [shift]);

  const goToOriginalIndex = useCallback((targetOrigIdx) => {
    if (numPages <= 0) return;
    const currentSlot = Math.round(-amountRef.current / shift);
    let bestSlot = currentSlot;
    let minDistance = Infinity;

    for (let s = currentSlot - numPages; s <= currentSlot + numPages; s++) {
      const wrapped = ((s % courses.length) + courses.length) % courses.length;
      if (wrapped === targetOrigIdx) {
        const dist = Math.abs(s - currentSlot);
        if (dist < minDistance) {
          minDistance = dist;
          bestSlot = s;
        }
      }
    }
    desiredValueRef.current = -bestSlot * shift;
  }, [courses.length, numPages, shift]);

  // Pointer / Touch Handlers for Drag Swiper
  const handlePointerDown = (e) => {
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    dragStartXRef.current = clientX;
    dragStartAmountRef.current = amountRef.current;
    lastPointerXRef.current = clientX;
    lastPointerTimeRef.current = performance.now();
    velocityRef.current = 0;
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - dragStartXRef.current;
    if (Math.abs(deltaX) > 4) {
      hasMovedRef.current = true;
    }

    const now = performance.now();
    const dt = now - lastPointerTimeRef.current;
    if (dt > 8) {
      velocityRef.current = (clientX - lastPointerXRef.current) / dt;
      lastPointerXRef.current = clientX;
      lastPointerTimeRef.current = now;
    }

    // Sensitivity factor 0.38
    amountRef.current = dragStartAmountRef.current + deltaX * 0.38;
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    // Momentum glide and snap to nearest shift
    const momentum = velocityRef.current * 45;
    const projectedAmount = amountRef.current + momentum;
    const nearestSlot = Math.round(projectedAmount / shift);
    desiredValueRef.current = nearestSlot * shift;
  };

  // Compute cylindrical projection for all cards
  const widthFactor = 1.05;
  const heightFactor = 2.4;
  const curve = 0.5;
  const fade = 0.12;
  const center = width / 2;

  const cardTransforms = items.map((item, i) => {
    const pageShiftX = i * shift;
    // Circular wrap in 2*r space
    const period = r * 2;
    const rawX = -r + (((amountRef.current + r + r * 2000000 + pageShiftX) % period) + period) % period;
    const xInHolder = center + rawX;
    const delta = xInHolder - center;

    // Chord height on cylinder
    const underSqrt = Math.max(0, r * r - delta * delta);
    const h = Math.sqrt(underSqrt) * 2;

    // Non-linear curvature displacement
    const distFromCenter = center - xInHolder;
    const sh = Math.sign(distFromCenter) * Math.round(Math.pow(distFromCenter, 2) / (20 + 800 * (1 - curve)));

    const finalX = xInHolder + delta * widthFactor + sh;
    const finalHeight = Math.max(40, h - (height - h) * heightFactor);
    const scale = Math.max(0.48, finalHeight / height);

    return {
      index: i,
      item,
      finalX,
      finalHeight,
      scale,
      delta: Math.abs(delta)
    };
  });

  // Sort by finalHeight to determine zIndex (closest is highest)
  const sorted = [...cardTransforms].sort((a, b) => a.finalHeight - b.finalHeight);
  const zIndexMap = new Map();
  sorted.forEach((card, rank) => {
    zIndexMap.set(card.index, rank + 1);
  });

  // Determine top-most (front) card
  const topCard = sorted[sorted.length - 1];
  const topOriginalIndex = topCard ? topCard.item.originalIndex : 0;

  // Notify parent of active index change
  useEffect(() => {
    if (topCard && onActiveIdxChange && topCard.item.originalIndex !== activeIdx) {
      onActiveIdxChange(topCard.item.originalIndex);
    }
  }, [topOriginalIndex, onActiveIdxChange, activeIdx]);

  return (
    <div className="zim-carousel-container" ref={containerRef}>
      {/* 3D Stage area with cylindrical orbit */}
      <div
        className="zim-stage"
        ref={stageRef}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        {cardTransforms.map((ct) => {
          const zIndex = zIndexMap.get(ct.index) || 1;
          const isTop = topCard && topCard.index === ct.index;
          // ZIM page.fader depth darkening: further back items get faded
          const rankFromFront = numPages - zIndex;
          const faderAlpha = isTop ? 0 : Math.min(0.65, rankFromFront * fade);

          const imgUrl = ct.item.thumbnail || ct.item.image || getSubjectArtwork(ct.item.category, ct.item.title);

          return (
            <div
              key={ct.item.slotKey || ct.index}
              className={`zim-card ${isTop ? 'is-active' : ''}`}
              style={{
                transform: `translate3d(${ct.finalX}px, 0px, 0px) scale(${ct.scale})`,
                zIndex: zIndex
              }}
              onClick={() => {
                if (hasMovedRef.current) return;
                if (isTop) {
                  if (onSelectCourse) onSelectCourse(ct.item);
                } else {
                  // Click side card rotates it to front
                  goToOriginalIndex(ct.item.originalIndex);
                }
              }}
            >
              <img
                src={imgUrl}
                alt={ct.item.title || 'Course'}
                className="zim-card-image"
                loading="eager"
              />

              {/* ZIM depth darkening overlay */}
              <div
                className="zim-card-fader"
                style={{ opacity: faderAlpha }}
              />

              {/* Content overlay */}
              <div className="zim-card-overlay">
                <div className="zim-card-category">
                  {ct.item.badge || ct.item.category || 'Course'}
                </div>
                <div className="zim-card-title">
                  {ct.item.title}
                </div>
              </div>
            </div>
          );
        })}

        {/* ZIM Left Navigation Arrow */}
        <button
          className="zim-arrow zim-arrow-left"
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          aria-label="Previous Course"
        >
          <ChevronLeft size={20} />
        </button>

        {/* ZIM Right Navigation Arrow */}
        <button
          className="zim-arrow zim-arrow-right"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          aria-label="Next Course"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* ZIM Indicator Dock Lights */}
      {courses.length > 1 && (
        <div className="zim-indicator-bar">
          {courses.map((c, idx) => {
            const isActive = idx === topOriginalIndex;
            return (
              <button
                key={c.id || idx}
                className={`zim-indicator-dot ${isActive ? 'is-active' : ''}`}
                onClick={() => goToOriginalIndex(idx)}
                aria-label={`Jump to ${c.title || `Course ${idx + 1}`}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
