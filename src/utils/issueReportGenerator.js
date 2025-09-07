// src/utils/issueReportGenerator.js - Generate formatted issue reports with compact layout
'use client';

export class IssueReportGenerator {
  constructor() {
    this.severityColors = {
      Critical: '#dc2626', // red-600
      Major: '#ea580c',    // orange-600
      Minor: '#ca8a04'     // yellow-600
    };
    
    this.categoryIcons = {
      formatting: '📄',
      structure: '🏗️',
      citations: '📚',
      references: '📖',
      content: '✍️',
      tables: '📊',
      statistics: '📈',
      quotations: '💬',
      'bias-free': '🤝',
      headers: '📌'
    };
  }

  /**
   * Generate compact HTML report with better structure for many issues
   */
  generateHTMLReport(issues, documentStats, documentName = 'Document') {
    const timestamp = new Date().toLocaleString();
    const groupedBySeverity = this.groupIssues(issues);
    const groupedByCategory = this.groupByCategory(issues);
    const issueTypeCounts = this.getIssueTypeCounts(issues);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APA Compliance Report - ${documentName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.5;
      color: #1f2937;
      background: #f0f2f5;
      padding: 0;
      margin: 0;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
    }
    
    /* Compact Header */
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .header h1 {
      font-size: 1.5rem;
      font-weight: 600;
    }
    
    .header-stats {
      display: flex;
      gap: 30px;
      align-items: center;
    }
    
    .header-stat {
      text-align: center;
    }
    
    .header-stat-value {
      font-size: 1.5rem;
      font-weight: bold;
    }
    
    .header-stat-label {
      font-size: 0.75rem;
      opacity: 0.9;
    }
    
    /* Navigation Tabs */
    .nav-tabs {
      background: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
      padding: 0 30px;
      display: flex;
      gap: 20px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    
    .nav-tab {
      padding: 12px 20px;
      cursor: pointer;
      border: none;
      background: none;
      font-size: 0.9rem;
      color: #6c757d;
      border-bottom: 3px solid transparent;
      transition: all 0.2s;
    }
    
    .nav-tab:hover {
      color: #495057;
    }
    
    .nav-tab.active {
      color: #667eea;
      border-bottom-color: #667eea;
      font-weight: 600;
    }
    
    /* Content Sections */
    .content {
      padding: 30px;
    }
    
    .section {
      display: none;
    }
    
    .section.active {
      display: block;
    }
    
    /* Summary Dashboard */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }
    
    .dashboard-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
    }
    
    .dashboard-card h3 {
      font-size: 1rem;
      color: #374151;
      margin-bottom: 15px;
      font-weight: 600;
    }
    
    /* Severity Distribution Chart */
    .severity-chart {
      display: flex;
      height: 30px;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 15px;
    }
    
    .severity-segment {
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
      position: relative;
    }
    
    .severity-segment.critical {
      background: #dc2626;
    }
    
    .severity-segment.major {
      background: #ea580c;
    }
    
    .severity-segment.minor {
      background: #ca8a04;
    }
    
    /* Category Summary Table */
    .summary-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    
    .summary-table th {
      text-align: left;
      padding: 8px 12px;
      background: #f8f9fa;
      border-bottom: 2px solid #dee2e6;
      font-weight: 600;
      color: #495057;
    }
    
    .summary-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #e9ecef;
    }
    
    .summary-table tr:hover {
      background: #f8f9fa;
    }
    
    .category-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    
    .count-badge {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .count-badge.critical {
      background: #fee2e2;
      color: #dc2626;
    }
    
    .count-badge.major {
      background: #fed7aa;
      color: #ea580c;
    }
    
    .count-badge.minor {
      background: #fef3c7;
      color: #ca8a04;
    }
    
    /* Issues by Category - Compact View */
    .category-issues {
      margin-bottom: 30px;
    }
    
    .category-header {
      background: #f8f9fa;
      padding: 12px 20px;
      border-radius: 8px 8px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
      border: 1px solid #e5e7eb;
    }
    
    .category-header:hover {
      background: #e9ecef;
    }
    
    .category-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .category-icon {
      font-size: 1.2rem;
    }
    
    .category-name {
      font-weight: 600;
      color: #374151;
    }
    
    .category-counts {
      display: flex;
      gap: 8px;
    }
    
    .expand-icon {
      transition: transform 0.2s;
    }
    
    .category-header.expanded .expand-icon {
      transform: rotate(180deg);
    }
    
    .category-content {
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 8px 8px;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }
    
    .category-content.expanded {
      max-height: 600px;
      overflow-y: auto;
    }
    
    /* Compact Issue List */
    .issues-table {
      width: 100%;
      font-size: 0.8rem;
    }
    
    .issues-table th {
      text-align: left;
      padding: 10px 15px;
      background: #fafafa;
      font-weight: 600;
      color: #495057;
      border-bottom: 1px solid #e5e7eb;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    
    .issues-table td {
      padding: 10px 15px;
      border-bottom: 1px solid #f0f0f0;
      vertical-align: top;
    }
    
    .issues-table tr:hover {
      background: #f8f9fa;
    }
    
    .severity-pill {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      color: white;
      display: inline-block;
    }
    
    .issue-title {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 2px;
    }
    
    .issue-description {
      color: #6b7280;
      font-size: 0.75rem;
    }
    
    .issue-context {
      background: #f9fafb;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.7rem;
      color: #4b5563;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .issue-explanation {
      color: #6b7280;
      font-size: 0.75rem;
      font-style: italic;
    }
    
    /* Top Issues Section */
    .top-issues-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .top-issue-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      transition: box-shadow 0.2s;
    }
    
    .top-issue-card:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    .top-issue-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    
    .top-issue-title {
      font-weight: 600;
      color: #1f2937;
      font-size: 0.9rem;
      flex: 1;
      margin-right: 10px;
    }
    
    /* Statistics Section */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .stat-label {
      font-size: 0.85rem;
      opacity: 0.9;
    }
    
    /* Print Styles */
    @media print {
      body {
        background: white;
      }
      
      .nav-tabs {
        display: none;
      }
      
      .section {
        display: block !important;
        page-break-after: always;
      }
      
      .category-content {
        max-height: none !important;
        overflow: visible !important;
      }
    }
    
    @media (max-width: 768px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
      
      .header {
        flex-direction: column;
        text-align: center;
      }
      
      .header-stats {
        margin-top: 15px;
      }
      
      .issues-table {
        font-size: 0.7rem;
      }
      
      .issues-table th,
      .issues-table td {
        padding: 8px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Compact Header with Key Stats -->
    <div class="header">
      <div>
        <h1>📋 APA Compliance Report</h1>
        <div style="font-size: 0.85rem; opacity: 0.9; margin-top: 5px;">
          ${documentName} • ${timestamp}
        </div>
      </div>
      <div class="header-stats">
        <div class="header-stat">
          <div class="header-stat-value">${issues.length}</div>
          <div class="header-stat-label">Total Issues</div>
        </div>
        <div class="header-stat">
          <div class="header-stat-value">${groupedBySeverity.Critical?.length || 0}</div>
          <div class="header-stat-label">Critical</div>
        </div>
        <div class="header-stat">
          <div class="header-stat-value">${groupedBySeverity.Major?.length || 0}</div>
          <div class="header-stat-label">Major</div>
        </div>
        <div class="header-stat">
          <div class="header-stat-value">${groupedBySeverity.Minor?.length || 0}</div>
          <div class="header-stat-label">Minor</div>
        </div>
      </div>
    </div>
    
    <!-- Navigation Tabs -->
    <div class="nav-tabs">
      <button class="nav-tab active" onclick="showSection('summary')">Summary</button>
      <button class="nav-tab" onclick="showSection('by-category')">By Category</button>
      <button class="nav-tab" onclick="showSection('by-severity')">By Severity</button>
      <button class="nav-tab" onclick="showSection('top-issues')">Top Issues</button>
      <button class="nav-tab" onclick="showSection('statistics')">Statistics</button>
    </div>
    
    <div class="content">
      <!-- Summary Section -->
      <section id="summary" class="section active">
        <h2 style="margin-bottom: 20px;">Executive Summary</h2>
        
        <div class="dashboard-grid">
          <!-- Severity Distribution -->
          <div class="dashboard-card">
            <h3>Severity Distribution</h3>
            <div class="severity-chart">
              ${this.generateSeverityChart(groupedBySeverity, issues.length)}
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #6b7280;">
              <span>🔴 Critical: ${((groupedBySeverity.Critical?.length || 0) / issues.length * 100).toFixed(1)}%</span>
              <span>🟠 Major: ${((groupedBySeverity.Major?.length || 0) / issues.length * 100).toFixed(1)}%</span>
              <span>🟡 Minor: ${((groupedBySeverity.Minor?.length || 0) / issues.length * 100).toFixed(1)}%</span>
            </div>
          </div>
          
          <!-- Category Breakdown -->
          <div class="dashboard-card">
            <h3>Issues by Category</h3>
            <table class="summary-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th style="text-align: center;">Critical</th>
                  <th style="text-align: center;">Major</th>
                  <th style="text-align: center;">Minor</th>
                  <th style="text-align: center;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${this.generateCategorySummaryRows(groupedByCategory)}
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Most Common Issues -->
        <div class="dashboard-card">
          <h3>Most Common Issue Types</h3>
          <table class="summary-table">
            <thead>
              <tr>
                <th>Issue Type</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${this.generateTopIssueTypes(issueTypeCounts, issues.length)}
            </tbody>
          </table>
        </div>
      </section>
      
      <!-- By Category Section -->
      <section id="by-category" class="section">
        <h2 style="margin-bottom: 20px;">Issues by Category</h2>
        ${this.generateCompactCategoryView(groupedByCategory)}
      </section>
      
      <!-- By Severity Section -->
      <section id="by-severity" class="section">
        <h2 style="margin-bottom: 20px;">Issues by Severity</h2>
        ${this.generateCompactSeverityView(groupedBySeverity)}
      </section>
      
      <!-- Top Issues Section -->
      <section id="top-issues" class="section">
        <h2 style="margin-bottom: 20px;">Critical & Major Issues Overview</h2>
        <div class="top-issues-grid">
          ${this.generateTopIssuesCards(groupedBySeverity)}
        </div>
      </section>
      
      <!-- Statistics Section -->
      <section id="statistics" class="section">
        <h2 style="margin-bottom: 20px;">Document Statistics</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${documentStats?.wordCount || 0}</div>
            <div class="stat-label">Word Count</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${documentStats?.paragraphCount || 0}</div>
            <div class="stat-label">Paragraphs</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${documentStats?.complianceScore || 0}%</div>
            <div class="stat-label">Compliance Score</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${Object.keys(groupedByCategory).length}</div>
            <div class="stat-label">Categories Affected</div>
          </div>
        </div>
      </section>
    </div>
  </div>
  
  <script>
    function showSection(sectionId) {
      // Hide all sections
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      
      // Show selected section
      document.getElementById(sectionId).classList.add('active');
      event.target.classList.add('active');
    }
    
    // Toggle category expansion
    document.addEventListener('DOMContentLoaded', function() {
      const headers = document.querySelectorAll('.category-header');
      headers.forEach(header => {
        header.addEventListener('click', function() {
          const content = this.nextElementSibling;
          this.classList.toggle('expanded');
          content.classList.toggle('expanded');
        });
      });
      
      // Auto-expand categories with critical issues
      document.querySelectorAll('.category-header').forEach(header => {
        const criticalCount = header.querySelector('.count-badge.critical');
        if (criticalCount && parseInt(criticalCount.textContent) > 0) {
          header.classList.add('expanded');
          header.nextElementSibling.classList.add('expanded');
        }
      });
    });
  </script>
</body>
</html>`;
    
    return html;
  }

  /**
   * Generate severity chart HTML
   */
  generateSeverityChart(groupedBySeverity, total) {
    const critical = groupedBySeverity.Critical?.length || 0;
    const major = groupedBySeverity.Major?.length || 0;
    const minor = groupedBySeverity.Minor?.length || 0;
    
    let html = '';
    
    if (critical > 0) {
      const width = (critical / total) * 100;
      html += `<div class="severity-segment critical" style="width: ${width}%">${critical}</div>`;
    }
    if (major > 0) {
      const width = (major / total) * 100;
      html += `<div class="severity-segment major" style="width: ${width}%">${major}</div>`;
    }
    if (minor > 0) {
      const width = (minor / total) * 100;
      html += `<div class="severity-segment minor" style="width: ${width}%">${minor}</div>`;
    }
    
    return html;
  }

  /**
   * Generate category summary rows
   */
  generateCategorySummaryRows(groupedByCategory) {
    let html = '';
    
    Object.entries(groupedByCategory).forEach(([category, issues]) => {
      const critical = issues.filter(i => i.severity === 'Critical').length;
      const major = issues.filter(i => i.severity === 'Major').length;
      const minor = issues.filter(i => i.severity === 'Minor').length;
      
      html += `
        <tr>
          <td>
            <span class="category-badge">
              ${this.categoryIcons[category] || '📝'}
              ${this.formatCategoryName(category)}
            </span>
          </td>
          <td style="text-align: center;">${critical || '-'}</td>
          <td style="text-align: center;">${major || '-'}</td>
          <td style="text-align: center;">${minor || '-'}</td>
          <td style="text-align: center; font-weight: 600;">${issues.length}</td>
        </tr>
      `;
    });
    
    return html;
  }

  /**
   * Generate compact category view
   */
  generateCompactCategoryView(groupedByCategory) {
    let html = '';
    
    Object.entries(groupedByCategory).forEach(([category, issues]) => {
      const critical = issues.filter(i => i.severity === 'Critical').length;
      const major = issues.filter(i => i.severity === 'Major').length;
      const minor = issues.filter(i => i.severity === 'Minor').length;
      
      html += `
        <div class="category-issues">
          <div class="category-header">
            <div class="category-header-left">
              <span class="category-icon">${this.categoryIcons[category] || '📝'}</span>
              <span class="category-name">${this.formatCategoryName(category)}</span>
              <span style="color: #6b7280; font-size: 0.85rem;">(${issues.length} issues)</span>
            </div>
            <div class="category-counts">
              ${critical > 0 ? `<span class="count-badge critical">${critical}</span>` : ''}
              ${major > 0 ? `<span class="count-badge major">${major}</span>` : ''}
              ${minor > 0 ? `<span class="count-badge minor">${minor}</span>` : ''}
              <span class="expand-icon">▼</span>
            </div>
          </div>
          <div class="category-content">
            <table class="issues-table">
              <thead>
                <tr>
                  <th style="width: 80px;">Severity</th>
                  <th style="width: 25%;">Issue</th>
                  <th style="width: 35%;">Context</th>
                  <th>Explanation</th>
                </tr>
              </thead>
              <tbody>
                ${issues.map(issue => this.generateCompactIssueRow(issue)).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    });
    
    return html;
  }

  /**
   * Generate compact issue row
   */
  generateCompactIssueRow(issue) {
    const severityColor = this.severityColors[issue.severity];
    
    return `
      <tr>
        <td>
          <span class="severity-pill" style="background: ${severityColor}">
            ${issue.severity}
          </span>
        </td>
        <td>
          <div class="issue-title">${this.escapeHtml(issue.title)}</div>
          <div class="issue-description">${this.escapeHtml(issue.description)}</div>
        </td>
        <td>
          ${issue.text ? `<div class="issue-context" title="${this.escapeHtml(issue.text)}">${this.escapeHtml(issue.text)}</div>` : '-'}
        </td>
        <td>
          <div class="issue-explanation">${this.escapeHtml(issue.explanation || 'See APA manual for details')}</div>
        </td>
      </tr>
    `;
  }

  /**
   * Generate compact severity view
   */
  generateCompactSeverityView(groupedBySeverity) {
    let html = '';
    const severityOrder = ['Critical', 'Major', 'Minor'];
    
    severityOrder.forEach(severity => {
      const issues = groupedBySeverity[severity];
      if (!issues || issues.length === 0) return;
      
      const severityColor = this.severityColors[severity];
      const byCategory = this.groupByCategory(issues);
      
      html += `
        <div class="category-issues">
          <div class="category-header expanded" style="background: linear-gradient(to right, ${severityColor}15, transparent);">
            <div class="category-header-left">
              <span class="severity-pill" style="background: ${severityColor}">${severity}</span>
              <span class="category-name">${issues.length} ${severity} Issues</span>
            </div>
            <div class="category-counts">
              ${Object.keys(byCategory).length} categories affected
              <span class="expand-icon">▼</span>
            </div>
          </div>
          <div class="category-content expanded">
            <table class="issues-table">
              <thead>
                <tr>
                  <th style="width: 15%;">Category</th>
                  <th style="width: 25%;">Issue</th>
                  <th style="width: 35%;">Context</th>
                  <th>Explanation</th>
                </tr>
              </thead>
              <tbody>
                ${issues.map(issue => `
                  <tr>
                    <td>
                      <span class="category-badge">
                        ${this.categoryIcons[issue.category] || '📝'}
                        ${this.formatCategoryName(issue.category)}
                      </span>
                    </td>
                    <td>
                      <div class="issue-title">${this.escapeHtml(issue.title)}</div>
                      <div class="issue-description">${this.escapeHtml(issue.description)}</div>
                    </td>
                    <td>
                      ${issue.text ? `<div class="issue-context" title="${this.escapeHtml(issue.text)}">${this.escapeHtml(issue.text)}</div>` : '-'}
                    </td>
                    <td>
                      <div class="issue-explanation">${this.escapeHtml(issue.explanation || 'See APA manual')}</div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    });
    
    return html;
  }

  /**
   * Generate top issues cards
   */
  generateTopIssuesCards(groupedBySeverity) {
    let html = '';
    const topIssues = [
      ...(groupedBySeverity.Critical || []),
      ...(groupedBySeverity.Major || [])
    ].slice(0, 12); // Show top 12 critical/major issues
    
    topIssues.forEach(issue => {
      const severityColor = this.severityColors[issue.severity];
      
      html += `
        <div class="top-issue-card">
          <div class="top-issue-header">
            <div class="top-issue-title">${this.escapeHtml(issue.title)}</div>
            <span class="severity-pill" style="background: ${severityColor}">${issue.severity}</span>
          </div>
          <p style="color: #6b7280; font-size: 0.85rem; margin-bottom: 10px;">
            ${this.escapeHtml(issue.description)}
          </p>
          ${issue.text ? `
            <div class="issue-context" style="margin-bottom: 10px; max-width: 100%;">
              ${this.escapeHtml(issue.text.substring(0, 100))}${issue.text.length > 100 ? '...' : ''}
            </div>
          ` : ''}
          ${issue.hasFix ? `
            <div style="background: #dcfce7; padding: 8px; border-radius: 4px; font-size: 0.75rem; color: #14532d;">
              ✅ Fix available: ${issue.fixAction || 'Manual correction'}
            </div>
          ` : ''}
        </div>
      `;
    });
    
    return html;
  }

  /**
   * Get issue type counts
   */
  getIssueTypeCounts(issues) {
    const counts = {};
    
    issues.forEach(issue => {
      if (!counts[issue.title]) {
        counts[issue.title] = 0;
      }
      counts[issue.title]++;
    });
    
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([title, count]) => ({ title, count }));
  }

  /**
   * Generate top issue types
   */
  generateTopIssueTypes(issueTypeCounts, total) {
    let html = '';
    const topTypes = issueTypeCounts.slice(0, 10);
    
    topTypes.forEach(type => {
      const percentage = ((type.count / total) * 100).toFixed(1);
      
      html += `
        <tr>
          <td>${this.escapeHtml(type.title)}</td>
          <td style="text-align: center;">${type.count}</td>
          <td style="text-align: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="flex: 1; background: #e5e7eb; height: 8px; border-radius: 4px;">
                <div style="width: ${percentage}%; height: 100%; background: linear-gradient(to right, #667eea, #764ba2); border-radius: 4px;"></div>
              </div>
              <span style="font-size: 0.75rem; color: #6b7280;">${percentage}%</span>
            </div>
          </td>
        </tr>
      `;
    });
    
    return html;
  }

  /**
   * Helper methods
   */
  
  groupIssues(issues) {
    return issues.reduce((acc, issue) => {
      if (!acc[issue.severity]) {
        acc[issue.severity] = [];
      }
      acc[issue.severity].push(issue);
      return acc;
    }, {});
  }
  
  groupByCategory(issues) {
    return issues.reduce((acc, issue) => {
      if (!acc[issue.category]) {
        acc[issue.category] = [];
      }
      acc[issue.category].push(issue);
      return acc;
    }, {});
  }
  
  formatCategoryName(category) {
    const nameMap = {
      formatting: 'Formatting',
      structure: 'Document Structure',
      citations: 'In-Text Citations',
      references: 'References',
      content: 'Content & Style',
      tables: 'Tables & Figures',
      statistics: 'Statistical Formatting',
      quotations: 'Quotations',
      'bias-free': 'Bias-Free Language',
      headers: 'Headers & Footers'
    };
    
    return nameMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
  }
  
  escapeHtml(text) {
    if (!text) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Generate Markdown report (simplified for large issue counts)
   */
  generateMarkdownReport(issues, documentStats, documentName = 'Document') {
    const timestamp = new Date().toLocaleString();
    const groupedBySeverity = this.groupIssues(issues);
    const groupedByCategory = this.groupByCategory(issues);
    
    let markdown = `# 📋 APA 7th Edition Compliance Report

**Document:** ${documentName}  
**Generated:** ${timestamp}  
**Total Issues:** ${issues.length}

---

## 📊 Summary Statistics

| Severity | Count | Percentage |
|----------|-------|------------|
| Critical | ${groupedBySeverity.Critical?.length || 0} | ${((groupedBySeverity.Critical?.length || 0) / issues.length * 100).toFixed(1)}% |
| Major | ${groupedBySeverity.Major?.length || 0} | ${((groupedBySeverity.Major?.length || 0) / issues.length * 100).toFixed(1)}% |
| Minor | ${groupedBySeverity.Minor?.length || 0} | ${((groupedBySeverity.Minor?.length || 0) / issues.length * 100).toFixed(1)}% |

## 📁 Issues by Category

| Category | Critical | Major | Minor | Total |
|----------|----------|-------|-------|-------|
`;

    Object.entries(groupedByCategory).forEach(([category, categoryIssues]) => {
      const critical = categoryIssues.filter(i => i.severity === 'Critical').length;
      const major = categoryIssues.filter(i => i.severity === 'Major').length;
      const minor = categoryIssues.filter(i => i.severity === 'Minor').length;
      
      markdown += `| ${this.formatCategoryName(category)} | ${critical} | ${major} | ${minor} | ${categoryIssues.length} |\n`;
    });

    markdown += `\n---\n\n## 🔍 Detailed Issues\n\n`;

    // Only show critical and major issues in detail for large reports
    if (issues.length > 50) {
      markdown += `*Note: Showing only Critical and Major issues due to large issue count (${issues.length} total)*\n\n`;
      
      const importantIssues = [
        ...(groupedBySeverity.Critical || []),
        ...(groupedBySeverity.Major || [])
      ];
      
      importantIssues.forEach((issue, index) => {
        markdown += `### ${index + 1}. [${issue.severity}] ${issue.title}\n\n`;
        markdown += `**Category:** ${this.formatCategoryName(issue.category)}  \n`;
        markdown += `**Description:** ${issue.description}  \n`;
        if (issue.text) markdown += `**Context:** \`${issue.text.substring(0, 100)}${issue.text.length > 100 ? '...' : ''}\`  \n`;
        if (issue.explanation) markdown += `**Explanation:** ${issue.explanation}  \n`;
        markdown += '\n---\n\n';
      });
    } else {
      // Show all issues for smaller reports
      Object.entries(groupedByCategory).forEach(([category, categoryIssues]) => {
        markdown += `### ${this.formatCategoryName(category)}\n\n`;
        
        categoryIssues.forEach((issue, index) => {
          markdown += `**${index + 1}. ${issue.title}** [\`${issue.severity}\`]\n`;
          markdown += `- ${issue.description}\n`;
          if (issue.text) markdown += `- Context: \`${issue.text.substring(0, 80)}...\`\n`;
          markdown += '\n';
        });
        
        markdown += '---\n\n';
      });
    }
    
    return markdown;
  }
  
  /**
   * Export report as file
   */
  exportReport(issues, documentStats, format = 'html', documentName = 'Document') {
    let content, filename, mimeType;
    
    if (format === 'html') {
      content = this.generateHTMLReport(issues, documentStats, documentName);
      filename = `APA_Report_${this.getTimestamp()}.html`;
      mimeType = 'text/html';
    } else if (format === 'markdown') {
      content = this.generateMarkdownReport(issues, documentStats, documentName);
      filename = `APA_Report_${this.getTimestamp()}.md`;
      mimeType = 'text/markdown';
    } else {
      throw new Error('Unsupported format: ' + format);
    }
    
    // Create blob and download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return filename;
  }
  
  getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  }
}

export const reportGenerator = new IssueReportGenerator();