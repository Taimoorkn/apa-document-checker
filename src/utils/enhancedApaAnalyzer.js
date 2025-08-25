// src/utils/enhancedApaAnalyzer.js - Fixed version with safe property access
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
    
    // Safely extract data with defaults
    const { 
      text = '', 
      html = '', 
      formatting = null, 
      structure = null 
    } = documentData || {};
    
    console.log('🔍 Enhanced APA Analyzer starting...');
    console.log('📊 Data received:', {
      hasText: !!text,
      hasHtml: !!html,
      hasFormatting: !!formatting,
      hasStructure: !!structure
    });
    
    // 1. Analyze formatting with precise data (if available)
    if (formatting) {
      issues.push(...this.analyzeFormatting(formatting));
    } else {
      console.warn('⚠️ No formatting data available - using basic analysis');
      issues.push(...this.analyzeBasicFormatting(html));
    }
    
    // 2. Analyze document structure
    if (structure && text) {
      issues.push(...this.analyzeStructure(structure, text));
    } else if (text) {
      console.warn('⚠️ No structure data available - using text-based analysis');
      issues.push(...this.analyzeBasicStructure(text));
    }
    
    // 3. Analyze citations - use basic analysis for better results
    if (text) {
      console.log('📚 Using basic citation analysis for better coverage...');
      issues.push(...this.analyzeBasicCitations(text));
    }
    
    // 4. Analyze references
    if (text) {
      issues.push(...this.analyzeReferences(text, structure));
    }
    
    // 5. Analyze content compliance
    if (text) {
      issues.push(...this.analyzeContent(text));
    }
    
    console.log(`✅ Analysis complete: ${issues.length} issues found`);
    
    return this.prioritizeAndDeduplicateIssues(issues);
  }
  
  /**
   * Analyze formatting with precise measurements - FIXED with safe property access
   */
  analyzeFormatting(formatting) {
    const issues = [];
    
    console.log('🎨 Analyzing formatting with rich data...');
    
    // Safely access formatting properties
    const documentFormatting = formatting?.document || {};
    const font = documentFormatting.font || {};
    const spacing = documentFormatting.spacing || {};
    const margins = documentFormatting.margins || {};
    const indentation = documentFormatting.indentation || {};
    const paragraphs = formatting?.paragraphs || [];
    const compliance = formatting?.compliance || {};
    
    // Check font family - SAFE ACCESS
    if (font.family) {
      const fontFamily = font.family.toLowerCase();
      if (!fontFamily.includes('times new roman') && 
          !fontFamily.includes('times') && 
          !fontFamily.includes('liberation serif')) {
        issues.push({
          title: "Incorrect font family",
          description: `Document uses "${font.family}" instead of Times New Roman`,
          text: `Font: ${font.family}`,
          severity: "Major",
          category: "formatting",
          location: { type: "document", section: "font" },
          hasFix: true,
          fixAction: "fixFont",
          explanation: "APA 7th edition requires Times New Roman 12pt font throughout the document."
        });
      }
    } else if (compliance.font && !compliance.font.family) {
      issues.push({
        title: "Font family not specified or non-compliant",
        description: "Document should use Times New Roman font",
        severity: "Major",
        category: "formatting",
        hasFix: true,
        fixAction: "fixFont",
        explanation: "APA 7th edition requires Times New Roman font."
      });
    }
    
    // Check font size with tolerance - SAFE ACCESS
    if (font.size && Math.abs(font.size - 12) > 0.5) {
      issues.push({
        title: "Incorrect font size",
        description: `Font size is ${font.size}pt instead of 12pt`,
        text: `Font size: ${font.size}pt`,
        severity: "Major",
        category: "formatting", 
        location: { type: "document", section: "font" },
        hasFix: true,
        fixAction: "fixFontSize",
        explanation: "APA 7th edition requires 12-point font size."
      });
    }
    
    // Check line spacing - SAFE ACCESS
    if (spacing.line && Math.abs(spacing.line - 2.0) > 0.1) {
      issues.push({
        title: "Incorrect line spacing",
        description: `Line spacing is ${spacing.line} instead of double (2.0)`,
        text: `Line spacing: ${spacing.line}`,
        severity: "Major",
        category: "formatting", 
        location: { type: "document", section: "spacing" },
        hasFix: true,
        fixAction: "fixLineSpacing",
        explanation: "APA 7th edition requires double spacing (2.0) throughout the document."
      });
    }
    
    // Check margins with tolerance - SAFE ACCESS
    const marginIssues = [];
    Object.entries(this.apaStandards.margins).forEach(([side, required]) => {
      const actual = margins[side];
      if (actual !== null && actual !== undefined && Math.abs(actual - required) > 0.1) {
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
    
    // Check paragraph indentation - SAFE ACCESS
    if (paragraphs.length > 0) {
      const bodyParagraphs = paragraphs.filter(p => 
        p && p.indentation && (p.indentation.firstLine !== null || p.indentation.left !== null)
      );
      
      const incorrectIndentation = bodyParagraphs.filter(p => {
        const firstLine = (p.indentation && p.indentation.firstLine) || 0;
        return Math.abs(firstLine - 0.5) > 0.05; // 5% tolerance
      });
      
      if (bodyParagraphs.length > 0 && incorrectIndentation.length > 0) {
        issues.push({
          title: "Incorrect paragraph indentation",
          description: `${incorrectIndentation.length} of ${bodyParagraphs.length} paragraphs have incorrect first-line indentation`,
          text: `Expected: 0.5", Found: varies`,
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
   * Fallback formatting analysis for when rich data isn't available
   */
  analyzeBasicFormatting(html) {
    const issues = [];
    
    console.log('📝 Using basic formatting analysis (no rich data)...');
    
    if (!html) return issues;
    
    // Check font family
    const fontCheck = html.match(/font-family:\s*['"]([^'"]+)['"]/i);
    if (fontCheck && !fontCheck[1].toLowerCase().includes('times new roman')) {
      issues.push({
        title: "Incorrect font detected",
        description: `Document appears to use "${fontCheck[1]}" instead of Times New Roman`,
        text: `Font: ${fontCheck[1]}`,
        severity: "Minor",
        category: "formatting",
        hasFix: true,
        fixAction: "fixFont",
        explanation: "APA 7th edition requires Times New Roman font."
      });
    }
    
    return issues;
  }
  
  /**
   * Analyze document structure with heading hierarchy
   */
  analyzeStructure(structure, text) {
    const issues = [];
    
    console.log('🏗️ Analyzing document structure...');
    
    if (!structure || !text) return issues;
    
    const headings = structure.headings || [];
    const sections = structure.sections || [];
    const citations = structure.citations || [];
    
    // 1. Check for required sections
    const hasAbstract = sections.some(s => s.type === 'abstract') || text.toLowerCase().includes('abstract');
    const hasReferences = sections.some(s => s.type === 'references') || text.toLowerCase().includes('references');
    const wordCount = text.split(/\s+/).length;
    
    if (wordCount > 1000 && !hasAbstract) {
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
    
    if (!hasReferences && citations.length > 0) {
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
    
    return issues;
  }
  
  /**
   * Fallback structure analysis
   */
  analyzeBasicStructure(text) {
    const issues = [];
    
    if (!text) return issues;
    
    console.log('🏗️ Basic structure analysis starting...');
    
    const hasReferences = text.toLowerCase().includes('references');
    const hasCitations = /\([^)]+,\s*\d{4}\)/.test(text);
    
    console.log('Has references section:', hasReferences);
    console.log('Has citations:', hasCitations);
    
    if (hasCitations && !hasReferences) {
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
    
    console.log(`Basic structure analysis found ${issues.length} issues`);
    return issues;
  }
  
  /**
   * Analyze citations with extracted citation data
   */
  analyzeCitations(text, extractedCitations) {
    const issues = [];
    
    console.log('📚 Analyzing citations with structure data...');
    
    // Use extracted citations for more accurate analysis
    const citations = extractedCitations || [];
    
    citations.forEach((citation, index) => {
      // Check author-year format - SAFE ACCESS
      if (!citation.year || !citation.author) {
        issues.push({
          title: "Incomplete citation",
          description: "Citation missing author or year",
          text: citation.text || 'Unknown citation',
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
      if (citation.text && !citation.text.includes(`, ${citation.year}`)) {
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
    });
    
    return issues;
  }
  
  /**
   * Fallback citation analysis
   */
  analyzeBasicCitations(text) {
    const issues = [];
    
    if (!text) return issues;
    
    console.log('📝 Basic citation analysis starting...');
    console.log('Text length:', text.length);
    console.log('Text sample:', text.substring(0, 200));
    
    // Enhanced citation patterns to catch all APA violations
    
    // 1. Check for citations missing commas (Author YEAR) format
    const missingCommaPattern = /\(([A-Za-z][A-Za-z\s&.,]+)\s+(\d{4})\)/g;
    let missingCommaMatch;
    while ((missingCommaMatch = missingCommaPattern.exec(text)) !== null) {
      const fullCitation = missingCommaMatch[0];
      console.log(`Found citation missing comma:`, fullCitation);
      
      issues.push({
        title: "Missing comma in citation",
        description: "Citations must have a comma between author and year",
        text: fullCitation,
        severity: "Minor", 
        category: "citations",
        hasFix: true,
        fixAction: "addCitationComma",
        explanation: "APA format requires a comma between author name(s) and year: (Author, YEAR)."
      });
    }
    
    // 2. Standard citation pattern with comma (Author, YEAR)
    const citationPattern = /\(([^)]+),\s*(\d{4})[^)]*\)/g;
    let match;
    let citationCount = 0;
    
    while ((match = citationPattern.exec(text)) !== null) {
      citationCount++;
      const fullCitation = match[0];
      const authorPart = match[1];
      
      console.log(`Found citation ${citationCount}:`, fullCitation);
      
      // Check for incorrect ampersand usage
      if (authorPart.includes(' and ') && fullCitation.includes('(')) {
        issues.push({
          title: "Incorrect connector in parenthetical citation",
          description: "Use '&' instead of 'and' in parenthetical citations",
          text: fullCitation,
          severity: "Minor",
          category: "citations",
          hasFix: true,
          fixAction: "fixParentheticalConnector",
          explanation: "In parenthetical citations, use & to connect author names."
        });
      }
      
      // Check for incorrect et al. formatting
      if (authorPart.includes(', et al.')) {
        issues.push({
          title: "Incorrect et al. formatting",
          description: "No comma before 'et al.' in citations",
          text: fullCitation,
          severity: "Minor",
          category: "citations", 
          hasFix: true,
          fixAction: "fixEtAlFormatting",
          explanation: "Use 'et al.' without a comma: (Smith et al., 2021)."
        });
      }
    }
    
    console.log(`Found ${citationCount} total citations`);
    
    // 3. Analyze References section for consistency issues
    const referencesSection = text.match(/REFERENCES([\s\S]*?)(?=\n\n[A-Z]|$)/i);
    if (referencesSection) {
      const referencesText = referencesSection[1];
      console.log('Found references section, analyzing...');
      
      // Check for "and" instead of "&" in references
      const andInReferencesPattern = /^[^.]+,\s+[^,]+,\s+and\s+[^,]+\./gm;
      let andMatch;
      while ((andMatch = andInReferencesPattern.exec(referencesText)) !== null) {
        issues.push({
          title: "Incorrect connector in reference",
          description: "Use '&' instead of 'and' in reference list",
          text: andMatch[0],
          severity: "Minor",
          category: "references",
          hasFix: true,
          fixAction: "fixReferenceConnector",
          explanation: "In reference lists, use & (ampersand) to connect author names, not 'and'."
        });
      }
      
      // Check for missing DOI/URL when available
      const lines = referencesText.split('\n').filter(line => line.trim().length > 0);
      lines.forEach((line, index) => {
        if (line.match(/^\s*[A-Z]/)) { // Reference entry line
          if (!line.includes('doi:') && !line.includes('http') && !line.includes('Retrieved from')) {
            if (line.toLowerCase().includes('journal') || line.toLowerCase().includes('article')) {
              issues.push({
                title: "Missing DOI or URL",
                description: "Journal articles should include DOI or URL when available",
                text: line.substring(0, 100) + '...',
                severity: "Minor",
                category: "references",
                hasFix: false,
                explanation: "Include DOI (preferred) or URL for journal articles and online sources when available."
              });
            }
          }
        }
      });
    }
    
    // 4. Check for title page issues
    const titlePageIssues = this.analyzeTitlePage(text);
    issues.push(...titlePageIssues);
    
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
    
    console.log(`Basic citation analysis found ${issues.length} issues`);
    return issues;
  }
  
  /**
   * Analyze title page structure
   */
  analyzeTitlePage(text) {
    const issues = [];
    
    if (!text) return issues;
    
    console.log('📄 Analyzing title page structure...');
    
    const firstPage = text.substring(0, 1500); // First ~1500 chars for title page
    
    // Check for required elements in order
    const lines = firstPage.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length < 3) {
      issues.push({
        title: "Incomplete title page",
        description: "Title page appears to be missing required elements",
        severity: "Major",
        category: "structure",
        hasFix: false,
        explanation: "APA title page requires: paper title, author name(s), institutional affiliation, and author note."
      });
      return issues;
    }
    
    // Check if title is centered (simple heuristic - no excessive leading spaces)
    const possibleTitle = lines[0];
    if (possibleTitle.length > 5 && possibleTitle.startsWith('  ')) {
      // This might indicate improper formatting, but it's hard to detect without rich formatting
      console.log('Possible title formatting issue detected');
    }
    
    // Check for common title page issues
    const titlePageText = firstPage.toLowerCase();
    
    // Check for missing running head
    if (!titlePageText.includes('running head') && !titlePageText.includes('page')) {
      issues.push({
        title: "Missing running head",
        description: "Title page should include a running head (for professional papers)",
        severity: "Minor", 
        category: "structure",
        hasFix: false,
        explanation: "Professional papers require a running head on the title page and throughout the document."
      });
    }
    
    // Check for author-year format in text (might indicate missing proper citation)
    const hasInlineCitations = /\([A-Za-z]+,?\s+\d{4}\)/.test(firstPage);
    if (hasInlineCitations) {
      issues.push({
        title: "Citations on title page",
        description: "Title page should not contain in-text citations",
        severity: "Minor",
        category: "structure", 
        hasFix: false,
        explanation: "The title page should contain only title, author, affiliation information - no citations."
      });
    }
    
    console.log(`Title page analysis found ${issues.length} issues`);
    return issues;
  }
  
  /**
   * Analyze references section
   */
  analyzeReferences(text, structure) {
    const issues = [];
    
    if (!text) return issues;
    
    console.log('📖 Analyzing references...');
    
    // Simple check - if we have citations but no references section
    const hasReferences = text.toLowerCase().includes('references');
    const hasCitations = /\([^)]+,?\s*\d{4}\)/.test(text);
    
    console.log('References check - has references:', hasReferences, 'has citations:', hasCitations);
    
    if (hasCitations && !hasReferences) {
      issues.push({
        title: "Missing References section",
        description: "Document has citations but no References section",
        severity: "Critical",
        category: "structure",
        hasFix: true,
        fixAction: "addReferencesHeader",
        explanation: "All APA papers must include a References section."
      });
      console.log('Added missing references issue');
    }
    
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
    
    return issues;
  }
  
  /**
   * Analyze content for APA compliance
   */
  analyzeContent(text) {
    const issues = [];
    
    if (!text) return issues;
    
    console.log('📄 Analyzing content compliance...');
    
    // Check for excessive first person usage
    const firstPersonPattern = /\b(I|me|my|mine|we|us|our|ours)\b/gi;
    const firstPersonMatches = text.match(firstPersonPattern) || [];
    const wordCount = text.split(/\s+/).length;
    
    if (firstPersonMatches.length > wordCount * 0.02) { // More than 2%
      issues.push({
        title: "Excessive first-person usage",
        description: "Consider reducing first-person pronouns in formal academic writing",
        text: `Found ${firstPersonMatches.length} instances`,
        severity: "Minor",
        category: "content",
        hasFix: false,
        explanation: "While not prohibited, excessive first-person usage should be avoided in formal academic writing."
      });
    }
    
    console.log(`Content analysis found ${issues.length} issues`);
    return issues;
  }
  
  /**
   * Helper methods
   */
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

// Usage function that matches what your store expects
export function analyzeAPADocument(documentData) {
  const analyzer = new EnhancedAPAAnalyzer();
  return analyzer.analyzeDocument(documentData);
}