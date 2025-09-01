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
   * Validate running head format
   */
  validateRunningHead(headersFooters, text) {
    const issues = [];
    
    // Check if document appears to be a professional paper (longer documents typically are)
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const isProfessionalPaper = wordCount > 3000 || text.toLowerCase().includes('running head');
    
    if (isProfessionalPaper) {
      const runningHead = headersFooters.runningHead;
      
      // Check if running head exists
      if (!runningHead && !headersFooters.headers?.length) {
        issues.push({
          title: "Missing running head",
          description: "Professional papers require a running head in the page header",
          severity: "Major",
          category: "headers",
          hasFix: false,
          explanation: "Add a running head in the format: 'Running head: ABBREVIATED TITLE' on the title page, then 'ABBREVIATED TITLE' on subsequent pages."
        });
        return issues;
      }
      
      if (runningHead) {
        // Check length (max 50 characters)
        if (runningHead.length > this.maxRunningHeadLength) {
          issues.push({
            title: "Running head too long",
            description: `Running head is ${runningHead.length} characters (max 50)`,
            text: runningHead.text,
            severity: "Major",
            category: "headers",
            hasFix: false,
            explanation: "Running head must be 50 characters or less including spaces and punctuation."
          });
        }
        
        // Check if all caps
        if (runningHead.text && !runningHead.allCaps) {
          const upperText = runningHead.text.replace(/^Running head:\s*/i, '');
          if (upperText !== upperText.toUpperCase()) {
            issues.push({
              title: "Running head not in all caps",
              description: "Running head should be in ALL CAPITAL LETTERS",
              text: runningHead.text,
              severity: "Minor",
              category: "headers",
              hasFix: true,
              fixAction: "fixRunningHeadCaps",
              explanation: "The running head text (after 'Running head:') should be in all capital letters."
            });
          }
        }
        
        // Check first page format
        const firstPageHasLabel = text.substring(0, 2000).includes('Running head:');
        const hasRunningHeadText = runningHead.text && runningHead.text.length > 0;
        
        if (hasRunningHeadText && !firstPageHasLabel) {
          issues.push({
            title: "Missing 'Running head:' label on title page",
            description: "Title page should include 'Running head:' before the abbreviated title",
            severity: "Minor",
            category: "headers",
            hasFix: true,
            fixAction: "addRunningHeadLabel",
            explanation: "The title page header should read 'Running head: ABBREVIATED TITLE' while subsequent pages show only 'ABBREVIATED TITLE'."
          });
        }
      }
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
    
    // Check if there's a different first page header setting
    if (headersFooters.firstPageHeader || headersFooters.firstPageFooter) {
      // This is often correct for APA (different first page for running head)
      // But check if it's properly configured
      
      const hasRunningHead = headersFooters.runningHead;
      const firstPageText = text.substring(0, 2000);
      
      if (hasRunningHead && !firstPageText.includes('Running head:')) {
        issues.push({
          title: "First page header configuration issue",
          description: "Different first page header detected but may not be properly configured",
          severity: "Minor",
          category: "headers",
          hasFix: false,
          explanation: "The title page should have 'Running head: TITLE' while other pages have just 'TITLE'."
        });
      }
    }
    
    // Check for title page elements
    const titlePageElements = this.checkTitlePageElements(text);
    if (!titlePageElements.hasAll) {
      const missing = [];
      if (!titlePageElements.hasTitle) missing.push('paper title');
      if (!titlePageElements.hasAuthor) missing.push('author name(s)');
      if (!titlePageElements.hasAffiliation) missing.push('institutional affiliation');
      
      if (missing.length > 0) {
        issues.push({
          title: "Incomplete title page",
          description: `Title page missing: ${missing.join(', ')}`,
          severity: "Major",
          category: "structure",
          hasFix: false,
          explanation: "APA title page must include: paper title, author name(s), institutional affiliation, and author note (if applicable)."
        });
      }
    }
    
    return issues;
  }

  /**
   * Check title page elements
   */
  checkTitlePageElements(text) {
    const firstPage = text.substring(0, 1500);
    const lines = firstPage.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Simple heuristics for title page elements
    const hasTitle = lines.some(line => 
      line.length > 10 && 
      line.length < 100 && 
      !line.includes('Running head') &&
      line[0] === line[0].toUpperCase()
    );
    
    // Check for author names (typically after title)
    const hasAuthor = lines.some((line, i) => 
      i > 0 && // Not first line
      line.length > 3 && 
      line.length < 50 &&
      /^[A-Z][a-z]+/.test(line) && // Starts with capital letter
      !line.includes('University') &&
      !line.includes('College')
    );
    
    // Check for affiliation (university/institution name)
    const hasAffiliation = lines.some(line => 
      line.includes('University') || 
      line.includes('College') || 
      line.includes('Institute') ||
      line.includes('Department')
    );
    
    return {
      hasTitle,
      hasAuthor,
      hasAffiliation,
      hasAll: hasTitle && hasAuthor && hasAffiliation
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