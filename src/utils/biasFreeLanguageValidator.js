// src/utils/biasFreeLanguageValidator.js - Bias-free and inclusive language validation
'use client';

export class BiasFreeLanguageValidator {
  constructor() {
    // Gendered terms to avoid
    this.genderedTerms = {
      'mankind': 'humanity, humankind, people',
      'man-made': 'artificial, synthetic, manufactured',
      'chairman': 'chair, chairperson, coordinator',
      'policeman': 'police officer',
      'fireman': 'firefighter',
      'mailman': 'mail carrier, postal worker',
      'businessman': 'business person, executive',
      'manpower': 'workforce, personnel, staff',
      'man hours': 'work hours, person hours',
      'freshman': 'first-year student',
      'upperclassman': 'upper-level student',
      'forefathers': 'ancestors, founders',
      'mothering': 'parenting, nurturing',
      'fathering': 'parenting'
    };
    
    // Outdated disability terms
    this.disabilityTerms = {
      'handicapped': 'person with a disability',
      'crippled': 'person with a physical disability',
      'retarded': 'person with an intellectual disability',
      'mentally ill': 'person with a mental health condition',
      'suffers from': 'has, experiences',
      'victim of': 'person with, person who has',
      'wheelchair-bound': 'wheelchair user',
      'confined to a wheelchair': 'uses a wheelchair',
      'normal people': 'people without disabilities',
      'able-bodied': 'people without disabilities',
      'invalid': 'person with a disability',
      'afflicted with': 'has, experiences'
    };
    
    // Age-related biased terms
    this.ageTerms = {
      'elderly': 'older adults, older people',
      'senile': 'person with dementia',
      'old people': 'older adults',
      'the aged': 'older adults',
      'geriatric': 'older adult (unless medical context)'
    };
    
    // Racial/ethnic considerations
    this.racialConsiderations = {
      'minorities': 'specific group names or "people of color"',
      'non-white': 'people of color or specific groups',
      'oriental': 'Asian or specific nationality',
      'hispanic': 'Latino/Latina/Latinx or specific nationality',
      'indian': 'Native American, Indigenous, or specific tribe'
    };
  }

  /**
   * Main validation for bias-free language
   */
  validateBiasFreeLanguage(text, structure) {
    const issues = [];
    
    // Check gendered language
    issues.push(...this.checkGenderedLanguage(text));
    
    // Check person-first language for disabilities
    issues.push(...this.checkPersonFirstLanguage(text));
    
    // Check age-appropriate terminology
    issues.push(...this.checkAgeTerminology(text));
    
    // Check racial/ethnic terminology
    issues.push(...this.checkRacialEthnicTerminology(text));
    
    // Check sexual orientation/gender identity terms
    issues.push(...this.checkSOGITerminology(text));
    
    // Check generic pronoun usage
    issues.push(...this.checkGenericPronouns(text));
    
    return issues;
  }

  /**
   * Check for gendered language
   */
  checkGenderedLanguage(text) {
    const issues = [];
    const reportedTerms = new Set();
    
    Object.entries(this.genderedTerms).forEach(([term, alternative]) => {
      const pattern = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = text.match(pattern) || [];
      
      if (matches.length > 0 && !reportedTerms.has(term.toLowerCase())) {
        const firstMatch = matches[0];
        const position = text.toLowerCase().indexOf(term.toLowerCase());
        const context = text.substring(Math.max(0, position - 30), position + term.length + 30);
        
        issues.push({
          title: "Gendered language detected",
          description: `"${firstMatch}" is gendered language`,
          text: context,
          severity: "Minor",
          category: "bias-free",
          hasFix: true,
          fixAction: "replaceGenderedTerm",
          fixValue: { original: firstMatch, replacement: alternative.split(',')[0].trim() },
          explanation: `Use gender-neutral terms: ${alternative}`
        });
        
        reportedTerms.add(term.toLowerCase());
      }
    });
    
    // Check for generic "he" or "his"
    const genericHePattern = /\b(he|his|him)\b[^.]*(student|participant|person|individual|researcher|subject|child|adult|employee|worker)/gi;
    const heMatches = [...text.matchAll(genericHePattern)];
    
    if (heMatches.length > 2) {
      issues.push({
        title: "Generic masculine pronouns",
        description: "Avoid using 'he/his/him' as generic pronouns",
        text: heMatches[0][0],
        severity: "Minor",
        category: "bias-free",
        hasFix: false,
        explanation: "Use 'they/their', alternate pronouns, or rephrase to avoid pronouns"
      });
    }
    
    return issues;
  }

  /**
   * Check person-first language for disabilities
   */
  checkPersonFirstLanguage(text) {
    const issues = [];
    const reportedTerms = new Set();
    
    // Check outdated disability terms
    Object.entries(this.disabilityTerms).forEach(([term, alternative]) => {
      const pattern = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = text.match(pattern) || [];
      
      if (matches.length > 0 && !reportedTerms.has(term.toLowerCase())) {
        const firstMatch = matches[0];
        const position = text.toLowerCase().indexOf(term.toLowerCase());
        const context = text.substring(Math.max(0, position - 30), position + term.length + 30);
        
        issues.push({
          title: "Non-person-first disability language",
          description: `"${firstMatch}" should use person-first language`,
          text: context,
          severity: "Major",
          category: "bias-free",
          hasFix: true,
          fixAction: "usePersonFirst",
          fixValue: { original: firstMatch, replacement: alternative },
          explanation: `Use person-first: "${alternative}"`
        });
        
        reportedTerms.add(term.toLowerCase());
      }
    });
    
    // Check for disability-first language patterns
    const disabilityFirstPatterns = [
      /\b(autistic|blind|deaf|disabled|epileptic|schizophrenic)\s+(person|people|individual|child|adult|student)/gi,
      /\bthe\s+(blind|deaf|disabled|mentally ill|handicapped)\b/gi
    ];
    
    disabilityFirstPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      if (matches.length > 0 && !reportedTerms.has('disability-first')) {
        issues.push({
          title: "Disability-first language",
          description: "Use person-first language for disabilities",
          text: matches[0],
          severity: "Major",
          category: "bias-free",
          hasFix: false,
          explanation: "Say 'person with autism' not 'autistic person' (unless individual preference known)"
        });
        reportedTerms.add('disability-first');
      }
    });
    
    return issues;
  }

  /**
   * Check age-appropriate terminology
   */
  checkAgeTerminology(text) {
    const issues = [];
    const reportedTerms = new Set();
    
    Object.entries(this.ageTerms).forEach(([term, alternative]) => {
      const pattern = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = text.match(pattern) || [];
      
      if (matches.length > 0 && !reportedTerms.has(term.toLowerCase())) {
        const firstMatch = matches[0];
        const position = text.toLowerCase().indexOf(term.toLowerCase());
        const context = text.substring(Math.max(0, position - 30), position + term.length + 30);
        
        // Check if in appropriate medical context
        const isMedicalContext = context.includes('geriatric medicine') || 
                                context.includes('geriatric care');
        
        if (!isMedicalContext || term !== 'geriatric') {
          issues.push({
            title: "Age-biased terminology",
            description: `"${firstMatch}" may be considered age-biased`,
            text: context,
            severity: "Minor",
            category: "bias-free",
            hasFix: true,
            fixAction: "replaceAgeTerm",
            fixValue: { original: firstMatch, replacement: alternative.split(',')[0].trim() },
            explanation: `Use: ${alternative}`
          });
          
          reportedTerms.add(term.toLowerCase());
        }
      }
    });
    
    // Check for specific age ranges
    const ageRangePattern = /\b(\d{2,3})[- ]years?[- ]old\b/gi;
    const ageMatches = text.match(ageRangePattern) || [];
    
    if (ageMatches.length > 0) {
      const ages = ageMatches.map(m => parseInt(m.match(/\d+/)[0]));
      const hasOlderAdults = ages.some(age => age >= 65);
      
      if (hasOlderAdults) {
        issues.push({
          title: "Consider age designations",
          description: "Be specific with age ranges for older adults",
          text: ageMatches[0],
          severity: "Minor",
          category: "bias-free",
          hasFix: false,
          explanation: "Use specific ages (65-80) rather than broad terms like 'elderly'"
        });
      }
    }
    
    return issues;
  }

  /**
   * Check racial and ethnic terminology
   */
  checkRacialEthnicTerminology(text) {
    const issues = [];
    const reportedTerms = new Set();
    
    Object.entries(this.racialConsiderations).forEach(([term, alternative]) => {
      const pattern = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = text.match(pattern) || [];
      
      if (matches.length > 0 && !reportedTerms.has(term.toLowerCase())) {
        const firstMatch = matches[0];
        const position = text.toLowerCase().indexOf(term.toLowerCase());
        const context = text.substring(Math.max(0, position - 30), position + term.length + 30);
        
        // Special handling for "Indian" - check if it's about India
        if (term === 'indian' && (context.includes('India') || context.includes('Indian Ocean'))) {
          return; // Skip if referring to country
        }
        
        issues.push({
          title: "Consider racial/ethnic terminology",
          description: `"${firstMatch}" may need more specific terminology`,
          text: context,
          severity: "Minor",
          category: "bias-free",
          hasFix: false,
          explanation: `Consider using: ${alternative}`
        });
        
        reportedTerms.add(term.toLowerCase());
      }
    });
    
    // Check for proper capitalization of racial/ethnic terms
    const lowercaseGroups = /\b(black|white|indigenous|asian|latino|latina)\s+(person|people|man|woman|participant)/g;
    const lowercaseMatches = text.match(lowercaseGroups) || [];
    
    lowercaseMatches.forEach(match => {
      const racial = match.split(/\s+/)[0];
      if (racial === racial.toLowerCase()) {
        issues.push({
          title: "Capitalize racial/ethnic designations",
          description: `Capitalize '${racial}' when referring to racial/ethnic groups`,
          text: match,
          severity: "Minor",
          category: "bias-free",
          hasFix: true,
          fixAction: "capitalizeRacialTerm",
          explanation: "Use 'Black person' not 'black person', 'White participants' not 'white participants'"
        });
      }
    });
    
    return issues;
  }

  /**
   * Check sexual orientation and gender identity terminology
   */
  checkSOGITerminology(text) {
    const issues = [];
    
    // Outdated or inappropriate terms
    const outdatedTerms = {
      'homosexual': 'gay, lesbian, or specific identity',
      'sexual preference': 'sexual orientation',
      'lifestyle choice': 'sexual orientation or gender identity',
      'transgenders': 'transgender people',
      'transgendered': 'transgender',
      'sex change': 'gender affirmation surgery',
      'opposite sex': 'different sex/gender',
      'both genders': 'all genders',
      'preferred pronouns': 'pronouns'
    };
    
    Object.entries(outdatedTerms).forEach(([term, alternative]) => {
      const pattern = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = text.match(pattern) || [];
      
      if (matches.length > 0) {
        const firstMatch = matches[0];
        const position = text.toLowerCase().indexOf(term.toLowerCase());
        const context = text.substring(Math.max(0, position - 30), position + term.length + 30);
        
        issues.push({
          title: "Outdated SOGI terminology",
          description: `"${firstMatch}" is outdated or inappropriate`,
          text: context,
          severity: "Major",
          category: "bias-free",
          hasFix: true,
          fixAction: "updateSOGITerm",
          fixValue: { original: firstMatch, replacement: alternative.split(',')[0].trim() },
          explanation: `Use: ${alternative}`
        });
      }
    });
    
    // Check for binary assumptions
    const binaryPatterns = [
      /\b(he|she)\s+or\s+(she|he)\b/gi,
      /\bmale\s+or\s+female\b/gi,
      /\bmen\s+and\s+women\b/gi,
      /\bboys\s+and\s+girls\b/gi
    ];
    
    let hasBinaryAssumption = false;
    binaryPatterns.forEach(pattern => {
      if (!hasBinaryAssumption && pattern.test(text)) {
        const match = text.match(pattern)[0];
        issues.push({
          title: "Binary gender assumption",
          description: "Consider inclusive language for all genders",
          text: match,
          severity: "Minor",
          category: "bias-free",
          hasFix: false,
          explanation: "Consider: 'all genders', 'they', or specific inclusive language"
        });
        hasBinaryAssumption = true;
      }
    });
    
    return issues;
  }

  /**
   * Check generic pronoun usage
   */
  checkGenericPronouns(text) {
    const issues = [];
    
    // Check for singular they usage (which is now acceptable)
    const singularTheyPattern = /\b(everyone|someone|anyone|each person|the student|the participant)\s+[^.]*\bthey\b/gi;
    const singularTheyMatches = text.match(singularTheyPattern) || [];
    
    // This is actually good - no issue needed, but we can provide positive feedback
    if (singularTheyMatches.length > 3) {
      // Good use of singular they - no issue
    }
    
    // Check for alternating pronouns (he/she throughout)
    const heCount = (text.match(/\bhe\b/gi) || []).length;
    const sheCount = (text.match(/\bshe\b/gi) || []).length;
    const theyCount = (text.match(/\bthey\b/gi) || []).length;
    
    if (heCount > 10 && sheCount < 2) {
      issues.push({
        title: "Overuse of masculine pronouns",
        description: "Document predominantly uses 'he' pronouns",
        text: `he: ${heCount} times, she: ${sheCount} times`,
        severity: "Minor",
        category: "bias-free",
        hasFix: false,
        explanation: "Balance pronoun use or use 'they' for generic references"
      });
    }
    
    if (sheCount > 10 && heCount < 2) {
      issues.push({
        title: "Overuse of feminine pronouns",
        description: "Document predominantly uses 'she' pronouns",
        text: `she: ${sheCount} times, he: ${heCount} times`,
        severity: "Minor",
        category: "bias-free",
        hasFix: false,
        explanation: "Balance pronoun use or use 'they' for generic references"
      });
    }
    
    return issues;
  }
}