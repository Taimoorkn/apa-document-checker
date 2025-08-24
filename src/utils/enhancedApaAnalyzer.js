// utils/enhancedApaAnalyzer.js
'use client';

// Enhanced APA 7th Edition Analyzer that works with rich document formatting data
export class EnhancedAPAAnalyzer {
  constructor() {
    this.apaStandards = {
      font: {
        family: 'times new roman',
        size: 12 // points
      },
      spacing: {
        line: 2.0, // double spacing
        paragraphAfter: 0, // no extra space after paragraphs
        paragraphBefore: 0
      },
      margins: {
        top: 1.0, // inches
        bottom: 1.0,
        left: 1.0,
        right: 1.0
      },
      indentation: {
        firstLine: 0.5 // inches
      }
    };
  }
  
  /**
   * Main analysis function - works with rich document data from server
   */
  analyzeDocument(documentData) {
    const issues = [];
    
    const { text, html, formatting, structure } = documentData;
    
    // 1. Analyze formatting with precise data
    issues.push(...this.analyzeFormatting(formatting));
    
    // 2. Analyze document structure
    issues.push(...this.analyzeStructure(structure, text));
    
    // 3. Analyze citations with context
    issues.push(...this.analyzeCitations(text, structure.citations));
    
    // 4. Analyze references
    issues.push(...this.analyzeReferences(text, structure));
    
    // 5. Analyze content compliance
    issues.push(...this.analyzeContent(text));
    
    return this.prioritizeAndDeduplicateIssues(issues);
  }
  
  /**
   * Analyze formatting with precise measurements
   */
  analyzeFormatting(formatting) {
    const issues = [];
    
    if (!formatting) {
      issues.push({
        title: "Unable to detect document formatting",
        description: "Could not extract formatting information from document",
        severity: "Critical",
        category: "formatting",
        hasFix: false
      });
      return issues;
    }
    
    // Check font family
    if (formatting.font.family) {
      const fontFamily = formatting.font.family.toLowerCase();
      if (!fontFamily.includes('times new roman') && 
          !fontFamily.includes('times') && 
          !fontFamily.includes('liberation serif') && // Alternative acceptable fonts
          !fontFamily.includes('tex computer modern')) {
        issues.push({
          title: "Incorrect font family",
          description: `Document uses "${formatting.font.family}" instead of Times New Roman`,
          text: `Font: ${formatting.font.family}`,
          severity: "Major",
          category: "formatting",
          location: { type: "document", section: "font" },
          hasFix: true,
          fixAction: "fixFont",
          explanation: "APA 7th edition requires Times New Roman 12pt font throughout the document."
        });
      }
    }
    
    // Check font size with tolerance
    if (formatting.font.size && Math.abs(formatting.font.size - 12) > 0.5) {
      issues.push({
        title: "Incorrect font size",
        description: `Font size is ${formatting.font.size}pt instead of 12pt`,
        text: `Font size: ${formatting.font.size}pt`,
        severity: "Major",
        category: "formatting",
        location: { type: "document", section: "font" },
        hasFix: true,
        fixAction: "fixFontSize",
        explanation: "APA 7th edition requires 12-point font size."
      });
    }
    
    // Check line spacing
    if (formatting.spacing.line && Math.abs(formatting.spacing.line - 2.0) > 0.1) {
      issues.push({
        title: "Incorrect line spacing",
        description: `Line spacing is ${formatting.spacing.line} instead of double (2.0)`,
        text: `Line spacing: ${formatting.spacing.line}`,
        severity: "Major",
        category: "formatting", 
        location: { type: "document", section: "spacing" },
        hasFix: true,
        fixAction: "fixLineSpacing",
        explanation: "APA 7th edition requires double spacing (2.0) throughout the document."
      });
    }
    
    // Check margins with tolerance
    const marginIssues = [];
    Object.entries(this.apaStandards.margins).forEach(([side, required]) => {
      const actual = formatting.margins[side];
      if (actual !== null && Math.abs(actual - required) > 0.1) {
        marginIssues.push(`${side}: ${actual}" (should be ${required}")`);
      }
    });
    
    if (marginIssues.length > 0) {
      issues.push({
        title: "Incorrect margins",
        description: `Margins are not 1 inch: ${marginIssues.join(', ')}`,
        text: marginIssues.join(', '),
        severity: "Major",
        category: "formatting",
        location: { type: "document", section: "margins" },
        hasFix: true,
        fixAction: "fixMargins",
        explanation: "APA 7th edition requires 1-inch margins on all sides."
      });
    }
    
    // Check paragraph indentation
    if (formatting.paragraphs && formatting.paragraphs.length > 0) {
      const bodyParagraphs = formatting.paragraphs.filter(p => 
        p.indentation.firstLine !== null || p.indentation.left !== null
      );
      
      const incorrectIndentation = bodyParagraphs.filter(p => {
        const firstLine = p.indentation.firstLine || 0;
        return Math.abs(firstLine - 0.5) > 0.05; // 5% tolerance
      });
      
      if (incorrectIndentation.length > 0) {
        issues.push({
          title: "Incorrect paragraph indentation",
          description: `${incorrectIndentation.length} paragraphs have incorrect first-line indentation`,
          text: `Expected: 0.5", Found: ${incorrectIndentation[0]?.indentation.firstLine || 0}"`,
          severity: "Minor",
          category: "formatting",
          location: { 
            type: "paragraph", 
            indices: incorrectIndentation.map(p => p.index).slice(0, 5) 
          },
          hasFix: true,
          fixAction: "fixIndentation",
          explanation: "APA 7th edition requires 0.5-inch first-line indentation for all paragraphs."
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Analyze document structure with heading hierarchy
   */
  analyzeStructure(structure, text) {
    const issues = [];
    
    if (!structure) return issues;
    
    // 1. Check for required sections
    const requiredSections = ['title page', 'abstract', 'main body', 'references'];
    const hasAbstract = text.toLowerCase().includes('abstract');
    const hasReferences = structure.sections.some(s => s.type === 'references') || 
                          text.toLowerCase().includes('references');
    const hasTitle = text.length > 50; // Basic check
    
    if (!hasTitle) {
      issues.push({
        title: "Missing title page",
        description: "Document appears to be missing a title page",
        severity: "Critical",
        category: "structure",
        hasFix: true,
        fixAction: "addTitlePage",
        explanation: "APA papers must begin with a title page containing the paper title, author name(s), institutional affiliation, and author note."
      });
    }
    
    if (text.split(/\s+/).length > 1000 && !hasAbstract) {
      issues.push({
        title: "Missing abstract",
        description: "Long papers typically require an abstract",
        severity: "Major",
        category: "structure",
        hasFix: true,
        fixAction: "addAbstract",
        explanation: "Papers longer than 1000 words typically require an abstract (150-250 words) summarizing the main points."
      });
    }
    
    if (!hasReferences && structure.citations.length > 0) {
      issues.push({
        title: "Missing references section",
        description: "Document has citations but no references section",
        severity: "Critical",
        category: "structure",
        hasFix: true,
        fixAction: "addReferencesSection",
        explanation: "All sources cited in the text must be listed in a References section."
      });
    }
    
    // 2. Check heading hierarchy
    const headings = structure.headings || [];
    if (headings.length > 1) {
      for (let i = 1; i < headings.length; i++) {
        const current = headings[i];
        const previous = headings[i - 1];
        
        if (current.level > previous.level + 1) {
          issues.push({
            title: "Improper heading hierarchy",
            description: `Heading level ${current.level} follows level ${previous.level}`,
            text: `"${current.text}" (Level ${current.level}) after "${previous.text}" (Level ${previous.level})`,
            severity: "Major",
            category: "structure",
            location: { 
              type: "heading", 
              paragraphIndex: current.paragraphIndex 
            },
            hasFix: true,
            fixAction: "fixHeadingLevel",
            explanation: "Headings must follow sequential order: Level 1, then Level 2, then Level 3, etc. Don't skip levels."
          });
        }
      }
    }
    
    // 3. Check for running head (professional papers)
    const hasRunningHead = text.toLowerCase().includes('running head:') ||
                          text.toLowerCase().match(/^.{0,200}running head/i);
    
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 500 && !hasRunningHead) {
      issues.push({
        title: "Missing running head",
        description: "Professional papers should include a running head",
        severity: "Minor",
        category: "structure",
        hasFix: true,
        fixAction: "addRunningHead",
        explanation: "Professional papers require a running head (shortened title, max 50 characters) on every page."
      });
    }
    
    return issues;
  }
  
  /**
   * Analyze citations with extracted citation data
   */
  analyzeCitations(text, extractedCitations) {
    const issues = [];
    
    // Use extracted citations for more accurate analysis
    const citations = extractedCitations || this.extractCitations(text);
    
    citations.forEach((citation, index) => {
      // Check author-year format
      if (!citation.year || !citation.author) {
        issues.push({
          title: "Incomplete citation",
          description: "Citation missing author or year",
          text: citation.text,
          severity: "Major",
          category: "citations",
          location: { 
            type: "citation", 
            paragraphIndex: citation.paragraphIndex,
            citationIndex: index 
          },
          hasFix: false,
          explanation: "All in-text citations must include author surname(s) and publication year."
        });
        return;
      }
      
      // Check for proper punctuation
      if (!citation.text.includes(`, ${citation.year}`)) {
        issues.push({
          title: "Missing comma in citation",
          description: "Citation missing comma between author and year",
          text: citation.text,
          severity: "Minor",
          category: "citations",
          location: { 
            type: "citation", 
            paragraphIndex: citation.paragraphIndex,
            citationIndex: index 
          },
          hasFix: true,
          fixAction: "addCitationComma",
          explanation: "In-text citations require a comma between the author name and year: (Smith, 2023)."
        });
      }
      
      // Check for ampersand vs "and"
      if (citation.text.includes(' and ') && citation.text.includes('(')) {
        issues.push({
          title: "Incorrect connector in parenthetical citation",
          description: "Use '&' instead of 'and' in parenthetical citations",
          text: citation.text,
          severity: "Minor",
          category: "citations",
          location: { 
            type: "citation", 
            paragraphIndex: citation.paragraphIndex,
            citationIndex: index 
          },
          hasFix: true,
          fixAction: "fixParentheticalConnector",
          explanation: "In parenthetical citations, use & to connect author names: (Smith & Jones, 2023)."
        });
      }
    });
    
    // Check for direct quotes without page numbers
    const quotePattern = /[""][^""]{10,}[""]\s*(\([^)]+\))/g;
    let quoteMatch;
    while ((quoteMatch = quotePattern.exec(text)) !== null) {
      const citation = quoteMatch[1];
      if (!citation.match(/,\s*p\.?\s*\d+/)) {
        issues.push({
          title: "Direct quote missing page number",
          description: "Direct quotes require page numbers",
          text: quoteMatch[0],
          severity: "Major",
          category: "citations",
          hasFix: true,
          fixAction: "addPageNumber",
          explanation: "All direct quotations must include a page number to help readers locate the original text."
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Analyze references section
   */
  analyzeReferences(text, structure) {
    const issues = [];
    
    const referencesSection = structure.sections.find(s => s.type === 'references');
    if (!referencesSection) {
      // Already handled in structure analysis
      return issues;
    }
    
    // Extract reference text
    const referencesMatch = text.match(/References[\s\n]+([\s\S]+?)(?:\n\n[A-Z]|$)/i);
    if (!referencesMatch) return issues;
    
    const referencesText = referencesMatch[1].trim();
    const referenceEntries = referencesText
      .split(/\n\s*\n/)
      .filter(entry => entry.trim().length > 10);
    
    if (referenceEntries.length === 0) {
      issues.push({
        title: "Empty references section",
        description: "References section contains no entries",
        severity: "Critical",
        category: "references",
        hasFix: false,
        explanation: "The References section must contain entries for all sources cited in your paper."
      });
      return issues;
    }
    
    // Check alphabetical order
    const firstWords = referenceEntries.map(entry => {
      const match = entry.match(/^([^,\s]+)/);
      return match ? match[1].toLowerCase() : '';
    });
    
    const sortedFirstWords = [...firstWords].sort();
    const isAlphabetical = JSON.stringify(firstWords) === JSON.stringify(sortedFirstWords);
    
    if (!isAlphabetical) {
      issues.push({
        title: "References not in alphabetical order",
        description: "Reference entries must be alphabetized by first author's surname",
        text: `First entries: ${firstWords.slice(0, 3).join(', ')}...`,
        severity: "Major",
        category: "references",
        hasFix: true,
        fixAction: "sortReferences",
        explanation: "References must be arranged in alphabetical order by the surname of the first author."
      });
    }
    
    // Analyze individual reference entries
    referenceEntries.forEach((entry, index) => {
      const entryIssues = this.analyzeReferenceEntry(entry, index);
      issues.push(...entryIssues);
    });
    
    return issues;
  }
  
  /**
   * Analyze individual reference entry
   */
  analyzeReferenceEntry(entry, index) {
    const issues = [];
    
    // Check basic format: Author. (Year). Title.
    const basicFormat = /^([^.]+)\.\s*\((\d{4})\)\.\s*([^.]+)\./;
    if (!basicFormat.test(entry)) {
      issues.push({
        title: `Reference ${index + 1}: Incorrect basic format`,
        description: "Reference doesn't follow Author. (Year). Title. format",
        text: entry.substring(0, 100) + '...',
        severity: "Major",
        category: "references",
        location: { type: "reference", index },
        hasFix: false,
        explanation: "References must follow the format: Author, A. (Year). Title of work. Additional information."
      });
    }
    
    // Check for DOI or URL in journal articles
    if (entry.toLowerCase().includes('journal') || 
        entry.match(/,\s*\d+(\(\d+\))?/)) { // Volume(Issue) pattern
      if (!entry.toLowerCase().includes('doi') && 
          !entry.includes('http')) {
        issues.push({
          title: `Reference ${index + 1}: Missing DOI or URL`,
          description: "Journal articles should include DOI when available",
          text: entry.substring(0, 100) + '...',
          severity: "Minor",
          category: "references",
          location: { type: "reference", index },
          hasFix: false,
          explanation: "Include DOI for journal articles when available to help readers locate the source."
        });
      }
    }
    
    // Check title capitalization (sentence case for articles)
    const titleMatch = entry.match(/\(\d{4}\)\.\s*([^.]+)\./);
    if (titleMatch) {
      const title = titleMatch[1];
      const words = title.split(' ');
      const capitalizedWords = words.filter(word => 
        word.length > 0 && 
        word[0] === word[0].toUpperCase() && 
        !this.isCommonWord(word.toLowerCase())
      );
      
      if (capitalizedWords.length > 2) {
        issues.push({
          title: `Reference ${index + 1}: Incorrect title capitalization`,
          description: "Use sentence case for article titles",
          text: title,
          severity: "Minor",
          category: "references",
          location: { type: "reference", index },
          hasFix: true,
          fixAction: "fixTitleCapitalization",
          explanation: "Use sentence case for article titles: capitalize only the first word, proper nouns, and first word after a colon."
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Analyze content for APA compliance
   */
  analyzeContent(text) {
    const issues = [];
    
    // Check for first person usage in formal papers
    const firstPersonPattern = /\b(I|me|my|mine|we|us|our|ours)\b/gi;
    const firstPersonMatches = text.match(firstPersonPattern) || [];
    
    if (firstPersonMatches.length > text.split(/\s+/).length * 0.02) { // More than 2%
      issues.push({
        title: "Excessive first-person usage",
        description: "Consider reducing first-person pronouns in formal academic writing",
        text: `Found ${firstPersonMatches.length} instances: ${firstPersonMatches.slice(0, 5).join(', ')}...`,
        severity: "Minor",
        category: "content",
        hasFix: false,
        explanation: "While not prohibited, excessive first-person usage should be avoided in formal academic writing. Use sparingly and appropriately."
      });
    }
    
    // Check for bias-free language issues
    const biasedTerms = [
      'mankind', 'manmade', 'chairman', 'policeman', 'fireman',
      'normal', 'abnormal', 'crazy', 'insane'
    ];
    
    biasedTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      if (regex.test(text)) {
        issues.push({
          title: "Potentially biased language",
          description: `Consider replacing "${term}" with more inclusive language`,
          text: term,
          severity: "Minor",
          category: "content",
          hasFix: true,
          fixAction: "suggestInclusiveLanguage",
          explanation: "APA 7th edition emphasizes the use of bias-free, inclusive language."
        });
      }
    });
    
    return issues;
  }
  
  /**
   * Helper methods
   */
  extractCitations(text) {
    const citations = [];
    const citationPattern = /\(([^)]+),\s*(\d{4})[^)]*\)/g;
    let match;
    
    while ((match = citationPattern.exec(text)) !== null) {
      citations.push({
        text: match[0],
        author: match[1],
        year: match[2],
        paragraphIndex: this.findParagraphIndex(text, match.index)
      });
    }
    
    return citations;
  }
  
  findParagraphIndex(text, position) {
    const beforeText = text.substring(0, position);
    return (beforeText.match(/\n\s*\n/g) || []).length;
  }
  
  isCommonWord(word) {
    const commonWords = [
      'and', 'or', 'but', 'for', 'nor', 'so', 'yet',
      'a', 'an', 'the', 'in', 'on', 'at', 'by', 'of', 'to'
    ];
    return commonWords.includes(word);
  }
  
  prioritizeAndDeduplicateIssues(issues) {
    // Remove duplicates based on title and text
    const unique = issues.filter((issue, index, self) => 
      index === self.findIndex(i => 
        i.title === issue.title && i.text === issue.text
      )
    );
    
    // Sort by severity and category
    const severityOrder = { 'Critical': 0, 'Major': 1, 'Minor': 2 };
    const categoryOrder = { 
      'formatting': 0, 
      'structure': 1, 
      'citations': 2, 
      'references': 3, 
      'content': 4 
    };
    
    return unique.sort((a, b) => {
      // First by severity
      const severityCompare = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityCompare !== 0) return severityCompare;
      
      // Then by category
      return categoryOrder[a.category] - categoryOrder[b.category];
    });
  }
}

// Usage example:
export function analyzeAPADocument(documentData) {
  const analyzer = new EnhancedAPAAnalyzer();
  return analyzer.analyzeDocument(documentData);
}