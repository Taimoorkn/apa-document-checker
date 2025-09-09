// src/utils/statisticalValidator.js - Statistical and numerical formatting validation
'use client';

export class StatisticalValidator {
  constructor() {
    this.statisticalSymbols = {
      p: 'probability',
      t: 't test',
      F: 'F test',
      r: 'correlation',
      R: 'multiple correlation',
      n: 'sample size',
      N: 'total sample',
      M: 'mean',
      SD: 'standard deviation',
      SE: 'standard error',
      df: 'degrees of freedom',
      χ2: 'chi-square',
      α: 'alpha',
      β: 'beta',
      η: 'eta',
      ω: 'omega'
    };
  }

  /**
   * Validate statistical and numerical formatting
   */
  validateStatistical(text, structure) {
    const issues = [];
    
    // Statistical notation italicization
    issues.push(...this.validateStatisticalItalics(text, structure));
    
    // Decimal places consistency
    issues.push(...this.validateDecimalPlaces(text));
    
    // Number presentation rules
    issues.push(...this.validateNumberPresentation(text));
    
    // Percentage formatting
    issues.push(...this.validatePercentageFormat(text));
    
    // Statistical results reporting
    issues.push(...this.validateStatisticalReporting(text));
    
    // Mathematical operators spacing
    issues.push(...this.validateMathOperators(text));
    
    return issues;
  }

  /**
   * Validate statistical notation italicization
   */
  validateStatisticalItalics(text, structure) {
    const issues = [];
    const italicizedText = structure?.italicizedText || [];
    
    // Check for statistical symbols that should be italicized - with improved context awareness
    const reportedSymbols = new Set();
    
    Object.entries(this.statisticalSymbols).forEach(([symbol, name]) => {
      // Skip if already reported
      if (reportedSymbols.has(symbol)) return;
      
      // Skip uppercase letters that might be regular text
      if (symbol.length === 1 && /[A-Z]/.test(symbol)) {
        // Look for clear statistical context with more specific patterns
        const statPatterns = [
          new RegExp(`\\b${symbol}\\s*[=<>≤≥]\\s*[\\d.-]+`, 'g'), // With value
          new RegExp(`\\(${symbol}\\s*[=<>≤≥]\\s*[\\d.-]+\\)`, 'g'), // In parentheses
          new RegExp(`\\b${symbol}\\s*\\([\\d,\\s]+\\)\\s*[=<>≤≥]`, 'g'), // With df like F(2, 147)
          new RegExp(`\\b${symbol}\\s+test\\b`, 'gi'), // Explicitly named test
          new RegExp(`\\btest.*\\b${symbol}\\s*[=<>≤≥]`, 'gi') // Test statistic
        ];
        
        let foundStatistical = false;
        for (const statPattern of statPatterns) {
          const matches = text.match(statPattern) || [];
          if (matches.length > 0) {
            foundStatistical = true;
            const match = matches[0];
            const isItalicized = italicizedText.some(item => item.text.includes(symbol));
            if (!isItalicized) {
              issues.push({
                title: `Statistical symbol '${symbol}' not italicized`,
                description: `'${symbol}' should be italicized when used as ${name}`,
                text: match,
                severity: "Minor",
                category: "statistical",
                hasFix: false,
                explanation: `Statistical symbols like ${symbol} must be italicized: *${symbol}* = value`
              });
              reportedSymbols.add(symbol);
              break;
            }
          }
        }
      } else {
        // For lowercase letters and multi-character symbols (more strict matching)
        const statContextPatterns = [
          new RegExp(`\\b${symbol}\\s*[=<>≤≥]\\s*[\\d.-]+`, 'g'),
          new RegExp(`\\(${symbol}\\s*[=<>≤≥]\\s*[\\d.-]+\\)`, 'g'),
          new RegExp(`\\b${symbol}\\s*\\([\\d,\\s]+\\)`, 'g')
        ];
        
        for (const pattern of statContextPatterns) {
          const matches = text.match(pattern) || [];
          if (matches.length > 0) {
            const match = matches[0];
            const isItalicized = italicizedText.some(item => item.text.includes(symbol));
            if (!isItalicized && !reportedSymbols.has(symbol)) {
              issues.push({
                title: `Statistical symbol '${symbol}' not italicized`,
                description: `'${symbol}' should be italicized in statistical context`,
                text: match,
                severity: "Minor",
                category: "statistical",
                hasFix: false,
                explanation: `Italicize statistical notation: *${symbol}*`
              });
              reportedSymbols.add(symbol);
              break;
            }
          }
        }
      }
    });
    
    return issues.slice(0, 5); // Limit to avoid overwhelming
  }

  /**
   * Validate decimal places consistency
   */
  validateDecimalPlaces(text) {
    const issues = [];
    
    // Find all decimal numbers
    const decimalPattern = /\b\d+\.\d+\b/g;
    const decimals = text.match(decimalPattern) || [];
    
    // Group by context (p-values, correlations, means, etc.)
    const pValues = decimals.filter(d => {
      const pos = text.indexOf(d);
      return text.substring(Math.max(0, pos - 10), pos).includes('p');
    });
    
    const correlations = decimals.filter(d => {
      const pos = text.indexOf(d);
      const context = text.substring(Math.max(0, pos - 10), pos);
      return context.includes('r') || context.includes('R');
    });
    
    // Check p-value formatting
    pValues.forEach(pValue => {
      const value = parseFloat(pValue);
      const decimalPlaces = pValue.split('.')[1].length;
      
      // p-values should have 2-3 decimal places
      if (decimalPlaces > 3 || decimalPlaces < 2) {
        issues.push({
          title: "Inconsistent p-value decimal places",
          description: `p-value '${pValue}' should have 2-3 decimal places`,
          text: `p = ${pValue}`,
          severity: "Minor",
          category: "statistical",
          hasFix: true,
          fixAction: "fixPValueDecimals",
          explanation: "Report p-values to 2-3 decimal places: p = .045 or p = .001"
        });
      }
      
      // Check for leading zero
      if (value < 1 && pValue.startsWith('0.')) {
        issues.push({
          title: "Leading zero in p-value",
          description: "Omit leading zero for values that cannot exceed 1",
          text: `p = ${pValue}`,
          severity: "Minor",
          category: "statistical",
          hasFix: true,
          fixAction: "removeLeadingZero",
          explanation: "Use p = .05 not p = 0.05"
        });
      }
    });
    
    // Check correlation formatting
    correlations.forEach(correlation => {
      const value = parseFloat(correlation);
      
      if (Math.abs(value) <= 1 && correlation.startsWith('0.')) {
        issues.push({
          title: "Leading zero in correlation",
          description: "Omit leading zero for correlations",
          text: `r = ${correlation}`,
          severity: "Minor",
          category: "statistical",
          hasFix: true,
          fixAction: "removeLeadingZero",
          explanation: "Use r = .45 not r = 0.45"
        });
      }
    });
    
    return issues.slice(0, 5); // Limit to avoid overwhelming
  }

  /**
   * Validate number presentation rules (spell out below 10)
   */
  validateNumberPresentation(text) {
    const issues = [];
    
    // Find numbers at beginning of sentences with position tracking
    const paragraphs = text.split('\n');
    paragraphs.forEach((para, paraIndex) => {
      const sentenceStartPattern = /(?:^|\. )(\d+)/g;
      let match;
      
      while ((match = sentenceStartPattern.exec(para)) !== null) {
        const fullMatch = match[0];
        const number = match[1];
        const charOffset = match.index;
        
        // Get more context for highlighting
        const contextEnd = Math.min(charOffset + 50, para.length);
        const contextText = para.substring(charOffset, contextEnd);
        
        issues.push({
          title: "Number at sentence beginning",
          description: "Spell out numbers that begin sentences",
          text: fullMatch.trim() + '...',
          highlightText: contextText,
          severity: "Major",
          category: "statistical",
          location: {
            paragraphIndex: paraIndex,
            charOffset: charOffset,
            length: Math.min(50, contextText.length),
            type: 'text'
          },
          hasFix: false,
          explanation: `Write "Twenty-three participants..." not "${number} participants..."`
        });
      }
    });
    
    // Find single digit numbers (1-9) that should be spelled out
    const singleDigits = text.match(/\b[1-9]\b/g) || [];
    const reportedSingleDigit = false;
    
    singleDigits.forEach(digit => {
      if (reportedSingleDigit) return;
      
      const position = text.indexOf(digit);
      const context = text.substring(Math.max(0, position - 30), position + 30);
      
      // Check if it's in a measurement, age, time, etc. (where digits are OK)
      const isException = context.match(/\d+\s*(years?|months?|days?|hours?|minutes?|%)/) ||
                         context.match(/[Ff]igure\s+\d/) ||
                         context.match(/[Tt]able\s+\d/) ||
                         context.match(/[Pp]age\s+\d/) ||
                         context.match(/[Cc]hapter\s+\d/) ||
                         context.match(/\d+:\d+/) || // Time
                         context.match(/\$\d+/) || // Money
                         context.match(/\d+\.\d+/); // Decimal
      
      if (!isException) {
        issues.push({
          title: "Single digit not spelled out",
          description: `Number ${digit} should be spelled out (under 10)`,
          text: context,
          severity: "Minor",
          category: "statistical",
          hasFix: true,
          fixAction: "spellOutNumber",
          explanation: "Spell out numbers below 10: one, two, three... nine"
        });
      }
    });
    
    // Check for inconsistent number format in comparisons
    const comparisons = text.match(/\b\d+\s*(?:to|and|-)\s*\d+\b/g) || [];
    comparisons.forEach(comparison => {
      const numbers = comparison.match(/\d+/g);
      if (numbers && numbers.length === 2) {
        const first = parseInt(numbers[0]);
        const second = parseInt(numbers[1]);
        
        if ((first < 10 && second >= 10) || (first >= 10 && second < 10)) {
          issues.push({
            title: "Inconsistent number format in range",
            description: "Use consistent format for number ranges",
            text: comparison,
            severity: "Minor",
            category: "statistical",
            hasFix: false,
            explanation: "Be consistent: 'five to nine' or '5 to 15', not 'five to 15'"
          });
        }
      }
    });
    
    return issues.slice(0, 5);
  }

  /**
   * Validate percentage formatting
   */
  validatePercentageFormat(text) {
    const issues = [];
    
    // Find percentages
    const percentPattern = /\d+\.?\d*\s*(?:%|percent|per cent)/gi;
    const percentages = text.match(percentPattern) || [];
    
    percentages.forEach(percentage => {
      // Check for space before %
      if (percentage.includes(' %')) {
        issues.push({
          title: "Space before percent symbol",
          description: "No space between number and % symbol",
          text: percentage,
          severity: "Minor",
          category: "statistical",
          hasFix: true,
          fixAction: "removePercentSpace",
          explanation: "Use 75% not 75 %"
        });
      }
      
      // Check for 'percent' vs '%'
      if (percentage.includes('percent') || percentage.includes('per cent')) {
        const position = text.indexOf(percentage);
        const isStartOfSentence = position === 0 || text[position - 2] === '.';
        
        if (!isStartOfSentence) {
          issues.push({
            title: "Word 'percent' instead of symbol",
            description: "Use % symbol except at sentence beginning",
            text: percentage,
            severity: "Minor",
            category: "statistical",
            hasFix: true,
            fixAction: "usePercentSymbol",
            explanation: "Use % symbol: 25% not 25 percent"
          });
        }
      }
      
      // Check for percentages over 100 (unless clearly intentional)
      const value = parseFloat(percentage);
      if (value > 100 && value < 1000) {
        const position = text.indexOf(percentage);
        const context = text.substring(Math.max(0, position - 50), position + 50);
        
        if (!context.includes('increase') && !context.includes('growth')) {
          issues.push({
            title: "Percentage over 100%",
            description: "Verify percentage value exceeding 100%",
            text: percentage,
            severity: "Minor",
            category: "statistical",
            hasFix: false,
            explanation: "Double-check percentages over 100% for accuracy"
          });
        }
      }
    });
    
    return issues.slice(0, 3);
  }

  /**
   * Validate statistical results reporting format
   */
  validateStatisticalReporting(text) {
    const issues = [];
    
    // Check t-test reporting format
    const tTestPattern = /t\s*\([^)]+\)\s*=\s*[^,\s]+/gi;
    const tTests = text.match(tTestPattern) || [];
    
    tTests.forEach(tTest => {
      // Should include df in parentheses
      if (!tTest.match(/t\s*\(\d+(?:\.\d+)?\)/)) {
        issues.push({
          title: "t-test missing degrees of freedom",
          description: "t-test should include df: t(df) = value",
          text: tTest,
          severity: "Major",
          category: "statistical",
          hasFix: false,
          explanation: "Format: t(45) = 2.31, p = .025"
        });
      }
    });
    
    // Check F-test reporting format
    const fTestPattern = /F\s*\([^)]+\)\s*=\s*[^,\s]+/gi;
    const fTests = text.match(fTestPattern) || [];
    
    fTests.forEach(fTest => {
      // Should include two df values
      if (!fTest.match(/F\s*\(\d+,\s*\d+\)/)) {
        issues.push({
          title: "F-test incorrect df format",
          description: "F-test needs two df values: F(df1, df2)",
          text: fTest,
          severity: "Major",
          category: "statistical",
          hasFix: false,
          explanation: "Format: F(2, 147) = 5.67, p = .004"
        });
      }
    });
    
    // Check chi-square reporting
    const chiSquarePattern = /(?:χ2|chi-square|Chi-square)\s*\([^)]+\)/gi;
    const chiSquares = text.match(chiSquarePattern) || [];
    
    chiSquares.forEach(chiSquare => {
      if (!chiSquare.includes('χ²') && !chiSquare.includes('χ2')) {
        issues.push({
          title: "Chi-square symbol format",
          description: "Use χ² symbol for chi-square",
          text: chiSquare,
          severity: "Minor",
          category: "statistical",
          hasFix: true,
          fixAction: "fixChiSquareSymbol",
          explanation: "Use χ²(df) = value, not 'chi-square'"
        });
      }
    });
    
    // Check for p < .001 format
    const pValuePattern = /p\s*[<>=]\s*\.?\d+/gi;
    const pValues = text.match(pValuePattern) || [];
    
    pValues.forEach(pValue => {
      if (pValue.includes('0.000') || pValue.includes('.000')) {
        issues.push({
          title: "p-value reported as .000",
          description: "Report as p < .001 instead of p = .000",
          text: pValue,
          severity: "Major",
          category: "statistical",
          hasFix: true,
          fixAction: "fixPValueZero",
          explanation: "Never report p = .000, use p < .001"
        });
      }
      
      if (pValue.includes('=') && pValue.includes('.05')) {
        issues.push({
          title: "Exact p = .05",
          description: "Avoid reporting exactly p = .05",
          text: pValue,
          severity: "Minor",
          category: "statistical",
          hasFix: false,
          explanation: "Report actual p-value (e.g., p = .049 or p = .051)"
        });
      }
    });
    
    return issues;
  }

  /**
   * Validate mathematical operators spacing
   */
  validateMathOperators(text) {
    const issues = [];
    
    // Check for spaces around operators
    const operators = ['=', '<', '>', '≤', '≥', '±', '×'];
    
    operators.forEach(op => {
      // Find operator without proper spacing
      const noSpaceBefore = new RegExp(`\\S${op}`, 'g');
      const noSpaceAfter = new RegExp(`${op}\\S`, 'g');
      
      const matchesBefore = text.match(noSpaceBefore) || [];
      const matchesAfter = text.match(noSpaceAfter) || [];
      
      if (matchesBefore.length > 0 || matchesAfter.length > 0) {
        const example = matchesBefore[0] || matchesAfter[0];
        issues.push({
          title: "Missing spaces around operator",
          description: `Add spaces around '${op}' operator`,
          text: example,
          severity: "Minor",
          category: "statistical",
          hasFix: true,
          fixAction: "addOperatorSpaces",
          explanation: `Use spaces: n ${op} 50, not n${op}50`
        });
      }
    });
    
    // Check for minus sign vs hyphen
    const minusPattern = /\b\d+\s*-\s*\d+\b/g;
    const minusMatches = text.match(minusPattern) || [];
    
    minusMatches.forEach(match => {
      const position = text.indexOf(match);
      const context = text.substring(Math.max(0, position - 10), position + match.length + 10);
      
      // Check if it's a range (should use en dash) or subtraction
      if (!context.includes('minus') && !context.includes('negative')) {
        // Likely a range, covered elsewhere
      } else {
        // Subtraction should have spaces
        if (!match.includes(' - ')) {
          issues.push({
            title: "Missing spaces around minus sign",
            description: "Add spaces around minus operator",
            text: match,
            severity: "Minor",
            category: "statistical",
            hasFix: true,
            fixAction: "addMinusSpaces",
            explanation: "Use: 10 - 5 = 5, not 10-5=5"
          });
        }
      }
    });
    
    return issues.slice(0, 3);
  }
}