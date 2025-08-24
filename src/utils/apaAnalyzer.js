'use client';

// APA 7th Edition Guidelines Analyzer
// This module analyzes documents for compliance with APA 7th Edition guidelines

// Source type patterns for reference validation
const SOURCE_TYPES = {
  journal: {
    pattern: /\b(?:journal|j\.|quarterly|review|proceedings|bulletin)\b/i,
    required: ['author', 'year', 'title', 'journal', 'volume'],
    optional: ['issue', 'pages', 'doi'],
    titleShouldBeItalic: false,
    journalShouldBeItalic: true
  },
  book: {
    pattern: /\b(?:publisher|press|books|publication)\b/i,
    required: ['author', 'year', 'title', 'publisher'],
    optional: ['edition', 'location'],
    titleShouldBeItalic: true,
    journalShouldBeItalic: false
  },
  website: {
    pattern: /\b(?:http|www\.|\.com|\.org|\.edu|retrieved)\b/i,
    required: ['author', 'year', 'title', 'url'],
    optional: ['retrieved', 'organization'],
    titleShouldBeItalic: false,
    journalShouldBeItalic: false
  },
  chapter: {
    pattern: /\b(?:in\s+[A-Z]|\(eds?\.\)|\(ed\.\))\b/i,
    required: ['author', 'year', 'title', 'editor', 'book', 'pages', 'publisher'],
    optional: ['location'],
    titleShouldBeItalic: false,
    journalShouldBeItalic: true
  }
};

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
  issues.push(...analyzeQuotations(text));
  issues.push(...analyzeNumbers(text));
  
  return issues;
}

// Analyze in-text citations
function analyzeCitations(text) {
  const issues = [];
  
  // Enhanced citation patterns
  const patterns = {
    // Basic citation patterns
    parenthetical: /\(([^)]+),\s*(\d{4})[^)]*\)/g,
    narrative: /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+\((\d{4})[^)]*\)/g,
    
    // Author count patterns
    singleAuthor: /\(([A-Z][a-zA-Z]+),\s*(\d{4})\)/g,
    twoAuthors: /\(([A-Z][a-zA-Z]+)\s*&\s*([A-Z][a-zA-Z]+),\s*(\d{4})\)/g,
    multipleAuthors: /\(([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s*et\s*al\.,\s*(\d{4})\)/g,
    
    // Quote patterns
    directQuote: /[""][^""]+?[""]\s*\([^)]+,\s*\d{4}(?:,\s*p\.?\s*\d+)?\)/g,
    longQuote: /\n\s*[^""][^\n]{40,}[^""]\n\s*\([^)]+,\s*\d{4}(?:,\s*pp?\.?\s*\d+(?:-\d+)?)?\)/g,
    
    // Multiple citations
    multipleCitations: /\(([^)]+;\s*[^)]+)\)/g,
    
    // Secondary sources
    secondarySource: /\(([^)]+)\s+as\s+cited\s+in\s+([^)]+),\s*(\d{4})\)/g
  };

  // 1. Check parenthetical vs narrative citation format
  let match;
  while ((match = patterns.parenthetical.exec(text)) !== null) {
    const fullCitation = match[0];
    const authorPart = match[1];
    const year = match[2];
    
    // Check for proper author format in parenthetical citations
    if (authorPart.includes(' and ')) {
      issues.push({
        title: "Incorrect connector in parenthetical citation",
        description: "Use '&' instead of 'and' in parenthetical citations",
        text: fullCitation,
        severity: "Minor",
        location: { text: fullCitation },
        hasFix: true,
        fixAction: "fixParentheticalConnector",
        explanation: "In parenthetical citations, use ampersand (&) to connect author names. Use 'and' only in narrative citations."
      });
    }
    
    // Check for missing comma between author and year
    if (!fullCitation.includes(', ' + year)) {
      issues.push({
        title: "Missing comma in citation",
        description: "Citations must have a comma between author and year",
        text: fullCitation,
        severity: "Minor",
        location: { text: fullCitation },
        hasFix: true,
        fixAction: "addCitationComma",
        explanation: "APA format requires a comma between the author name(s) and publication year."
      });
    }
  }

  // 2. Check narrative citations
  while ((match = patterns.narrative.exec(text)) !== null) {
    const fullCitation = match[0];
    const authorPart = match[1];
    const year = match[2];
    
    // Check for incorrect use of ampersand in narrative citations
    if (authorPart.includes('&')) {
      issues.push({
        title: "Incorrect connector in narrative citation",
        description: "Use 'and' instead of '&' in narrative citations",
        text: fullCitation,
        severity: "Minor",
        location: { text: fullCitation },
        hasFix: true,
        fixAction: "fixNarrativeConnector",
        explanation: "In narrative citations where authors are part of the sentence, use 'and' to connect names, not '&'."
      });
    }
  }

  // 3. Check author count rules
  // Two authors - should always include both
  while ((match = patterns.twoAuthors.exec(text)) !== null) {
    // This is correct format - both authors with &
  }

  // Multiple authors - check et al. usage
  const allCitations = text.match(/\([^)]+,\s*\d{4}[^)]*\)/g) || [];
  allCitations.forEach(citation => {
    const authorPart = citation.match(/\(([^,]+)/)?.[1] || '';
    const authorCount = (authorPart.match(/&/g) || []).length + 1;
    
    // Check if et al. is used correctly
    if (authorCount >= 3 && !citation.includes('et al.')) {
      // For 3+ authors, et al. should be used from first citation
      issues.push({
        title: "Missing 'et al.' for multiple authors",
        description: "Use 'et al.' for sources with 3 or more authors",
        text: citation,
        severity: "Minor",
        location: { text: citation },
        hasFix: true,
        fixAction: "addEtAl",
        explanation: "For sources with 3 or more authors, use the first author's name followed by 'et al.' in all citations."
      });
    }
  });

  // 4. Check direct quotes for page numbers
  while ((match = patterns.directQuote.exec(text)) !== null) {
    const quote = match[0];
    if (!quote.match(/,\s*p\.?\s*\d+/i)) {
      issues.push({
        title: "Missing page number in direct quote",
        description: "Direct quotes must include page numbers",
        text: quote,
        severity: "Major",
        location: { text: quote },
        hasFix: true,
        fixAction: "addPageNumber",
        explanation: "All direct quotes require a page number (or paragraph number for web sources) to help readers locate the original text."
      });
    }
  }

  // 5. Check long quotes (40+ words)
  while ((match = patterns.longQuote.exec(text)) !== null) {
    const quote = match[0];
    // Long quotes should be in block format without quotation marks
    if (quote.includes('""') || quote.includes('"')) {
      issues.push({
        title: "Long quote format error",
        description: "Quotes of 40+ words should be in block format without quotation marks",
        text: quote,
        severity: "Major",
        location: { text: quote },
        hasFix: true,
        fixAction: "formatLongQuote",
        explanation: "Long quotations (40+ words) should be formatted as indented blocks without quotation marks."
      });
    }
  }

  // 6. Check multiple citations format
  while ((match = patterns.multipleCitations.exec(text)) !== null) {
    const citations = match[1];
    const parts = citations.split(';');
    
    // Check alphabetical order
    const authors = parts.map(part => part.trim().split(',')[0].trim());
    const sortedAuthors = [...authors].sort();
    
    if (JSON.stringify(authors) !== JSON.stringify(sortedAuthors)) {
      issues.push({
        title: "Multiple citations not in alphabetical order",
        description: "Multiple citations should be listed alphabetically by first author",
        text: match[0],
        severity: "Minor",
        location: { text: match[0] },
        hasFix: true,
        fixAction: "sortMultipleCitations",
        explanation: "When citing multiple sources in one parenthesis, arrange them alphabetically by first author's surname."
      });
    }
    
    // Check semicolon usage
    if (!citations.includes(';')) {
      issues.push({
        title: "Missing semicolon in multiple citations",
        description: "Use semicolons to separate multiple citations",
        text: match[0],
        severity: "Minor",
        location: { text: match[0] },
        hasFix: true,
        fixAction: "addSemicolons",
        explanation: "Multiple citations within one parenthesis should be separated by semicolons."
      });
    }
  }

  // 7. Check secondary sources
  while ((match = patterns.secondarySource.exec(text)) !== null) {
    const originalAuthor = match[1];
    const citingAuthor = match[2];
    const year = match[3];
    
    // This is correct format, but check if it's overused
    const secondaryCount = (text.match(/as cited in/g) || []).length;
    if (secondaryCount > 3) {
      issues.push({
        title: "Excessive use of secondary sources",
        description: "Try to locate and cite primary sources when possible",
        text: match[0],
        severity: "Minor",
        location: { text: match[0] },
        hasFix: false,
        explanation: "While secondary citations are acceptable, APA encourages citing primary sources whenever possible."
      });
    }
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
      fixAction: "addReferencesHeader",
      explanation: "All APA papers must include a References section listing all sources cited in the text."
    });
    
    // If no references section, return early
    return issues;
  }
  
  // Extract references section
  const referencesMatch = text.match(/References([\s\S]+?)(?:\n\n[A-Z]|$)/i);
  if (!referencesMatch || !referencesMatch[1]) return issues;
  
  const referencesText = referencesMatch[1].trim();
  const referenceEntries = referencesText.split(/\n\s*\n/).filter(entry => entry.trim().length > 0);
  
  if (referenceEntries.length === 0) {
    issues.push({
      title: "Empty References section",
      description: "References section exists but contains no entries",
      text: null,
      severity: "Critical",
      location: null,
      hasFix: false,
      explanation: "The References section must contain entries for all sources cited in your paper."
    });
    return issues;
  }

  // Check for alphabetical ordering
  const authorLastNames = referenceEntries.map(entry => {
    const match = entry.match(/^([^,(\d]+)/);
    return match ? match[1].trim().toLowerCase() : '';
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
        fixAction: "reorderReferences",
        explanation: "References must be arranged alphabetically by the surname of the first author."
      });
      break;
    }
  }
  
  // Analyze each reference entry
  referenceEntries.forEach((entry, index) => {
    const trimmedEntry = entry.trim();
    
    // 1. Detect source type and validate format
    const sourceType = detectSourceType(trimmedEntry);
    const validationIssues = validateReferenceFormat(trimmedEntry, sourceType);
    issues.push(...validationIssues);
    
    // 2. Check author name format
    const authorIssues = validateAuthorFormat(trimmedEntry);
    issues.push(...authorIssues);
    
    // 3. Check title capitalization
    const titleIssues = validateTitleCapitalization(trimmedEntry, sourceType);
    issues.push(...titleIssues);
    
    // 4. Check date format
    const dateIssues = validateDateFormat(trimmedEntry);
    issues.push(...dateIssues);
    
    // 5. Check DOI/URL format
    const linkIssues = validateLinks(trimmedEntry, sourceType);
    issues.push(...linkIssues);
    
    // 6. Check for period placement
    const punctuationIssues = validatePunctuation(trimmedEntry);
    issues.push(...punctuationIssues);
  });
  
  return issues;
}

// Helper function to detect source type
function detectSourceType(entry) {
  for (const [type, config] of Object.entries(SOURCE_TYPES)) {
    if (config.pattern.test(entry)) {
      return type;
    }
  }
  return 'unknown';
}

// Validate reference format based on source type
function validateReferenceFormat(entry, sourceType) {
  const issues = [];
  const config = SOURCE_TYPES[sourceType];
  
  if (!config) return issues;
  
  // Check for required elements
  config.required.forEach(element => {
    switch (element) {
      case 'author':
        if (!entry.match(/^[A-Z][a-zA-Z]+,\s*[A-Z]/)) {
          issues.push({
            title: "Missing or incorrect author format",
            description: "Author name should be formatted as 'Last, F. M.'",
            text: entry,
            severity: "Major",
            location: { text: entry },
            hasFix: true,
            fixAction: "fixAuthorFormat",
            explanation: "Author names should be formatted with surname first, followed by initials."
          });
        }
        break;
      case 'year':
        if (!entry.match(/\(\d{4}\)/)) {
          issues.push({
            title: "Missing or incorrect year format",
            description: "Publication year should be in parentheses",
            text: entry,
            severity: "Major",
            location: { text: entry },
            hasFix: true,
            fixAction: "fixYearFormat",
            explanation: "Publication year must be enclosed in parentheses and placed after the author(s)."
          });
        }
        break;
      case 'doi':
        if (sourceType === 'journal' && !entry.match(/doi:|DOI:|doi\.org/i)) {
          issues.push({
            title: "Missing DOI in journal reference",
            description: "Journal articles should include DOI when available",
            text: entry,
            severity: "Minor",
            location: { text: entry },
            hasFix: false,
            explanation: "Include the DOI for journal articles when available to help readers locate the source."
          });
        }
        break;
      case 'volume':
        if (sourceType === 'journal' && !entry.match(/,\s*\d+[\(,]/)) {
          issues.push({
            title: "Missing volume number",
            description: "Journal references must include volume number",
            text: entry,
            severity: "Major",
            location: { text: entry },
            hasFix: false,
            explanation: "Journal references require the volume number, typically italicized."
          });
        }
        break;
    }
  });
  
  return issues;
}

// Validate author name format
function validateAuthorFormat(entry) {
  const issues = [];
  const authorMatch = entry.match(/^([^(]+)\s*\(/);
  
  if (authorMatch) {
    const authorPart = authorMatch[1].trim();
    
    // Check for proper initials format
    if (authorPart.includes(',')) {
      const afterComma = authorPart.split(',')[1]?.trim();
      if (afterComma && !afterComma.match(/^[A-Z]\.(\s*[A-Z]\.)*$/)) {
        issues.push({
          title: "Incorrect author initial format",
          description: "Author initials should be formatted as 'F. M.' with periods and spaces",
          text: entry,
          severity: "Minor",
          location: { text: entry },
          hasFix: true,
          fixAction: "fixAuthorInitials",
          explanation: "Use initials with periods and spaces (e.g., 'Smith, J. A.') for author names."
        });
      }
    }
    
    // Check for multiple authors format
    if (authorPart.includes('&')) {
      const parts = authorPart.split('&');
      if (parts.length > 2) {
        issues.push({
          title: "Incorrect multiple author format",
          description: "Use commas to separate multiple authors, with '&' before the last author",
          text: entry,
          severity: "Minor",
          location: { text: entry },
          hasFix: true,
          fixAction: "fixMultipleAuthors",
          explanation: "Format multiple authors as: 'Author1, A., Author2, B., & Author3, C.'"
        });
      }
    }
  }
  
  return issues;
}

// Validate title capitalization
function validateTitleCapitalization(entry, sourceType) {
  const issues = [];
  const config = SOURCE_TYPES[sourceType];
  
  if (!config) return issues;
  
  // Extract title (usually after year, before journal/publisher)
  const titleMatch = entry.match(/\(\d{4}\)\.\s*([^.]+)\./);
  if (titleMatch) {
    const title = titleMatch[1];
    
    // Check sentence case for article/chapter titles
    if (!config.titleShouldBeItalic) {
      const words = title.split(' ');
      const capitalizedWords = words.filter(word => 
        word.length > 0 && word[0] === word[0].toUpperCase() && 
        !['And', 'Or', 'But', 'For', 'Nor', 'So', 'Yet', 'A', 'An', 'The', 'In', 'On', 'At', 'By', 'Of'].includes(word)
      );
      
      if (capitalizedWords.length > 2) {
        issues.push({
          title: "Incorrect title capitalization",
          description: "Article and chapter titles should use sentence case",
          text: entry,
          severity: "Minor",
          location: { text: entry },
          hasFix: true,
          fixAction: "fixTitleCase",
          explanation: "Use sentence case for article and chapter titles (capitalize only first word, proper nouns, and first word after colon)."
        });
      }
    }
  }
  
  return issues;
}

// Validate date format
function validateDateFormat(entry) {
  const issues = [];
  
  // Check for proper year format
  const yearMatch = entry.match(/\((\d{4})\)/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    const currentYear = new Date().getFullYear();
    
    if (year < 1800 || year > currentYear + 1) {
      issues.push({
        title: "Suspicious publication year",
        description: "Check if the publication year is correct",
        text: entry,
        severity: "Minor",
        location: { text: entry },
        hasFix: false,
        explanation: "Verify that the publication year is accurate and falls within a reasonable range."
      });
    }
  }
  
  return issues;
}

// Validate DOI and URL formats
function validateLinks(entry, sourceType) {
  const issues = [];
  
  // Check DOI format
  const doiMatch = entry.match(/doi[:\s]*([^\s]+)/i);
  if (doiMatch) {
    const doi = doiMatch[1];
    if (!doi.match(/^10\.\d+/)) {
      issues.push({
        title: "Invalid DOI format",
        description: "DOI should start with '10.' followed by numbers",
        text: entry,
        severity: "Minor",
        location: { text: entry },
        hasFix: true,
        fixAction: "fixDOIFormat",
        explanation: "DOIs should follow the format: https://doi.org/10.xxxx/xxxx"
      });
    }
  }
  
  // Check URL format
  const urlMatch = entry.match(/(https?:\/\/[^\s]+)/);
  if (urlMatch) {
    const url = urlMatch[1];
    if (url.endsWith('.') || url.endsWith(',')) {
      issues.push({
        title: "URL ends with punctuation",
        description: "Remove trailing punctuation from URLs",
        text: entry,
        severity: "Minor",
        location: { text: entry },
        hasFix: true,
        fixAction: "cleanURL",
        explanation: "URLs should not end with periods or other punctuation marks."
      });
    }
  }
  
  return issues;
}

// Validate punctuation
function validatePunctuation(entry) {
  const issues = [];
  
  // Check for proper ending punctuation
  if (!entry.trim().endsWith('.')) {
    issues.push({
      title: "Missing ending period",
      description: "Reference entries should end with a period",
      text: entry,
      severity: "Minor",
      location: { text: entry },
      hasFix: true,
      fixAction: "addEndingPeriod",
      explanation: "Each reference entry must end with a period."
    });
  }
  
  // Check for double periods
  if (entry.includes('..')) {
    issues.push({
      title: "Double periods in reference",
      description: "Remove extra periods from reference",
      text: entry,
      severity: "Minor",
      location: { text: entry },
      hasFix: true,
      fixAction: "removeDoublePeriods",
      explanation: "Avoid double periods in reference entries."
    });
  }
  
  return issues;
}

// Analyze document structure
function analyzeDocumentStructure(text, html) {
  const issues = [];
  
  // 1. Check for title page elements
  const titlePageElements = [
    { element: 'title', pattern: /^[\s\S]{0,1000}(?:title:|paper title:|running head:)/im, name: 'Title' },
    { element: 'author', pattern: /^[\s\S]{0,1000}(?:author:|by:|\n[A-Z][a-z]+ [A-Z][a-z]+)/im, name: 'Author' },
    { element: 'institution', pattern: /^[\s\S]{0,1000}(?:institution:|university|college)/im, name: 'Institution' },
    { element: 'course', pattern: /^[\s\S]{0,1000}(?:course:|class:)/im, name: 'Course' }
  ];
  
  const missingElements = titlePageElements.filter(elem => !elem.pattern.test(text));
  
  if (missingElements.length > 0) {
    issues.push({
      title: "Incomplete title page",
      description: `Missing title page elements: ${missingElements.map(e => e.name).join(', ')}`,
      text: null,
      severity: "Critical",
      location: { position: 0 },
      hasFix: true,
      fixAction: "addTitlePageElements",
      explanation: "Title page must include paper title, author name(s), institutional affiliation, course information, instructor name, and due date."
    });
  }
  
  // 2. Check for running head
  if (!text.match(/running head:/i)) {
    issues.push({
      title: "Missing running head",
      description: "Professional papers require a running head on every page",
      text: null,
      severity: "Major",
      location: null,
      hasFix: true,
      fixAction: "addRunningHead",
      explanation: "The running head is a shortened version of your paper title (max 50 characters) that appears at the top of every page."
    });
  }
  
  // 3. Check for abstract
  const abstractMatch = text.match(/Abstract[\s\n]/i);
  if (!abstractMatch) {
    // Check if it's a research paper that should have an abstract
    const isResearchPaper = text.match(/method|results|discussion|participants|procedure/i);
    if (isResearchPaper) {
      issues.push({
        title: "Missing abstract",
        description: "Research papers should include an abstract",
        text: null,
        severity: "Major",
        location: null,
        hasFix: true,
        fixAction: "addAbstract",
        explanation: "Research papers typically require an abstract summarizing the study's purpose, method, results, and conclusions."
      });
    }
  } else {
    // Check abstract content if it exists
    const abstractContent = text.match(/Abstract\s*([\s\S]*?)(?:\n\n|\nKeywords|\nIntroduction|\n[A-Z])/i);
    if (abstractContent && abstractContent[1]) {
      const wordCount = abstractContent[1].trim().split(/\s+/).length;
      if (wordCount < 50) {
        issues.push({
          title: "Abstract too short",
          description: "Abstract appears to be unusually short",
          text: abstractContent[0],
          severity: "Minor",
          location: { text: abstractContent[0] },
          hasFix: false,
          explanation: "Abstracts typically range from 150-250 words for most academic papers."
        });
      } else if (wordCount > 300) {
        issues.push({
          title: "Abstract too long",
          description: "Abstract may be too long (over 300 words)",
          text: abstractContent[0],
          severity: "Minor",
          location: { text: abstractContent[0] },
          hasFix: false,
          explanation: "Abstracts should typically be 150-250 words. Consider condensing key points."
        });
      }
    }
  }
  
  // 4. Check for keywords
  if (abstractMatch && !text.match(/keywords:/i)) {
    issues.push({
      title: "Missing keywords",
      description: "Papers with abstracts should include keywords",
      text: null,
      severity: "Minor",
      location: null,
      hasFix: true,
      fixAction: "addKeywords",
      explanation: "Include 3-5 keywords after the abstract to help with indexing and searchability."
    });
  }
  
  // 5. Check for heading levels and formatting
  const headingPatterns = {
    level1: /^([A-Z][^.\n]*?)(?:\n|$)/gm,  // Centered, Bold, Title Case
    level2: /^([A-Z][a-z][^.\n]*?)(?:\n|$)/gm,  // Flush Left, Bold, Title Case
    level3: /^\s*([A-Z][a-z][^.\n]*?)\.(?:\n|$)/gm,  // Flush Left, Bold, Italic, Title Case, ending with period
    markdown: /^(#{1,6})\s+(.+)$/gm  // Markdown style headings
  };
  
  const headings = [];
  let match;
  
  // Check markdown headings
  while ((match = headingPatterns.markdown.exec(text)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2],
      type: 'markdown'
    });
  }
  
  // Check for proper heading hierarchy
  for (let i = 1; i < headings.length; i++) {
    if (headings[i].level > headings[i-1].level + 1) {
      issues.push({
        title: "Improper heading hierarchy",
        description: "Headings should not skip levels",
        text: `${headings[i-1].text} → ${headings[i].text}`,
        severity: "Major",
        location: { text: headings[i].text },
        hasFix: true,
        fixAction: "fixHeadingLevel",
        explanation: "Use heading levels in order: Level 1, then Level 2, then Level 3, etc. Don't skip levels."
      });
    }
  }
  
  // 6. Check for research paper structure
  const researchSections = {
    method: /\b(method|methodology)\b/i,
    results: /\bresults?\b/i,
    discussion: /\bdiscussion\b/i,
    conclusion: /\bconclusion\b/i
  };
  
  const hasMethodSection = researchSections.method.test(text);
  const hasResultsSection = researchSections.results.test(text);
  const hasDiscussionSection = researchSections.discussion.test(text);
  
  // If it looks like a research paper, check for required sections
  if (hasMethodSection || hasResultsSection) {
    if (!hasMethodSection) {
      issues.push({
        title: "Missing Method section",
        description: "Research papers should include a Method section",
        text: null,
        severity: "Major",
        location: null,
        hasFix: true,
        fixAction: "addMethodSection",
        explanation: "Research papers need a Method section describing participants, materials, and procedures."
      });
    }
    
    if (!hasResultsSection) {
      issues.push({
        title: "Missing Results section",
        description: "Research papers should include a Results section",
        text: null,
        severity: "Major",
        location: null,
        hasFix: true,
        fixAction: "addResultsSection",
        explanation: "Research papers need a Results section presenting the findings of your study."
      });
    }
    
    if (!hasDiscussionSection) {
      issues.push({
        title: "Missing Discussion section",
        description: "Research papers should include a Discussion section",
        text: null,
        severity: "Major",
        location: null,
        hasFix: true,
        fixAction: "addDiscussionSection",
        explanation: "Research papers need a Discussion section interpreting results and their implications."
      });
    }
  }
  
  // 7. Check for tables and figures formatting
  const tableMatches = text.match(/table \d+/gi);
  const figureMatches = text.match(/figure \d+/gi);
  
  if (tableMatches) {
    tableMatches.forEach(table => {
      // Check if table has proper caption format
      const tablePattern = new RegExp(`${table}[\\s\\S]*?\\n`, 'i');
      const tableSection = text.match(tablePattern);
      if (tableSection && !tableSection[0].includes('Note.')) {
        // Tables should have notes when appropriate
      }
    });
  }
  
  return issues;
}

// Analyze quotations
function analyzeQuotations(text) {
  const issues = [];
  
  // 1. Check short quotations (less than 40 words)
  const shortQuotePattern = /[""]([^""]{1,200}?)[""]/g;
  let match;
  
  while ((match = shortQuotePattern.exec(text)) !== null) {
    const quote = match[1];
    const wordCount = quote.trim().split(/\s+/).length;
    
    if (wordCount >= 40) {
      issues.push({
        title: "Long quote in inline format",
        description: "Quotes of 40+ words should be formatted as block quotes",
        text: match[0],
        severity: "Major",
        location: { text: match[0] },
        hasFix: true,
        fixAction: "convertToBlockQuote",
        explanation: "Quotations of 40 or more words must be formatted as block quotations without quotation marks."
      });
    }
  }
  
  // 2. Check block quotations
  const blockQuotePattern = /\n\s{4,}([^\n]{40,})\n/g;
  while ((match = blockQuotePattern.exec(text)) !== null) {
    const quote = match[1];
    
    // Block quotes should not have quotation marks
    if (quote.includes('"') || quote.includes('"') || quote.includes('"')) {
      issues.push({
        title: "Block quote has quotation marks",
        description: "Block quotations should not include quotation marks",
        text: match[0],
        severity: "Minor",
        location: { text: match[0] },
        hasFix: true,
        fixAction: "removeQuotationMarks",
        explanation: "Block quotations are formatted without quotation marks and indented from the left margin."
      });
    }
  }
  
  // 3. Check for quotes without citations
  const quotesWithoutCitation = [];
  const allQuotes = text.match(/[""][^""]+?[""]/g) || [];
  
  allQuotes.forEach(quote => {
    // Look for citation within 50 characters after the quote
    const quoteIndex = text.indexOf(quote);
    const afterQuote = text.substr(quoteIndex + quote.length, 50);
    
    if (!afterQuote.match(/\([^)]+,\s*\d{4}/)) {
      quotesWithoutCitation.push(quote);
    }
  });
  
  quotesWithoutCitation.forEach(quote => {
    issues.push({
      title: "Quote without citation",
      description: "All quotations must be followed by a citation",
      text: quote,
      severity: "Critical",
      location: { text: quote },
      hasFix: true,
      fixAction: "addCitationToQuote",
      explanation: "Every direct quotation must include a citation with author, year, and page number."
    });
  });
  
  return issues;
}

// Analyze numbers and statistics
function analyzeNumbers(text) {
  const issues = [];
  
  // 1. Check number formatting (spell out numbers below 10)
  const numberPattern = /\b([1-9])\b(?!\d)/g;
  let match;
  
  while ((match = numberPattern.exec(text)) !== null) {
    const number = parseInt(match[1]);
    const fullMatch = match[0];
    
    // Skip if it's part of a citation year or page number
    const context = text.substr(Math.max(0, match.index - 10), 20);
    if (context.match(/\(\d{4}\)|p\.\s*\d|pp\.\s*\d/)) {
      continue;
    }
    
    if (number < 10) {
      const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
      issues.push({
        title: "Number should be spelled out",
        description: `Numbers below 10 should be spelled out as words`,
        text: fullMatch,
        severity: "Minor",
        location: { text: fullMatch },
        hasFix: true,
        fixAction: "spellOutNumber",
        explanation: "In APA style, spell out numbers below 10 unless they represent precise measurements or are part of a series with numbers 10 and above."
      });
    }
  }
  
  // 2. Check percentage formatting
  const percentPattern = /(\d+)\s*%/g;
  while ((match = percentPattern.exec(text)) !== null) {
    if (match[0].includes(' %')) {
      issues.push({
        title: "Space before percent symbol",
        description: "Remove space between number and percent symbol",
        text: match[0],
        severity: "Minor",
        location: { text: match[0] },
        hasFix: true,
        fixAction: "removePercentSpace",
        explanation: "Write percentages with no space between the number and % symbol (e.g., '25%' not '25 %')."
      });
    }
  }
  
  // 3. Check statistical reporting
  const statisticalTests = [
    { pattern: /\bt\s*=\s*([+-]?\d+\.?\d*)/gi, name: 't-test' },
    { pattern: /\bF\s*=\s*([+-]?\d+\.?\d*)/gi, name: 'F-test' },
    { pattern: /\br\s*=\s*([+-]?\d+\.?\d*)/gi, name: 'correlation' },
    { pattern: /\bp\s*=\s*([+-]?\d+\.?\d*)/gi, name: 'p-value' }
  ];
  
  statisticalTests.forEach(test => {
    while ((match = test.pattern.exec(text)) !== null) {
      const value = parseFloat(match[1]);
      
      if (test.name === 'p-value') {
        if (value === 0) {
          issues.push({
            title: "P-value reported as exactly zero",
            description: "Report very small p-values as 'p < .001' rather than 'p = 0'",
            text: match[0],
            severity: "Minor",
            location: { text: match[0] },
            hasFix: true,
            fixAction: "fixZeroPValue",
            explanation: "Very small p-values should be reported as '< .001' rather than '= 0' to maintain precision."
          });
        }
        
        if (value > 1) {
          issues.push({
            title: "Invalid p-value",
            description: "P-values cannot be greater than 1.0",
            text: match[0],
            severity: "Major",
            location: { text: match[0] },
            hasFix: false,
            explanation: "P-values represent probabilities and must be between 0 and 1. Check your statistical analysis."
          });
        }
      }
      
      if (test.name === 'correlation' && Math.abs(value) > 1) {
        issues.push({
          title: "Invalid correlation coefficient",
          description: "Correlation coefficients must be between -1 and 1",
          text: match[0],
          severity: "Major",
          location: { text: match[0] },
          hasFix: false,
          explanation: "Correlation coefficients (r) must be between -1.0 and +1.0. Check your calculation."
        });
      }
    }
  });
  
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
