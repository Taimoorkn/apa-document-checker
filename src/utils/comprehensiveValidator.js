// src/utils/comprehensiveValidator.js - Lists, abbreviations, and appendix validation
'use client';

export class ComprehensiveValidator {
  constructor() {
    this.commonAbbreviations = {
      'e.g.': 'for example',
      'i.e.': 'that is',
      'etc.': 'and so forth',
      'vs.': 'versus',
      'cf.': 'compare',
      'viz.': 'namely'
    };
  }

  /**
   * Validate lists and seriation
   */
  validateListsAndSeriation(text) {
    const issues = [];
    
    // Check bulleted lists
    const bulletPatterns = [/^[•·▪▫◦‣⁃]\s+/gm, /^\*\s+/gm, /^-\s+/gm];
    let hasBullets = false;
    
    bulletPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        hasBullets = true;
      }
    });
    
    if (hasBullets) {
      // Check for parallel structure in lists
      const bulletLines = text.split('\n').filter(line => 
        bulletPatterns.some(p => p.test(line))
      );
      
      
      // Check for punctuation consistency
      const withPeriods = bulletLines.filter(line => line.trim().endsWith('.')).length;
      const withoutPeriods = bulletLines.filter(line => 
        !line.trim().endsWith('.') && line.trim().length > 0
      ).length;
      
      if (withPeriods > 0 && withoutPeriods > 0) {
        issues.push({
          title: "Inconsistent list punctuation",
          description: "List items have mixed punctuation",
          severity: "Minor",
          category: "lists",
          hasFix: false,
          explanation: "Use periods for all items (complete sentences) or none (fragments)"
        });
      }
    }
    
    // Check numbered lists
    const numberedPattern = /^\d+[.)]\s+/gm;
    const numberedLines = text.split('\n').filter(line => numberedPattern.test(line));
    
    if (numberedLines.length > 1) {
      // Check sequence
      const numbers = numberedLines.map(line => 
        parseInt(line.match(/^(\d+)/)[1])
      );
      
      for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] !== numbers[i-1] + 1) {
          issues.push({
            title: "Numbered list sequence error",
            description: "Numbered list has non-consecutive numbers",
            text: `${numbers[i-1]} followed by ${numbers[i]}`,
            severity: "Minor",
            category: "lists",
            hasFix: true,
            fixAction: "fixListNumbering",
            explanation: "Number lists consecutively: 1, 2, 3..."
          });
          break;
        }
      }
    }
    
    // Check in-sentence series (serial comma)
    const seriesPattern = /\b\w+,\s+\w+(?:,\s+\w+)*,?\s+and\s+\w+/g;
    const seriesMatches = text.match(seriesPattern) || [];
    
    seriesMatches.forEach(series => {
      const items = series.split(/,|\s+and\s+/).map(s => s.trim());
      if (items.length >= 3) {
        // Check for Oxford/serial comma
        if (!series.includes(', and')) {
          issues.push({
            title: "Missing serial comma",
            description: "APA requires serial comma before 'and' in lists",
            text: series,
            severity: "Minor",
            category: "lists",
            hasFix: true,
            fixAction: "addSerialComma",
            explanation: "Use: A, B, and C (not A, B and C)"
          });
        }
      }
    });
    
    // Check for complex series with semicolons
    const complexSeries = text.match(/[^.;]+;\s*[^.;]+;\s*and\s+[^.;]+/g) || [];
    complexSeries.forEach(series => {
      if (!series.includes('; and')) {
        issues.push({
          title: "Complex series punctuation",
          description: "Use semicolon before 'and' in complex series",
          text: series.substring(0, 50) + '...',
          severity: "Minor",
          category: "lists",
          hasFix: true,
          fixAction: "fixComplexSeries",
          explanation: "Complex items need: item A; item B; and item C"
        });
      }
    });
    
    return issues;
  }

  /**
   * Validate abbreviation management
   */
  validateAbbreviations(text) {
    const issues = [];
    const definedAbbreviations = new Set();
    const usedAbbreviations = new Map();
    
    // Find abbreviation definitions [ABBR] or (ABBR)
    const definitionPattern = /\b([A-Za-z][A-Za-z\s]+)\s*[\[(]([A-Z]{2,})\s*[\])]/g;
    const definitions = [...text.matchAll(definitionPattern)];
    
    definitions.forEach(match => {
      const fullTerm = match[1];
      const abbr = match[2];
      definedAbbreviations.add(abbr);
    });
    
    // Find used abbreviations (2+ capital letters)
    const abbrPattern = /\b([A-Z]{2,})\b/g;
    const abbreviations = [...text.matchAll(abbrPattern)];
    
    abbreviations.forEach(match => {
      const abbr = match[1];
      const position = match.index;
      
      // Skip common ones that don't need definition
      const skipList = ['USA', 'UK', 'US', 'AM', 'PM', 'BC', 'AD', 'DC', 'ID', 'OK', 'TV'];
      if (skipList.includes(abbr)) return;
      
      if (!usedAbbreviations.has(abbr)) {
        usedAbbreviations.set(abbr, []);
      }
      usedAbbreviations.get(abbr).push(position);
    });
    
    // Check for undefined abbreviations
    usedAbbreviations.forEach((positions, abbr) => {
      if (!definedAbbreviations.has(abbr) && positions.length > 1) {
        const firstPosition = positions[0];
        const context = text.substring(Math.max(0, firstPosition - 20), firstPosition + abbr.length + 20);
        
        issues.push({
          title: "Undefined abbreviation",
          description: `Abbreviation "${abbr}" used without definition`,
          text: context,
          severity: "Minor",
          category: "abbreviations",
          hasFix: false,
          explanation: "Define abbreviation on first use: American Psychological Association (APA)"
        });
      }
    });
    
    // Check Latin abbreviations usage
    Object.entries(this.commonAbbreviations).forEach(([abbr, meaning]) => {
      const pattern = new RegExp(`\\b${abbr.replace('.', '\\.')}`, 'g');
      const matches = text.match(pattern) || [];
      
      matches.forEach(match => {
        const position = text.indexOf(match);
        const context = text.substring(Math.max(0, position - 30), position + match.length + 30);
        
        // Check if in parentheses (required for e.g., i.e., etc.)
        const inParentheses = context.includes(`(${match}`) || 
                             context.includes(`(${meaning}`) ||
                             context.match(/\([^)]*$/);
        
        if (!inParentheses && ['e.g.', 'i.e.', 'etc.', 'cf.'].includes(abbr)) {
          issues.push({
            title: "Latin abbreviation outside parentheses",
            description: `"${abbr}" should only be used in parentheses`,
            text: context,
            severity: "Minor",
            category: "abbreviations",
            hasFix: true,
            fixAction: "replaceLatinAbbr",
            fixValue: { original: abbr, replacement: meaning },
            explanation: `In text use "${meaning}", in parentheses use "${abbr}"`
          });
        }
      })
    });
    
    // Check plural abbreviations
    const pluralAbbrPattern = /\b([A-Z]{2,})'s\b/g;
    const pluralAbbrs = text.match(pluralAbbrPattern) || [];
    
    pluralAbbrs.forEach(plural => {
      // Check if it has apostrophe (it shouldn't for plurals)
      if (plural.includes("'")) {
        issues.push({
          title: "Incorrect plural abbreviation",
          description: "Plural abbreviations don't use apostrophes",
          text: plural,
          severity: "Minor",
          category: "abbreviations",
          hasFix: true,
          fixAction: "fixPluralAbbr",
          explanation: "Use 'URLs' not 'URL's' for plurals"
        });
      }
    });
    
    return issues;
  }

  /**
   * Validate appendix and supplemental materials
   */
  validateAppendixAndSupplements(text, structure) {
    const issues = [];
    
    // Check for appendix references
    const appendixPattern = /\bAppendix\s+([A-Z])\b/g;
    const appendixRefs = [...text.matchAll(appendixPattern)];
    const referencedAppendices = new Set();
    const actualAppendices = new Set();
    
    appendixRefs.forEach(match => {
      const letter = match[1];
      const position = match.index;
      const context = text.substring(Math.max(0, position - 50), position + 100);
      
      // Check if this is the appendix itself or a reference to it
      if (context.match(/^Appendix\s+[A-Z]\s*\n/)) {
        actualAppendices.add(letter);
      } else {
        referencedAppendices.add(letter);
      }
    });
    
    // Check for missing appendices
    referencedAppendices.forEach(letter => {
      if (!actualAppendices.has(letter)) {
        issues.push({
          title: "Referenced appendix not found",
          description: `Appendix ${letter} is referenced but not included`,
          text: `Appendix ${letter}`,
          severity: "Major",
          category: "appendix",
          hasFix: false,
          explanation: "All referenced appendices must be included in the document"
        });
      }
    });
    
    // Check appendix order
    const appendixLetters = Array.from(actualAppendices).sort();
    for (let i = 0; i < appendixLetters.length; i++) {
      const expected = String.fromCharCode(65 + i); // A, B, C...
      if (appendixLetters[i] !== expected) {
        issues.push({
          title: "Appendix labeling sequence error",
          description: `Appendix ${appendixLetters[i]} out of sequence`,
          text: `Expected Appendix ${expected}`,
          severity: "Minor",
          category: "appendix",
          hasFix: false,
          explanation: "Label appendices consecutively: Appendix A, Appendix B, etc."
        });
        break;
      }
    }
    
    // Check for appendix titles
    actualAppendices.forEach(letter => {
      const titlePattern = new RegExp(`Appendix\\s+${letter}\\s*\\n\\s*([A-Z][^\\n]+)`, 'g');
      const titleMatch = text.match(titlePattern);
      
      if (!titleMatch) {
        issues.push({
          title: "Appendix missing title",
          description: `Appendix ${letter} should have a descriptive title`,
          text: `Appendix ${letter}`,
          severity: "Minor",
          category: "appendix",
          hasFix: false,
          explanation: "Each appendix needs a title: 'Appendix A: Survey Questions'"
        });
      }
    });
    
    // Check for callouts to appendices
    actualAppendices.forEach(letter => {
      const calloutPattern = new RegExp(`(?:see|See|shown in|presented in)\\s+Appendix\\s+${letter}`, 'g');
      const hasCallout = calloutPattern.test(text);
      
      if (!hasCallout) {
        // Check if appendix is mentioned at all before it appears
        const appendixPosition = text.indexOf(`Appendix ${letter}\n`);
        const mentionPattern = new RegExp(`Appendix\\s+${letter}`, 'g');
        const mentions = [...text.matchAll(mentionPattern)];
        
        const hasEarlierMention = mentions.some(m => m.index < appendixPosition);
        
        if (!hasEarlierMention) {
          issues.push({
            title: "Appendix not referenced in text",
            description: `Appendix ${letter} should be mentioned in the main text`,
            text: `Appendix ${letter}`,
            severity: "Minor",
            category: "appendix",
            hasFix: false,
            explanation: "Refer to each appendix in the main text before it appears"
          });
        }
      }
    });
    
    // Check for supplemental materials notation
    if (text.includes('supplemental material') || text.includes('supplementary material')) {
      const suppPattern = /supplementa[lr]y?\s+materials?\s+(?:is|are)?\s*available/gi;
      const suppMatches = text.match(suppPattern) || [];
      
      if (suppMatches.length > 0 && !text.includes('osf.io') && !text.includes('doi.org')) {
        issues.push({
          title: "Supplemental materials location not specified",
          description: "Specify where supplemental materials can be accessed",
          text: suppMatches[0],
          severity: "Minor",
          category: "appendix",
          hasFix: false,
          explanation: "Include repository URL or DOI for supplemental materials"
        });
      }
    }
    
    return issues;
  }

  /**
   * Additional title and heading validations
   */
  validateTitleAndHeadings(text) {
    const issues = [];
    
    // Check title length (≤12 words recommended)
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      const potentialTitle = lines[0];
      const wordCount = potentialTitle.split(/\s+/).filter(w => w.length > 0).length;
      
      if (wordCount > 12 && wordCount < 30) {
        issues.push({
          title: "Title length",
          description: `Title has ${wordCount} words (recommended ≤12)`,
          text: potentialTitle.substring(0, 50) + '...',
          severity: "Minor",
          category: "headings",
          hasFix: false,
          explanation: "APA recommends concise titles of 12 words or fewer"
        });
      }
    }
    
    // Check for colon usage in titles
    const titleWithColon = lines[0]?.includes(':');
    if (titleWithColon) {
      const parts = lines[0].split(':');
      if (parts.length === 2 && parts[1].trim()[0] !== parts[1].trim()[0].toUpperCase()) {
        issues.push({
          title: "Subtitle capitalization",
          description: "Subtitle after colon should start with capital letter",
          text: lines[0].substring(0, 50),
          severity: "Minor",
          category: "headings",
          hasFix: true,
          fixAction: "capitalizeSubtitle",
          explanation: "Capitalize first word after colon in titles"
        });
      }
    }
    
    // Check heading length
    const headingPattern = /^(#{1,5}|[A-Z][^.!?]{5,50}$)/gm;
    const headings = text.match(headingPattern) || [];
    
    headings.forEach(heading => {
      const wordCount = heading.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount > 10) {
        issues.push({
          title: "Long heading",
          description: "Heading may be too long for clarity",
          text: heading.substring(0, 50),
          severity: "Minor",
          category: "headings",
          hasFix: false,
          explanation: "Keep headings concise and descriptive"
        });
      }
    });

    // NEW: Validate APA 7th Edition Level 5 heading format
    issues.push(...this.validateLevel5Headings(text));

    return issues;
  }

  /**
   * NEW: Validate APA 7th Edition Level 5 heading format
   */
  validateLevel5Headings(text) {
    const issues = [];

    // Level 5 headings should be: Indented, Bold, Italic, Title Case, Ending with a Period.
    // They appear as part of the paragraph.

    // Pattern to detect potential level 5 headings
    // Look for bold/italic text at paragraph start that ends with a period
    const level5Pattern = /^[ \t]*([A-Z][^.]{10,50})\.\s+[A-Z]/gm;
    const potentialLevel5s = [...text.matchAll(level5Pattern)];

    potentialLevel5s.forEach(match => {
      const headingText = match[1];
      const fullMatch = match[0];

      // Check if it follows title case
      const words = headingText.split(/\s+/);
      const smallWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if',
                         'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet'];

      let titleCaseErrors = 0;
      words.forEach((word, index) => {
        const isFirstOrLast = index === 0 || index === words.length - 1;
        const isSmallWord = smallWords.includes(word.toLowerCase());

        if (isFirstOrLast && word[0] !== word[0].toUpperCase()) {
          titleCaseErrors++;
        } else if (!isFirstOrLast && !isSmallWord && word[0] !== word[0].toUpperCase()) {
          titleCaseErrors++;
        } else if (!isFirstOrLast && isSmallWord && word[0] === word[0].toUpperCase()) {
          titleCaseErrors++;
        }
      });

      if (titleCaseErrors > 0) {
        issues.push({
          title: "Potential Level 5 heading case error",
          description: "Level 5 headings should use title case",
          text: headingText,
          severity: "Minor",
          category: "headings",
          hasFix: true,
          fixAction: "fixLevel5HeadingCase",
          explanation: "Level 5 headings: Indented, Bold, Italic, Title Case, Ending with Period. Text continues on same line."
        });
      }

      // Check if indented (should start with spaces/tab)
      if (!match[0].match(/^[ \t]/)) {
        issues.push({
          title: "Level 5 heading not indented",
          description: "Level 5 headings should be indented",
          text: headingText,
          severity: "Minor",
          category: "headings",
          hasFix: true,
          fixAction: "indentLevel5Heading",
          explanation: "Level 5 headings must be indented (0.5 inch) like paragraph indent"
        });
      }
    });

    return issues;
  }
}