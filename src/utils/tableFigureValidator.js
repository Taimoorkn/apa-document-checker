// src/utils/tableFigureValidator.js - Table and Figure APA compliance validation
'use client';

export class TableFigureValidator {
  constructor() {
    this.tablePattern = /(?:Table|TABLE)\s+(\d+\.?\d*)/gi;
    this.figurePattern = /(?:Figure|FIGURE|Fig\.|FIG\.)\s+(\d+\.?\d*)/gi;
    this.tableTitlePattern = /(?:Table|TABLE)\s+\d+\.?\d*\s*\n\s*([^\n]+)/gi;
    this.figureTitlePattern = /(?:Figure|FIGURE|Fig\.|FIG\.)\s+\d+\.?\d*\s*\n\s*([^\n]+)/gi;
  }

  /**
   * Main validation function for tables and figures
   */
  validateTablesAndFigures(text, structure, formatting) {
    const issues = [];
    
    if (!text) return issues;
    
    // Extract tables and figures
    const tables = this.extractTables(text, structure);
    const figures = this.extractFigures(text, structure);
    
    // Validate tables
    issues.push(...this.validateTables(tables, text));
    
    // Validate figures  
    issues.push(...this.validateFigures(figures, text));
    
    // Check in-text callouts
    issues.push(...this.validateCallouts(tables, figures, text));
    
    // Check for table/figure formatting in document structure
    if (formatting?.tables || formatting?.figures) {
      issues.push(...this.validateFormattingCompliance(formatting));
    }
    
    return issues;
  }

  /**
   * Extract tables from document
   */
  extractTables(text, structure) {
    const tables = [];
    const tableMatches = [...text.matchAll(this.tablePattern)];
    
    tableMatches.forEach((match, index) => {
      const number = match[1];
      const position = match.index;
      
      // Extract title
      const titleMatch = text.substring(position, position + 200).match(/Table\s+\d+\.?\d*\s*\n\s*([^\n]+)/i);
      const title = titleMatch ? titleMatch[1].trim() : '';
      
      // Extract note if present
      const noteMatch = text.substring(position, position + 500).match(/Note[.:]\s*([^\n]+)/i);
      const note = noteMatch ? noteMatch[1].trim() : '';
      
      tables.push({
        number: parseFloat(number),
        numberText: number,
        title: title,
        note: note,
        position: position,
        fullMatch: match[0],
        hasTitle: title.length > 0,
        hasNote: note.length > 0,
        titleCase: this.checkTitleCase(title),
        location: this.getLocationContext(text, position)
      });
    });
    
    return tables;
  }

  /**
   * Extract figures from document
   */
  extractFigures(text, structure) {
    const figures = [];
    const figureMatches = [...text.matchAll(this.figurePattern)];
    
    figureMatches.forEach((match, index) => {
      const number = match[1];
      const position = match.index;
      
      // Extract caption
      const captionMatch = text.substring(position, position + 200).match(/(?:Figure|Fig\.)\s+\d+\.?\d*\s*\.?\s*([^\n]+)/i);
      const caption = captionMatch ? captionMatch[1].trim() : '';
      
      // Extract note if present
      const noteMatch = text.substring(position, position + 500).match(/Note[.:]\s*([^\n]+)/i);
      const note = noteMatch ? noteMatch[1].trim() : '';
      
      figures.push({
        number: parseFloat(number),
        numberText: number,
        caption: caption,
        note: note,
        position: position,
        fullMatch: match[0],
        hasCaption: caption.length > 0,
        hasNote: note.length > 0,
        captionCase: this.checkSentenceCase(caption),
        location: this.getLocationContext(text, position)
      });
    });
    
    return figures;
  }

  /**
   * Get location context for table/figure
   */
  getLocationContext(text, position) {
    const before = text.substring(Math.max(0, position - 100), position);
    const after = text.substring(position, Math.min(text.length, position + 100));
    
    // Check if it's in references section
    const inReferences = before.toLowerCase().includes('references') || 
                        text.substring(Math.max(0, position - 500), position).toLowerCase().includes('references');
    
    // Check if it's in appendix
    const inAppendix = before.toLowerCase().includes('appendix') ||
                      text.substring(Math.max(0, position - 500), position).toLowerCase().includes('appendix');
    
    return {
      inReferences,
      inAppendix,
      contextBefore: before.substring(before.length - 50),
      contextAfter: after.substring(0, 50)
    };
  }

  /**
   * Check if text is in title case
   */
  checkTitleCase(text) {
    if (!text) return false;
    
    const words = text.split(/\s+/);
    const smallWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 
                       'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet', 'with'];
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const isSmallWord = smallWords.includes(word.toLowerCase());
      const isFirstOrLast = i === 0 || i === words.length - 1;
      
      // First and last words should be capitalized
      if (isFirstOrLast && word[0] !== word[0].toUpperCase()) {
        return false;
      }
      
      // Small words in middle should be lowercase
      if (!isFirstOrLast && isSmallWord && word[0] === word[0].toUpperCase()) {
        return false;
      }
      
      // Other words should be capitalized
      if (!isFirstOrLast && !isSmallWord && word[0] !== word[0].toUpperCase()) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if text is in sentence case
   */
  checkSentenceCase(text) {
    if (!text) return false;
    
    // First letter should be capital
    if (text[0] !== text[0].toUpperCase()) return false;
    
    // Check for proper nouns and acronyms (allow those to be capitalized)
    const words = text.split(/\s+/);
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      
      // Skip acronyms (all caps)
      if (word === word.toUpperCase() && word.length > 1) continue;
      
      // Skip words after colons
      if (i > 0 && words[i-1].endsWith(':')) continue;
      
      // Regular words should be lowercase
      if (word[0] === word[0].toUpperCase() && word !== word.toUpperCase()) {
        // Could be a proper noun, but flag if too many
        const capsCount = words.filter(w => w[0] === w[0].toUpperCase()).length;
        if (capsCount > words.length * 0.3) return false;
      }
    }
    
    return true;
  }

  /**
   * Validate tables
   */
  validateTables(tables, text) {
    const issues = [];
    
    // Check numbering sequence
    const numberingIssues = this.checkNumberingSequence(tables, 'Table');
    issues.push(...numberingIssues);
    
    tables.forEach((table, index) => {
      // Check for missing title
      if (!table.hasTitle || table.title.length < 5) {
        issues.push({
          title: "Missing or incomplete table title",
          description: `Table ${table.numberText} lacks a descriptive title`,
          text: table.fullMatch,
          severity: "Major",
          category: "tables",
          hasFix: false,
          explanation: "Every table must have a brief, descriptive title in title case placed above the table."
        });
      } else if (!table.titleCase) {
        // Check title case
        issues.push({
          title: "Incorrect table title capitalization",
          description: `Table ${table.numberText} title should use title case`,
          text: table.title,
          severity: "Minor",
          category: "tables",
          hasFix: true,
          fixAction: "fixTableTitleCase",
          explanation: "Table titles should use title case capitalization (major words capitalized)."
        });
      }
      
      // Check table placement
      if (table.location.inReferences) {
        issues.push({
          title: "Table in references section",
          description: `Table ${table.numberText} appears in the References section`,
          text: table.fullMatch,
          severity: "Major",
          category: "tables",
          hasFix: false,
          explanation: "Tables should appear in the main text or appendices, not in the References section."
        });
      }
      
      // Check for table note formatting
      if (table.hasNote && !table.note.startsWith('Note.')) {
        issues.push({
          title: "Incorrect table note format",
          description: `Table ${table.numberText} note should start with 'Note.' in italics`,
          text: table.note.substring(0, 50),
          severity: "Minor",
          category: "tables",
          hasFix: true,
          fixAction: "fixTableNoteFormat",
          explanation: "Table notes should begin with 'Note.' in italics, followed by the note text."
        });
      }
    });
    
    return issues;
  }

  /**
   * Validate figures
   */
  validateFigures(figures, text) {
    const issues = [];
    
    // Check numbering sequence
    const numberingIssues = this.checkNumberingSequence(figures, 'Figure');
    issues.push(...numberingIssues);
    
    figures.forEach((figure, index) => {
      // Check for missing caption
      if (!figure.hasCaption || figure.caption.length < 5) {
        issues.push({
          title: "Missing or incomplete figure caption",
          description: `Figure ${figure.numberText} lacks a descriptive caption`,
          text: figure.fullMatch,
          severity: "Major",
          category: "figures",
          hasFix: false,
          explanation: "Every figure must have a brief, descriptive caption in sentence case placed below the figure."
        });
      } else if (!figure.captionCase) {
        // Check sentence case
        issues.push({
          title: "Incorrect figure caption capitalization",
          description: `Figure ${figure.numberText} caption should use sentence case`,
          text: figure.caption,
          severity: "Minor",
          category: "figures",
          hasFix: true,
          fixAction: "fixFigureCaptionCase",
          explanation: "Figure captions should use sentence case (only first word and proper nouns capitalized)."
        });
      }
      
      // Check figure placement
      if (figure.location.inReferences) {
        issues.push({
          title: "Figure in references section",
          description: `Figure ${figure.numberText} appears in the References section`,
          text: figure.fullMatch,
          severity: "Major",
          category: "figures",
          hasFix: false,
          explanation: "Figures should appear in the main text or appendices, not in the References section."
        });
      }
      
      // Check for copyright/permission note if needed
      const needsCopyright = figure.caption.includes('from') || 
                            figure.caption.includes('adapted') || 
                            figure.caption.includes('reprinted');
      
      if (needsCopyright && !figure.note.includes('Copyright') && !figure.note.includes('permission')) {
        issues.push({
          title: "Missing copyright information",
          description: `Figure ${figure.numberText} may need copyright attribution`,
          text: figure.caption.substring(0, 50),
          severity: "Minor",
          category: "figures",
          hasFix: false,
          explanation: "Figures adapted or reprinted from other sources need copyright attribution in the note."
        });
      }
    });
    
    return issues;
  }

  /**
   * Check numbering sequence
   */
  checkNumberingSequence(items, type) {
    const issues = [];
    
    if (items.length < 2) return issues;
    
    // Sort by position to check sequence
    const sortedItems = [...items].sort((a, b) => a.position - b.position);
    
    let expectedNumber = 1;
    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      
      // Check if it's a sub-number (e.g., Table 2.1)
      const isSubNumber = item.numberText.includes('.');
      
      if (item.number !== expectedNumber) {
        if (!isSubNumber && Math.abs(item.number - expectedNumber) > 0.1) {
          issues.push({
            title: `${type} numbering sequence error`,
            description: `${type} ${item.numberText} appears out of sequence (expected ${type} ${expectedNumber})`,
            text: item.fullMatch,
            severity: "Major",
            category: type.toLowerCase() + 's',
            hasFix: true,
            fixAction: `fix${type}Numbering`,
            explanation: `${type}s must be numbered consecutively in the order they appear in the text.`
          });
          break; // Only report first sequence error
        }
      }
      
      if (!isSubNumber) {
        expectedNumber = item.number + 1;
      }
    }
    
    return issues;
  }

  /**
   * Validate in-text callouts
   */
  validateCallouts(tables, figures, text) {
    const issues = [];
    const reportedMissing = new Set();
    
    // Check table callouts
    tables.forEach(table => {
      const calloutPattern = new RegExp(`(?:see |See |shown in |displayed in |presented in )?Table\\s+${table.numberText}(?![\\d.])`, 'gi');
      const hasCallout = calloutPattern.test(text.substring(0, table.position));
      
      if (!hasCallout && !reportedMissing.has('table')) {
        issues.push({
          title: "Missing table callout",
          description: `Table ${table.numberText} is not referenced in the text before it appears`,
          text: `Table ${table.numberText}`,
          severity: "Major",
          category: "tables",
          hasFix: false,
          explanation: "Every table must be called out (mentioned) in the text before it appears."
        });
        reportedMissing.add('table');
      }
    });
    
    // Check figure callouts
    figures.forEach(figure => {
      const calloutPattern = new RegExp(`(?:see |See |shown in |displayed in |illustrated in )?(?:Figure|Fig\\.)\\s+${figure.numberText}(?![\\d.])`, 'gi');
      const hasCallout = calloutPattern.test(text.substring(0, figure.position));
      
      if (!hasCallout && !reportedMissing.has('figure')) {
        issues.push({
          title: "Missing figure callout",
          description: `Figure ${figure.numberText} is not referenced in the text before it appears`,
          text: `Figure ${figure.numberText}`,
          severity: "Major",
          category: "figures",
          hasFix: false,
          explanation: "Every figure must be called out (mentioned) in the text before it appears."
        });
        reportedMissing.add('figure');
      }
    });
    
    // Check for callouts to non-existent tables/figures
    const tableCalloutPattern = /(?:see |See |shown in |displayed in |presented in )?Table\s+(\d+\.?\d*)/gi;
    const existingTableNumbers = new Set(tables.map(t => t.numberText));
    
    let match;
    while ((match = tableCalloutPattern.exec(text)) !== null) {
      const calledNumber = match[1];
      if (!existingTableNumbers.has(calledNumber) && !reportedMissing.has('missing-table-' + calledNumber)) {
        issues.push({
          title: "Reference to non-existent table",
          description: `Text references Table ${calledNumber} which doesn't exist`,
          text: match[0],
          severity: "Critical",
          category: "tables",
          hasFix: false,
          explanation: "All tables referenced in the text must actually exist in the document."
        });
        reportedMissing.add('missing-table-' + calledNumber);
      }
    }
    
    const figureCalloutPattern = /(?:see |See |shown in |displayed in |illustrated in )?(?:Figure|Fig\.)\s+(\d+\.?\d*)/gi;
    const existingFigureNumbers = new Set(figures.map(f => f.numberText));
    
    while ((match = figureCalloutPattern.exec(text)) !== null) {
      const calledNumber = match[1];
      if (!existingFigureNumbers.has(calledNumber) && !reportedMissing.has('missing-figure-' + calledNumber)) {
        issues.push({
          title: "Reference to non-existent figure",
          description: `Text references Figure ${calledNumber} which doesn't exist`,
          text: match[0],
          severity: "Critical",
          category: "figures",
          hasFix: false,
          explanation: "All figures referenced in the text must actually exist in the document."
        });
        reportedMissing.add('missing-figure-' + calledNumber);
      }
    }
    
    return issues;
  }

  /**
   * Validate formatting compliance from document structure
   */
  validateFormattingCompliance(formatting) {
    const issues = [];
    
    // Check table formatting if available
    if (formatting.tables) {
      formatting.tables.forEach((table, index) => {
        // Check for vertical lines (APA doesn't use them)
        if (table.hasVerticalLines) {
          issues.push({
            title: "Vertical lines in table",
            description: `Table ${index + 1} contains vertical lines`,
            text: `Table ${index + 1}`,
            severity: "Minor",
            category: "tables",
            hasFix: true,
            fixAction: "removeTableVerticalLines",
            explanation: "APA style tables should not use vertical lines, only horizontal lines for clarity."
          });
        }
        
        // Check for borders
        if (table.hasFullBorders) {
          issues.push({
            title: "Excessive borders in table",
            description: `Table ${index + 1} has full borders instead of APA style`,
            text: `Table ${index + 1}`,
            severity: "Minor",
            category: "tables",
            hasFix: true,
            fixAction: "fixTableBorders",
            explanation: "APA tables use minimal borders: top and bottom of table, and below column headings."
          });
        }
      });
    }
    
    // Check figure formatting if available
    if (formatting.figures) {
      formatting.figures.forEach((figure, index) => {
        // Check image quality/resolution notes
        if (figure.lowResolution) {
          issues.push({
            title: "Low resolution figure",
            description: `Figure ${index + 1} appears to have low resolution`,
            text: `Figure ${index + 1}`,
            severity: "Minor",
            category: "figures",
            hasFix: false,
            explanation: "Figures should be high resolution for clarity in print and digital formats."
          });
        }
      });
    }
    
    return issues;
  }
}