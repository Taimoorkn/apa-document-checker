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
  FileText,
  ExternalLink,
  Info,
  Zap
} from 'lucide-react';

export default function IssuesPanel() {
  const { 
    issues, 
    activeIssueId, 
    setActiveIssue, 
    applyFix, 
    processingState,
    documentFormatting,
    documentStats
  } = useDocumentStore();
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
    
    // Use server-side compliance data if available
    let score;
    if (documentFormatting?.compliance?.overall !== undefined) {
      const contentPenalty = issueCounts.Critical * 10 + issueCounts.Major * 5 + issueCounts.Minor * 2;
      score = Math.max(0, Math.min(100, 
        Math.round(documentFormatting.compliance.overall - contentPenalty)
      ));
    } else {
      score = total > 0 
        ? Math.max(0, 100 - (issueCounts.Critical * 5 + issueCounts.Major * 3 + issueCounts.Minor)) 
        : 100;
    }
    
    return { totalIssues: total, weightedScore: score };
  }, [issueCounts, documentFormatting]);
  
  return (
    <div className="h-full bg-white flex flex-col">
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Issues Found</h2>
              <p className="text-sm text-gray-500">APA 7th edition compliance</p>
            </div>
          </div>
          {totalIssues > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
              <span className="text-red-700 text-sm font-medium">
                {totalIssues} {totalIssues === 1 ? 'Issue' : 'Issues'}
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-6">
      
      {totalIssues > 0 ? (
        <div className="space-y-5">
          {/* Document format overview */}
          {documentFormatting && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mr-3">
                  <Info className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-800 mb-1">Document Format Details</h3>
                  <div className="text-xs text-blue-700 grid grid-cols-2 gap-x-4 gap-y-1">
                    <div>
                      <span className="font-medium">Font:</span> {documentFormatting.document?.font?.family || 'Unknown'}
                    </div>
                    <div>
                      <span className="font-medium">Font Size:</span> {documentFormatting.document?.font?.size || 'Unknown'}pt
                    </div>
                    <div>
                      <span className="font-medium">Line Spacing:</span> {documentFormatting.document?.spacing?.line || 'Unknown'}
                    </div>
                    <div>
                      <span className="font-medium">Margins:</span> {documentFormatting.document?.margins?.top || 'Unknown'}in
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        
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
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl mb-6 flex items-center justify-center">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Document Loaded</h3>
          <p className="text-gray-500 max-w-sm">
            Upload a document using the button in the header to check it against APA 7th Edition guidelines
          </p>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-1">Excellent Work!</h3>
              <p className="text-green-700 mb-2">
                No APA compliance issues found in your document.
              </p>
              <p className="text-sm text-green-600">
                Your document follows APA 7th Edition guidelines correctly.
              </p>
            </div>
          </div>
        </div>
      )}
      
      </div>
      
      {/* Document Statistics */}
      {issues.length > 0 && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center mb-4">
            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
              <PieChart className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Document Statistics</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">Compliance Score</p>
              <div className="flex items-center">
                <span className={`text-2xl font-bold mr-3 ${
                  weightedScore > 80 ? 'text-green-600' : weightedScore > 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>{weightedScore}%</span>
                <div className="flex-1">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        weightedScore > 80 ? 'bg-green-500' : weightedScore > 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{width: `${weightedScore}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">Issue Breakdown</p>
              <div className="flex justify-between items-end h-12">
                {issueCounts.Critical > 0 && (
                  <div className="flex flex-col items-center justify-end h-full">
                    <span className="text-xs font-medium text-red-600 mb-1">{issueCounts.Critical}</span>
                    <div 
                      className="bg-red-500 w-6 rounded-t-lg" 
                      style={{height: `${Math.max(8, issueCounts.Critical * 4)}px`}}
                    ></div>
                    <span className="text-xs text-gray-500 mt-1">Critical</span>
                  </div>
                )}
                {issueCounts.Major > 0 && (
                  <div className="flex flex-col items-center justify-end h-full">
                    <span className="text-xs font-medium text-orange-600 mb-1">{issueCounts.Major}</span>
                    <div 
                      className="bg-orange-500 w-6 rounded-t-lg" 
                      style={{height: `${Math.max(8, issueCounts.Major * 4)}px`}}
                    ></div>
                    <span className="text-xs text-gray-500 mt-1">Major</span>
                  </div>
                )}
                {issueCounts.Minor > 0 && (
                  <div className="flex flex-col items-center justify-end h-full">
                    <span className="text-xs font-medium text-blue-600 mb-1">{issueCounts.Minor}</span>
                    <div 
                      className="bg-blue-500 w-6 rounded-t-lg" 
                      style={{height: `${Math.max(8, issueCounts.Minor * 4)}px`}}
                    ></div>
                    <span className="text-xs text-gray-500 mt-1">Minor</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Additional Document Stats */}
          {documentStats && (
            <div className="mt-4 bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-center mb-2">
                <Zap className="h-3.5 w-3.5 text-blue-500 mr-1.5" />
                <p className="text-xs font-medium text-gray-500">Document Details</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 p-2 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Words</p>
                  <p className="text-sm font-semibold text-gray-800">{documentStats.wordCount}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Paragraphs</p>
                  <p className="text-sm font-semibold text-gray-800">{documentStats.paragraphCount}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Characters</p>
                  <p className="text-sm font-semibold text-gray-800">{documentStats.charCount}</p>
                </div>
              </div>
            </div>
          )}
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
const IssueItem = React.memo(function IssueItem({ 
  issue, 
  isActive, 
  onSelect, 
  onApplyFix,
  isApplyingFix = false
}) {
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
          
          {/* Text snippet */}
          {issue.text && (
            <div className="mt-2 p-3 border rounded-md text-xs font-mono relative animate-scale-in bg-gray-50 border-gray-200 text-gray-700">
              <div className="absolute -left-1 -top-1 h-2 w-2 bg-gray-300 rounded-full"></div>
              <div className="absolute -right-1 -top-1 h-2 w-2 bg-gray-300 rounded-full"></div>
              <div className="absolute -left-1 -bottom-1 h-2 w-2 bg-gray-300 rounded-full"></div>
              <div className="absolute -right-1 -bottom-1 h-2 w-2 bg-gray-300 rounded-full"></div>
              &ldquo;{issue.text}&rdquo;
            </div>
          )}
          
          {/* Explanation/Guidance */}
          {issue.explanation && (
            <div className="mt-3 text-xs text-gray-500 italic">
              <p>{issue.explanation}</p>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col justify-center space-y-2">
          {/* Apply Fix Button for rule-based issues */}
          {issue.hasFix && (
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
          )}
          
        </div>
      </div>
    </div>
  );
});