'use client';

import { useState, useMemo, useCallback } from 'react';
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import React from 'react';
import { 
  ClipboardList, 
  AlertTriangle, 
  AlertCircle, 
  AlertOctagon, 
  PieChart, 
  Check,
  ChevronDown,
  FileText
} from 'lucide-react';

export default function IssuesPanel() {
  const { issues, activeIssueId, setActiveIssue, applyFix, processingState } = useDocumentStore();
  const [expandedCategories, setExpandedCategories] = useState({
    Critical: true,
    Major: true,
    Minor: false
  });
  
  // Group issues by severity (memoized to prevent recalculation on re-renders)
  const groupedIssues = useMemo(() => {
    return (issues || []).reduce((acc, issue) => {
      if (!acc[issue.severity]) {
        acc[issue.severity] = [];
      }
      acc[issue.severity].push(issue);
      return acc;
    }, {});
  }, [issues]);
  
  // Count issues by severity (memoized)
  const issueCounts = useMemo(() => ({
    Critical: groupedIssues.Critical?.length || 0,
    Major: groupedIssues.Major?.length || 0,
    Minor: groupedIssues.Minor?.length || 0
  }), [groupedIssues]);
  
  // Toggle category expansion (use useCallback to prevent unnecessary function recreation)
  const toggleCategory = useCallback((category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  }, []);
  
  // Calculate compliance score (memoized)
  const { totalIssues, weightedScore } = useMemo(() => {
    const total = issueCounts.Critical + issueCounts.Major + issueCounts.Minor;
    const score = total > 0 
      ? Math.max(0, 100 - (issueCounts.Critical * 5 + issueCounts.Major * 3 + issueCounts.Minor)) 
      : null;
    return { totalIssues: total, weightedScore: score };
  }, [issueCounts]);
  
  return (
    <div className="h-full bg-gray-50 p-4">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <ClipboardList className="h-6 w-6 mr-2 text-blue-600" />
          Document Issues
        </h2>
        {totalIssues > 0 && (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
            {totalIssues} {totalIssues === 1 ? 'Issue' : 'Issues'}
          </span>
        )}
      </div>
      
      {totalIssues > 0 ? (
        <div className="space-y-5">
          {/* Critical Issues */}
          {issueCounts.Critical > 0 && (
            <IssueCategory 
              title="Critical Issues" 
              count={issueCounts.Critical} 
              severity="Critical"
              expanded={expandedCategories.Critical}
              toggleExpanded={() => toggleCategory('Critical')}
            >
              {expandedCategories.Critical && groupedIssues.Critical.map(issue => (
                <IssueItem 
                  key={issue.id}
                  issue={issue}
                  isActive={activeIssueId === issue.id}
                  onSelect={() => setActiveIssue(issue.id)}
                  onApplyFix={() => applyFix(issue.id)}
                  isApplyingFix={processingState.isApplyingFix && processingState.currentFixId === issue.id}
                />
              ))}
            </IssueCategory>
          )}
          
          {/* Major Issues */}
          {issueCounts.Major > 0 && (
            <IssueCategory 
              title="Major Issues" 
              count={issueCounts.Major} 
              severity="Major"
              expanded={expandedCategories.Major}
              toggleExpanded={() => toggleCategory('Major')}
            >
              {expandedCategories.Major && groupedIssues.Major.map(issue => (
                <IssueItem 
                  key={issue.id}
                  issue={issue}
                  isActive={activeIssueId === issue.id}
                  onSelect={() => setActiveIssue(issue.id)}
                  onApplyFix={() => applyFix(issue.id)}
                  isApplyingFix={processingState.isApplyingFix && processingState.currentFixId === issue.id}
                />
              ))}
            </IssueCategory>
          )}
          
          {/* Minor Issues */}
          {issueCounts.Minor > 0 && (
            <IssueCategory 
              title="Minor Issues" 
              count={issueCounts.Minor} 
              severity="Minor"
              expanded={expandedCategories.Minor}
              toggleExpanded={() => toggleCategory('Minor')}
            >
              {expandedCategories.Minor && groupedIssues.Minor.map(issue => (
                <IssueItem 
                  key={issue.id}
                  issue={issue}
                  isActive={activeIssueId === issue.id}
                  onSelect={() => setActiveIssue(issue.id)}
                  onApplyFix={() => applyFix(issue.id)}
                  isApplyingFix={processingState.isApplyingFix && processingState.currentFixId === issue.id}
                />
              ))}
            </IssueCategory>
          )}
        </div>
      ) : issues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <div className="bg-gray-100 p-4 rounded-full mb-4 flex items-center justify-center">
            <FileText className="h-12 w-12 text-gray-400" />
          </div>
          <p className="text-xl font-medium text-gray-600">No document loaded</p>
          <p className="mt-2 text-gray-500 max-w-xs text-center">Upload a document using the button above to check it against APA 7th Edition guidelines</p>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-100 shadow-sm">
          <div className="flex items-center">
            <div className="bg-green-100 p-2 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-lg font-semibold text-green-800">Perfect! No APA issues found.</p>
              <p className="text-sm mt-1 text-green-700">Your document follows APA 7th Edition guidelines.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Document Statistics */}
      {issues.length > 0 && (
        <div className="mt-6 bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
            <PieChart className="h-4 w-4 mr-1 text-blue-500" />
            Document Statistics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Compliance Score</p>
              <div className="flex items-center">
                <div className={`w-2 h-8 rounded-full mr-2 ${
                  weightedScore > 80 ? 'bg-green-500' : weightedScore > 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <p className="text-2xl font-bold text-gray-800">{weightedScore}%</p>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Issue Breakdown</p>
              <div className="flex space-x-3 items-end">
                {issueCounts.Critical > 0 && (
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-red-600">{issueCounts.Critical}</span>
                    <div className="bg-red-500 w-4 rounded-t-sm" style={{height: `${issueCounts.Critical * 6}px`}}></div>
                    <span className="text-xs text-gray-500 mt-1">Critical</span>
                  </div>
                )}
                {issueCounts.Major > 0 && (
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-orange-600">{issueCounts.Major}</span>
                    <div className="bg-orange-500 w-4 rounded-t-sm" style={{height: `${issueCounts.Major * 6}px`}}></div>
                    <span className="text-xs text-gray-500 mt-1">Major</span>
                  </div>
                )}
                {issueCounts.Minor > 0 && (
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-blue-600">{issueCounts.Minor}</span>
                    <div className="bg-blue-500 w-4 rounded-t-sm" style={{height: `${issueCounts.Minor * 6}px`}}></div>
                    <span className="text-xs text-gray-500 mt-1">Minor</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Memoize the IssueCategory component to prevent unnecessary renders
const IssueCategory = React.memo(function IssueCategory({ title, count, severity, expanded, toggleExpanded, children }) {
  // Set colors based on severity
  const getStyles = () => {
    switch (severity) {
      case 'Critical': 
        return {
          bg: 'bg-gradient-to-r from-red-50 to-red-100',
          text: 'text-red-800',
          border: 'border-red-200',
          icon: 'text-red-500',
          badge: 'bg-red-500',
          shadow: 'shadow-red-100'
        };
      case 'Major': 
        return {
          bg: 'bg-gradient-to-r from-orange-50 to-amber-100',
          text: 'text-orange-800',
          border: 'border-orange-200',
          icon: 'text-orange-500',
          badge: 'bg-orange-500',
          shadow: 'shadow-orange-100'
        };
      case 'Minor': 
        return {
          bg: 'bg-gradient-to-r from-blue-50 to-blue-100',
          text: 'text-blue-800',
          border: 'border-blue-200',
          icon: 'text-blue-500',
          badge: 'bg-blue-500',
          shadow: 'shadow-blue-100'
        };
      default: 
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-200',
          icon: 'text-gray-500',
          badge: 'bg-gray-500',
          shadow: 'shadow-gray-100'
        };
    }
  };
  
  const styles = getStyles();
  
  // Get icon based on severity
  const getIcon = () => {
    switch (severity) {
      case 'Critical':
        return <AlertOctagon className="h-5 w-5 mr-2" />;
      case 'Major':
        return <AlertTriangle className="h-5 w-5 mr-2" />;
      case 'Minor':
        return <AlertCircle className="h-5 w-5 mr-2" />;
      default:
        return null;
    }
  };
  
  return (
    <div className={`rounded-lg overflow-hidden border ${styles.border} shadow-sm ${styles.shadow} issue-category hover-shadow`}>
      <button 
        onClick={toggleExpanded}
        className={`w-full flex justify-between items-center px-5 py-3.5 ${styles.bg} ${styles.text} transition-all duration-200 hover:shadow-inner`}
      >
        <span className="font-medium flex items-center text-base">
          <span className={`${styles.icon}`}>{getIcon()}</span>
          {title}
        </span>
        <div className="flex items-center">
          <span className={`${styles.badge} text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${count > 0 ? 'animate-pulse-blue' : ''}`}>{count}</span>
          <ChevronDown 
            className={`h-5 w-5 ml-3 transition-transform duration-300 ease-in-out ${expanded ? 'transform rotate-180' : ''} ${styles.icon}`}
          />
        </div>
      </button>
      
      {expanded && (
        <div className="bg-white divide-y divide-gray-100 transition-all duration-300 ease-in-out animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
});

// Memoize IssueItem to prevent unnecessary re-renders
const IssueItem = React.memo(function IssueItem({ issue, isActive, onSelect, onApplyFix, isApplyingFix = false }) {
  // Get highlight color based on severity
  const getHighlightColor = () => {
    switch (issue.severity) {
      case 'Critical': return 'border-red-500 bg-red-50';
      case 'Major': return 'border-orange-500 bg-orange-50';
      case 'Minor': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };
  
  // Get icon based on severity
  const getIcon = () => {
    switch (issue.severity) {
      case 'Critical':
        return <AlertOctagon className="h-4 w-4 text-red-500" />;
      case 'Major':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'Minor':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };
  
  return (
    <div 
      className={`px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150 ease-in-out issue-item ${
        isActive ? `border-l-4 ${getHighlightColor()}` : 'border-l-4 border-transparent'
      }`}
      onClick={onSelect}
    >
      <div className="flex justify-between">
        <div className="flex-1 pr-4">
          <div className="flex items-center mb-1.5">
            {getIcon()}
            <p className="text-sm font-semibold text-gray-800 ml-1">{issue.title}</p>
          </div>
          <p className="text-xs text-gray-600 mb-2 leading-relaxed">{issue.description}</p>
          {issue.text && (
            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-xs font-mono text-gray-700 relative animate-scale-in">
              <div className="absolute -left-1 -top-1 h-2 w-2 bg-gray-300 rounded-full"></div>
              <div className="absolute -right-1 -top-1 h-2 w-2 bg-gray-300 rounded-full"></div>
              <div className="absolute -left-1 -bottom-1 h-2 w-2 bg-gray-300 rounded-full"></div>
              <div className="absolute -right-1 -bottom-1 h-2 w-2 bg-gray-300 rounded-full"></div>
              "{issue.text}"
            </div>
          )}
        </div>
        
        {issue.hasFix && (
          <div className="flex flex-col justify-center">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (!isApplyingFix) onApplyFix();
              }}
              disabled={isApplyingFix}
              className={`flex items-center justify-center text-white text-xs px-4 py-1.5 rounded-md shadow-sm transition-all h-fit whitespace-nowrap font-medium ${
                isApplyingFix 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow hover:translate-y-[-1px]'
              }`}
            >
              {isApplyingFix ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Fixing...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Apply Fix
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
