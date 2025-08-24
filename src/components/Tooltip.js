'use client';

import { useState, useRef, useEffect } from 'react';

export default function Tooltip({ children, content, delay = 300 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);
  const containerRef = useRef(null);
  let timeoutId = useRef(null);

  const showTooltip = (e) => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    
    timeoutId.current = setTimeout(() => {
      const rect = e.currentTarget.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      // Calculate position
      let top = rect.bottom + scrollTop + 8;
      let left = rect.left + scrollLeft + (rect.width / 2);
      
      // Adjust if tooltip would go off screen
      if (tooltipRef.current) {
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        
        // Adjust horizontal position if tooltip would overflow
        if (left + tooltipRect.width / 2 > window.innerWidth) {
          left = window.innerWidth - tooltipRect.width - 16;
        } else if (left - tooltipRect.width / 2 < 0) {
          left = tooltipRect.width / 2 + 16;
        }
        
        // Adjust vertical position if tooltip would overflow
        if (top + tooltipRect.height > window.innerHeight + scrollTop) {
          top = rect.top + scrollTop - tooltipRect.height - 8;
        }
      }
      
      setPosition({ top, left });
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
    };
  }, []);

  if (!content) {
    return children;
  }

  return (
    <>
      <span
        ref={containerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="relative inline-block"
      >
        {children}
      </span>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg max-w-xs pointer-events-none"
          style={{
            top: position.top,
            left: position.left,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="relative">
            {content}
            {/* Tooltip arrow */}
            <div
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: '6px solid #1f2937',
                marginBottom: '-1px'
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

// Hook for creating dynamic tooltips
export function useTooltip() {
  const [tooltipContent, setTooltipContent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const showTooltip = (content, x, y) => {
    setTooltipContent(content);
    setTooltipPosition({ x, y });
    setIsTooltipVisible(true);
  };

  const hideTooltip = () => {
    setIsTooltipVisible(false);
    setTooltipContent(null);
  };

  const TooltipComponent = () => {
    if (!isTooltipVisible || !tooltipContent) return null;

    return (
      <div
        className="fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg max-w-xs pointer-events-none"
        style={{
          top: tooltipPosition.y + 10,
          left: tooltipPosition.x,
          transform: 'translateX(-50%)',
        }}
      >
        <div className="relative">
          {tooltipContent}
          {/* Tooltip arrow */}
          <div
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '6px solid #1f2937',
              marginBottom: '-1px'
            }}
          />
        </div>
      </div>
    );
  };

  return { showTooltip, hideTooltip, TooltipComponent };
}
