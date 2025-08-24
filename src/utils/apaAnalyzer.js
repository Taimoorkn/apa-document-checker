'use client';

// APA 7th Edition Guidelines Analyzer
// This module analyzes documents for compliance with APA 7th Edition guidelines

// Main analysis function
export function analyzeAPAGuidelines(text, html) {
  const issues = [];
  
  // Ensure we have valid inputs
  if (!text || typeof text !== 'string') {
    console.warn('Invalid text provided to APA analyzer');
    return issues;
  }
  
  // Analyze different aspects of the document
  issues.push(...analyzeCitations(text));
  issues.push(...analyzeReferenceList(text));
  issues.push(...analyzeDocumentStructure(text, html || ''));
  issues.push(...analyzeFormatting(html || ''));
  
  return issues;
}

// Analyze in-text citations
function analyzeCitations(text) {
  const issues = [];
  
  // Regular expressions for common citation patterns
  const citationRegex = /\(([^)]+?,\s*\d{4}[^)]*)\)/g;
  const directQuoteRegex = /[""][^""]+?[""]\s*\([^)]+?,\s*\d{4}(?:,\s*p\.?\s*\d+)?\)/g;
  const multipleAuthorsRegex = /\(([^)]+?)\s*&\s*([^)]+?),\s*(\d{4})\)/g;
  
  // Check for citations without page numbers in direct quotes
  let match;
  const quotesWithoutPages = [];
  
  // Find direct quotes
  const directQuotes = [];
  while ((match = directQuoteRegex.exec(text)) !== null) {
    directQuotes.push(match[0]);
  }
  
  // Check if direct quotes have page numbers
  for (const quote of directQuotes) {
    if (!quote.match(/p\.?\s*\d+/i)) {
      quotesWithoutPages.push(quote);
    }
  }
  
  // Add issues for quotes without page numbers
  for (const quote of quotesWithoutPages) {
    issues.push({
      title: "Missing page number in direct quote",
      description: "Direct quotes must include a page number in the citation",
      text: quote,
      severity: "Major",
      location: { text: quote },
      hasFix: true,
      fixAction: "addPageNumber"
    });
  }
  
  // Check for incorrect citation format
  while ((match = citationRegex.exec(text)) !== null) {
    const citation = match[0];
    const contents = match[1];
    
    // Check for missing comma between author and year
    if (!contents.includes(",")) {
      issues.push({
        title: "Incorrect citation format",
        description: "Citation should have a comma between author and year",
        text: citation,
        severity: "Minor",
        location: { text: citation },
        hasFix: true,
        fixAction: "fixCitationFormat"
      });
    }
  }
  
  // Check for ampersand usage in parenthetical citations
  while ((match = multipleAuthorsRegex.exec(text)) !== null) {
    // This is correct format for parenthetical citations
  }
  
  // Check for ampersand vs. 'and' in narrative citations
  const narrativeCitationRegex = /([A-Z][a-z]+) and ([A-Z][a-z]+) \((\d{4})\)/g;
  while ((match = narrativeCitationRegex.exec(text)) !== null) {
    issues.push({
      title: "Incorrect use of 'and' in citation",
      description: "Use ampersand (&) in parenthetical citations, 'and' in narrative citations",
      text: match[0],
      severity: "Minor",
      location: { text: match[0] },
      hasFix: true,
      fixAction: "fixAmpersand"
    });
  }
  
  // Check for et al. usage with 3+ authors
  const etAlRegex = /\(([^)]+?)\s*et\s*al\.,\s*(\d{4}[^)]*)\)/g;
  while ((match = etAlRegex.exec(text)) !== null) {
    // This is generally correct, but we'd need to check the author count
    // in a real implementation
  }
  
  return issues;
}

// Analyze reference list
function analyzeReferenceList(text) {
  const issues = [];
  
  // Check if References header exists
  if (!text.match(/References/i)) {
    issues.push({
      title: "Missing References section",
      description: "Document should include a References section with proper heading",
      text: null,
      severity: "Critical",
      location: null,
      hasFix: true,
      fixAction: "addReferencesHeader"
    });
    
    // If no references section, return early
    return issues;
  }
  
  // Extract references section
  const referencesMatch = text.match(/References([\s\S]+)(?:$|^#)/i);
  if (!referencesMatch || !referencesMatch[1]) return issues;
  
  const referencesText = referencesMatch[1].trim();
  const referenceEntries = referencesText.split(/\n\s*\n/).filter(Boolean);
  
  // Check for alphabetical ordering
  const authorLastNames = referenceEntries.map(entry => {
    const match = entry.match(/^([^,]+)/);
    return match ? match[1].trim() : '';
  });
  
  const sortedLastNames = [...authorLastNames].sort((a, b) => 
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
  
  for (let i = 0; i < authorLastNames.length; i++) {
    if (authorLastNames[i] !== sortedLastNames[i]) {
      issues.push({
        title: "References not in alphabetical order",
        description: "Reference list must be in alphabetical order by first author's last name",
        text: referenceEntries[i],
        severity: "Major",
        location: { text: referenceEntries[i] },
        hasFix: true,
        fixAction: "reorderReferences"
      });
      break;
    }
  }
  
  // Check each reference entry format
  for (const entry of referenceEntries) {
    // Check for DOI if available
    if ((entry.includes('journal') || entry.includes('Journal')) && !entry.includes('doi.org') && !entry.includes('DOI:')) {
      issues.push({
        title: "Missing DOI in journal reference",
        description: "Journal references should include DOI when available",
        text: entry,
        severity: "Minor",
        location: { text: entry },
        hasFix: false
      });
    }
    
    // Check for incorrect italicization in journal titles
    if (entry.includes('journal') || entry.includes('Journal')) {
      // In a real implementation, we would check for proper italics
      // but this would require HTML analysis
    }
    
    // Check for hanging indentation (would need HTML analysis in real implementation)
  }
  
  return issues;
}

// Analyze document structure
function analyzeDocumentStructure(text, html) {
  const issues = [];
  
  // Check for title page elements
  if (!text.match(/^[\s\S]{0,500}Title:/im)) {
    issues.push({
      title: "Missing title page",
      description: "APA papers should include a title page with paper title, author name, institution, course, instructor, and date",
      text: null,
      severity: "Critical",
      location: { position: 0 },
      hasFix: true,
      fixAction: "addTitlePage"
    });
  }
  
  // Check for abstract
  if (!text.match(/Abstract[\s\n]/i)) {
    issues.push({
      title: "Missing abstract",
      description: "APA papers should include an abstract after the title page",
      text: null,
      severity: "Major",
      location: null,
      hasFix: true,
      fixAction: "addAbstract"
    });
  }
  
  // Check for heading levels
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings = [];
  let match;
  
  while ((match = headingRegex.exec(text)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2]
    });
  }
  
  // Check for proper heading hierarchy
  for (let i = 1; i < headings.length; i++) {
    if (headings[i].level > headings[i-1].level + 1) {
      issues.push({
        title: "Improper heading hierarchy",
        description: "Headings should not skip levels (e.g., from H1 to H3)",
        text: `${headings[i-1].text} → ${headings[i].text}`,
        severity: "Major",
        location: { text: headings[i].text },
        hasFix: true,
        fixAction: "fixHeadingLevel"
      });
    }
  }
  
  return issues;
}

// Analyze formatting
function analyzeFormatting(html) {
  const issues = [];
  
  // Ensure html is a string
  if (!html || typeof html !== 'string') {
    return issues;
  }
  
  // Check font family
  const fontCheck = html.match(/font-family:\s*['"]([^'"]+)['"]/i);
  if (fontCheck && !fontCheck[1].toLowerCase().includes('times new roman')) {
    issues.push({
      title: "Incorrect font",
      description: "APA 7th edition requires 12-point Times New Roman font",
      text: `Font found: ${fontCheck[1]}`,
      severity: "Minor",
      location: { position: html.indexOf(fontCheck[0]) },
      hasFix: true,
      fixAction: "fixFont"
    });
  } else if (!fontCheck) {
    issues.push({
      title: "Font not specified",
      description: "APA 7th edition requires 12-point Times New Roman font",
      text: null,
      severity: "Minor",
      location: null,
      hasFix: true,
      fixAction: "fixFont"
    });
  }
  
  // Check font size
  const fontSizeCheck = html.match(/font-size:\s*(\d+(?:\.\d+)?)(pt|px|em|rem)/i);
  if (fontSizeCheck) {
    const size = parseFloat(fontSizeCheck[1]);
    const unit = fontSizeCheck[2].toLowerCase();
    
    // Convert to pt for comparison
    let ptSize;
    switch (unit) {
      case 'px': ptSize = size * 0.75; break; // Approximate px to pt conversion
      case 'em': ptSize = size * 12; break;   // Assuming 1em = 12pt
      case 'rem': ptSize = size * 12; break;  // Assuming 1rem = 12pt
      case 'pt': ptSize = size; break;
      default: ptSize = 0;
    }
    
    if (Math.abs(ptSize - 12) > 0.5) { // Allow some tolerance
      issues.push({
        title: "Incorrect font size",
        description: "APA 7th edition requires 12-point Times New Roman font",
        text: `Font size found: ${fontSizeCheck[0]}`,
        severity: "Minor",
        location: { position: html.indexOf(fontSizeCheck[0]) },
        hasFix: true,
        fixAction: "fixFontSize"
      });
    }
  }
  
  // Check line spacing
  const lineSpacingCheck = html.match(/line-height:\s*([^\s;]+)/i);
  if (lineSpacingCheck) {
    const lineHeight = lineSpacingCheck[1];
    // Check if line spacing is approximately double
    // Double spacing typically ranges from 1.9 to 2.1, or 200%
    if (lineHeight !== '2' && lineHeight !== '2.0' && 
        lineHeight !== 'double' && lineHeight !== '200%') {
      issues.push({
        title: "Incorrect line spacing",
        description: "APA 7th edition requires double-spaced text",
        text: `Line spacing found: ${lineSpacingCheck[0]}`,
        severity: "Minor",
        location: { position: html.indexOf(lineSpacingCheck[0]) },
        hasFix: true,
        fixAction: "fixLineSpacing"
      });
    }
  } else {
    issues.push({
      title: "Line spacing not specified",
      description: "APA 7th edition requires double-spaced text",
      text: null,
      severity: "Minor",
      location: null,
      hasFix: true,
      fixAction: "fixLineSpacing"
    });
  }
  
  // Check margins
  const marginCheck = html.match(/margin:\s*([^;]+)/i);
  if (marginCheck) {
    // Check if any margin is less than 1 inch (approximately 72px or 6em)
    const margins = marginCheck[1].split(/\s+/);
    const hasSmallMargin = margins.some(margin => {
      const value = parseFloat(margin);
      const unit = margin.match(/[a-z%]+$/i)?.[0] || '';
      
      if (unit === 'in' && value < 1) return true;
      if (unit === 'cm' && value < 2.54) return true;
      if (unit === 'mm' && value < 25.4) return true;
      if (unit === 'pt' && value < 72) return true;
      if (unit === 'px' && value < 96) return true;
      if ((unit === 'em' || unit === 'rem') && value < 6) return true;
      
      return false;
    });
    
    if (hasSmallMargin) {
      issues.push({
        title: "Insufficient margins",
        description: "APA 7th edition requires 1-inch margins on all sides",
        text: `Margins found: ${marginCheck[0]}`,
        severity: "Minor",
        location: { position: html.indexOf(marginCheck[0]) },
        hasFix: true,
        fixAction: "fixMargins"
      });
    }
  }
  
  // Check paragraph indentation
  const textIndentCheck = html.match(/text-indent:\s*([^;]+)/i);
  if (textIndentCheck) {
    const indent = textIndentCheck[1];
    const value = parseFloat(indent);
    const unit = indent.match(/[a-z%]+$/i)?.[0] || '';
    
    let isCorrect = false;
    
    // Check if indent is approximately 0.5 inch
    if (unit === 'in' && Math.abs(value - 0.5) < 0.1) isCorrect = true;
    if (unit === 'cm' && Math.abs(value - 1.27) < 0.2) isCorrect = true;
    if (unit === 'mm' && Math.abs(value - 12.7) < 2) isCorrect = true;
    if (unit === 'pt' && Math.abs(value - 36) < 5) isCorrect = true;
    if (unit === 'px' && Math.abs(value - 48) < 5) isCorrect = true;
    if ((unit === 'em' || unit === 'rem') && Math.abs(value - 3) < 0.5) isCorrect = true;
    
    if (!isCorrect) {
      issues.push({
        title: "Incorrect paragraph indentation",
        description: "APA 7th edition requires 0.5-inch indentation for the first line of each paragraph",
        text: `Text indent found: ${textIndentCheck[0]}`,
        severity: "Minor",
        location: { position: html.indexOf(textIndentCheck[0]) },
        hasFix: true,
        fixAction: "fixIndentation"
      });
    }
  } else {
    // Check if paragraphs exist without indentation
    if (html.includes('<p') && !html.includes('text-indent')) {
      issues.push({
        title: "Missing paragraph indentation",
        description: "APA 7th edition requires 0.5-inch indentation for the first line of each paragraph",
        text: null,
        severity: "Minor",
        location: null,
        hasFix: true,
        fixAction: "fixIndentation"
      });
    }
  }
  
  // Check for page numbers
  if (!html.includes('page-number') && !html.includes('page number')) {
    issues.push({
      title: "Missing page numbers",
      description: "APA 7th edition requires page numbers in the top-right corner of each page",
      text: null,
      severity: "Minor",
      location: null,
      hasFix: true,
      fixAction: "addPageNumbers"
    });
  }
  
  return issues;
}
