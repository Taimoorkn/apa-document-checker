// src/utils/groqService.js - Groq AI Integration Service
'use client';

class GroqService {
  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    this.baseURL = 'https://api.groq.com/openai/v1/chat/completions';
    this.model = 'llama3-8b-8192'; // Fast and capable model
  }

  /**
   * Generic method to call Groq API
   */
  async callGroq(messages, maxTokens = 1000, temperature = 0.3) {
    try {
      if (!this.apiKey) {
        throw new Error('Groq API key not configured');
      }

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          max_tokens: maxTokens,
          temperature: temperature
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Invalid response format from Groq API');
      }

      return {
        success: true,
        content: data.choices[0].message.content,
        usage: data.usage
      };

    } catch (error) {
      console.error('Groq API call failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze academic content quality
   */
  async analyzeContentQuality(text, documentType = 'academic paper') {
    const prompt = `You are an expert academic writing reviewer specializing in APA 7th edition style. Analyze the following ${documentType} excerpt for academic quality and APA compliance.

Focus on these aspects:
1. Academic tone and formality
2. Clarity and conciseness
3. Argument structure and logic
4. Evidence presentation
5. Transitions and flow
6. APA-specific writing conventions

Text to analyze:
"""
${text.substring(0, 2000)} ${text.length > 2000 ? '...[truncated]' : ''}
"""

IMPORTANT: Respond with ONLY valid JSON, no markdown or extra text. For each issue, include a "highlightText" field with the EXACT phrase from the document that demonstrates the issue. Use this exact format:

{
  "overallScore": 85,
  "issues": [
    {
      "type": "tone",
      "severity": "minor", 
      "description": "Consider using more formal language",
      "suggestion": "Replace casual phrases with academic alternatives",
      "highlightText": "a lot of people",
      "examples": ["instead of 'a lot of' use 'numerous' or 'substantial'"]
    }
  ],
  "strengths": ["Clear thesis statement", "Good use of evidence"],
  "recommendations": ["Add more transitional phrases between paragraphs"]
}`;

    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];

    return await this.callGroq(messages, 1500, 0.05); // Very low temperature for consistent JSON
  }

  /**
   * Verify citation accuracy and relevance
   */
  async verifyCitations(text, citations) {
    const citationList = citations.map(c => c.text).join('\n');
    
    const prompt = `As an APA citation expert, analyze these citations for accuracy and contextual appropriateness.

Document excerpt:
"""
${text.substring(0, 1500)}
"""

Citations found:
"""
${citationList}
"""

Check for:
1. APA format accuracy
2. Citation-claim relationship
3. Source appropriateness
4. Missing citations where needed

IMPORTANT: Respond with ONLY valid JSON, no markdown or extra text. Include "highlightText" for problematic citations and statements needing sources. Use this exact format:

{
  "citations": [
    {
      "text": "(Smith, 2023)",
      "highlightText": "(Smith, 2023)",
      "issues": ["Missing page number for direct quote"],
      "suggestions": ["Add page number (Smith, 2023, p. 45)"],
      "accuracy": "good"
    }
  ],
  "missingCitations": [
    {
      "description": "Statistics need source",
      "highlightText": "75% of students reported improvement"
    }
  ],
  "overallQuality": "Needs improvement"
}`;

    const messages = [
      {
        role: 'user', 
        content: prompt
      }
    ];

    return await this.callGroq(messages, 1200, 0.05); // Very low temperature for consistent JSON
  }

  /**
   * Generate intelligent fix suggestions
   */
  async generateFixSuggestions(issue, context) {
    const prompt = `You are an APA writing coach helping a student improve their academic paper.

Issue to fix:
- Title: ${issue.title}
- Description: ${issue.description}
- Severity: ${issue.severity}
- Category: ${issue.category}

Context around the issue:
"""
${context.substring(0, 800)}
"""

IMPORTANT: Respond with ONLY valid JSON, no markdown or extra text. Use this exact format:

{
  "explanation": "Why this issue matters for APA compliance",
  "steps": [
    "1. Specific action to take",
    "2. How to implement the fix"
  ],
  "examples": {
    "before": "Current problematic text",
    "after": "Improved version"
  },
  "tips": ["Additional advice for avoiding this issue"],
  "resources": ["APA 7th edition page references"]
}`;

    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];

    return await this.callGroq(messages, 800, 0.05); // Very low temperature for consistent JSON
  }

  /**
   * Assess document structure and organization
   */
  async analyzeDocumentStructure(text, headings = []) {
    const headingList = headings.map(h => `Level ${h.level}: ${h.text}`).join('\n');
    
    const prompt = `Analyze this academic document's structure and organization for APA compliance.

Document headings:
"""
${headingList}
"""

Document text (first 1500 characters):
"""
${text.substring(0, 1500)}
"""

Evaluate:
1. Logical flow and organization
2. APA heading hierarchy
3. Section completeness
4. Transition quality

IMPORTANT: Respond with ONLY valid JSON, no markdown or extra text. Use this exact format:

{
  "structureScore": 78,
  "issues": [
    {
      "type": "hierarchy",
      "description": "Skip from Level 1 to Level 3 heading",
      "suggestion": "Add Level 2 heading or adjust current levels"
    }
  ],
  "missingElements": ["Abstract", "Conclusion"],
  "recommendations": ["Add clear topic sentences to paragraphs"]
}`;

    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];

    return await this.callGroq(messages, 1000, 0.05); // Very low temperature for consistent JSON
  }

  /**
   * Generate writing improvement suggestions
   */
  async suggestImprovements(paragraph, issueType = 'general') {
    const prompt = `As an academic writing tutor, help improve this paragraph for better APA compliance and clarity.

Focus area: ${issueType}

Paragraph:
"""
${paragraph}
"""

Provide specific improvements in JSON:
{
  "improvedParagraph": "Rewritten version with improvements",
  "changes": [
    {
      "original": "specific phrase that was changed",
      "improved": "better version",
      "reason": "why this is better"
    }
  ],
  "score": {
    "before": 65,
    "after": 85
  }
}`;

    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];

    return await this.callGroq(messages, 600, 0.5);
  }
}

// Export singleton instance
export const groqService = new GroqService();
export default groqService;