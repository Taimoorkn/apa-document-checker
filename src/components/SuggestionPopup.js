'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertCircle, Sparkles, ChevronRight, X } from 'lucide-react';

export default function SuggestionPopup({ 
  isOpen, 
  position, 
  issue, 
  suggestions, 
  onApply, 
  onDismiss,
  onClose 
}) {
  const popupRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isApplying, setIsApplying] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(suggestions.length - 1, prev + 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            handleApply(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, suggestions]);

  // Position popup near the text
  useEffect(() => {
    if (isOpen && popupRef.current && position) {
      const popup = popupRef.current;
      const rect = popup.getBoundingClientRect();
      
      // Adjust position to stay within viewport
      let top = position.top + position.height + 5;
      let left = position.left;
      
      // Check if popup goes beyond viewport
      if (top + rect.height > window.innerHeight) {
        top = position.top - rect.height - 5;
      }
      
      if (left + rect.width > window.innerWidth) {
        left = window.innerWidth - rect.width - 20;
      }
      
      popup.style.top = `${top}px`;
      popup.style.left = `${left}px`;
    }
  }, [isOpen, position]);

  const handleApply = async (suggestion) => {
    setIsApplying(true);
    await onApply(suggestion);
    setIsApplying(false);
    onClose();
  };

  if (!isOpen) return null;

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'major': return 'border-orange-500 bg-orange-50';
      case 'minor': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'major': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'minor': return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default: return <CheckCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div 
      ref={popupRef}
      className={`fixed z-50 bg-white rounded-xl shadow-2xl border ${getSeverityColor(issue?.severity)} max-w-sm animate-in fade-in slide-in-from-bottom-2`}
      style={{ minWidth: '320px' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-200">
        <div className="flex items-start space-x-2">
          {getSeverityIcon(issue?.severity)}
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">
              {issue?.title || 'Suggestion'}
            </h3>
            {issue?.description && (
              <p className="text-xs text-gray-600 mt-1">
                {issue.description}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Suggestions List */}
      <div className="max-h-64 overflow-y-auto">
        {suggestions.length > 0 ? (
          <div className="p-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleApply(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`
                  w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150
                  ${selectedIndex === index 
                    ? 'bg-blue-50 border border-blue-200 shadow-sm' 
                    : 'hover:bg-gray-50 border border-transparent'
                  }
                  ${isApplying ? 'opacity-50 cursor-wait' : ''}
                `}
                disabled={isApplying}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {suggestion.confidence > 0.9 && (
                        <Sparkles className="h-3 w-3 text-yellow-500" />
                      )}
                      <span className="font-medium text-sm text-gray-900">
                        {suggestion.text}
                      </span>
                      {suggestion.confidence && (
                        <span className="text-xs text-gray-500">
                          {Math.round(suggestion.confidence * 100)}% confident
                        </span>
                      )}
                    </div>
                    {suggestion.replacement && (
                      <div className="mt-1">
                        <span className="text-xs text-gray-500">Change to:</span>
                        <div className="mt-1 px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-700">
                          {suggestion.replacement}
                        </div>
                      </div>
                    )}
                    {suggestion.explanation && (
                      <p className="text-xs text-gray-600 mt-1">
                        {suggestion.explanation}
                      </p>
                    )}
                  </div>
                  {selectedIndex === index && (
                    <ChevronRight className="h-4 w-4 text-blue-500 ml-2 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              No automatic suggestions available
            </p>
            <button
              onClick={onDismiss}
              className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Dismiss Issue
            </button>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
        <button
          onClick={onDismiss}
          className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          Ignore
        </button>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            Press ↑↓ to navigate, Enter to apply
          </span>
        </div>
      </div>
    </div>
  );
}