// src/utils/referenceValidator.js - Comprehensive reference list validation
'use client';

export class ReferenceValidator {
  constructor() {
    // Enhanced DOI pattern with validation
    this.doiPattern = /(?:https?:\/\/)?(?:dx\.)?doi\.org\/([0-9.]+\/[^\s]+)|doi:\s*([0-9.]+\/[^\s]+)/i;
    this.urlPattern = /https?:\/\/[^\s)]+/g;
    // Valid DOI prefix pattern (10.xxxx)
    this.validDoiPrefix = /^10\.\d{4,}/;
  }

  /**
   * Main validation function for references section with deep formatting
   */
  validateReferences(text, structure, italicizedText = []) {
    const issues = [];
    
    if (!text) return issues;
    
    // Extract references section
    const referencesMatch = text.match(/(?:^|\n)(?:references|REFERENCES|References)\s*\n([\s\S]*?)(?=\n(?:appendix|APPENDIX|Appendix)|$)/i);
    
    if (!referencesMatch) {
      // Check if there are citations that need references
      const hasCitations = /\([^)]+,\s*\d{4}\)/.test(text);
      if (hasCitations) {
        issues.push({
          title: "Missing references section",
          description: "Document contains citations but no references section",
          severity: "Critical",
          category: "references",
          hasFix: false,
          explanation: "All cited sources must be listed in the References section at the end of the document."
        });
      }
      return issues;
    }
    
    const referencesText = referencesMatch[1].trim();
    
    // Check for empty references section
    if (referencesText.length < 50 || !referencesText.match(/[A-Z]/)) {
      issues.push({
        title: "Empty references section",
        description: "References section exists but contains no entries",
        severity: "Critical",
        category: "references",
        hasFix: false,
        explanation: "The References section must contain full citations for all sources cited in the text."
      });
      return issues;
    }
    
    // Parse individual references
    const referenceEntries = this.parseReferenceEntries(referencesText);
    
    // Run all validation checks including deep formatting with italicized text
    issues.push(...this.checkAlphabeticalOrder(referenceEntries));
    issues.push(...this.checkHangingIndent(referenceEntries, referencesText));
    issues.push(...this.checkReferenceFormatting(referenceEntries, italicizedText));
    issues.push(...this.crossCheckCitationsAndReferences(text, referenceEntries));
    issues.push(...this.checkDuplicateReferences(referenceEntries));
    issues.push(...this.checkDOIAndURLFormatting(referenceEntries));
    
    return issues;
  }

  /**
   * Parse reference entries from text
   */
  parseReferenceEntries(referencesText) {
    const entries = [];
    const lines = referencesText.split('\n');
    let currentEntry = '';
    let entryStartLine = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Check if this is a new reference entry (starts with capital letter, previous entry has year)
      const isNewEntry = trimmedLine.length > 0 && 
                         /^[A-Z]/.test(trimmedLine) && 
                         currentEntry.includes('(') && 
                         currentEntry.includes(')');
      
      if (trimmedLine.length === 0 || isNewEntry) {
        if (currentEntry.trim().length > 10) {
          entries.push({
            text: currentEntry.trim(),
            firstAuthor: this.extractFirstAuthor(currentEntry),
            year: this.extractYear(currentEntry),
            hasMultipleAuthors: this.hasMultipleAuthors(currentEntry),
            type: this.detectReferenceType(currentEntry),
            lineNumber: entryStartLine,
            indentation: this.checkIndentation(currentEntry, lines.slice(entryStartLine, i))
          });
        }
        
        if (isNewEntry) {
          currentEntry = trimmedLine;
          entryStartLine = i;
        } else {
          currentEntry = '';
        }
      } else if (trimmedLine.length > 0) {
        currentEntry += (currentEntry ? ' ' : '') + trimmedLine;
      }
    }
    
    // Add last entry
    if (currentEntry.trim().length > 10) {
      entries.push({
        text: currentEntry.trim(),
        firstAuthor: this.extractFirstAuthor(currentEntry),
        year: this.extractYear(currentEntry),
        hasMultipleAuthors: this.hasMultipleAuthors(currentEntry),
        type: this.detectReferenceType(currentEntry),
        lineNumber: entryStartLine,
        indentation: this.checkIndentation(currentEntry, lines.slice(entryStartLine))
      });
    }
    
    return entries;
  }

  /**
   * Extract first author's surname from reference
   */
  extractFirstAuthor(reference) {
    // Match pattern: Surname, F. M. or Surname, First Middle
    const match = reference.match(/^([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)?),/);
    return match ? match[1] : '';
  }

  /**
   * Extract year from reference
   */
  extractYear(reference) {
    // Match (YYYY) or (YYYY, Month) or (n.d.)
    const match = reference.match(/\((\d{4}[a-z]?|n\.d\.)[^)]*\)/);
    return match ? match[1] : '';
  }

  /**
   * Check if reference has multiple authors
   */
  hasMultipleAuthors(reference) {
    return reference.includes('&') || reference.includes(', &') || 
           reference.split(',').length > 3;
  }

  /**
   * Detect reference type (journal, book, website, etc.)
   */
  detectReferenceType(reference) {
    if (reference.match(/\d+\(\d+\),?\s*\d+-\d+/)) return 'journal';
    if (reference.includes('http') || reference.includes('doi')) return 'online';
    if (reference.match(/\([^)]*Ed(?:s)?\.\)/)) return 'book';
    if (reference.includes('In ')) return 'chapter';
    return 'other';
  }

  /**
   * Check indentation of reference entry
   */
  checkIndentation(entry, lines) {
    if (lines.length <= 1) return 'single-line';
    
    // Check if second line has more indentation than first
    const firstLineIndent = lines[0].match(/^(\s*)/)[1].length;
    const secondLineIndent = lines[1] ? lines[1].match(/^(\s*)/)[1].length : 0;
    
    return secondLineIndent > firstLineIndent ? 'hanging' : 'no-hanging';
  }

  /**
   * Check alphabetical order
   */
  checkAlphabeticalOrder(entries) {
    const issues = [];
    if (entries.length < 2) return issues;
    
    for (let i = 1; i < entries.length; i++) {
      const current = entries[i].firstAuthor.toLowerCase();
      const previous = entries[i-1].firstAuthor.toLowerCase();
      
      if (current && previous && current < previous) {
        // Check for same author, different years
        const currentBase = current.replace(/[a-z]$/, '');
        const previousBase = previous.replace(/[a-z]$/, '');
        
        if (currentBase !== previousBase) {
          issues.push({
            title: "References not in alphabetical order",
            description: `"${entries[i].firstAuthor}" should come before "${entries[i-1].firstAuthor}"`,
            text: `${entries[i].firstAuthor} (${entries[i].year})`,
            severity: "Major",
            category: "references",
            hasFix: true,
            fixAction: "sortReferences",
            explanation: "References must be listed in alphabetical order by the first author's surname."
          });
          break; // Only report first occurrence
        }
      }
      
      // Check same author, year order
      if (current === previous && entries[i].year && entries[i-1].year) {
        const currentYear = entries[i].year;
        const previousYear = entries[i-1].year;
        
        if (currentYear < previousYear && !currentYear.includes('n.d.')) {
          issues.push({
            title: "Same author references not in chronological order",
            description: `${entries[i].firstAuthor}'s works should be ordered by year`,
            text: `${previousYear} comes before ${currentYear}`,
            severity: "Minor",
            category: "references",
            hasFix: true,
            fixAction: "sortReferencesByYear",
            explanation: "When the same author has multiple works, order them chronologically (oldest first)."
          });
        }
      }
    }
    
    return issues;
  }

  /**
   * Check hanging indent
   */
  checkHangingIndent(entries, referencesText) {
    const issues = [];
    let noHangingCount = 0;
    
    entries.forEach((entry) => {
      if (entry.indentation === 'no-hanging' && entry.text.length > 80) {
        noHangingCount++;
      }
    });
    
    if (noHangingCount > entries.length * 0.3) { // If >30% lack hanging indent
      issues.push({
        title: "Missing hanging indent in references",
        description: "Reference entries should have 0.5\" hanging indent for lines after the first",
        text: `${noHangingCount} of ${entries.length} references lack proper indentation`,
        severity: "Minor",
        category: "references",
        hasFix: true,
        fixAction: "fixReferenceIndent",
        explanation: "Each reference entry should have a hanging indent of 0.5 inches for continuation lines."
      });
    }
    
    return issues;
  }

  /**
   * Enhanced deep reference formatting validation
   */
  checkReferenceFormatting(entries, italicizedText) {
    const issues = [];
    const reportedTypes = new Set();
    
    entries.forEach((entry, index) => {
      // Deep validation of author format
      const authorIssues = this.validateAuthorFormat(entry);
      if (authorIssues && !reportedTypes.has('author-format')) {
        issues.push(authorIssues);
        reportedTypes.add('author-format');
      }
      
      // Check for missing year
      if (!entry.year && !reportedTypes.has('year')) {
        issues.push({
          title: "Missing year in reference",
          description: "Reference entry missing publication year",
          text: entry.text.substring(0, 60) + '...',
          severity: "Major",
          category: "references",
          hasFix: false,
          explanation: "All references must include the publication year in parentheses after the author(s)."
        });
        reportedTypes.add('year');
      }
      
      // Deep validation based on reference type
      const typeSpecificIssues = this.validateReferenceByType(entry, italicizedText);
      typeSpecificIssues.forEach(issue => {
        if (!reportedTypes.has(issue.type)) {
          issues.push(issue);
          reportedTypes.add(issue.type);
        }
      });
      
      // Check for missing DOI/URL in journal articles
      if (entry.type === 'journal' && 
          !entry.text.match(/(?:https?:\/\/|doi:|DOI:)/) && 
          !reportedTypes.has('doi')) {
        issues.push({
          title: "Missing DOI or URL in journal article",
          description: "Journal articles should include DOI or stable URL",
          text: entry.text.substring(0, 60) + '...',
          severity: "Minor",
          category: "references",
          hasFix: false,
          explanation: "Include DOI (preferred) or stable URL for all journal articles when available."
        });
        reportedTypes.add('doi');
      }
      
      // Check for "and" instead of "&"
      if (entry.hasMultipleAuthors && entry.text.includes(', and ')) {
        issues.push({
          title: "Incorrect connector in reference",
          description: "Use '&' instead of 'and' between authors",
          text: entry.text.substring(0, 60) + '...',
          severity: "Minor",
          category: "references",
          hasFix: true,
          fixAction: "fixReferenceConnector",
          explanation: "In reference lists, use & (ampersand) to connect the last two author names."
        });
      }
      
      // Check for consistent punctuation
      if (!entry.text.endsWith('.') && !entry.text.match(/\)\.?$/) && !reportedTypes.has('period')) {
        issues.push({
          title: "Missing period at end of reference",
          description: "References should end with a period",
          text: entry.text.substring(entry.text.length - 30),
          severity: "Minor",
          category: "references",
          hasFix: true,
          fixAction: "addReferencePeriod",
          explanation: "Each reference entry must end with a period."
        });
        reportedTypes.add('period');
      }
    });
    
    return issues;
  }

  /**
   * Cross-check citations with references
   */
  crossCheckCitationsAndReferences(text, referenceEntries) {
    const issues = [];
    
    // Extract all in-text citations
    const citationPattern = /\(([A-Za-z][A-Za-z\s&.,'-]+?)(?:,?\s+et\s+al\.)?(?:,\s+)?(\d{4}[a-z]?|n\.d\.)\)/g;
    const citations = new Map();
    let match;
    
    while ((match = citationPattern.exec(text)) !== null) {
      const author = match[1].trim().replace(/,$/, '').split(/\s+&\s+|\s+and\s+/)[0];
      const year = match[2];
      const key = `${author.toLowerCase()}_${year}`;
      
      if (!citations.has(key)) {
        citations.set(key, { author, year, full: match[0], count: 1 });
      } else {
        citations.get(key).count++;
      }
    }
    
    // Create reference map
    const references = new Map();
    referenceEntries.forEach(ref => {
      if (ref.firstAuthor && ref.year) {
        const key = `${ref.firstAuthor.toLowerCase()}_${ref.year}`;
        references.set(key, ref);
      }
    });
    
    // Find citations without references
    const missingRefs = [];
    citations.forEach((citation, key) => {
      // Try exact match first
      if (!references.has(key)) {
        // Try fuzzy match (first 3 letters)
        const authorStart = citation.author.toLowerCase().substring(0, 3);
        const found = Array.from(references.keys()).some(refKey => 
          refKey.startsWith(authorStart) && refKey.includes(citation.year)
        );
        
        if (!found) {
          missingRefs.push(citation);
        }
      }
    });
    
    // Report missing references (max 3)
    missingRefs.slice(0, 3).forEach(citation => {
      issues.push({
        title: "Citation without reference",
        description: `Citation "${citation.full}" not found in references`,
        text: citation.full,
        severity: "Critical",
        category: "references",
        hasFix: false,
        explanation: "Every in-text citation must have a corresponding entry in the References section."
      });
    });
    
    // Find orphaned references
    const orphanedRefs = [];
    references.forEach((ref, key) => {
      const authorPart = key.split('_')[0];
      const yearPart = key.split('_')[1];
      
      // Check if this reference is cited
      const found = Array.from(citations.keys()).some(citKey => {
        const citAuthor = citKey.split('_')[0];
        const citYear = citKey.split('_')[1];
        return citAuthor.startsWith(authorPart.substring(0, 3)) && citYear === yearPart;
      });
      
      if (!found) {
        orphanedRefs.push(ref);
      }
    });
    
    // Report orphaned references (max 3)
    orphanedRefs.slice(0, 3).forEach(ref => {
      issues.push({
        title: "Orphaned reference",
        description: `Reference for ${ref.firstAuthor} (${ref.year}) not cited in text`,
        text: ref.text.substring(0, 60) + '...',
        severity: "Major",
        category: "references",
        hasFix: false,
        explanation: "Only include references that are cited in the document text."
      });
    });
    
    return issues;
  }

  /**
   * Check for duplicate references
   */
  checkDuplicateReferences(entries) {
    const issues = [];
    const seen = new Map();
    
    entries.forEach(entry => {
      const key = `${entry.firstAuthor}_${entry.year}`.toLowerCase();
      
      if (key && entry.firstAuthor && entry.year) {
        if (seen.has(key)) {
          const existing = seen.get(key);
          
          // Check if texts are actually different (not just formatting)
          const normalizedCurrent = entry.text.replace(/\s+/g, ' ').toLowerCase();
          const normalizedExisting = existing.text.replace(/\s+/g, ' ').toLowerCase();
          
          if (normalizedCurrent !== normalizedExisting) {
            issues.push({
              title: "Possible duplicate reference",
              description: `Multiple references for ${entry.firstAuthor} (${entry.year})`,
              text: entry.text.substring(0, 60) + '...',
              severity: "Major",
              category: "references",
              hasFix: false,
              explanation: "Each source should appear only once. Use 'a', 'b' suffixes for multiple works by same author in same year."
            });
          }
        } else {
          seen.set(key, entry);
        }
      }
    });
    
    return issues;
  }

  /**
   * Validate author format in references
   */
  validateAuthorFormat(entry) {
    const text = entry.text;
    
    // Check for proper author format: Lastname, F. M.
    const authorPattern = /^([A-Z][a-zA-Z'-]+),\s+([A-Z]\.(?:\s*[A-Z]\.)*)/;
    
    if (!authorPattern.test(text)) {
      // Check for common formatting errors
      
      // Missing initials
      if (/^[A-Z][a-zA-Z'-]+,\s+[A-Z][a-z]+/.test(text)) {
        return {
          title: "Full first names instead of initials",
          description: "Use initials instead of full first names in references",
          text: text.substring(0, 50) + '...',
          severity: "Major",
          category: "references",
          hasFix: false,
          type: 'author-format',
          explanation: "Author names should use initials: Smith, J. D., not Smith, John David."
        };
      }
      
      // Missing comma after surname
      if (/^[A-Z][a-zA-Z'-]+\s+[A-Z]\./.test(text)) {
        return {
          title: "Missing comma after author surname",
          description: "Author surname should be followed by a comma",
          text: text.substring(0, 50) + '...',
          severity: "Minor",
          category: "references",
          hasFix: true,
          fixAction: "fixAuthorComma",
          type: 'author-format',
          explanation: "Format: Lastname, F. M., not Lastname F. M."
        };
      }
      
      // Missing periods after initials
      if (/^[A-Z][a-zA-Z'-]+,\s+[A-Z]\s+[A-Z]/.test(text)) {
        return {
          title: "Missing periods after author initials",
          description: "Each initial should be followed by a period",
          text: text.substring(0, 50) + '...',
          severity: "Minor",
          category: "references",
          hasFix: true,
          fixAction: "fixAuthorInitials",
          type: 'author-format',
          explanation: "Format: Smith, J. D., not Smith, J D"
        };
      }
    }
    
    // Check for up to 20 authors rule (APA 7th)
    const authorCount = (text.match(/[A-Z][a-zA-Z'-]+,\s+[A-Z]\./g) || []).length;
    if (authorCount > 20) {
      return {
        title: "Too many authors listed",
        description: "List first 19 authors, then ... and the last author",
        text: text.substring(0, 50) + '...',
        severity: "Minor",
        category: "references",
        hasFix: false,
        type: 'author-format',
        explanation: "For 21+ authors: list first 19, then ellipsis (...), then final author."
      };
    }
    
    return null;
  }
  
  /**
   * Validate reference by type with deep formatting checks
   */
  validateReferenceByType(entry, italicizedText = []) {
    const issues = [];
    const text = entry.text;
    
    if (entry.type === 'journal') {
      // Journal article specific validation
      
      // Check for journal name italicization
      const journalMatch = text.match(/\)\.\s+([^,]+),\s*\d+/);
      if (journalMatch) {
        const journalName = journalMatch[1];
        const isItalicized = italicizedText?.some(item => 
          item.text.includes(journalName) || journalName.includes(item.text)
        );
        
        if (!isItalicized && journalName.length > 3) {
          issues.push({
            title: "Journal name not italicized",
            description: "Journal names must be italicized in references",
            text: journalName,
            severity: "Major",
            category: "references",
            hasFix: false,
            type: 'journal-italics',
            explanation: "Journal titles should be in italics: Journal of Psychology, not Journal of Psychology"
          });
        }
      }
      
      // Check for volume number italicization
      const volumeMatch = text.match(/,\s*(\d+)(?:\(|,)/);
      if (volumeMatch) {
        const volume = volumeMatch[1];
        const volumeContext = text.substring(
          text.indexOf(volume) - 10, 
          text.indexOf(volume) + volume.length + 10
        );
        
        const volumeItalicized = italicizedText?.some(item => 
          item.text.includes(volume) && item.context?.includes(journalMatch?.[1])
        );
        
        if (!volumeItalicized) {
          issues.push({
            title: "Volume number not italicized",
            description: "Journal volume numbers should be italicized",
            text: volumeContext,
            severity: "Minor",
            category: "references",
            hasFix: false,
            type: 'volume-italics',
            explanation: "Volume numbers should be italicized: Psychology Today, 45(3), not Psychology Today, 45(3)"
          });
        }
      }
      
      // Check for issue number format
      const issueMatch = text.match(/\d+\((\d+)\)/);
      if (issueMatch) {
        const issueContext = text.substring(
          text.indexOf(issueMatch[0]) - 5,
          text.indexOf(issueMatch[0]) + issueMatch[0].length + 5
        );
        
        // Issue number should NOT be italicized
        const issueItalicized = italicizedText?.some(item => 
          item.text.includes(`(${issueMatch[1]})`)
        );
        
        if (issueItalicized) {
          issues.push({
            title: "Issue number incorrectly italicized",
            description: "Issue numbers in parentheses should not be italicized",
            text: issueContext,
            severity: "Minor",
            category: "references",
            hasFix: false,
            type: 'issue-italics',
            explanation: "Only volume is italicized, not issue: 45(3), where 45 is italic but (3) is not"
          });
        }
      }
      
      // Check page range format
      const pageMatch = text.match(/,\s*(\d+)[–-](\d+)/);
      if (pageMatch) {
        // Check for en dash vs hyphen
        if (text.includes(`${pageMatch[1]}-${pageMatch[2]}`)) {
          issues.push({
            title: "Hyphen instead of en dash in page range",
            description: "Use en dash (–) not hyphen (-) for page ranges",
            text: `${pageMatch[1]}-${pageMatch[2]}`,
            severity: "Minor",
            category: "references",
            hasFix: true,
            fixAction: "fixPageRangeDash",
            type: 'page-dash',
            explanation: "Page ranges use en dash: 123–456, not 123-456"
          });
        }
      }
      
    } else if (entry.type === 'book') {
      // Book specific validation
      
      // Check for book title italicization
      const titleMatch = text.match(/\)\.\s+([^.]+)\./);
      if (titleMatch) {
        const bookTitle = titleMatch[1];
        const isItalicized = italicizedText?.some(item => 
          item.text.includes(bookTitle) || bookTitle.includes(item.text)
        );
        
        if (!isItalicized && bookTitle.length > 3) {
          issues.push({
            title: "Book title not italicized",
            description: "Book titles must be italicized in references",
            text: bookTitle.substring(0, 50),
            severity: "Major",
            category: "references",
            hasFix: false,
            type: 'book-italics',
            explanation: "Book titles should be in italics throughout the reference"
          });
        }
        
        // Check for sentence case in book titles
        const words = bookTitle.split(/\s+/);
        const hasExcessiveCapitals = words.filter(w => 
          w.length > 3 && w[0] === w[0].toUpperCase()
        ).length > words.length * 0.5;
        
        if (hasExcessiveCapitals) {
          issues.push({
            title: "Book title not in sentence case",
            description: "Book titles should use sentence case, not title case",
            text: bookTitle.substring(0, 50),
            severity: "Minor",
            category: "references",
            hasFix: true,
            fixAction: "fixBookTitleCase",
            type: 'book-case',
            explanation: "Book titles use sentence case: 'The psychology of learning' not 'The Psychology of Learning'"
          });
        }
      }
      
      // Check for edition format
      const editionMatch = text.match(/\((\d+)(?:st|nd|rd|th)\s+[Ee]d(?:ition)?\)/);
      if (editionMatch) {
        if (!text.includes(`(${editionMatch[1]}th ed.)`) && 
            !text.includes(`(${editionMatch[1]}nd ed.)`) &&
            !text.includes(`(${editionMatch[1]}rd ed.)`) &&
            !text.includes(`(${editionMatch[1]}st ed.)`)) {
          issues.push({
            title: "Incorrect edition format",
            description: "Edition should be formatted as '(2nd ed.)'",
            text: editionMatch[0],
            severity: "Minor",
            category: "references",
            hasFix: true,
            fixAction: "fixEditionFormat",
            type: 'edition-format',
            explanation: "Format editions as: (2nd ed.), (3rd ed.), etc."
          });
        }
      }
      
      // Check for publisher location (not needed in APA 7th)
      if (text.match(/[A-Z][a-z]+,\s+[A-Z]{2}:\s+[A-Z]/) || 
          text.includes('New York:') || 
          text.includes('London:')) {
        issues.push({
          title: "Publisher location included",
          description: "APA 7th edition no longer requires publisher location",
          text: text.substring(0, 60) + '...',
          severity: "Minor",
          category: "references",
          hasFix: true,
          fixAction: "removePublisherLocation",
          type: 'publisher-location',
          explanation: "APA 7th edition omits publisher location. Use just publisher name."
        });
      }
    }
    
    return issues;
  }

  /**
   * Check DOI and URL formatting
   */
  checkDOIAndURLFormatting(entries) {
    const issues = [];
    const reportedTypes = new Set();
    
    entries.forEach(entry => {
      // Check for "Retrieved from" (outdated in APA 7)
      if (entry.text.includes('Retrieved from') && !reportedTypes.has('retrieved')) {
        issues.push({
          title: "Outdated 'Retrieved from' phrase",
          description: "APA 7th edition no longer uses 'Retrieved from' before URLs",
          text: entry.text.substring(entry.text.indexOf('Retrieved'), 60) + '...',
          severity: "Minor",
          category: "references",
          hasFix: true,
          fixAction: "removeRetrievedFrom",
          explanation: "APA 7th edition omits 'Retrieved from' before URLs unless a retrieval date is needed."
        });
        reportedTypes.add('retrieved');
      }
      
      // Check DOI format and validity
      const doiMatch = entry.text.match(this.doiPattern);
      if (doiMatch) {
        const doi = doiMatch[1] || doiMatch[2];
        
        // Validate DOI structure
        if (doi && !this.validDoiPrefix.test(doi) && !reportedTypes.has('invalid-doi')) {
          issues.push({
            title: "Invalid DOI format",
            description: "DOI appears malformed",
            text: doiMatch[0],
            severity: "Major",
            category: "references",
            hasFix: false,
            explanation: "DOIs should start with '10.' followed by a registrant code"
          });
          reportedTypes.add('invalid-doi');
        }
        
        // Check if formatted as hyperlink
        if (!entry.text.includes('https://doi.org/') && !reportedTypes.has('doi-format')) {
          issues.push({
            title: "DOI not formatted as hyperlink",
            description: "DOIs should be formatted as clickable hyperlinks",
            text: doiMatch[0],
            severity: "Minor",
            category: "references",
            hasFix: true,
            fixAction: "formatDOI",
            explanation: "Format DOIs as: https://doi.org/10.xxxx/xxxxx"
          });
          reportedTypes.add('doi-format');
        }
      }
      
      // Check for electronic sources without retrieval date when needed
      if (entry.text.includes('http') && !entry.text.includes('doi') && 
          !reportedTypes.has('retrieval-date')) {
        // Check if it's a source that changes (wiki, news, etc.)
        const needsRetrievalDate = /wikipedia|wiki|news|blog|press release/i.test(entry.text);
        if (needsRetrievalDate && !entry.text.includes('Retrieved')) {
          issues.push({
            title: "Missing retrieval date",
            description: "Online sources that change need retrieval dates",
            text: entry.text.substring(0, 60) + '...',
            severity: "Minor",
            category: "references",
            hasFix: false,
            explanation: "Add 'Retrieved [Month Day, Year], from' before URL for changing content"
          });
          reportedTypes.add('retrieval-date');
        }
      }
    });
    
    return issues;
  }
}