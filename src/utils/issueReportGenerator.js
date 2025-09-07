// src/utils/issueReportGenerator.js - Generate formatted issue reports
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
   * Generate HTML report with all issues
   */
  generateHTMLReport(issues, documentStats, documentName = 'Document') {
    const timestamp = new Date().toLocaleString();
    const groupedIssues = this.groupIssues(issues);
    
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
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      font-weight: 700;
    }
    
    .header .subtitle {
      font-size: 1.1rem;
      opacity: 0.95;
    }
    
    .header .timestamp {
      font-size: 0.9rem;
      opacity: 0.85;
      margin-top: 10px;
    }
    
    .summary {
      background: #f8fafc;
      padding: 30px 40px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .summary h2 {
      color: #374151;
      margin-bottom: 20px;
      font-size: 1.5rem;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      text-align: center;
      transition: transform 0.2s;
    }
    
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    .stat-number {
      font-size: 2rem;
      font-weight: bold;
      color: #4b5563;
    }
    
    .stat-label {
      font-size: 0.9rem;
      color: #6b7280;
      margin-top: 5px;
    }
    
    .severity-breakdown {
      display: flex;
      gap: 15px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    
    .severity-badge {
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      color: white;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    
    .severity-critical {
      background: #dc2626;
    }
    
    .severity-major {
      background: #ea580c;
    }
    
    .severity-minor {
      background: #ca8a04;
    }
    
    .issues-section {
      padding: 40px;
    }
    
    .category-section {
      margin-bottom: 40px;
    }
    
    .category-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .category-icon {
      font-size: 1.5rem;
    }
    
    .category-title {
      font-size: 1.3rem;
      color: #374151;
      font-weight: 600;
    }
    
    .category-count {
      margin-left: auto;
      background: #f3f4f6;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.9rem;
      color: #6b7280;
    }
    
    .issue-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 15px;
      transition: all 0.2s;
    }
    
    .issue-card:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transform: translateX(4px);
    }
    
    .issue-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .issue-severity {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      color: white;
      flex-shrink: 0;
    }
    
    .issue-title {
      font-weight: 600;
      color: #1f2937;
      font-size: 1.05rem;
      flex-grow: 1;
    }
    
    .issue-description {
      color: #4b5563;
      margin-bottom: 12px;
      line-height: 1.5;
    }
    
    .issue-text {
      background: #f9fafb;
      border-left: 3px solid #9ca3af;
      padding: 10px 15px;
      margin: 12px 0;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      color: #374151;
      border-radius: 4px;
      word-break: break-word;
    }
    
    .issue-explanation {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 8px;
      padding: 12px;
      margin-top: 12px;
      color: #78350f;
      font-size: 0.9rem;
    }
    
    .issue-explanation::before {
      content: '💡 ';
      font-weight: bold;
    }
    
    .issue-fix {
      background: #dcfce7;
      border: 1px solid #86efac;
      border-radius: 8px;
      padding: 12px;
      margin-top: 12px;
      color: #14532d;
      font-size: 0.9rem;
    }
    
    .issue-fix::before {
      content: '✅ ';
      font-weight: bold;
    }
    
    .footer {
      background: #f8fafc;
      padding: 30px 40px;
      text-align: center;
      color: #6b7280;
      border-top: 2px solid #e5e7eb;
    }
    
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    
    .no-issues {
      text-align: center;
      padding: 60px;
      color: #10b981;
    }
    
    .no-issues-icon {
      font-size: 4rem;
      margin-bottom: 20px;
    }
    
    .no-issues-text {
      font-size: 1.5rem;
      font-weight: 600;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
        border-radius: 0;
      }
      
      .issue-card:hover {
        transform: none;
        box-shadow: none;
      }
    }
    
    @media (max-width: 768px) {
      .header h1 {
        font-size: 1.8rem;
      }
      
      .stats-grid {
        grid-template-columns: 1fr;
      }
      
      .severity-breakdown {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 APA 7th Edition Compliance Report</h1>
      <div class="subtitle">${documentName}</div>
      <div class="timestamp">Generated: ${timestamp}</div>
    </div>
    
    <div class="summary">
      <h2>Executive Summary</h2>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">${issues.length}</div>
          <div class="stat-label">Total Issues</div>
        </div>
        ${documentStats ? `
        <div class="stat-card">
          <div class="stat-number">${documentStats.wordCount || 0}</div>
          <div class="stat-label">Word Count</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${documentStats.paragraphCount || 0}</div>
          <div class="stat-label">Paragraphs</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${documentStats.complianceScore || 0}%</div>
          <div class="stat-label">Compliance Score</div>
        </div>
        ` : ''}
      </div>
      
      <div class="severity-breakdown">
        ${this.generateSeverityBadges(groupedIssues)}
      </div>
    </div>
    
    <div class="issues-section">
      ${issues.length === 0 ? this.generateNoIssuesMessage() : this.generateIssuesByCategory(issues)}
    </div>
    
    <div class="footer">
      <p>Generated by APA Document Checker</p>
      <p>This report provides suggestions based on APA 7th Edition guidelines.</p>
      <p><a href="https://apastyle.apa.org/">Learn more about APA Style</a></p>
    </div>
  </div>
</body>
</html>`;
    
    return html;
  }

  /**
   * Generate Markdown report
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

| Metric | Value |
|--------|-------|
| Total Issues | ${issues.length} |
| Critical Issues | ${groupedBySeverity.Critical?.length || 0} |
| Major Issues | ${groupedBySeverity.Major?.length || 0} |
| Minor Issues | ${groupedBySeverity.Minor?.length || 0} |
${documentStats ? `| Word Count | ${documentStats.wordCount || 0} |
| Paragraphs | ${documentStats.paragraphCount || 0} |
| Compliance Score | ${documentStats.complianceScore || 0}% |` : ''}

---

## 🔍 Issues by Category

`;

    // Generate issues by category
    Object.entries(groupedByCategory).forEach(([category, categoryIssues]) => {
      const icon = this.categoryIcons[category] || '📝';
      markdown += `\n### ${icon} ${this.formatCategoryName(category)} (${categoryIssues.length} issues)\n\n`;
      
      categoryIssues.forEach((issue, index) => {
        markdown += this.generateMarkdownIssue(issue, index + 1);
      });
    });
    
    markdown += `\n---

*Generated by APA Document Checker*  
*Based on APA 7th Edition Guidelines*`;
    
    return markdown;
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
  
  generateSeverityBadges(groupedIssues) {
    const badges = [];
    
    if (groupedIssues.Critical?.length > 0) {
      badges.push(`<span class="severity-badge severity-critical">🔴 ${groupedIssues.Critical.length} Critical</span>`);
    }
    if (groupedIssues.Major?.length > 0) {
      badges.push(`<span class="severity-badge severity-major">🟠 ${groupedIssues.Major.length} Major</span>`);
    }
    if (groupedIssues.Minor?.length > 0) {
      badges.push(`<span class="severity-badge severity-minor">🟡 ${groupedIssues.Minor.length} Minor</span>`);
    }
    
    return badges.join('');
  }
  
  generateNoIssuesMessage() {
    return `
      <div class="no-issues">
        <div class="no-issues-icon">✅</div>
        <div class="no-issues-text">Excellent! No APA issues detected.</div>
        <p>Your document appears to comply with APA 7th Edition guidelines.</p>
      </div>
    `;
  }
  
  generateIssuesByCategory(issues) {
    const grouped = this.groupByCategory(issues);
    let html = '';
    
    Object.entries(grouped).forEach(([category, categoryIssues]) => {
      const icon = this.categoryIcons[category] || '📝';
      
      html += `
        <div class="category-section">
          <div class="category-header">
            <span class="category-icon">${icon}</span>
            <span class="category-title">${this.formatCategoryName(category)}</span>
            <span class="category-count">${categoryIssues.length} issue${categoryIssues.length !== 1 ? 's' : ''}</span>
          </div>
          ${categoryIssues.map(issue => this.generateIssueCard(issue)).join('')}
        </div>
      `;
    });
    
    return html;
  }
  
  generateIssueCard(issue) {
    const severityColor = this.severityColors[issue.severity];
    
    return `
      <div class="issue-card">
        <div class="issue-header">
          <span class="issue-severity" style="background: ${severityColor}">
            ${issue.severity}
          </span>
          <span class="issue-title">${this.escapeHtml(issue.title)}</span>
        </div>
        
        <div class="issue-description">
          ${this.escapeHtml(issue.description)}
        </div>
        
        ${issue.text ? `
          <div class="issue-text">
            ${this.escapeHtml(issue.text)}
          </div>
        ` : ''}
        
        ${issue.explanation ? `
          <div class="issue-explanation">
            ${this.escapeHtml(issue.explanation)}
          </div>
        ` : ''}
        
        ${issue.hasFix ? `
          <div class="issue-fix">
            Suggested Fix: ${issue.fixAction ? `Apply "${issue.fixAction}" action` : 'Manual correction recommended'}
          </div>
        ` : ''}
      </div>
    `;
  }
  
  generateMarkdownIssue(issue, number) {
    return `
#### ${number}. ${issue.title}

**Severity:** \`${issue.severity}\`  
**Description:** ${issue.description}  
${issue.text ? `**Context:** \`${issue.text}\`  ` : ''}
${issue.explanation ? `\n> 💡 **Explanation:** ${issue.explanation}\n` : ''}
${issue.hasFix ? `\n> ✅ **Fix Available:** ${issue.fixAction || 'Manual correction recommended'}\n` : ''}

---
`;
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