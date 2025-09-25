'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import React from 'react';
import { 
  ClipboardList, 
  AlertTriangle, 
  AlertCircle, 
  AlertOctagon,
  Check,
  ChevronDown,
  FileText,
  Info,
  Zap,
  BarChart3,
  Activity,
  Target,
  BookOpen,
  FileSearch,
  Clock,
  Sparkles,
  FileDown
} from 'lucide-react';

export default function IssuesPanel() {
  const { 
    issues, 
    activeIssueId, 
    setActiveIssue, 
    applyFix, 
    processingState,
    documentFormatting,
    documentStats,
    analysisScore
  } = useDocumentStore();
  
  const [expandedCategories, setExpandedCategories] = useState({
    Critical: true,
    Major: true,
    Minor: false
  });
  
  const [activeTab, setActiveTab] = useState('issues'); // 'issues' or 'stats'
  
  // Refs for tracking issue elements
  const issueRefs = useRef({});
  const panelContentRef = useRef(null);
  
  // Group issues by severity
  const groupedIssues = useMemo(() => {
    return (issues || []).reduce((acc, issue) => {
      if (!acc[issue.severity]) {
        acc[issue.severity] = [];
      }
      acc[issue.severity].push(issue);
      return acc;
    }, {});
  }, [issues]);
  
  // Count issues by severity
  const issueCounts = useMemo(() => ({
    Critical: groupedIssues.Critical?.length || 0,
    Major: groupedIssues.Major?.length || 0,
    Minor: groupedIssues.Minor?.length || 0
  }), [groupedIssues]);
  
  const totalIssues = issueCounts.Critical + issueCounts.Major + issueCounts.Minor;
  
  // Toggle category expansion
  const toggleCategory = useCallback((category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  }, []);
  
  // Auto-scroll and auto-expand when activeIssueId changes
  useEffect(() => {
    if (!activeIssueId || !issues || issues.length === 0) return;
    
    // Find the issue and its severity
    const activeIssue = issues.find(issue => issue.id === activeIssueId);
    if (!activeIssue) return;
    
    const severity = activeIssue.severity;
    
    // Auto-expand the category if it's collapsed
    setExpandedCategories(prev => {
      if (!prev[severity]) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`📂 Auto-expanding ${severity} category for issue: ${activeIssueId}`);
        }
        return { ...prev, [severity]: true };
      }
      return prev;
    });
    
    // Delay scrolling to allow for category expansion animation
    const scrollTimer = setTimeout(() => {
      // Only switch to issues tab if we're currently scrolling to show an issue
      // Don't force tab switch if user is viewing statistics
      const shouldScrollToIssue = activeTab === 'issues';

      if (shouldScrollToIssue) {
        // Scroll to the issue element
        const issueElement = issueRefs.current[activeIssueId];
        if (issueElement) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`📍 Auto-scrolling to issue: ${activeIssueId}`);
          }

          // Calculate the position relative to the panel content
          const panelContent = panelContentRef.current;
          if (panelContent) {
            // Get the issue element's position relative to the panel
            const issueRect = issueElement.getBoundingClientRect();
            const panelRect = panelContent.getBoundingClientRect();

            // Calculate scroll position to center the issue in view
            const scrollTop = issueElement.offsetTop - panelRect.height / 2 + issueElement.offsetHeight / 2;

            // Smooth scroll to the issue
            panelContent.scrollTo({
              top: Math.max(0, scrollTop),
              behavior: 'smooth'
            });
          }

          // Add a highlight animation to draw attention
          issueElement.classList.add('issue-highlight-animation');
          setTimeout(() => {
            issueElement.classList.remove('issue-highlight-animation');
          }, 2000);
        }
      }
    }, expandedCategories[severity] ? 100 : 400); // Longer delay if category needs to expand
    
    return () => clearTimeout(scrollTimer);
  }, [activeIssueId, issues, activeTab, expandedCategories]);
  
  return (
    <div className="h-full bg-white flex flex-col">
      {/* Header with Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <ClipboardList className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Analysis Panel</h2>
              <p className="text-sm text-slate-500 font-medium">APA 7th Edition Compliance</p>
            </div>
          </div>
          
          {/* Compliance Badge */}
          {analysisScore !== null && (
            <div className={`px-4 py-2 rounded-xl font-semibold text-sm shadow-sm ${
              analysisScore >= 80 ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200' :
              analysisScore >= 60 ? 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border border-amber-200' :
              'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border border-red-200'
            }`}>
              {analysisScore >= 80 ? '✨ Excellent' : analysisScore >= 60 ? '⚡ Good' : '🎯 Needs Work'}
            </div>
          )}
        </div>
        
        {/* Tab Navigation and Export */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('issues')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 relative ${
              activeTab === 'issues'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <AlertCircle className="h-4 w-4" />
            <span>Issues ({totalIssues})</span>
            {activeIssueId && activeTab !== 'issues' && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white animate-pulse"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'stats'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Statistics</span>
          </button>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 overflow-auto" ref={panelContentRef}>
        {activeTab === 'issues' ? (
          <div className="p-6">
            {totalIssues > 0 ? (
              <div className="space-y-4">
                {/* Quick Stats Cards */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {issueCounts.Critical > 0 && (
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <AlertOctagon className="h-5 w-5 text-red-600" />
                        <span className="text-2xl font-bold text-red-700">{issueCounts.Critical}</span>
                      </div>
                      <p className="text-xs font-medium text-red-600">Critical Issues</p>
                    </div>
                  )}
                  {issueCounts.Major > 0 && (
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <span className="text-2xl font-bold text-amber-700">{issueCounts.Major}</span>
                      </div>
                      <p className="text-xs font-medium text-amber-600">Major Issues</p>
                    </div>
                  )}
                  {issueCounts.Minor > 0 && (
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <Info className="h-5 w-5 text-blue-600" />
                        <span className="text-2xl font-bold text-blue-700">{issueCounts.Minor}</span>
                      </div>
                      <p className="text-xs font-medium text-blue-600">Minor Issues</p>
                    </div>
                  )}
                </div>
                
                {/* Issue Categories */}
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
                        ref={el => issueRefs.current[issue.id] = el}
                        issue={issue}
                        isActive={activeIssueId === issue.id}
                        onSelect={() => setActiveIssue(issue.id)}
                        onApplyFix={() => applyFix(issue.id)}
                        isApplyingFix={processingState.isApplyingFix && processingState.currentFixId === issue.id}
                      />
                    ))}
                  </IssueCategory>
                )}
                
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
                        ref={el => issueRefs.current[issue.id] = el}
                        issue={issue}
                        isActive={activeIssueId === issue.id}
                        onSelect={() => setActiveIssue(issue.id)}
                        onApplyFix={() => applyFix(issue.id)}
                        isApplyingFix={processingState.isApplyingFix && processingState.currentFixId === issue.id}
                      />
                    ))}
                  </IssueCategory>
                )}
                
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
                        ref={el => issueRefs.current[issue.id] = el}
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
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl mb-6 flex items-center justify-center shadow-lg">
                  <FileText className="h-12 w-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No Document Loaded</h3>
                <p className="text-slate-500 text-center max-w-sm">
                  Upload a document to check it against APA 7th Edition guidelines
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-8 shadow-lg">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xl shadow-emerald-500/25">
                    <Check className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-emerald-900 mb-2">Perfect Compliance!</h3>
                    <p className="text-emerald-700 mb-1 text-lg">
                      Your document meets all APA 7th Edition requirements.
                    </p>
                    <p className="text-sm text-emerald-600">
                      No formatting or citation issues detected.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6">
            {/* Statistics Tab Content */}
            <div className="space-y-6">
              {/* Compliance Score Card */}
              {analysisScore !== null && (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center">
                      <Target className="h-5 w-5 mr-2 text-emerald-500" />
                      Compliance Score
                    </h3>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      analysisScore >= 80 ? 'bg-emerald-100 text-emerald-700' :
                      analysisScore >= 60 ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {analysisScore >= 80 ? 'Excellent' : analysisScore >= 60 ? 'Good' : 'Needs Improvement'}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="#e2e8f0"
                          strokeWidth="12"
                          fill="none"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke={analysisScore >= 80 ? '#10b981' : analysisScore >= 60 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${(analysisScore / 100) * 351.86} 351.86`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold text-slate-900">{analysisScore}%</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Critical Issues</span>
                        <span className="text-sm font-semibold text-red-600">{issueCounts.Critical}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Major Issues</span>
                        <span className="text-sm font-semibold text-amber-600">{issueCounts.Major}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Minor Issues</span>
                        <span className="text-sm font-semibold text-blue-600">{issueCounts.Minor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Document Statistics */}
              {documentStats && (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-emerald-500" />
                    Document Statistics
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <BookOpen className="h-5 w-5 text-emerald-600" />
                        <span className="text-2xl font-bold text-emerald-700">{documentStats.wordCount}</span>
                      </div>
                      <p className="text-xs font-medium text-emerald-600">Total Words</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <FileText className="h-5 w-5 text-slate-600" />
                        <span className="text-2xl font-bold text-slate-700">{documentStats.paragraphCount}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-600">Paragraphs</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4 border border-teal-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <Zap className="h-5 w-5 text-teal-600" />
                        <span className="text-2xl font-bold text-teal-700">{documentStats.charCount}</span>
                      </div>
                      <p className="text-xs font-medium text-teal-600">Characters</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <Clock className="h-5 w-5 text-amber-600" />
                        <span className="text-2xl font-bold text-amber-700">{Math.round(documentStats.wordCount / 200)}</span>
                      </div>
                      <p className="text-xs font-medium text-amber-600">Min Read Time</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Document Format Details */}
              {documentFormatting && (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                    <FileSearch className="h-5 w-5 mr-2 text-emerald-500" />
                    Format Analysis
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Font Family</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {documentFormatting.document?.font?.family || 'Not specified'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Font Size</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {documentFormatting.document?.font?.size || 'Not specified'}pt
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Line Spacing</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {documentFormatting.document?.spacing?.line || 'Not specified'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Margins</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {documentFormatting.document?.margins?.top || 'Not specified'}&quot;
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Modern Issue Category Component
const IssueCategory = React.memo(function IssueCategory({ title, count, severity, expanded, toggleExpanded, children }) {
  const getStyles = () => {
    switch (severity) {
      case 'Critical':
        return {
          gradient: 'from-red-500 to-red-600',
          bg: 'from-red-50 to-red-100',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: <AlertOctagon className="h-5 w-5" />
        };
      case 'Major': 
        return {
          gradient: 'from-amber-500 to-amber-600',
          bg: 'from-amber-50 to-amber-100',
          border: 'border-amber-200',
          text: 'text-amber-700',
          icon: <AlertTriangle className="h-5 w-5" />
        };
      case 'Minor':
        return {
          gradient: 'from-blue-500 to-blue-600',
          bg: 'from-blue-50 to-blue-100',
          border: 'border-blue-200',
          text: 'text-blue-700',
          icon: <Info className="h-5 w-5" />
        };
      default:
        return {
          gradient: 'from-slate-500 to-slate-600',
          bg: 'from-slate-50 to-slate-100',
          border: 'border-slate-200',
          text: 'text-slate-700',
          icon: null
        };
    }
  };
  
  const styles = getStyles();
  
  return (
    <div className={`rounded-2xl overflow-hidden border ${styles.border} shadow-lg hover:shadow-xl transition-all duration-300 mb-4`}>
      <button 
        onClick={toggleExpanded}
        className={`w-full flex justify-between items-center px-6 py-4 bg-gradient-to-r ${styles.bg} ${styles.text} transition-all duration-200 hover:opacity-90`}
      >
        <span className="font-semibold flex items-center text-base">
          <div className={`w-8 h-8 bg-gradient-to-br ${styles.gradient} rounded-lg flex items-center justify-center mr-3 text-white`}>
            {styles.icon}
          </div>
          {title}
        </span>
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 bg-white rounded-full text-sm font-bold shadow-sm`}>
            {count}
          </span>
          <ChevronDown 
            className={`h-5 w-5 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>
      
      {expanded && (
        <div className="bg-white divide-y divide-slate-100">
          {children}
        </div>
      )}
    </div>
  );
});

// Modern Issue Item Component
const IssueItem = React.memo(React.forwardRef(function IssueItem({ 
  issue, 
  isActive, 
  onSelect, 
  onApplyFix,
  isApplyingFix = false
}, ref) {
  return (
    <div
      ref={ref}
      className={`px-6 py-5 hover:bg-slate-50 cursor-pointer transition-all duration-200 ${
        isActive ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-l-4 border-emerald-500' : ''
      }`}
      onClick={onSelect}
    >
      <div className="flex justify-between">
        <div className="flex-1 pr-4">
          <div className="flex items-start mb-2">
            <p className="text-sm font-semibold text-slate-900">{issue.title}</p>
          </div>
          <p className="text-xs text-slate-600 mb-3 leading-relaxed">{issue.description}</p>
          
          {issue.text && (
            <div className="mt-3 p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
              <p className="text-xs font-mono text-slate-700">&ldquo;{issue.text}&rdquo;</p>
            </div>
          )}
          
          {issue.explanation && (
            <div className="mt-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
              <div className="flex items-start space-x-2">
                <Info className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-emerald-700">{issue.explanation}</p>
              </div>
            </div>
          )}
        </div>
        
        {issue.hasFix && (
          <div className="flex items-center">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (!isApplyingFix) onApplyFix();
              }}
              disabled={isApplyingFix}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 transform ${
                isApplyingFix
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'
              }`}
            >
              {isApplyingFix ? (
                <>
                  <div className="loading-spinner w-3.5 h-3.5"></div>
                  <span>Fixing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Apply Fix</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}));