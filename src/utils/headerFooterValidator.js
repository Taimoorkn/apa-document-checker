// src/utils/headerFooterValidator.js - Running head and page number validation
'use client';

export class HeaderFooterValidator {
  constructor() {
    this.maxRunningHeadLength = 50;
  }

  /**
   * Validate headers, footers, running head, and page numbers
   */
  validateHeadersFooters(text, structure) {
    const issues = [];
    
    // Extract headers/footers from structure if available
    const headersFooters = structure?.headersFooters || {};
    
    // Validate running head
    issues.push(...this.validateRunningHead(headersFooters, text));
    
    // Validate page numbers
    issues.push(...this.validatePageNumbers(headersFooters, text));
    
    // Check for different first page header
    issues.push(...this.validateFirstPageHeader(headersFooters, text));
    
    // Validate section breaks
    issues.push(...this.validateSectionBreaks(headersFooters, text));
    
    return issues;
  }

  /**
   * FIXED: Validate running head format according to APA 7th Edition
   */
  validateRunningHead(headersFooters, text) {
    const issues = [];

    const runningHeadText = headersFooters?.runningHead?.text || '';

    if (runningHeadText && /running head:/i.test(runningHeadText)) {
      issues.push({
        title: "Running head label not required",
        description: "APA 7 student papers only require a page number in the header",
        severity: "Minor",
        category: "headers",
        hasFix: true,
        fixAction: "removeRunningHeadLabel",
        explanation: "Remove the 'Running head:' label unless an instructor specifically requests a professional running head."
      });
    }

    return issues;
  }

  /**
   * Validate page number positioning
   */
  validatePageNumbers(headersFooters, text) {
    const issues = [];
    const pageNumbers = headersFooters.pageNumbers || {};
    
    // Check if page numbers exist
    if (!pageNumbers.present) {
      // Check if document has multiple pages (rough estimate based on content)
      const estimatedPages = Math.ceil(text.split(/\s+/).length / 250); // ~250 words per page
      
      if (estimatedPages > 1) {
        issues.push({
          title: "Missing page numbers",
          description: "Document appears to have multiple pages but no page numbers detected",
          severity: "Major",
          category: "headers",
          hasFix: false,
          explanation: "All pages should be numbered consecutively, starting with the title page as page 1."
        });
      }
    } else {
      // Check positioning (should be top right)
      if (pageNumbers.position && pageNumbers.position !== 'right') {
        issues.push({
          title: "Incorrect page number position",
          description: `Page numbers are ${pageNumbers.position}-aligned instead of right-aligned`,
          severity: "Minor",
          category: "headers",
          hasFix: true,
          fixAction: "fixPageNumberPosition",
          explanation: "Page numbers should be positioned in the top right corner of every page."
        });
      }
      
      // Check if in header (not footer)
      const inFooter = headersFooters.footers?.some(f => f.hasPageNumber);
      const inHeader = headersFooters.headers?.some(h => h.hasPageNumber);
      
      if (inFooter && !inHeader) {
        issues.push({
          title: "Page numbers in footer instead of header",
          description: "Page numbers should be in the header, not the footer",
          severity: "Major",
          category: "headers",
          hasFix: true,
          fixAction: "movePageNumbersToHeader",
          explanation: "APA format requires page numbers in the top right corner of the header, not in the footer."
        });
      }
    }
    
    return issues;
  }

  /**
   * Validate first page header differences
   */
  validateFirstPageHeader(headersFooters, text) {
    const issues = [];

    // Student-format APA papers generally use the same header on every page.
    // No additional validation needed beyond running head and page number checks.
    return issues;
  }

  /**
   * Check title page elements
   */
  checkTitlePageElements(text) {
    const firstPage = (text || '').substring(0, 1500);
    const lines = firstPage
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const hasTitle = lines.some(line =>
      line.length > 10 &&
      line.length < 100 &&
      !/running head/i.test(line) &&
      /^[A-Z]/.test(line)
    );

    const authorPattern = /^[A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+)+$/;
    const hasAuthor = lines.some((line, index) =>
      index > 0 &&
      line.length > 3 &&
      line.length < 80 &&
      authorPattern.test(line)
    );

    const hasAffiliation = lines.some(line =>
      /(University|College|Institute|School|Department)/i.test(line)
    );

    const coursePattern = /(course|class)\s*(number|name|code)?:?/i;
    const catalogPattern = /\b[A-Z]{2,4}\s*\d{3,4}\b/;
    const hasCourse = lines.some(line => coursePattern.test(line) || catalogPattern.test(line));

    const instructorPattern = /(Professor|Prof\.|Dr\.|Instructor|Ms\.|Mr\.|Mrs\.)/i;
    const hasInstructor = lines.some(line => instructorPattern.test(line));

    const monthPattern = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/;
    const dayFirstPattern = /\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/;
    const numericDatePattern = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/;
    const hasDueDate = lines.some(line => monthPattern.test(line) || dayFirstPattern.test(line) || numericDatePattern.test(line));

    const runningHeadLabel = /running head:/i.test(firstPage);

    return {
      hasTitle,
      hasAuthor,
      hasAffiliation,
      hasCourse,
      hasInstructor,
      hasDueDate,
      runningHeadLabel,
      hasAll: hasTitle && hasAuthor && hasAffiliation && hasCourse && hasInstructor && hasDueDate
    };
  }

  /**
   * Validate section breaks and headers consistency
   */
  validateSectionBreaks(headersFooters, text) {
    const issues = [];
    
    // Check if there are multiple header/footer definitions (indicating section breaks)
    const headerCount = headersFooters.headers?.length || 0;
    const footerCount = headersFooters.footers?.length || 0;
    
    if (headerCount > 3 || footerCount > 3) {
      // Multiple section breaks detected
      issues.push({
        title: "Multiple section breaks detected",
        description: "Document has multiple section breaks which may cause header/footer inconsistencies",
        severity: "Minor",
        category: "headers",
        hasFix: false,
        explanation: "APA format typically uses consistent headers throughout. Avoid unnecessary section breaks unless needed for landscape pages or appendices."
      });
    }
    
    // Check for consistency across headers
    if (headersFooters.headers && headersFooters.headers.length > 1) {
      const firstHeader = headersFooters.headers[0];
      const inconsistentHeaders = headersFooters.headers.filter(h => 
        h.text !== firstHeader.text && 
        !h.text.includes('Running head')
      );
      
      if (inconsistentHeaders.length > 0) {
        issues.push({
          title: "Inconsistent headers across document",
          description: "Headers vary across different sections of the document",
          severity: "Minor",
          category: "headers",
          hasFix: false,
          explanation: "Maintain consistent headers throughout the document, except for the title page which may have 'Running head:' prefix."
        });
      }
    }
    
    return issues;
  }
}