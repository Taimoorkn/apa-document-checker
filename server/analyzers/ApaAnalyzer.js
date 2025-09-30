// server/analyzers/ApaAnalyzer.js - Server-side APA analyzer (CommonJS)
// Placeholder implementation - will be enhanced with actual validators

/**
 * Server-side APA 7th Edition Analyzer
 * Analyzes document data and returns compliance issues
 */
class ApaAnalyzer {
  constructor() {
    this.apaStandards = {
      font: {
        family: 'times new roman',
        size: 12 // points
      },
      spacing: {
        line: 2.0, // double spacing
        paragraphAfter: 0,
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
   * Analyze document for APA compliance
   * @param {Object} documentData - Document data from XmlDocxProcessor
   * @returns {Array} Array of compliance issues
   */
  analyzeDocument(documentData) {
    const issues = [];

    // Validate input
    if (!documentData) {
      console.error('❌ analyzeDocument called with null/undefined documentData');
      return issues;
    }

    const {
      text = '',
      html = '',
      formatting = null,
      structure = null
    } = documentData;

    // Validate required fields
    if (!text && !html) {
      console.error('❌ Document has no text or HTML content');
      return issues;
    }

    console.log(`📊 Analyzing document: ${text.length} chars, ${formatting?.paragraphs?.length || 0} paragraphs`);

    try {
      // Run all validators
      this.validateFormatting(formatting, issues);
      this.validateStructure(structure, text, issues);
      this.validateReferences(text, issues);
      this.validateCitations(text, issues);

    } catch (error) {
      console.error('Error during analysis:', error);
      issues.push({
        id: `analysis-error-${Date.now()}`,
        title: 'Analysis Error',
        description: 'An error occurred during document analysis',
        severity: 'Critical',
        category: 'document',
        hasFix: false,
        explanation: error.message
      });
    }

    console.log(`✅ Analysis complete: ${issues.length} issues found`);
    return issues;
  }

  /**
   * Validate document formatting (font, spacing, margins)
   */
  validateFormatting(formatting, issues) {
    if (!formatting || !formatting.document) {
      return;
    }

    const doc = formatting.document;

    // Check font family
    if (doc.font && doc.font.family) {
      const fontFamily = doc.font.family.toLowerCase();
      if (!fontFamily.includes('times') && !fontFamily.includes('arial') &&
          !fontFamily.includes('calibri') && !fontFamily.includes('georgia')) {
        issues.push({
          id: `font-family-${Date.now()}`,
          title: 'Non-APA Compliant Font',
          description: `Document uses "${doc.font.family}" font. APA recommends Times New Roman, Arial, Calibri, or Georgia.`,
          severity: 'Major',
          category: 'Formatting',
          hasFix: true,
          fixAction: 'fixFont',
          fixValue: 'Times New Roman',
          explanation: 'APA 7th edition recommends accessible fonts like Times New Roman 12pt.'
        });
      }
    }

    // Check font size
    if (doc.font && doc.font.size) {
      if (doc.font.size < 11 || doc.font.size > 12) {
        issues.push({
          id: `font-size-${Date.now()}`,
          title: 'Non-Standard Font Size',
          description: `Document uses ${doc.font.size}pt font. APA recommends 12pt.`,
          severity: 'Major',
          category: 'Formatting',
          hasFix: true,
          fixAction: 'fixFontSize',
          fixValue: '12pt',
          explanation: 'APA 7th edition requires 12-point font size for body text.'
        });
      }
    }

    // Check line spacing
    if (doc.spacing && doc.spacing.line) {
      if (doc.spacing.line < 1.9 || doc.spacing.line > 2.1) {
        issues.push({
          id: `line-spacing-${Date.now()}`,
          title: 'Incorrect Line Spacing',
          description: `Document uses ${doc.spacing.line} line spacing. APA requires double spacing (2.0).`,
          severity: 'Major',
          category: 'Formatting',
          hasFix: true,
          fixAction: 'fixLineSpacing',
          fixValue: '2.0',
          explanation: 'APA 7th edition requires double-spaced lines throughout the document.'
        });
      }
    }

    // Check margins
    if (doc.margins) {
      const marginIssues = [];
      if (doc.margins.top && doc.margins.top < 0.9) marginIssues.push('top');
      if (doc.margins.bottom && doc.margins.bottom < 0.9) marginIssues.push('bottom');
      if (doc.margins.left && doc.margins.left < 0.9) marginIssues.push('left');
      if (doc.margins.right && doc.margins.right < 0.9) marginIssues.push('right');

      if (marginIssues.length > 0) {
        issues.push({
          id: `margins-${Date.now()}`,
          title: 'Insufficient Margins',
          description: `Document has insufficient ${marginIssues.join(', ')} margins. APA requires 1-inch margins on all sides.`,
          severity: 'Major',
          category: 'Formatting',
          hasFix: true,
          fixAction: 'fixMargins',
          fixValue: '1 inch',
          explanation: 'APA 7th edition requires 1-inch margins on all sides of the page.'
        });
      }
    }
  }

  /**
   * Validate document structure (headings, sections)
   */
  validateStructure(structure, text, issues) {
    if (!structure) {
      return;
    }

    // Check for headings
    if (structure.headings && structure.headings.length > 0) {
      // Validate heading levels
      let previousLevel = 0;
      structure.headings.forEach((heading, index) => {
        const level = heading.level || 1;

        // Check for skipped levels
        if (level - previousLevel > 1) {
          issues.push({
            id: `heading-level-skip-${index}`,
            title: 'Heading Level Skipped',
            description: `Heading "${heading.text}" skips from level ${previousLevel} to level ${level}. APA requires sequential heading levels.`,
            severity: 'Minor',
            category: 'Structure',
            hasFix: false,
            explanation: 'APA 7th edition requires heading levels to be used sequentially (Level 1, then Level 2, etc.).'
          });
        }

        previousLevel = level;
      });
    }
  }

  /**
   * Validate references section
   */
  validateReferences(text, issues) {
    // Check for "References" section
    const referencesMatch = text.match(/\b(References?|Bibliography|Works Cited)\b/i);

    if (!referencesMatch) {
      issues.push({
        id: `missing-references-${Date.now()}`,
        title: 'Missing References Section',
        description: 'No "References" section found. APA papers must include a references page.',
        severity: 'Critical',
        category: 'References',
        hasFix: false,
        explanation: 'APA 7th edition requires a "References" section listing all cited sources.'
      });
      return;
    }

    // Check for proper heading (should be "References" not "Bibliography")
    if (referencesMatch[1].toLowerCase() !== 'references') {
      issues.push({
        id: `wrong-references-heading-${Date.now()}`,
        title: 'Incorrect References Heading',
        description: `Section is titled "${referencesMatch[1]}" but should be "References" in APA style.`,
        severity: 'Major',
        category: 'References',
        hasFix: false,
        explanation: 'APA 7th edition requires the heading "References" (not "Bibliography" or "Works Cited").'
      });
    }
  }

  /**
   * Validate in-text citations
   */
  validateCitations(text, issues) {
    // Check for basic citation patterns
    const citationPattern = /\([^)]*\d{4}[^)]*\)/g;
    const citations = text.match(citationPattern) || [];

    if (citations.length === 0) {
      issues.push({
        id: `no-citations-${Date.now()}`,
        title: 'No In-Text Citations Found',
        description: 'No in-text citations detected. Academic papers should cite sources.',
        severity: 'Major',
        category: 'Citations',
        hasFix: false,
        explanation: 'APA 7th edition requires in-text citations for all referenced sources in the format (Author, Year).'
      });
    }
  }

  /**
   * Calculate compliance score based on issues
   */
  calculateComplianceScore(issues) {
    if (!issues || issues.length === 0) {
      return 100;
    }

    // Deduct points based on severity
    let totalDeduction = 0;
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'Critical':
          totalDeduction += 15;
          break;
        case 'Major':
          totalDeduction += 8;
          break;
        case 'Minor':
          totalDeduction += 3;
          break;
        default:
          totalDeduction += 5;
      }
    });

    // Cap at 0 and 100
    const score = Math.max(0, Math.min(100, 100 - totalDeduction));
    return Math.round(score);
  }
}

module.exports = ApaAnalyzer;
