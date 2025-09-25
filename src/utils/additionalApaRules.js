// src/utils/additionalApaRules.js - Additional APA 7th edition rules
'use client';

export class AdditionalAPARules {
  constructor() {
    // Patterns for additional APA rules
    this.patterns = {
      // Footnotes
      footnote: /\[\^?\d+\]|\(\*+\)|[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g,
      
      // Mathematical equations
      equation: /[∑∏∫∂∇±√∞≈≠≤≥]/,
      inlineEquation: /\$[^$]+\$/g,
      displayEquation: /\$\$[^$]+\$\$/g,
      
      // Legal references
      legalCase: /v\.\s+[A-Z]/g,
      legalCitation: /\d+\s+[A-Z]\.\s*[A-Z]\.\s*(?:2d|3d)?\s*\d+/g,
      
      // Social media citations
      twitter: /@[a-zA-Z0-9_]+/g,
      hashtag: /#[a-zA-Z0-9_]+/g,
      
      // Conference papers
      conference: /(?:Conference|Symposium|Proceedings|Meeting)\s+(?:on|of)/gi,
      
      // Data availability
      dataStatement: /data\s+(?:are|is|were|was)\s+available/gi,
      openData: /open\s+(?:data|science|access)/gi,
      
      // Supplemental materials
      supplemental: /supplementa[lr](?:y)?\s+(?:material|data|file|information|table|figure)/gi
    };
  }
  
  /**
   * Validate footnotes according to APA 7th edition
   */
  validateFootnotes(text, structure) {
    const issues = [];
    const footnotes = text.match(this.patterns.footnote) || [];
    
    if (footnotes.length > 0) {
      // APA prefers to minimize footnote use
      issues.push({
        title: "Footnotes detected",
        description: "APA style discourages extensive use of footnotes",
        text: footnotes[0],
        severity: "Minor",
        category: "formatting",
        hasFix: false,
        explanation: "Use footnotes sparingly. Consider incorporating content into main text or using parenthetical information."
      });
      
      // Check footnote formatting
      footnotes.forEach(footnote => {
        if (footnote.includes('[') && footnote.includes(']')) {
          issues.push({
            title: "Incorrect footnote format",
            description: "Use superscript numbers for footnotes",
            text: footnote,
            severity: "Minor",
            category: "formatting",
            hasFix: false,
            explanation: "Format footnotes as superscript numbers (¹, ², ³) not [1], [2], [3]"
          });
        }
      });
    }
    
    return issues;
  }
  
  /**
   * Validate mathematical equations formatting
   */
  validateMathematicalEquations(text, structure) {
    const issues = [];
    
    // Check for mathematical symbols
    if (this.patterns.equation.test(text)) {
      const inlineEqs = text.match(this.patterns.inlineEquation) || [];
      const displayEqs = text.match(this.patterns.displayEquation) || [];
      
      // Check inline equations
      inlineEqs.forEach(eq => {
        if (eq.length > 50) {
          issues.push({
            title: "Long inline equation",
            description: "Complex equations should be displayed on separate lines",
            text: eq.substring(0, 30) + '...',
            severity: "Minor",
            category: "formatting",
            hasFix: false,
            explanation: "Display complex equations on separate lines and number them"
          });
        }
      });
      
      // Check if display equations are numbered
      displayEqs.forEach((eq, index) => {
        const eqPosition = text.indexOf(eq);
        const nearbyText = text.substring(eqPosition - 20, eqPosition + eq.length + 20);
        
        if (!nearbyText.match(/\(\d+\)/)) {
          issues.push({
            title: "Unnumbered display equation",
            description: "Display equations should be numbered",
            text: eq.substring(0, 30) + '...',
            severity: "Minor",
            category: "formatting",
            hasFix: false,
            explanation: "Number display equations consecutively: (1), (2), etc."
          });
        }
      });
    }
    
    return issues;
  }
  
  /**
   * Validate legal references formatting
   */
  validateLegalReferences(text) {
    const issues = [];
    const reportedTypes = new Set();
    
    // Check for legal case citations
    const legalCases = text.match(this.patterns.legalCase) || [];
    
    legalCases.forEach(legalCase => {
      if (!reportedTypes.has('legal-italics')) {
        const casePosition = text.indexOf(legalCase);
        const fullCase = text.substring(Math.max(0, casePosition - 30), casePosition + 50);
        
        issues.push({
          title: "Legal case name formatting",
          description: "Legal case names should be italicized",
          text: fullCase,
          severity: "Minor",
          category: "references",
          hasFix: false,
          explanation: "Italicize case names: *Brown v. Board of Education*"
        });
        reportedTypes.add('legal-italics');
      }
    });
    
    // Check for legal citations
    const legalCitations = text.match(this.patterns.legalCitation) || [];
    
    if (legalCitations.length > 0 && !reportedTypes.has('legal-format')) {
      issues.push({
        title: "Legal citation format",
        description: "Verify legal citation follows Bluebook format",
        text: legalCitations[0],
        severity: "Minor",
        category: "references",
        hasFix: false,
        explanation: "Legal citations should follow standard legal citation format"
      });
      reportedTypes.add('legal-format');
    }
    
    return issues;
  }
  
  /**
   * Validate social media citations
   */
  validateSocialMediaCitations(text) {
    const issues = [];
    const reportedTypes = new Set();
    
    // Check for Twitter handles
    const twitterHandles = text.match(this.patterns.twitter) || [];
    
    twitterHandles.forEach(handle => {
      if (!reportedTypes.has('twitter-citation')) {
        const handlePosition = text.indexOf(handle);
        const context = text.substring(Math.max(0, handlePosition - 50), handlePosition + 50);
        
        // Check if it's in a reference or citation
        if (context.includes('Twitter') || context.includes('Tweet')) {
          issues.push({
            title: "Social media citation format",
            description: "Include full citation information for social media",
            text: context,
            severity: "Minor",
            category: "references",
            hasFix: false,
            explanation: "Format: Author, A. [@username]. (Year, Month Day). Content [Tweet]. Twitter. URL"
          });
          reportedTypes.add('twitter-citation');
        }
      }
    });
    
    return issues;
  }
  
  /**
   * Validate conference paper citations
   */
  validateConferencePapers(text) {
    const issues = [];
    const reportedTypes = new Set();
    
    const conferences = text.match(this.patterns.conference) || [];
    
    conferences.forEach(conf => {
      if (!reportedTypes.has('conference-format')) {
        const confPosition = text.indexOf(conf);
        const context = text.substring(Math.max(0, confPosition - 100), confPosition + 100);
        
        // Check if it's in references section
        if (context.includes('In ') || context.includes('Paper presented')) {
          // Check for location
          if (!context.match(/,\s+[A-Z][a-z]+(?:,\s+[A-Z]{2})?(?:,\s+[A-Z][a-z]+)?/)) {
            issues.push({
              title: "Conference paper missing location",
              description: "Conference presentations need location information",
              text: context.substring(0, 60) + '...',
              severity: "Minor",
              category: "references",
              hasFix: false,
              explanation: "Include conference location: City, State/Country"
            });
            reportedTypes.add('conference-format');
          }
        }
      }
    });
    
    return issues;
  }
  
  /**
   * Validate data availability statements
   */
  validateDataAvailability(text) {
    const issues = [];
    
    // Check if research paper (has method/results sections)
    const hasMethodSection = /\bMethod(?:s|ology)?\b/i.test(text);
    const hasResultsSection = /\bResults?\b/i.test(text);
    
    if (hasMethodSection && hasResultsSection) {
    }
    
    return issues;
  }
  
  /**
   * Validate supplemental materials references
   */
  validateSupplementalMaterials(text) {
    const issues = [];
    const supplementalRefs = text.match(this.patterns.supplemental) || [];
    
    supplementalRefs.forEach(ref => {
      const refPosition = text.indexOf(ref);
      const context = text.substring(Math.max(0, refPosition - 50), refPosition + 100);
      
      // Check if properly referenced
      if (!context.match(/see|refer|available|found|included/i)) {
        issues.push({
          title: "Supplemental material reference unclear",
          description: "Clearly indicate how to access supplemental materials",
          text: context,
          severity: "Minor",
          category: "content",
          hasFix: false,
          explanation: "Specify where supplemental materials can be found (e.g., 'see Supplemental Material online')"
        });
      }
      
      // Check naming convention
      if (!ref.match(/Supplement(?:al|ary)\s+(?:Table|Figure)\s+[A-Z]?\d+/)) {
        issues.push({
          title: "Supplemental material naming",
          description: "Use consistent naming for supplemental materials",
          text: ref,
          severity: "Minor",
          category: "formatting",
          hasFix: false,
          explanation: "Label as 'Supplemental Table S1', 'Supplemental Figure S1', etc."
        });
      }
    });
    
    return issues;
  }
  
  /**
   * Main validation function for additional rules
   */
  validateAdditionalRules(text, structure) {
    const issues = [];
    
    // Run all additional validations
    issues.push(...this.validateFootnotes(text, structure));
    issues.push(...this.validateMathematicalEquations(text, structure));
    issues.push(...this.validateLegalReferences(text));
    issues.push(...this.validateSocialMediaCitations(text));
    issues.push(...this.validateConferencePapers(text));
    issues.push(...this.validateDataAvailability(text));
    issues.push(...this.validateSupplementalMaterials(text));
    
    return issues;
  }
}