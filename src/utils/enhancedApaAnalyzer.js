// src/utils/enhancedApaAnalyzer.js - Enhanced with reference and table/figure validation
'use client';

// Import specialized validators
import { ReferenceValidator } from './referenceValidator';
import { TableFigureValidator } from './tableFigureValidator';
import { HeaderFooterValidator } from './headerFooterValidator';
import { AdvancedCitationValidator } from './advancedCitationValidator';
import { QuotationValidator } from './quotationValidator';
import { StatisticalValidator } from './statisticalValidator';
import { BiasFreeLanguageValidator } from './biasFreeLanguageValidator';
import { ComprehensiveValidator } from './comprehensiveValidator';
import { AdditionalAPARules } from './additionalApaRules';

// Enhanced APA 7th Edition Analyzer that works with rich document formatting data
export class EnhancedAPAAnalyzer {
  constructor(validators = {}) {
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

    // Initialize specialized validators with dependency injection
    // Allow injection of custom validators for testing and modularity
    this.referenceValidator = validators.referenceValidator || new ReferenceValidator();
    this.tableFigureValidator = validators.tableFigureValidator || new TableFigureValidator();
    this.headerFooterValidator = validators.headerFooterValidator || new HeaderFooterValidator();
    this.advancedCitationValidator = validators.advancedCitationValidator || new AdvancedCitationValidator();
    this.quotationValidator = validators.quotationValidator || new QuotationValidator();
    this.statisticalValidator = validators.statisticalValidator || new StatisticalValidator();
    this.biasFreeLanguageValidator = validators.biasFreeLanguageValidator || new BiasFreeLanguageValidator();
    this.comprehensiveValidator = validators.comprehensiveValidator || new ComprehensiveValidator();
  }

  /**
   * Factory method to create analyzer with default validators
   * Useful for production use while maintaining testability
   */
  static createDefault() {
    return new EnhancedAPAAnalyzer();
  }

  /**
   * Factory method to create analyzer with custom validators
   * Useful for testing and modularity
   */
  static createWithValidators(validators) {
    return new EnhancedAPAAnalyzer(validators);
  }

  /**
   * Main analysis function - works with rich document data from server
   */
  analyzeDocument(documentData) {
    const issues = [];

    // Comprehensive input validation
    if (!documentData) {
      console.error('❌ analyzeDocument called with null/undefined documentData');
      issues.push({
        id: 'invalid-document-data',
        title: 'Invalid document data',
        description: 'Document analysis failed due to missing document data',
        severity: 'Critical',
        category: 'document',
        hasFix: false,
        explanation: 'The document could not be analyzed because no document data was provided.'
      });
      return issues;
    }

    // Safely extract data with defaults and type checking
    const {
      text = '',
      html = '',
      formatting = null,
      structure = null
    } = documentData;

    // Validate required fields
    if (!text && !html) {
      console.error('❌ Document has no text or HTML content');
      issues.push({
        id: 'no-content',
        title: 'Empty document',
        description: 'Document contains no readable text content',
        severity: 'Critical',
        category: 'document',
        hasFix: false,
        explanation: 'The document appears to be empty or could not be processed properly.'
      });
      return issues;
    }

    // Validate text content
    if (typeof text !== 'string') {
      console.warn('⚠️ Document text is not a string, converting...');
      text = String(text || '');
    }

    // Validate HTML content
    if (typeof html !== 'string') {
      console.warn('⚠️ Document HTML is not a string, converting...');
      html = String(html || '');
    }

    console.log(`📊 Analyzing document: ${text.length} chars text, ${html.length} chars HTML, formatting: ${!!formatting}, structure: ${!!structure}`);

    try {
      // 1. Analyze formatting with precise data (if available)
      if (formatting && typeof formatting === 'object') {
        issues.push(...this.analyzeFormatting(formatting));
      } else {
        console.warn('⚠️ No valid formatting data available - using basic analysis');
        issues.push(...this.analyzeBasicFormatting(html));
      }
    } catch (error) {
      console.error('❌ Error in formatting analysis:', error);
      issues.push(this.createErrorIssue('formatting-analysis-error', 'Formatting analysis failed', error.message));
    }

    try {
      // 2. Analyze document structure
      if (structure && typeof structure === 'object' && text) {
        issues.push(...this.analyzeStructure(structure, text));
      } else if (text) {
        console.warn('⚠️ No valid structure data available - using text-based analysis');
        issues.push(...this.analyzeBasicStructure(text));
      }
    } catch (error) {
      console.error('❌ Error in structure analysis:', error);
      issues.push(this.createErrorIssue('structure-analysis-error', 'Structure analysis failed', error.message));
    }

    try {
      // 3. Analyze citations - use basic analysis for better results
      if (text) {
        console.log('📚 Using basic citation analysis for better coverage...');
        issues.push(...this.analyzeBasicCitations(text));
      }
    } catch (error) {
      console.error('❌ Error in citation analysis:', error);
      issues.push(this.createErrorIssue('citation-analysis-error', 'Citation analysis failed', error.message));
    }

    try {
      // 4. Analyze references with enhanced validation including deep formatting
      if (text) {
        // Safely extract italicized text
        const italicizedText = (structure && Array.isArray(structure.italicizedText)) ? structure.italicizedText : [];
        const referenceIssues = this.referenceValidator.validateReferences(text, structure, italicizedText);
        issues.push(...(Array.isArray(referenceIssues) ? referenceIssues : []));
      }
    } catch (error) {
      console.error('❌ Error in reference validation:', error);
      issues.push(this.createErrorIssue('reference-validation-error', 'Reference validation failed', error.message));
    }

    try {
      // 5. Analyze tables and figures including border validation
      if (text) {
        // Enhanced validation with table border information from XML
        const tableFigureIssues = this.tableFigureValidator.validateTablesAndFigures(text, structure, formatting);
        issues.push(...(Array.isArray(tableFigureIssues) ? tableFigureIssues : []));

        // Add table border validation if XML data is available
        if (structure && Array.isArray(structure.tables)) {
          const borderIssues = this.validateTableBorders(structure.tables);
          issues.push(...(Array.isArray(borderIssues) ? borderIssues : []));
        }
      }
    } catch (error) {
      console.error('❌ Error in table/figure validation:', error);
      issues.push(this.createErrorIssue('table-figure-error', 'Table/figure validation failed', error.message));
    }

    try {
      // 6. Analyze headers, footers, running heads, and page numbers
      if (text && structure && typeof structure === 'object') {
        const headerFooterIssues = this.headerFooterValidator.validateHeadersFooters(text, structure);
        issues.push(...(Array.isArray(headerFooterIssues) ? headerFooterIssues : []));
      }
    } catch (error) {
      console.error('❌ Error in header/footer validation:', error);
      issues.push(this.createErrorIssue('header-footer-error', 'Header/footer validation failed', error.message));
    }

    try {
      // 7. Advanced citation validation
      if (text) {
        const advancedCitationIssues = this.advancedCitationValidator.validateAdvancedCitations(text, structure);
        issues.push(...(Array.isArray(advancedCitationIssues) ? advancedCitationIssues : []));
      }
    } catch (error) {
      console.error('❌ Error in advanced citation validation:', error);
      issues.push(this.createErrorIssue('advanced-citation-error', 'Advanced citation validation failed', error.message));
    }

    try {
      // 8. Quotation handling validation
      if (text) {
        const quotationIssues = this.quotationValidator.validateQuotations(text, structure);
        issues.push(...(Array.isArray(quotationIssues) ? quotationIssues : []));
      }
    } catch (error) {
      console.error('❌ Error in quotation validation:', error);
      issues.push(this.createErrorIssue('quotation-error', 'Quotation validation failed', error.message));
    }

    try {
      // 9. Statistical and numerical formatting
      if (text) {
        const statisticalIssues = this.statisticalValidator.validateStatistical(text, structure);
        issues.push(...(Array.isArray(statisticalIssues) ? statisticalIssues : []));
      }
    } catch (error) {
      console.error('❌ Error in statistical validation:', error);
      issues.push(this.createErrorIssue('statistical-error', 'Statistical validation failed', error.message));
    }

    try {
      // 10. Bias-free language detection
      if (text) {
        const biasFreeIssues = this.biasFreeLanguageValidator.validateBiasFreeLanguage(text, structure);
        issues.push(...(Array.isArray(biasFreeIssues) ? biasFreeIssues : []));
      }
    } catch (error) {
      console.error('❌ Error in bias-free language validation:', error);
      issues.push(this.createErrorIssue('bias-free-error', 'Bias-free language validation failed', error.message));
    }

    try {
      // 11. Lists, abbreviations, and appendices
      if (text) {
        const listIssues = this.comprehensiveValidator.validateListsAndSeriation(text);
        issues.push(...(Array.isArray(listIssues) ? listIssues : []));

        const abbrIssues = this.comprehensiveValidator.validateAbbreviations(text);
        issues.push(...(Array.isArray(abbrIssues) ? abbrIssues : []));

        const appendixIssues = this.comprehensiveValidator.validateAppendixAndSupplements(text, structure);
        issues.push(...(Array.isArray(appendixIssues) ? appendixIssues : []));

        const titleIssues = this.comprehensiveValidator.validateTitleAndHeadings(text);
        issues.push(...(Array.isArray(titleIssues) ? titleIssues : []));
      }
    } catch (error) {
      console.error('❌ Error in comprehensive validation:', error);
      issues.push(this.createErrorIssue('comprehensive-error', 'Comprehensive validation failed', error.message));
    }

    try {
      // 12. Additional APA rules (footnotes, equations, legal, social media, etc.)
      if (text) {
        const additionalRulesValidator = new AdditionalAPARules();
        const additionalIssues = additionalRulesValidator.validateAdditionalRules(text, structure);
        issues.push(...(Array.isArray(additionalIssues) ? additionalIssues : []));
      }
    } catch (error) {
      console.error('❌ Error in additional rules validation:', error);
      issues.push(this.createErrorIssue('additional-rules-error', 'Additional rules validation failed', error.message));
    }
    
    // 13. Analyze content compliance (original basic content check)
    if (text) {
      issues.push(...this.analyzeContent(text));
    }
    
    
    console.log(`✅ Analysis complete: ${issues.length} issues found`);
    return this.prioritizeAndDeduplicateIssues(issues);
  }

  /**
   * Create a standardized error issue for analysis failures
   */
  createErrorIssue(id, title, errorMessage) {
    return {
      id: id,
      title: title,
      description: `Analysis failed: ${errorMessage}`,
      severity: 'Major',
      category: 'system',
      hasFix: false,
      explanation: 'An error occurred during document analysis. The validator may have encountered invalid data or a processing error.',
      error: errorMessage
    };
  }

  /**
   * Analyze formatting with precise measurements - FIXED with safe property access
   */
  analyzeFormatting(formatting) {
    const issues = [];
    
    
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
        // Find first paragraph with text to highlight
        const firstParagraphWithText = paragraphs.find(p => p.text && p.text.trim().length > 0);
        const paraIndex = firstParagraphWithText ? paragraphs.indexOf(firstParagraphWithText) : 0;
        issues.push({
          title: "Incorrect font family",
          description: `Document uses "${font.family}" instead of Times New Roman`,
          text: firstParagraphWithText ? firstParagraphWithText.text.substring(0, 50) : null,
          highlightText: firstParagraphWithText ? firstParagraphWithText.text.substring(0, 50) : null,
          severity: "Major",
          category: "formatting",
          location: { 
            type: "document", 
            section: "font", 
            paragraphIndex: paraIndex,
            charOffset: 0,
            length: firstParagraphWithText ? Math.min(50, firstParagraphWithText.text.length) : 50
          },
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
      // Find first paragraph with text to highlight
      const firstParagraphWithText = paragraphs.find(p => p.text && p.text.trim().length > 0);
      const paraIndex = firstParagraphWithText ? paragraphs.indexOf(firstParagraphWithText) : 0;
      issues.push({
        title: "Incorrect font size",
        description: `Font size is ${font.size}pt instead of 12pt`,
        text: firstParagraphWithText ? firstParagraphWithText.text.substring(0, 50) : null,
        highlightText: firstParagraphWithText ? firstParagraphWithText.text.substring(0, 50) : null,
        severity: "Major",
        category: "formatting", 
        location: { 
          type: "document", 
          section: "font", 
          paragraphIndex: paraIndex,
          charOffset: 0,
          length: firstParagraphWithText ? Math.min(50, firstParagraphWithText.text.length) : 50
        },
        hasFix: true,
        fixAction: "fixFontSize",
        explanation: "APA 7th edition requires 12-point font size."
      });
    }
    
    // Check line spacing - SAFE ACCESS
    if (spacing.line && Math.abs(spacing.line - 2.0) > 0.1) {
      // Find first paragraph with text to highlight
      const firstParagraphWithText = paragraphs.find(p => p.text && p.text.trim().length > 0);
      const paraIndex = firstParagraphWithText ? paragraphs.indexOf(firstParagraphWithText) : 0;
      issues.push({
        title: "Incorrect line spacing",
        description: `Line spacing is ${spacing.line} instead of double (2.0)`,
        text: firstParagraphWithText ? firstParagraphWithText.text.substring(0, 50) : null,
        highlightText: firstParagraphWithText ? firstParagraphWithText.text.substring(0, 50) : null,
        severity: "Major",
        category: "formatting", 
        location: { 
          type: "document", 
          section: "spacing", 
          paragraphIndex: paraIndex,
          charOffset: 0,
          length: firstParagraphWithText ? Math.min(50, firstParagraphWithText.text.length) : 50
        },
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
    
    
    const hasReferences = text.toLowerCase().includes('references');
    const hasCitations = /\([^)]+,\s*\d{4}\)/.test(text);
    
    
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
    
    return issues;
  }
  
  /**
   * Analyze citations with extracted citation data
   */
  analyzeCitations(text, extractedCitations) {
    const issues = [];
    
    
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
   * Fallback citation analysis with position tracking
   */
  analyzeBasicCitations(text) {
    const issues = [];
    
    if (!text) return issues;
    
    // Split text into paragraphs to track positions
    const paragraphs = text.split('\n');
    let globalOffset = 0;
    
    paragraphs.forEach((paragraphText, paragraphIndex) => {
      // Enhanced citation patterns to catch all APA violations
      
      // 1. Check for citations missing commas (Author YEAR) format - but exclude et al. cases
      const missingCommaPattern = /\(([A-Za-z][A-Za-z\s&.]+(?<!et\s+al))\s+(\d{4})\)/g;
      let missingCommaMatch;
      while ((missingCommaMatch = missingCommaPattern.exec(paragraphText)) !== null) {
        const fullCitation = missingCommaMatch[0];
        const authorPart = missingCommaMatch[1];
        
        // Skip if this contains et al. - handle separately
        if (authorPart.includes('et al')) continue;
        
        issues.push({
          title: "Missing comma in citation",
          description: "Citations must have a comma between author and year",
          text: fullCitation,
          highlightText: fullCitation,
          severity: "Minor", 
          category: "citations",
          location: {
            paragraphIndex: paragraphIndex,
            charOffset: missingCommaMatch.index,
            length: fullCitation.length,
            type: 'text'
          },
          hasFix: true,
          fixAction: "addCitationComma",
          explanation: "APA format requires a comma between author name(s) and year: (Author, YEAR)."
        });
      }
    
      // 2. Standard citation pattern with comma (Author, YEAR)
      const citationPattern = /\(([^)]+),\s*(\d{4})[^)]*\)/g;
      let match;
      
      while ((match = citationPattern.exec(paragraphText)) !== null) {
        const fullCitation = match[0];
        const authorPart = match[1];
        
        // Check for incorrect ampersand usage
        if (authorPart.includes(' and ') && fullCitation.includes('(')) {
          issues.push({
            title: "Incorrect connector in parenthetical citation",
            description: "Use '&' instead of 'and' in parenthetical citations",
            text: fullCitation,
            highlightText: fullCitation,
            severity: "Minor",
            category: "citations",
            location: {
              paragraphIndex: paragraphIndex,
              charOffset: match.index,
              length: fullCitation.length,
              type: 'text'
            },
            hasFix: true,
            fixAction: "fixParentheticalConnector",
            explanation: "In parenthetical citations, use & to connect author names."
          });
        }
        
        // Check for incorrect et al. formatting - APA 7th edition does NOT use comma before et al.
        if (authorPart.includes(', et al.')) {
          issues.push({
            title: "Incorrect comma before et al.",
            description: "APA 7th edition does not use comma before 'et al.' in citations",
            text: fullCitation,
            highlightText: fullCitation,
            severity: "Minor",
            category: "citations",
            location: {
              paragraphIndex: paragraphIndex,
              charOffset: match.index,
              length: fullCitation.length,
              type: 'text'
            },
            hasFix: true,
            fixAction: "fixEtAlFormatting",
            explanation: "APA 7th edition format: (Smith et al., 2021), not (Smith, et al., 2021)."
          });
        }
      }
      
      globalOffset += paragraphText.length + 1; // +1 for newline
    });
    
    
    // 3. Analyze References section for consistency issues
    const referencesSection = text.match(/REFERENCES([\s\S]*?)(?=\n\n[A-Z]|$)/i);
    if (referencesSection) {
      const referencesText = referencesSection[1];
      
      // Check for "and" instead of "&" in references
      const andInReferencesPattern = /^[^.]+,\s+[^,]+,\s+and\s+[^,]+\./gm;
      let andMatch;
      while ((andMatch = andInReferencesPattern.exec(referencesText)) !== null) {
        issues.push({
          title: "Incorrect connector in reference",
          description: "Use '&' instead of 'and' in reference list",
          text: andMatch[0],
          highlightText: andMatch[0],
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
    
    // 5. Check for spacing issues around citations
    const spacingIssuePattern = /[^\s]\(([^)]+,\s*\d{4})\)|(\([^)]+,\s*\d{4}\))[^\s.,;]/g;
    let spacingMatch;
    while ((spacingMatch = spacingIssuePattern.exec(text)) !== null) {
      issues.push({
        title: "Citation spacing error",
        description: "Citations need proper spacing before and after",
        text: spacingMatch[0],
        highlightText: spacingMatch[0],
        severity: "Minor",
        category: "formatting",
        hasFix: false,
        explanation: "There should be a space before opening parenthesis and proper punctuation after citations."
      });
    }
    
    // 6. Check for URLs in text that should be properly formatted
    const urlInTextPattern = /https?:\/\/[^\s)]+/g;
    let urlMatch;
    while ((urlMatch = urlInTextPattern.exec(text)) !== null) {
      if (!text.includes('Retrieved from') || !text.includes('doi:')) {
        issues.push({
          title: "URL formatting in text",
          description: "URLs should be properly formatted in references, not embedded in text",
          text: urlMatch[0],
          highlightText: urlMatch[0],
          severity: "Minor",
          category: "formatting",
          hasFix: false,
          explanation: "URLs should appear in the reference list, not embedded in the main text."
        });
      }
    }
    
    // 7. Check for ALL CAPS headings (more precise detection)
    const allCapsHeadingPattern = /\n\s*([A-Z][A-Z\s]{8,})\s*\n/g;
    let titleMatch;
    while ((titleMatch = allCapsHeadingPattern.exec(text)) !== null) {
      const heading = titleMatch[1].trim();
      // Only flag if it's truly ALL CAPS and looks like a heading
      if (heading.length > 8 && heading === heading.toUpperCase() && 
          !heading.includes('(') && !heading.includes(',') && 
          heading.split(' ').length <= 8) {
        issues.push({
          title: "ALL CAPS heading detected",
          description: "Headings should use title case or sentence case, not ALL CAPS",
          text: heading,
          highlightText: heading,
          severity: "Minor",
          category: "formatting", 
          hasFix: true,
          fixAction: "fixAllCapsHeading",
          explanation: "APA 7th edition headings should use title case (Level 1-3) or sentence case (Level 4-5), not ALL CAPS."
        });
      }
    }
    
    // 8. Check for paragraph structure (multiple consecutive line breaks)
    const excessiveBreaksPattern = /\n\s*\n\s*\n\s*\n/g;
    if (excessiveBreaksPattern.test(text)) {
      issues.push({
        title: "Excessive line spacing",
        description: "Too many blank lines between paragraphs",
        severity: "Minor",
        category: "formatting",
        hasFix: false,
        explanation: "APA format uses double-spacing with no extra blank lines between paragraphs."
      });
    }
    
    // 9. Check for sentences ending without punctuation with position tracking
    const incompleteSentencePattern = /[a-z]\s+[A-Z][a-z]/g;
    let incompleteMatch;
    let sentenceIssueCount = 0;
    while ((incompleteMatch = incompleteSentencePattern.exec(text)) && sentenceIssueCount < 3) {
      const matchIndex = incompleteMatch.index;
      const context = text.substring(Math.max(0, matchIndex - 30), matchIndex + 50);
      
      // Skip if this looks like an abbreviation or proper formatting
      if (context.includes('Dr.') || context.includes('Mr.') || context.includes('Ms.') ||
          context.includes('etc.') || context.includes('i.e.') || context.includes('e.g.') ||
          context.match(/\d+\s+[A-Z]/) || // Numbers followed by caps (like page numbers)
          context.includes('(') || context.includes(')')) {
        continue;
      }
      
      // Find the paragraph containing this issue
      const textBefore = text.substring(0, matchIndex);
      const paragraphIndex = (textBefore.match(/\n/g) || []).length;
      const lastNewline = textBefore.lastIndexOf('\n');
      const charOffset = Math.max(0, matchIndex - lastNewline - 1 - 30); // Include context
      
      sentenceIssueCount++;
      issues.push({
        title: "Possible missing punctuation",
        description: "Check if sentence needs proper punctuation",
        text: context.trim().substring(0, 60) + '...',
        highlightText: context.trim(),
        severity: "Minor",
        category: "formatting",
        location: {
          paragraphIndex: paragraphIndex,
          charOffset: charOffset,
          length: Math.min(80, context.length),
          type: 'text'
        },
        hasFix: false,
        explanation: "Sentences should end with appropriate punctuation before starting a new sentence."
      });
    }
    
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
          highlightText: quoteMatch[0],
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
   * Analyze title page structure
   */
  analyzeTitlePage(text) {
    const issues = [];
    
    if (!text) return issues;
    
    
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
    
    // Check for in-text citations on title page (but be more selective)
    const citationPattern = /\([A-Za-z]+,?\s+\d{4}\)/g;
    const citationsOnTitlePage = firstPage.match(citationPattern);
    if (citationsOnTitlePage && citationsOnTitlePage.length > 0) {
      // Only flag if it's clearly in the main title page content, not in author notes
      const titlePageWithoutAuthorNote = firstPage.split('Author Note')[0];
      if (citationPattern.test(titlePageWithoutAuthorNote)) {
        issues.push({
          title: "Citations on title page",
          description: "Title page should not contain in-text citations",
          severity: "Minor",
          category: "structure", 
          hasFix: false,
          explanation: "The title page should contain only title, author, affiliation information - no citations."
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Validate table borders from XML data
   */
  validateTableBorders(tables) {
    const issues = [];
    
    tables.forEach((table, index) => {
      // Check for vertical lines (APA doesn't use them)
      if (table.hasVerticalLines) {
        issues.push({
          title: "Vertical lines in table",
          description: `Table ${index + 1} contains vertical lines which violate APA format`,
          text: `Table ${index + 1}`,
          severity: "Minor",
          category: "tables",
          hasFix: true,
          fixAction: "removeTableVerticalLines",
          explanation: "APA style tables should not use vertical lines. Use only horizontal lines for clarity."
        });
      }
      
      // Check for excessive borders
      if (table.hasFullBorders) {
        issues.push({
          title: "Excessive borders in table",
          description: `Table ${index + 1} has full borders instead of APA style minimal borders`,
          text: `Table ${index + 1}`,
          severity: "Minor",
          category: "tables",
          hasFix: true,
          fixAction: "fixTableBorders",
          explanation: "APA tables use minimal borders: horizontal lines at top, bottom, and below column headings only."
        });
      }
      
      // Check for proper APA table border style
      if (table.borderStyle) {
        const hasProperBorders = table.borderStyle.top && 
                                table.borderStyle.bottom && 
                                table.borderStyle.insideH && 
                                !table.borderStyle.left && 
                                !table.borderStyle.right && 
                                !table.borderStyle.insideV;
        
        if (!hasProperBorders && !table.hasFullBorders) {
          issues.push({
            title: "Incorrect table border style",
            description: `Table ${index + 1} doesn't follow APA border guidelines`,
            text: `Table ${index + 1}`,
            severity: "Minor",
            category: "tables",
            hasFix: true,
            fixAction: "fixTableBorderStyle",
            explanation: "APA tables should have horizontal lines at top, bottom, and after header row only."
          });
        }
      }
    });
    
    return issues;
  }

  /**
   * Legacy analyze references section - kept for backward compatibility
   * Now replaced by ReferenceValidator for comprehensive validation
   * @deprecated Use ReferenceValidator.validateReferences() instead
   */
  analyzeReferences(text, structure) {
    const issues = [];
    
    if (!text) return issues;
    
    
    // Simple check - if we have citations but no references section
    const hasReferences = text.toLowerCase().includes('references');
    const hasCitations = /\([^)]+,?\s*\d{4}\)/.test(text);
    
    
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