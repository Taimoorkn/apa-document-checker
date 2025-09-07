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
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
      color: #1a1a1a;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
      padding: 0;
      margin: 0;
    }
    
    .container {
      max-width: 1500px;
      margin: 0 auto;
      background: #ffffff;
      box-shadow: 0 0 40px rgba(0, 0, 0, 0.1);
    }
    
    /* Enhanced Header */
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      overflow: hidden;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      border-radius: 50%;
    }
    
    .header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.5px;
      position: relative;
      z-index: 1;
    }
    
    .header-stats {
      display: flex;
      gap: 40px;
      align-items: center;
      position: relative;
      z-index: 1;
    }
    
    .header-stat {
      text-align: center;
      padding: 10px 20px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      transition: all 0.3s ease;
    }
    
    .header-stat:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: translateY(-2px);
    }
    
    .header-stat-value {
      font-size: 1.75rem;
      font-weight: 800;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .header-stat-label {
      font-size: 0.8rem;
      opacity: 0.95;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Enhanced Navigation Tabs */
    .nav-tabs {
      background: linear-gradient(to bottom, #ffffff, #fafbfc);
      border-bottom: 1px solid rgba(0,0,0,0.08);
      padding: 0 40px;
      display: flex;
      gap: 8px;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    
    .nav-tab {
      padding: 16px 24px;
      cursor: pointer;
      border: none;
      background: none;
      font-size: 0.925rem;
      color: #64748b;
      border-bottom: 3px solid transparent;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-weight: 500;
      position: relative;
    }
    
    .nav-tab::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      width: 0;
      height: 3px;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform: translateX(-50%);
    }
    
    .nav-tab:hover {
      color: #475569;
      background: rgba(102, 126, 234, 0.04);
    }
    
    .nav-tab.active {
      color: #667eea;
      font-weight: 600;
      background: rgba(102, 126, 234, 0.08);
    }
    
    .nav-tab.active::after {
      width: 100%;
    }
    
    /* Content Sections */
    .content {
      padding: 40px;
      background: #fafbfc;
    }
    
    .section {
      display: none;
      animation: fadeIn 0.3s ease-in-out;
    }
    
    .section.active {
      display: block;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    /* Enhanced Dashboard */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }
    
    .dashboard-card {
      background: white;
      border: 1px solid rgba(0,0,0,0.06);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      transition: all 0.3s ease;
    }
    
    .dashboard-card:hover {
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
      transform: translateY(-2px);
    }
    
    .dashboard-card h3 {
      font-size: 1.1rem;
      color: #1e293b;
      margin-bottom: 20px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .dashboard-card h3::before {
      content: '';
      width: 4px;
      height: 20px;
      background: linear-gradient(180deg, #667eea, #764ba2);
      border-radius: 2px;
    }
    
    /* Enhanced Severity Chart */
    .severity-chart {
      display: flex;
      height: 40px;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    .severity-segment {
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.875rem;
      font-weight: 700;
      position: relative;
      transition: all 0.3s ease;
    }
    
    .severity-segment:hover {
      filter: brightness(1.1);
    }
    
    .severity-segment.critical {
      background: linear-gradient(135deg, #ef4444, #dc2626);
    }
    
    .severity-segment.major {
      background: linear-gradient(135deg, #f97316, #ea580c);
    }
    
    .severity-segment.minor {
      background: linear-gradient(135deg, #eab308, #ca8a04);
    }
    
    /* Enhanced Summary Table */
    .summary-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 0.875rem;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .summary-table th {
      text-align: left;
      padding: 12px 16px;
      background: linear-gradient(to bottom, #f8fafc, #f1f5f9);
      border-bottom: 1px solid rgba(0,0,0,0.08);
      font-weight: 600;
      color: #475569;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .summary-table td {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(0,0,0,0.04);
      transition: all 0.2s ease;
    }
    
    .summary-table tr:hover td {
      background: rgba(102, 126, 234, 0.03);
    }
    
    .summary-table tr:last-child td {
      border-bottom: none;
    }
    
    .category-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    
    .count-badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.3px;
      transition: all 0.2s ease;
    }
    
    .count-badge.critical {
      background: linear-gradient(135deg, #fee2e2, #fecaca);
      color: #dc2626;
      box-shadow: 0 2px 4px rgba(220, 38, 38, 0.1);
    }
    
    .count-badge.major {
      background: linear-gradient(135deg, #fed7aa, #fdba74);
      color: #ea580c;
      box-shadow: 0 2px 4px rgba(234, 88, 12, 0.1);
    }
    
    .count-badge.minor {
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      color: #ca8a04;
      box-shadow: 0 2px 4px rgba(202, 138, 4, 0.1);
    }
    
    .count-badge:hover {
      transform: scale(1.05);
    }
    
    /* Enhanced Category View */
    .category-issues {
      margin-bottom: 24px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      transition: all 0.3s ease;
    }
    
    .category-issues:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    }
    
    .category-header {
      background: linear-gradient(to right, #ffffff, #fafbfc);
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
      border: 1px solid rgba(0,0,0,0.06);
      transition: all 0.3s ease;
    }
    
    .category-header:hover {
      background: linear-gradient(to right, #fafbfc, #f1f5f9);
      border-color: rgba(102, 126, 234, 0.2);
    }
    
    .category-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .category-icon {
      font-size: 1.4rem;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
    }
    
    .category-name {
      font-weight: 700;
      color: #1e293b;
      font-size: 0.95rem;
    }
    
    .category-counts {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    
    .expand-icon {
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      color: #94a3b8;
      font-size: 1.2rem;
    }
    
    .category-header.expanded .expand-icon {
      transform: rotate(180deg);
    }
    
    .category-content {
      background: #ffffff;
      border: 1px solid rgba(0,0,0,0.06);
      border-top: none;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .category-content.expanded {
      max-height: 700px;
      overflow-y: auto;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.03);
    }
    
    /* Custom Scrollbar */
    .category-content::-webkit-scrollbar {
      width: 8px;
    }
    
    .category-content::-webkit-scrollbar-track {
      background: #f1f5f9;
    }
    
    .category-content::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #cbd5e1, #94a3b8);
      border-radius: 4px;
    }
    
    .category-content::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, #94a3b8, #64748b);
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
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      color: white;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.2s ease;
    }
    
    .severity-pill:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
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
    
    /* Enhanced Top Issues Section */
    .top-issues-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 24px;
      margin-bottom: 30px;
    }
    
    .top-issue-card {
      background: white;
      border: 1px solid rgba(0,0,0,0.06);
      border-radius: 12px;
      padding: 20px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    
    .top-issue-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transform: scaleX(0);
      transition: transform 0.3s ease;
    }
    
    .top-issue-card:hover {
      box-shadow: 0 8px 24px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }
    
    .top-issue-card:hover::before {
      transform: scaleX(1);
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
    
    /* Enhanced Statistics Section */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 24px;
      margin-bottom: 30px;
    }
    
    .stat-card {
      background: white;
      border: 1px solid rgba(0,0,0,0.06);
      padding: 24px;
      border-radius: 16px;
      text-align: center;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    
    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #667eea, #764ba2);
    }
    
    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0,0,0,0.1);
    }
    
    .stat-value {
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .stat-label {
      font-size: 0.9rem;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
    <!-- Enhanced Header with Key Stats -->
    <div class="header">
      <div style="position: relative; z-index: 1;">
        <h1 style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">📋</span>
          APA Compliance Report
        </h1>
        <div style="font-size: 0.9rem; opacity: 0.95; margin-top: 8px; font-weight: 500;">
          <span style="opacity: 0.9;">Document:</span> ${documentName}
          <span style="margin: 0 12px; opacity: 0.6;">•</span>
          <span style="opacity: 0.9;">Generated:</span> ${timestamp}
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
    
    <!-- Quick Summary Bar -->
    <div id="summaryBar" style="background: #fafbfc; padding: 12px 40px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem;">
      <div style="display: flex; gap: 20px;">
        <span><strong>${issues.length}</strong> total issues</span>
        <span style="color: #dc2626;">▪ <strong>${groupedBySeverity.Critical?.length || 0}</strong> Critical</span>
        <span style="color: #ea580c;">▪ <strong>${groupedBySeverity.Major?.length || 0}</strong> Major</span>
        <span style="color: #ca8a04;">▪ <strong>${groupedBySeverity.Minor?.length || 0}</strong> Minor</span>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <span id="activeFilter" style="padding: 4px 12px; background: #e0e7ff; color: #4338ca; border-radius: 12px; font-weight: 500; display: none;"></span>
        <button onclick="window.print()" style="padding: 6px 12px; background: white; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">Print Report</button>
      </div>
    </div>
    
    <!-- Navigation Tabs with Counts -->
    <div class="nav-tabs">
      <button class="nav-tab active" onclick="showSection('summary')">
        Summary
      </button>
      <button class="nav-tab" onclick="showSection('by-category')">
        By Category
        <span style="background: rgba(102, 126, 234, 0.1); color: #667eea; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; margin-left: 6px; font-weight: 600;">${Object.keys(groupedByCategory).length}</span>
      </button>
      <button class="nav-tab" onclick="showSection('by-severity')">
        By Severity
        <span style="background: rgba(239, 68, 68, 0.1); color: #dc2626; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; margin-left: 6px; font-weight: 600;">${groupedBySeverity.Critical?.length || 0}</span>
      </button>
      <button class="nav-tab" onclick="showSection('top-issues')">
        Top Issues
        <span style="background: rgba(249, 115, 22, 0.1); color: #ea580c; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; margin-left: 6px; font-weight: 600;">${Math.min(12, (groupedBySeverity.Critical?.length || 0) + (groupedBySeverity.Major?.length || 0))}</span>
      </button>
      <button class="nav-tab" onclick="showSection('statistics')">Statistics</button>
    </div>
    
    <div class="content">
      <!-- Summary Section -->
      <section id="summary" class="section active">
        <h2 style="margin-bottom: 30px; color: #1e293b; font-size: 1.5rem; font-weight: 700; display: flex; align-items: center; gap: 12px;">
          <span style="width: 4px; height: 24px; background: linear-gradient(180deg, #667eea, #764ba2); border-radius: 2px;"></span>
          Executive Summary
        </h2>
        
        <div class="dashboard-grid">
          <!-- Severity Distribution -->
          <div class="dashboard-card">
            <h3>Severity Distribution</h3>
            <div class="severity-chart">
              ${this.generateSeverityChart(groupedBySeverity, issues.length)}
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 16px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: linear-gradient(135deg, #ef4444, #dc2626);"></div>
                <span style="font-size: 0.85rem; color: #64748b; font-weight: 500;">Critical: ${((groupedBySeverity.Critical?.length || 0) / issues.length * 100).toFixed(1)}%</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: linear-gradient(135deg, #f97316, #ea580c);"></div>
                <span style="font-size: 0.85rem; color: #64748b; font-weight: 500;">Major: ${((groupedBySeverity.Major?.length || 0) / issues.length * 100).toFixed(1)}%</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: linear-gradient(135deg, #eab308, #ca8a04);"></div>
                <span style="font-size: 0.85rem; color: #64748b; font-weight: 500;">Minor: ${((groupedBySeverity.Minor?.length || 0) / issues.length * 100).toFixed(1)}%</span>
              </div>
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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 style="color: #1e293b; font-size: 1.5rem; font-weight: 700; margin: 0;">Issues by Category</h2>
          <div style="display: flex; gap: 12px; align-items: center;">
            <!-- Search -->
            <input type="text" id="categorySearch" placeholder="Search issues..." 
              style="padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.875rem; width: 200px;"
              onkeyup="filterIssues(this.value)">
            <!-- Quick Actions -->
            <button onclick="expandAllCategories()" 
              style="padding: 8px 16px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.875rem; cursor: pointer; font-weight: 500;">
              Expand All
            </button>
            <button onclick="collapseAllCategories()" 
              style="padding: 8px 16px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.875rem; cursor: pointer; font-weight: 500;">
              Collapse All
            </button>
            <button onclick="showOnlyCritical()" 
              style="padding: 8px 16px; background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; font-size: 0.875rem; cursor: pointer; font-weight: 500; color: #dc2626;">
              Critical Only
            </button>
          </div>
        </div>
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
    // Quick summary for current view
    let currentFilter = 'all';
    let searchTerm = '';
    
    function showSection(sectionId) {
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.getElementById(sectionId).classList.add('active');
      event.target.classList.add('active');
      updateSummaryBar();
    }
    
    // Search functionality
    function filterIssues(term) {
      searchTerm = term.toLowerCase();
      const rows = document.querySelectorAll('.issues-table tbody tr');
      let visibleCount = 0;
      
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
          row.style.display = '';
          visibleCount++;
        } else {
          row.style.display = 'none';
        }
      });
      
      // Update count
      document.getElementById('filterCount').textContent = visibleCount + ' issues shown';
    }
    
    // Expand/Collapse all
    function expandAllCategories() {
      document.querySelectorAll('.category-header').forEach(header => {
        header.classList.add('expanded');
        header.nextElementSibling.classList.add('expanded');
      });
    }
    
    function collapseAllCategories() {
      document.querySelectorAll('.category-header').forEach(header => {
        header.classList.remove('expanded');
        header.nextElementSibling.classList.remove('expanded');
      });
    }
    
    // Filter by severity
    function showOnlyCritical() {
      currentFilter = 'critical';
      document.querySelectorAll('.issues-table tbody tr').forEach(row => {
        const hasCritical = row.querySelector('.severity-pill')?.textContent.includes('CRITICAL');
        row.style.display = hasCritical ? '' : 'none';
      });
      updateFilterCount();
    }
    
    function resetFilter() {
      currentFilter = 'all';
      document.querySelectorAll('.issues-table tbody tr').forEach(row => {
        row.style.display = '';
      });
      updateFilterCount();
    }
    
    function updateFilterCount() {
      const visible = document.querySelectorAll('.issues-table tbody tr:not([style*="display: none"])').length;
      const filterEl = document.getElementById('filterCount');
      if (filterEl) filterEl.textContent = visible + ' issues shown';
    }
    
    function updateSummaryBar() {
      // Update summary based on current view
      const activeSection = document.querySelector('.section.active');
      const visibleIssues = activeSection.querySelectorAll('.issues-table tbody tr:not([style*="display: none"])').length;
      console.log('Current view has ' + visibleIssues + ' visible issues');
    }
    
    // Copy issue text
    function copyIssue(text) {
      navigator.clipboard.writeText(text);
      // Show toast notification
      const toast = document.createElement('div');
      toast.textContent = 'Copied to clipboard!';
      toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #10b981; color: white; padding: 12px 20px; border-radius: 8px; z-index: 1000;';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    }
    
    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
      // Category click handlers
      const headers = document.querySelectorAll('.category-header');
      headers.forEach(header => {
        header.addEventListener('click', function(e) {
          if (e.target.tagName !== 'BUTTON') {
            const content = this.nextElementSibling;
            this.classList.toggle('expanded');
            content.classList.toggle('expanded');
          }
        });
      });
      
      // Auto-expand critical categories
      document.querySelectorAll('.category-header').forEach(header => {
        const criticalCount = header.querySelector('.count-badge.critical');
        if (criticalCount && parseInt(criticalCount.textContent) > 0) {
          header.classList.add('expanded');
          header.nextElementSibling.classList.add('expanded');
        }
      });
      
      // Add filter count indicator
      const filterIndicator = document.createElement('div');
      filterIndicator.id = 'filterCount';
      filterIndicator.style.cssText = 'position: fixed; bottom: 20px; left: 20px; background: #667eea; color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.875rem; font-weight: 600; display: none;';
      document.body.appendChild(filterIndicator);
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
    const issueId = `issue-${Math.random().toString(36).substr(2, 9)}`;
    
    return `
      <tr id="${issueId}" data-severity="${issue.severity}" data-category="${issue.category}">
        <td>
          <span class="severity-pill" style="background: ${severityColor}">
            ${issue.severity}
          </span>
        </td>
        <td>
          <div class="issue-title">${this.escapeHtml(issue.title)}</div>
          <div class="issue-description">${this.escapeHtml(issue.description)}</div>
          ${issue.hasFix ? `<span style="display: inline-block; margin-top: 4px; padding: 2px 6px; background: #dcfce7; color: #14532d; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">✓ Fix Available</span>` : ''}
        </td>
        <td>
          ${issue.text ? `
            <div class="issue-context" title="${this.escapeHtml(issue.text)}" style="position: relative;">
              ${this.escapeHtml(issue.text.length > 50 ? issue.text.substring(0, 50) + '...' : issue.text)}
              <button onclick="copyIssue('${this.escapeHtml(issue.text).replace(/'/g, "\\'")}')" 
                style="position: absolute; right: 4px; top: 4px; background: white; border: 1px solid #e5e7eb; border-radius: 4px; padding: 2px 6px; font-size: 0.65rem; cursor: pointer; opacity: 0; transition: opacity 0.2s;"
                onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
                copy
              </button>
            </div>
          ` : '<span style="color: #9ca3af;">—</span>'}
        </td>
        <td>
          <div class="issue-explanation">${this.escapeHtml(issue.explanation || 'See APA manual for details')}</div>
          ${issue.location ? `<div style="margin-top: 4px; font-size: 0.7rem; color: #6b7280;">📍 ${issue.location.type || 'document'}</div>` : ''}
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