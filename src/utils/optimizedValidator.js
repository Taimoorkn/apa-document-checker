// src/utils/optimizedValidator.js - Performance-optimized single-pass validator
'use client';

export class OptimizedValidator {
  constructor() {
    // Precompile all regex patterns for better performance
    this.patterns = {
      // Citations
      parentheticalCitation: /\(([^)]+,\s*\d{4}[a-z]?)\)/g,
      narrativeCitation: /([A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+)*)\s+\((\d{4}[a-z]?)\)/g,
      etAlComma: /\(([^,)]+),\s+et\s+al\.,\s*(\d{4})\)/g,
      
      // Statistics
      statValues: /\b([MNnprtFχ])\s*[=<>≤≥]\s*[\d.-]+/g,
      pValue: /p\s*[=<>]\s*\.?\d+/gi,
      
      // Tables/Figures
      table: /(?:Table|TABLE)\s+([A-Z]?\d+\.?\d*)/gi,
      figure: /(?:Figure|FIGURE|Fig\.|FIG\.)\s+([A-Z]?\d+\.?\d*)/gi,
      
      // DOI/URL
      doi: /(?:https?:\/\/)?(?:dx\.)?doi\.org\/([0-9.]+\/[^\s]+)|doi:\s*([0-9.]+\/[^\s]+)/i,
      url: /https?:\/\/[^\s)]+/g,
      
      // Common issues
      sentenceStartNumber: /(?:^|\. )\d+/g,
      singleDigit: /\b[1-9]\b/g,
      percentage: /\d+\.?\d*\s*(?:%|percent|per cent)/gi
    };
    
    // Cache for performance
    this.cache = new Map();
  }
  
  /**
   * Single-pass validation for optimal performance
   */
  validateDocument(text, structure, formatting) {
    // Check cache first
    const cacheKey = this.generateCacheKey(text);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const issues = [];
    const foundItems = {
      citations: [],
      statistics: [],
      tables: [],
      figures: [],
      references: [],
      dois: []
    };
    
    // Single pass through text to collect all matches
    this.collectMatches(text, foundItems);
    
    // Process collected data for issues
    issues.push(...this.processCitations(foundItems.citations));
    issues.push(...this.processStatistics(foundItems.statistics, structure));
    issues.push(...this.processTablesFigures(foundItems.tables, foundItems.figures));
    issues.push(...this.processReferences(foundItems.references, foundItems.dois));
    
    // Add formatting checks (these use the formatting data, not text)
    if (formatting) {
      issues.push(...this.processFormattingIssues(formatting));
    }
    
    // Cache results
    this.cache.set(cacheKey, issues);
    
    // Clear cache if it gets too large
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    return issues;
  }
  
  /**
   * Collect all pattern matches in a single pass
   */
  collectMatches(text, foundItems) {
    // Process line by line for better memory efficiency
    const lines = text.split('\n');
    let currentPosition = 0;
    
    lines.forEach((line, lineIndex) => {
      // Citations
      let match;
      
      // Reset lastIndex for global regexes
      Object.values(this.patterns).forEach(pattern => {
        if (pattern.global) pattern.lastIndex = 0;
      });
      
      // Parenthetical citations
      while ((match = this.patterns.parentheticalCitation.exec(line))) {
        foundItems.citations.push({
          type: 'parenthetical',
          text: match[0],
          content: match[1],
          position: currentPosition + match.index,
          line: lineIndex + 1
        });
      }
      
      // Narrative citations
      this.patterns.narrativeCitation.lastIndex = 0;
      while ((match = this.patterns.narrativeCitation.exec(line))) {
        foundItems.citations.push({
          type: 'narrative',
          text: match[0],
          author: match[1],
          year: match[2],
          position: currentPosition + match.index,
          line: lineIndex + 1
        });
      }
      
      // Statistical values
      this.patterns.statValues.lastIndex = 0;
      while ((match = this.patterns.statValues.exec(line))) {
        foundItems.statistics.push({
          text: match[0],
          symbol: match[1],
          position: currentPosition + match.index,
          line: lineIndex + 1
        });
      }
      
      // Tables
      this.patterns.table.lastIndex = 0;
      while ((match = this.patterns.table.exec(line))) {
        foundItems.tables.push({
          text: match[0],
          number: match[1],
          position: currentPosition + match.index,
          line: lineIndex + 1
        });
      }
      
      // Figures
      this.patterns.figure.lastIndex = 0;
      while ((match = this.patterns.figure.exec(line))) {
        foundItems.figures.push({
          text: match[0],
          number: match[1],
          position: currentPosition + match.index,
          line: lineIndex + 1
        });
      }
      
      // DOIs
      this.patterns.doi.lastIndex = 0;
      while ((match = this.patterns.doi.exec(line))) {
        foundItems.dois.push({
          text: match[0],
          doi: match[1] || match[2],
          position: currentPosition + match.index,
          line: lineIndex + 1
        });
      }
      
      currentPosition += line.length + 1; // +1 for newline
    });
    
    // Extract references section separately
    const referencesMatch = text.match(/References?\s*\n([\s\S]*?)(?=\n\n[A-Z]|$)/i);
    if (referencesMatch) {
      const referencesText = referencesMatch[1];
      const referenceEntries = referencesText.split(/\n(?=[A-Z])/);
      foundItems.references = referenceEntries.map(entry => ({
        text: entry.trim(),
        hasDoi: this.patterns.doi.test(entry),
        hasUrl: this.patterns.url.test(entry)
      }));
    }
  }
  
  /**
   * Process citation issues
   */
  processCitations(citations) {
    const issues = [];
    const reportedTypes = new Set();
    
    citations.forEach(citation => {
      // Check for comma before et al. (should not have comma in APA 7th)
      if (citation.type === 'parenthetical' && citation.content) {
        if (citation.content.includes(', et al.') && !reportedTypes.has('et-al-comma')) {
          issues.push({
            title: "Incorrect comma before et al.",
            description: "APA 7th edition does not use comma before 'et al.'",
            text: citation.text,
            severity: "Minor",
            category: "citations",
            hasFix: true,
            fixAction: "fixEtAlFormatting",
            explanation: "Format: (Smith et al., 2021), not (Smith, et al., 2021)"
          });
          reportedTypes.add('et-al-comma');
        }
      }
    });
    
    return issues;
  }
  
  /**
   * Process statistics issues
   */
  processStatistics(statistics, structure) {
    const issues = [];
    const reportedSymbols = new Set();
    const italicizedText = structure?.italicizedText || [];
    
    statistics.forEach(stat => {
      if (!reportedSymbols.has(stat.symbol)) {
        const isItalicized = italicizedText.some(item => 
          item.text.includes(stat.symbol) && 
          Math.abs(item.position - stat.position) < 10
        );
        
        if (!isItalicized) {
          issues.push({
            title: `Statistical symbol '${stat.symbol}' not italicized`,
            description: `Statistical symbols must be italicized`,
            text: stat.text,
            severity: "Minor",
            category: "statistical",
            hasFix: false,
            explanation: `Italicize: *${stat.symbol}*`
          });
          reportedSymbols.add(stat.symbol);
        }
      }
    });
    
    return issues;
  }
  
  /**
   * Process table and figure issues
   */
  processTablesFigures(tables, figures) {
    const issues = [];
    
    // Check table numbering sequence
    if (tables.length > 1) {
      const sorted = [...tables].sort((a, b) => a.position - b.position);
      for (let i = 1; i < sorted.length; i++) {
        const current = parseInt(sorted[i].number);
        const previous = parseInt(sorted[i-1].number);
        
        if (!isNaN(current) && !isNaN(previous) && current !== previous + 1) {
          issues.push({
            title: "Table numbering sequence error",
            description: `Table ${sorted[i].number} out of sequence`,
            text: sorted[i].text,
            severity: "Major",
            category: "tables",
            hasFix: false,
            explanation: "Tables must be numbered consecutively"
          });
          break;
        }
      }
    }
    
    // Similar check for figures
    if (figures.length > 1) {
      const sorted = [...figures].sort((a, b) => a.position - b.position);
      for (let i = 1; i < sorted.length; i++) {
        const current = parseInt(sorted[i].number);
        const previous = parseInt(sorted[i-1].number);
        
        if (!isNaN(current) && !isNaN(previous) && current !== previous + 1) {
          issues.push({
            title: "Figure numbering sequence error",
            description: `Figure ${sorted[i].number} out of sequence`,
            text: sorted[i].text,
            severity: "Major",
            category: "figures",
            hasFix: false,
            explanation: "Figures must be numbered consecutively"
          });
          break;
        }
      }
    }
    
    return issues;
  }
  
  /**
   * Process reference issues
   */
  processReferences(references, dois) {
    const issues = [];
    
    // Check DOI formatting
    dois.forEach(doiItem => {
      if (!doiItem.text.includes('https://doi.org/')) {
        issues.push({
          title: "DOI not formatted as hyperlink",
          description: "DOIs should be formatted as clickable hyperlinks",
          text: doiItem.text,
          severity: "Minor",
          category: "references",
          hasFix: true,
          fixAction: "formatDOI",
          explanation: "Format: https://doi.org/10.xxxx/xxxxx"
        });
      }
    });
    
    // Check reference formatting
    if (references.length > 0) {
      // Check alphabetical order
      let previousAuthor = '';
      for (let i = 0; i < Math.min(references.length, 10); i++) {
        const entry = references[i];
        const authorMatch = entry.text.match(/^([A-Z][a-zA-Z'-]+)/);
        
        if (authorMatch) {
          const currentAuthor = authorMatch[1];
          if (previousAuthor && currentAuthor < previousAuthor) {
            issues.push({
              title: "References not in alphabetical order",
              description: "References should be sorted alphabetically by author surname",
              text: `${previousAuthor}... before ${currentAuthor}...`,
              severity: "Major",
              category: "references",
              hasFix: true,
              fixAction: "sortReferences",
              explanation: "Sort references alphabetically by first author's surname"
            });
            break;
          }
          previousAuthor = currentAuthor;
        }
      }
    }
    
    return issues;
  }
  
  /**
   * Process formatting issues
   */
  processFormattingIssues(formatting) {
    const issues = [];
    
    // Check document-level formatting
    if (formatting.document) {
      const doc = formatting.document;
      
      // Font check
      if (doc.font?.family && doc.font.family !== 'Times New Roman') {
        issues.push({
          title: "Incorrect font family",
          description: `Document uses ${doc.font.family} instead of Times New Roman`,
          text: null,
          severity: "Major",
          category: "formatting",
          hasFix: true,
          fixAction: "fixFont",
          explanation: "APA requires Times New Roman 12pt font"
        });
      }
      
      // Font size check
      if (doc.font?.size && doc.font.size !== 12) {
        issues.push({
          title: "Incorrect font size",
          description: `Document uses ${doc.font.size}pt instead of 12pt`,
          text: null,
          severity: "Major",
          category: "formatting",
          hasFix: true,
          fixAction: "fixFontSize",
          explanation: "APA requires 12pt font size"
        });
      }
      
      // Line spacing check
      if (doc.spacing?.line && Math.abs(doc.spacing.line - 2.0) > 0.1) {
        issues.push({
          title: "Incorrect line spacing",
          description: "Document should use double spacing",
          text: null,
          severity: "Major",
          category: "formatting",
          hasFix: true,
          fixAction: "fixLineSpacing",
          explanation: "APA requires double line spacing throughout"
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Generate cache key for document
   */
  generateCacheKey(text) {
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < Math.min(text.length, 1000); i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash;
    }
    return `${text.length}_${hash}`;
  }
}