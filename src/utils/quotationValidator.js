// src/utils/quotationValidator.js - Quotation and block quote validation
'use client';

export class QuotationValidator {
  constructor() {
    this.blockQuoteMinWords = 40;
  }

  /**
   * Validate quotation handling and formatting
   */
  validateQuotations(text, structure) {
    const issues = [];
    
    // Block quote detection and formatting
    issues.push(...this.validateBlockQuotes(text));
    
    // Ellipsis usage
    issues.push(...this.validateEllipsisUsage(text));
    
    // Square brackets for modifications
    issues.push(...this.validateSquareBrackets(text));
    
    // Quote integration
    issues.push(...this.validateQuoteIntegration(text));
    
    // Quote accuracy indicators
    issues.push(...this.validateQuoteAccuracy(text));
    
    return issues;
  }

  /**
   * Validate block quote formatting (40+ words)
   */
  validateBlockQuotes(text) {
    const issues = [];
    
    // Find all quoted text
    const quotePattern = /[""]([^""]+)[""]/g;
    const quotes = [...text.matchAll(quotePattern)];
    
    quotes.forEach(match => {
      const quoteText = match[1];
      const wordCount = quoteText.split(/\s+/).filter(w => w.length > 0).length;
      
      // Check if quote is 40+ words
      if (wordCount >= this.blockQuoteMinWords) {
        // Check if it's formatted as block quote (usually indented paragraph)
        const quotePosition = match.index;
        const beforeQuote = text.substring(Math.max(0, quotePosition - 50), quotePosition);
        const afterQuote = text.substring(quotePosition + match[0].length, Math.min(text.length, quotePosition + match[0].length + 50));

        // FIXED: Block quotes (40+ words) should NOT have quotation marks
        // If we found a 40+ word quote WITH quotation marks, it's incorrectly formatted
        if (match[0].includes('"') || match[0].includes('"') || match[0].includes('"') || match[0].includes('"')) {
          issues.push({
            title: "Long quote incorrectly formatted with quotation marks",
            description: `Quote with ${wordCount} words should be a block quote without quotation marks`,
            text: quoteText.substring(0, 50) + '...',
            severity: "Major",
            category: "quotations",
            hasFix: true,
            fixAction: "convertToBlockQuote",
            explanation: "Quotes of 40+ words should be in block format: indented 0.5\", no quotation marks"
          });
        }
        
        // Check for citation after block quote
        if (!afterQuote.match(/^\s*\([^)]+\)/)) {
          issues.push({
            title: "Block quote missing citation",
            description: "Block quote should be followed immediately by citation",
            text: quoteText.substring(0, 30) + '...',
            severity: "Major",
            category: "quotations",
            hasFix: false,
            explanation: "Place citation after final punctuation of block quote: ...end of quote. (Author, Year, p. #)"
          });
        }
      } else if (wordCount > 30 && wordCount < this.blockQuoteMinWords) {
        // Warning for quotes approaching block quote length
        issues.push({
          title: "Long inline quote",
          description: `Quote with ${wordCount} words is long for inline format`,
          text: quoteText.substring(0, 50) + '...',
          severity: "Minor",
          category: "quotations",
          hasFix: false,
          explanation: "Consider paraphrasing or using block quote format for lengthy quotes"
        });
      }
    });
    
    // Check for improperly formatted block quotes (indented but with quotes)
    const indentedQuotes = text.match(/\n\s{4,}[""].*[""]/g) || [];
    indentedQuotes.forEach(quote => {
      issues.push({
        title: "Block quote with quotation marks",
        description: "Block quotes should not have quotation marks",
        text: quote.trim().substring(0, 50),
        severity: "Major",
        category: "quotations",
        hasFix: true,
        fixAction: "removeBlockQuoteMarks",
        explanation: "Block quotes use indentation only, no quotation marks"
      });
    });

    // Also check for potential block quotes that are properly indented (40+ words without quotes)
    // This is to catch block quotes that might be correctly formatted
    const blockQuotePattern = /\n\s{4,}([^\n]{160,})/g; // 160+ chars ≈ 40+ words
    const potentialBlockQuotes = [...text.matchAll(blockQuotePattern)];

    potentialBlockQuotes.forEach(match => {
      const content = match[1];
      const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

      // If it's 40+ words and properly indented without quotes, this is likely correct
      if (wordCount >= this.blockQuoteMinWords &&
          !content.includes('"') && !content.includes('"') &&
          !content.includes('"') && !content.includes('"')) {
        // This is a properly formatted block quote - no issue needed
        // Could add positive feedback here if desired
      }
    });
    
    return issues;
  }

  /**
   * Validate ellipsis usage in quotes
   */
  validateEllipsisUsage(text) {
    const issues = [];
    
    // Find ellipses in quotes
    const quotesWithEllipsis = text.match(/[""][^""]*\.\.\.+[^""]*[""]/g) || [];
    
    quotesWithEllipsis.forEach(quote => {
      // Check for correct ellipsis format (three dots with spaces)
      const ellipsisVariants = quote.match(/\.\.+/g) || [];
      
      ellipsisVariants.forEach(ellipsis => {
        if (ellipsis !== '...' && ellipsis !== '. . .') {
          issues.push({
            title: "Incorrect ellipsis format",
            description: "Use three dots for ellipsis (...) or spaced (. . .)",
            text: quote.substring(quote.indexOf(ellipsis) - 10, quote.indexOf(ellipsis) + 20),
            severity: "Minor",
            category: "quotations",
            hasFix: true,
            fixAction: "fixEllipsisFormat",
            explanation: "Ellipsis should be exactly three dots, with or without spaces"
          });
        }
      });
      
      // Check for ellipsis at beginning (usually not needed)
      if (quote.match(/[""]\.\.\./) || quote.match(/[""]\s*\.\.\./)) {
        issues.push({
          title: "Ellipsis at quote beginning",
          description: "Ellipsis at start of quote usually unnecessary",
          text: quote.substring(0, 30),
          severity: "Minor",
          category: "quotations",
          hasFix: false,
          explanation: "Begin quotes at natural starting point without ellipsis unless showing continuation"
        });
      }
      
      // Check for four dots (period + ellipsis)
      if (quote.includes('....')) {
        issues.push({
          title: "Four dots in quote",
          description: "Use three dots for ellipsis, even at sentence end",
          text: quote.substring(quote.indexOf('....') - 10, quote.indexOf('....') + 20),
          severity: "Minor",
          category: "quotations",
          hasFix: true,
          fixAction: "fixFourDots",
          explanation: "APA 7th uses three dots only, not four dots for end of sentence"
        });
      }
    });
    
    return issues;
  }

  /**
   * Validate square bracket usage for modifications
   */
  validateSquareBrackets(text) {
    const issues = [];
    
    // Find square brackets in quotes
    const quotesWithBrackets = text.match(/[""][^""]*\[[^\]]*\][^""]*[""]/g) || [];
    
    quotesWithBrackets.forEach(quote => {
      const brackets = quote.match(/\[([^\]]*)\]/g) || [];
      
      brackets.forEach(bracket => {
        const content = bracket.slice(1, -1);
        
        // Check for [sic] usage
        if (content.toLowerCase() === 'sic') {
          // Check if [sic] is italicized (in some formats)
          const position = quote.indexOf(bracket);
          if (position > 0 && quote[position - 1] !== ' ') {
            issues.push({
              title: "Missing space before [sic]",
              description: "[sic] should have space before it",
              text: quote.substring(position - 10, position + 10),
              severity: "Minor",
              category: "quotations",
              hasFix: true,
              fixAction: "addSpaceBeforeSic",
              explanation: "Format: 'original text [sic]' with space before bracket"
            });
          }
        }
        
        // Check for clarifications
        else if (content.length > 20) {
          issues.push({
            title: "Long text in square brackets",
            description: "Keep bracketed clarifications brief",
            text: bracket,
            severity: "Minor",
            category: "quotations",
            hasFix: false,
            explanation: "Use square brackets sparingly for brief clarifications only"
          });
        }
        
        // Check for capital letter changes
        else if (content.length === 1 && /[A-Z]/.test(content)) {
          // This is likely a capitalization change, which is correct
          // No issue
        }
        
        // Check for ellipsis in brackets (should be without brackets)
        else if (content === '...') {
          issues.push({
            title: "Ellipsis in square brackets",
            description: "Ellipsis should not be in square brackets",
            text: bracket,
            severity: "Minor",
            category: "quotations",
            hasFix: true,
            fixAction: "removeEllipsisBrackets",
            explanation: "Use ... without brackets for omitted material"
          });
        }
      });
    });
    
    return issues;
  }

  /**
   * Validate quote integration (floating quotes, etc.)
   */
  validateQuoteIntegration(text) {
    const issues = [];
    
    // Check for floating quotes (quotes without introduction)
    const sentences = text.split(/[.!?]+/);
    
    sentences.forEach(sentence => {
      if (sentence.trim().startsWith('"') || sentence.trim().startsWith('"')) {
        // Check if previous sentence introduces the quote
        const sentenceIndex = sentences.indexOf(sentence);
        if (sentenceIndex > 0) {
          const prevSentence = sentences[sentenceIndex - 1];
          const hasIntroduction = prevSentence.includes('states') || 
                                 prevSentence.includes('argues') || 
                                 prevSentence.includes('notes') ||
                                 prevSentence.includes('writes') ||
                                 prevSentence.includes('according to') ||
                                 prevSentence.includes('said') ||
                                 prevSentence.includes('explained');
          
          if (!hasIntroduction && sentence.length > 20) {
            issues.push({
              title: "Floating quotation",
              description: "Quote appears without proper introduction",
              text: sentence.trim().substring(0, 50) + '...',
              severity: "Minor",
              category: "quotations",
              hasFix: false,
              explanation: "Introduce quotes with signal phrases: 'Smith (2023) noted that...'"
            });
          }
        }
      }
    });
    
    // Check for overuse of quotes
    const quoteCount = (text.match(/[""][^""]+[""]/g) || []).length;
    const paragraphCount = (text.match(/\n\n/g) || []).length + 1;
    const quotesPerParagraph = quoteCount / paragraphCount;
    
    if (quotesPerParagraph > 2) {
      issues.push({
        title: "Excessive use of direct quotes",
        description: `Average of ${quotesPerParagraph.toFixed(1)} quotes per paragraph`,
        text: `${quoteCount} quotes in ${paragraphCount} paragraphs`,
        severity: "Minor",
        category: "quotations",
        hasFix: false,
        explanation: "Prefer paraphrasing over direct quotes. Use quotes sparingly for impact."
      });
    }
    
    return issues;
  }

  /**
   * Validate quote accuracy indicators
   */
  validateQuoteAccuracy(text) {
    const issues = [];
    
    // Check for quotes with emphasis added
    const emphasisPattern = /[""][^""]*(?:\*[^*]+\*|_[^_]+_)[^""]*[""]/g;
    const emphasisQuotes = text.match(emphasisPattern) || [];
    
    emphasisQuotes.forEach(quote => {
      // Check if "emphasis added" is noted
      const quoteEnd = text.indexOf(quote) + quote.length;
      const afterQuote = text.substring(quoteEnd, quoteEnd + 100);
      
      if (!afterQuote.includes('emphasis added') && !afterQuote.includes('[emphasis added]')) {
        issues.push({
          title: "Emphasis without attribution",
          description: "Added emphasis in quote should be noted",
          text: quote.substring(0, 50) + '...',
          severity: "Minor",
          category: "quotations",
          hasFix: true,
          fixAction: "addEmphasisNote",
          explanation: "Note added emphasis: (Author, Year, p. #, emphasis added)"
        });
      }
    });
    
    // Check for translated quotes
    const translationIndicators = ['translated from', 'trans.', 'translation', 'my translation'];
    translationIndicators.forEach(indicator => {
      if (text.includes(indicator)) {
        const position = text.indexOf(indicator);
        const context = text.substring(Math.max(0, position - 100), position + 50);
        
        if (context.includes('"') || context.includes('"')) {
          // Found a likely translated quote
          if (!context.includes('trans.') && !context.includes('translation')) {
            issues.push({
              title: "Translation not properly noted",
              description: "Translated quotes should be clearly marked",
              text: context.substring(0, 50),
              severity: "Minor",
              category: "quotations",
              hasFix: false,
              explanation: "Note translations: (Author, Year, p. #, my translation)"
            });
          }
        }
      }
    });
    
    return issues;
  }
}