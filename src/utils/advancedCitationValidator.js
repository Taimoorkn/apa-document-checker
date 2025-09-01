// src/utils/advancedCitationValidator.js - Advanced citation validation
'use client';

export class AdvancedCitationValidator {
  constructor() {
    this.narrativeCitationPattern = /([A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+)*)\s+\((\d{4}[a-z]?)\)/g;
    this.parentheticalCitationPattern = /\(([^)]+,\s*\d{4}[a-z]?)\)/g;
  }

  /**
   * Validate advanced citation rules
   */
  validateAdvancedCitations(text, structure) {
    const issues = [];
    
    // Multiple authors formatting
    issues.push(...this.validateMultipleAuthors(text));
    
    // Secondary source citations
    issues.push(...this.validateSecondarySources(text));
    
    // Personal communication citations
    issues.push(...this.validatePersonalCommunications(text));
    
    // Group/corporate authors
    issues.push(...this.validateCorporateAuthors(text));
    
    // No date citations
    issues.push(...this.validateNoDateCitations(text));
    
    // Multiple works same author/year
    issues.push(...this.validateMultipleWorksSameYear(text));
    
    // Narrative vs parenthetical consistency
    issues.push(...this.validateCitationConsistency(text));
    
    return issues;
  }

  /**
   * Validate multiple authors formatting (up to 20 authors rules)
   */
  validateMultipleAuthors(text) {
    const issues = [];
    
    // Check for 3+ authors without et al.
    const threeAuthorsPattern = /\(([A-Z][a-z]+),\s+([A-Z][a-z]+),\s+(?:and|&)\s+([A-Z][a-z]+),\s+\d{4}\)/g;
    let match;
    
    while ((match = threeAuthorsPattern.exec(text)) !== null) {
      const citation = match[0];
      
      // For 3+ authors, first citation should list all, subsequent use et al.
      const firstAuthor = match[1];
      const etAlPattern = new RegExp(`\\(${firstAuthor},?\\s+et\\s+al\\.`, 'g');
      const hasEtAl = etAlPattern.test(text);
      
      if (!hasEtAl) {
        issues.push({
          title: "Multiple authors citation may need et al.",
          description: "Citations with 3+ authors should use 'et al.' after first mention",
          text: citation,
          severity: "Minor",
          category: "citations",
          hasFix: false,
          explanation: "After first citation, use: (FirstAuthor, et al., year)"
        });
      }
    }
    
    // Check for incorrect number of authors before et al.
    const etAlCitations = text.match(/\([^)]*et\s+al\.[^)]*\)/g) || [];
    etAlCitations.forEach(citation => {
      // Count commas before et al.
      const beforeEtAl = citation.split('et al.')[0];
      const authorCount = (beforeEtAl.match(/[A-Z][a-z]+/g) || []).length;
      
      if (authorCount > 2) {
        issues.push({
          title: "Too many authors before et al.",
          description: "List only first author before 'et al.' for 3+ authors",
          text: citation,
          severity: "Minor",
          category: "citations",
          hasFix: true,
          fixAction: "simplifyEtAlCitation",
          explanation: "Format: (FirstAuthor, et al., year) not (Author1, Author2, et al., year)"
        });
      }
    });
    
    // Check for 21+ authors rule
    const veryLongCitations = text.match(/\([^)]{200,}\)/g) || [];
    veryLongCitations.forEach(citation => {
      const authorCount = (citation.match(/[A-Z][a-z]+/g) || []).length;
      if (authorCount > 20) {
        issues.push({
          title: "Too many authors in citation",
          description: "For 21+ authors, cite first 19, then '...', then last author",
          text: citation.substring(0, 50) + '...',
          severity: "Major",
          category: "citations",
          hasFix: false,
          explanation: "Format: (Author1, Author2, ... Author19, ... LastAuthor, year)"
        });
      }
    });
    
    return issues;
  }

  /**
   * Validate secondary source citations (as cited in)
   */
  validateSecondarySources(text) {
    const issues = [];
    
    // Check for secondary source format
    const secondaryPattern = /\((?:as\s+)?cited\s+in\s+[^)]+\)/gi;
    const secondaryMatches = text.match(secondaryPattern) || [];
    
    secondaryMatches.forEach(citation => {
      // Check format: (Original, year, as cited in Secondary, year)
      if (!citation.match(/\([^,]+,\s*\d{4},?\s*as\s+cited\s+in\s+[^,]+,\s*\d{4}\)/i)) {
        issues.push({
          title: "Incorrect secondary source citation format",
          description: "Secondary citations need both original and secondary source years",
          text: citation,
          severity: "Major",
          category: "citations",
          hasFix: false,
          explanation: "Format: (OriginalAuthor, OriginalYear, as cited in SecondaryAuthor, SecondaryYear)"
        });
      }
    });
    
    // Check if primary source is in references
    const primarySources = text.match(/\(([^,]+),\s*\d{4},?\s*as\s+cited\s+in/gi) || [];
    if (primarySources.length > 0) {
      issues.push({
        title: "Secondary source used",
        description: "Consider finding and citing the primary source directly",
        text: primarySources[0],
        severity: "Minor",
        category: "citations",
        hasFix: false,
        explanation: "Only the secondary source should appear in references, not the original"
      });
    }
    
    return issues;
  }

  /**
   * Validate personal communication citations
   */
  validatePersonalCommunications(text) {
    const issues = [];
    
    // Check for personal communication format
    const personalCommPattern = /\(([^,)]+),\s*personal\s+communication,?\s*([^)]+)\)/gi;
    const personalComms = text.match(personalCommPattern) || [];
    
    personalComms.forEach(citation => {
      // Check for date format
      if (!citation.match(/,\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*\d{4}/)) {
        issues.push({
          title: "Personal communication missing full date",
          description: "Personal communications need full date (Month Day, Year)",
          text: citation,
          severity: "Major",
          category: "citations",
          hasFix: false,
          explanation: "Format: (J. Smith, personal communication, January 15, 2024)"
        });
      }
      
      // Check if in references (shouldn't be)
      const author = citation.match(/\(([^,]+),/)?.[1];
      if (author && text.includes('References') && text.indexOf('References') < text.length - 1000) {
        const referencesSection = text.substring(text.indexOf('References'));
        if (referencesSection.includes(author) && referencesSection.includes('personal communication')) {
          issues.push({
            title: "Personal communication in references",
            description: "Personal communications should not appear in reference list",
            text: citation,
            severity: "Major",
            category: "citations",
            hasFix: false,
            explanation: "Personal communications are cited in text only, not in references"
          });
        }
      }
    });
    
    return issues;
  }

  /**
   * Validate corporate/group author citations
   */
  validateCorporateAuthors(text) {
    const issues = [];
    
    // Common corporate authors
    const corporatePattern = /\((?:American\s+Psychological\s+Association|World\s+Health\s+Organization|National\s+Institute|Centers\s+for\s+Disease|Department\s+of|Ministry\s+of|University\s+of)[^,)]*[,)]/gi;
    const corporateMatches = text.match(corporatePattern) || [];
    
    corporateMatches.forEach(citation => {
      // Check for abbreviation on first use
      const fullName = citation.match(/\(([^,)]+)/)?.[1];
      if (fullName && fullName.length > 20) {
        // Check if abbreviation is defined
        const abbrevPattern = new RegExp(`${fullName}\\s*\\[([A-Z]+)\\]`, 'i');
        const hasAbbrev = abbrevPattern.test(text.substring(0, text.indexOf(citation)));
        
        if (!hasAbbrev) {
          issues.push({
            title: "Long corporate author without abbreviation",
            description: "Define abbreviation for long organizational names on first use",
            text: citation.substring(0, 50) + '...',
            severity: "Minor",
            category: "citations",
            hasFix: false,
            explanation: "First use: (American Psychological Association [APA], 2020), then: (APA, 2020)"
          });
        }
      }
    });
    
    return issues;
  }

  /**
   * Validate no date citations
   */
  validateNoDateCitations(text) {
    const issues = [];
    
    // Check for n.d. citations
    const ndPattern = /\(([^,)]+),\s*n\.d\.\)/g;
    const ndMatches = text.match(ndPattern) || [];
    
    if (ndMatches.length > 0) {
      // Check if used consistently
      ndMatches.forEach(citation => {
        const author = citation.match(/\(([^,]+),/)?.[1];
        if (author) {
          // Check if same author has dated citations too
          const datedPattern = new RegExp(`\\(${author},\\s*\\d{4}\\)`, 'g');
          if (datedPattern.test(text)) {
            issues.push({
              title: "Inconsistent dating for same author",
              description: `${author} has both dated and undated (n.d.) citations`,
              text: citation,
              severity: "Major",
              category: "citations",
              hasFix: false,
              explanation: "Verify if all works by this author have publication dates"
            });
          }
        }
      });
      
      // General warning about n.d. usage
      if (ndMatches.length > 3) {
        issues.push({
          title: "Multiple undated sources",
          description: "Document has many n.d. citations - verify if dates can be found",
          text: `${ndMatches.length} instances of n.d.`,
          severity: "Minor",
          category: "citations",
          hasFix: false,
          explanation: "Use (n.d.) only when publication date truly cannot be determined"
        });
      }
    }
    
    return issues;
  }

  /**
   * Validate multiple works by same author in same year
   */
  validateMultipleWorksSameYear(text) {
    const issues = [];
    
    // Find citations with letter suffixes (2021a, 2021b)
    const suffixPattern = /\(([^,)]+),\s*(\d{4})([a-z])\)/g;
    const suffixMatches = [...text.matchAll(suffixPattern)];
    
    const authorYearMap = new Map();
    
    suffixMatches.forEach(match => {
      const author = match[1];
      const year = match[2];
      const suffix = match[3];
      const key = `${author}_${year}`;
      
      if (!authorYearMap.has(key)) {
        authorYearMap.set(key, new Set());
      }
      authorYearMap.get(key).add(suffix);
    });
    
    // Check for missing or inconsistent suffixes
    authorYearMap.forEach((suffixes, key) => {
      const suffixArray = Array.from(suffixes).sort();
      
      // Check if sequence starts with 'a'
      if (!suffixArray.includes('a')) {
        const [author, year] = key.split('_');
        issues.push({
          title: "Letter suffix doesn't start with 'a'",
          description: `${author} (${year}) citations should start with 'a'`,
          text: `${author}, ${year}${suffixArray[0]}`,
          severity: "Minor",
          category: "citations",
          hasFix: false,
          explanation: "Multiple works same year should be labeled: 2024a, 2024b, 2024c..."
        });
      }
      
      // Check for gaps in sequence
      for (let i = 1; i < suffixArray.length; i++) {
        const expected = String.fromCharCode(suffixArray[0].charCodeAt(0) + i);
        if (suffixArray[i] !== expected) {
          const [author, year] = key.split('_');
          issues.push({
            title: "Gap in letter suffix sequence",
            description: `${author} (${year}) has non-consecutive letter suffixes`,
            text: `${suffixArray.join(', ')}`,
            severity: "Minor",
            category: "citations",
            hasFix: false,
            explanation: "Use consecutive letters: a, b, c, not a, c, d"
          });
          break;
        }
      }
    });
    
    return issues;
  }

  /**
   * Check narrative vs parenthetical citation consistency
   */
  validateCitationConsistency(text) {
    const issues = [];
    
    // Extract all citations
    const narrativeMatches = [...text.matchAll(this.narrativeCitationPattern)];
    const parentheticalMatches = [...text.matchAll(this.parentheticalCitationPattern)];
    
    // Track which style is used for each source
    const citationStyles = new Map();
    
    narrativeMatches.forEach(match => {
      const author = match[1];
      const year = match[2];
      const key = `${author}_${year}`;
      
      if (!citationStyles.has(key)) {
        citationStyles.set(key, { narrative: 0, parenthetical: 0 });
      }
      citationStyles.get(key).narrative++;
    });
    
    parentheticalMatches.forEach(match => {
      const citation = match[1];
      const authorMatch = citation.match(/([^,]+),\s*(\d{4})/);
      if (authorMatch) {
        const author = authorMatch[1].replace(/\s*&\s*/g, ' and ');
        const year = authorMatch[2];
        const key = `${author}_${year}`;
        
        if (!citationStyles.has(key)) {
          citationStyles.set(key, { narrative: 0, parenthetical: 0 });
        }
        citationStyles.get(key).parenthetical++;
      }
    });
    
    // Check for overuse of one style
    let totalNarrative = 0;
    let totalParenthetical = 0;
    
    citationStyles.forEach(style => {
      totalNarrative += style.narrative;
      totalParenthetical += style.parenthetical;
    });
    
    if (totalNarrative > 0 && totalParenthetical > 0) {
      const ratio = totalNarrative / totalParenthetical;
      
      if (ratio > 5 || ratio < 0.2) {
        issues.push({
          title: "Imbalanced citation style usage",
          description: ratio > 5 ? "Overuse of narrative citations" : "Overuse of parenthetical citations",
          text: `Narrative: ${totalNarrative}, Parenthetical: ${totalParenthetical}`,
          severity: "Minor",
          category: "citations",
          hasFix: false,
          explanation: "Vary citation style for better readability. Use narrative when author is subject, parenthetical for support."
        });
      }
    }
    
    return issues;
  }
}