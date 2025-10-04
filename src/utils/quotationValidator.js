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



    const quotePattern = /["\u201C\u201D]([^"\u201C\u201D]+)["\u201C\u201D]/g;

    const quotes = [...text.matchAll(quotePattern)];



    quotes.forEach(match => {

      const quoteText = match[1];

      const wordCount = quoteText.split(/\s+/).filter(Boolean).length;



      if (wordCount >= this.blockQuoteMinWords) {

        const afterQuote = text.slice(match.index + match[0].length);

        const citationMatch = afterQuote.match(/^\s*\([^)]+\)/);



        issues.push({

          title: "Long quote formatted inline",

          description: `Quote with ${wordCount} words should use block quote formatting`,

          text: quoteText.substring(0, 50) + "...",

          severity: "Major",

          category: "quotations",

          hasFix: true,

          fixAction: "convertToBlockQuote",

          explanation: 'Quotes of 40+ words should start on a new line, be indented 0.5" in from the left margin, remain double spaced, and omit quotation marks.'

        });



        if (!citationMatch) {

          issues.push({

            title: "Block quote missing citation",

            description: "Block quote should be followed immediately by citation",

            text: quoteText.substring(0, 30) + "...",

            severity: "Major",

            category: "quotations",

            hasFix: false,

            explanation: "Place the citation after the final punctuation of the block quote: ... end of quote. (Author, Year, p. #)"

          });

        }

      } else if (wordCount >= 30) {

        issues.push({

          title: "Long inline quote",

          description: `Quote with ${wordCount} words is long for inline format`,

          text: quoteText.substring(0, 50) + "...",

          severity: "Minor",

          category: "quotations",

          hasFix: false,

          explanation: "Consider paraphrasing or using block quote format for lengthy quotations."

        });

      }

    });



    const indentedQuotes = text.match(/\n\s{4,}["\u201C\u201D].*["\u201C\u201D]/g) || [];

    indentedQuotes.forEach(quote => {

      issues.push({

        title: "Block quote with quotation marks",

        description: "Block quotes should not include quotation marks",

        text: quote.trim().substring(0, 50),

        severity: "Major",

        category: "quotations",

        hasFix: true,

        fixAction: "removeBlockQuoteMarks",

        explanation: "Block quotes rely on indentation rather than quotation marks."

      });

    });



    return issues;

  }



  /**
   * Validate ellipsis usage in quotes
   */
  validateEllipsisUsage(text) {
    const issues = [];
    
    // Find ellipses in quotes
    const quotesWithEllipsis = text.match(/["\u201C\u201D][^"\u201C\u201D]*\.\.\.+[^"\u201C\u201D]*["\u201C\u201D]/g) || [];
    
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
      if (quote.match(/["\u201C\u201D]\.\.\./) || quote.match(/["\u201C\u201D]\s*\.\.\./)) {
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
    const quotesWithBrackets = text.match(/["\u201C\u201D][^"\u201C\u201D]*\[[^\]]*\][^"\u201C\u201D]*["\u201C\u201D]/g) || [];
    
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
      }
    });
    
    
    return issues;
  }

  /**
   * Validate quote accuracy indicators
   */
  validateQuoteAccuracy(text) {
    const issues = [];
    
    // Check for quotes with emphasis added
    const emphasisPattern = /["\u201C\u201D][^"\u201C\u201D]*(?:\*[^*]+\*|_[^_]+_)[^"\u201C\u201D]*["\u201C\u201D]/g;
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