// src/utils/aiEnhancedAnalyzer.js - AI-powered APA analysis enhancement
'use client';

import { groqService } from './groqService';
import { v4 as uuidv4 } from 'uuid';

export class AIEnhancedAnalyzer {
  constructor() {
    this.maxTextLength = 3000; // Limit for API efficiency
    this.analysisCache = new Map(); // Cache to avoid re-analyzing same content
  }

  /**
   * Enhance existing rule-based issues with AI insights
   */
  async enhanceAnalysis(documentData, existingIssues) {
    try {
      console.log('🤖 Starting AI-enhanced analysis...');
      
      const { text, formatting, structure } = documentData;
      
      if (!text || text.length < 100) {
        console.log('⚠️ Document too short for AI analysis');
        return existingIssues;
      }

      // Store document text for later use in highlighting
      this.documentText = text;

      // Run AI analyses in parallel for efficiency
      const aiAnalyses = await Promise.allSettled([
        this.analyzeContentQuality(text),
        this.analyzeDocumentStructure(text, structure?.headings || []),
        this.verifyCitationContext(text, existingIssues.filter(i => i.category === 'citations'))
      ]);

      // Process AI results and create enhanced issues
      const aiIssues = [];
      
      // Content quality issues
      if (aiAnalyses[0].status === 'fulfilled' && aiAnalyses[0].value.success) {
        const contentIssues = this.processContentQualityResults(aiAnalyses[0].value);
        aiIssues.push(...contentIssues);
      }

      // Structure issues  
      if (aiAnalyses[1].status === 'fulfilled' && aiAnalyses[1].value.success) {
        const structureIssues = this.processStructureResults(aiAnalyses[1].value);
        aiIssues.push(...structureIssues);
      }

      // Enhanced citation issues
      if (aiAnalyses[2].status === 'fulfilled' && aiAnalyses[2].value.success) {
        const citationIssues = this.processCitationResults(aiAnalyses[2].value);
        aiIssues.push(...citationIssues);
      }

      console.log(`🎯 AI analysis complete: ${aiIssues.length} additional issues found`);
      
      // Enhance AI issues with better highlighting text
      const enhancedAiIssues = this.enhanceHighlightText(aiIssues);
      
      // Combine with existing issues, avoiding duplicates
      return this.mergeIssues(existingIssues, enhancedAiIssues);

    } catch (error) {
      console.error('❌ AI analysis failed:', error);
      // Return original issues if AI fails - graceful degradation
      return existingIssues;
    }
  }

  /**
   * Analyze content quality using AI
   */
  async analyzeContentQuality(text) {
    const cacheKey = `content_${this.hashText(text.substring(0, 500))}`;
    
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey);
    }

    // Truncate text for API efficiency while preserving context
    const analysisText = this.truncateIntelligently(text, this.maxTextLength);
    
    const result = await groqService.analyzeContentQuality(analysisText);
    this.analysisCache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Analyze document structure
   */
  async analyzeDocumentStructure(text, headings) {
    const result = await groqService.analyzeDocumentStructure(text, headings);
    return result;
  }

  /**
   * Verify citation context and accuracy
   */
  async verifyCitationContext(text, citationIssues) {
    if (citationIssues.length === 0) return { success: true, content: '{"citations": []}' };
    
    const citations = citationIssues.map(issue => ({ text: issue.text || issue.description }));
    const result = await groqService.verifyCitations(text, citations);
    
    return result;
  }

  /**
   * Process content quality AI results into issue format
   */
  processContentQualityResults(aiResult) {
    const issues = [];
    
    try {
      // Clean the AI response - sometimes it has markdown formatting
      let cleanContent = aiResult.content;
      
      // Remove markdown code blocks if present
      cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Try to extract JSON if it's wrapped in other text
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      console.log('🔍 Parsing AI content result:', cleanContent.substring(0, 200));
      
      const analysis = JSON.parse(cleanContent);
      
      if (analysis.issues) {
        analysis.issues.forEach(aiIssue => {
          issues.push({
            id: uuidv4(),
            title: `AI: ${this.formatIssueTitle(aiIssue.type)}`,
            description: aiIssue.description,
            severity: this.mapAISeverity(aiIssue.severity),
            category: 'ai-content',
            text: aiIssue.highlightText || aiIssue.examples?.[0] || null,
            location: { type: 'content', section: aiIssue.type },
            hasFix: false, // AI issues typically need manual review
            fixAction: null,
            explanation: aiIssue.suggestion,
            aiGenerated: true,
            aiDetails: {
              type: aiIssue.type,
              suggestion: aiIssue.suggestion,
              examples: aiIssue.examples || [],
              highlightText: aiIssue.highlightText,
              overallScore: analysis.overallScore
            }
          });
        });
      }

    } catch (error) {
      console.error('Error processing AI content results:', error.message);
      console.error('Raw AI response:', aiResult.content?.substring(0, 300));
      
      // If JSON parsing fails, create a generic AI issue
      issues.push({
        id: uuidv4(),
        title: 'AI: Content Analysis Available',
        description: 'AI detected potential writing improvements but response needs manual review',
        severity: 'Minor',
        category: 'ai-content',
        text: null,
        location: { type: 'content', section: 'general' },
        hasFix: false,
        fixAction: null,
        explanation: 'AI analysis completed but couldn\'t parse specific recommendations. Check console for details.',
        aiGenerated: true,
        aiDetails: {
          type: 'parsing-error',
          rawResponse: aiResult.content?.substring(0, 500)
        }
      });
    }
    
    return issues;
  }

  /**
   * Process structure AI results
   */
  processStructureResults(aiResult) {
    const issues = [];
    
    try {
      // Clean the AI response
      let cleanContent = aiResult.content;
      cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      console.log('🔍 Parsing AI structure result:', cleanContent.substring(0, 200));
      
      const analysis = JSON.parse(cleanContent);
      
      if (analysis.issues) {
        analysis.issues.forEach(aiIssue => {
          issues.push({
            id: uuidv4(),
            title: `AI: ${this.formatIssueTitle(aiIssue.type)}`,
            description: aiIssue.description,
            severity: 'Minor', // Structure issues are typically minor
            category: 'ai-structure',
            text: null,
            location: { type: 'structure', section: aiIssue.type },
            hasFix: false,
            fixAction: null,
            explanation: aiIssue.suggestion,
            aiGenerated: true,
            aiDetails: {
              type: aiIssue.type,
              suggestion: aiIssue.suggestion,
              structureScore: analysis.structureScore,
              missingElements: analysis.missingElements || []
            }
          });
        });
      }

    } catch (error) {
      console.error('Error processing AI structure results:', error.message);
      console.error('Raw AI response:', aiResult.content?.substring(0, 300));
      
      // Create fallback issue
      issues.push({
        id: uuidv4(),
        title: 'AI: Structure Analysis Available',
        description: 'AI analyzed document structure but response needs manual review',
        severity: 'Minor',
        category: 'ai-structure',
        text: null,
        location: { type: 'structure', section: 'general' },
        hasFix: false,
        fixAction: null,
        explanation: 'AI structure analysis completed. Check console for raw results.',
        aiGenerated: true,
        aiDetails: {
          type: 'parsing-error',
          rawResponse: aiResult.content?.substring(0, 500)
        }
      });
    }
    
    return issues;
  }

  /**
   * Process citation verification results
   */
  processCitationResults(aiResult) {
    const issues = [];
    
    try {
      // Clean the AI response
      let cleanContent = aiResult.content;
      cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      console.log('🔍 Parsing AI citation result:', cleanContent.substring(0, 200));
      
      const analysis = JSON.parse(cleanContent);
      
      if (analysis.citations) {
        analysis.citations.forEach(citation => {
          if (citation.issues && citation.issues.length > 0) {
            citation.issues.forEach(issue => {
              issues.push({
                id: uuidv4(),
                title: 'AI: Citation Context Issue',
                description: issue,
                severity: citation.accuracy === 'poor' ? 'Major' : 'Minor',
                category: 'ai-citations',
                text: citation.highlightText || citation.text,
                location: { type: 'citation', text: citation.text },
                hasFix: false,
                fixAction: null,
                explanation: citation.suggestions?.[0] || 'Review citation accuracy and context',
                aiGenerated: true,
                aiDetails: {
                  accuracy: citation.accuracy,
                  suggestions: citation.suggestions || [],
                  highlightText: citation.highlightText
                }
              });
            });
          }
        });
      }

      // Add missing citation issues
      if (analysis.missingCitations) {
        analysis.missingCitations.forEach(missing => {
          const missingData = typeof missing === 'string' ? { description: missing } : missing;
          
          issues.push({
            id: uuidv4(),
            title: 'AI: Missing Citation Detected',
            description: missingData.description || missing,
            severity: 'Major',
            category: 'ai-citations',
            text: missingData.highlightText || null,
            location: { type: 'content', issue: 'missing-citation' },
            hasFix: false,
            fixAction: null,
            explanation: 'Consider adding a citation to support this claim or statement',
            aiGenerated: true,
            aiDetails: {
              type: 'missing-citation',
              suggestion: missingData.description || missing,
              highlightText: missingData.highlightText
            }
          });
        });
      }

    } catch (error) {
      console.error('Error processing AI citation results:', error.message);
      console.error('Raw AI response:', aiResult.content?.substring(0, 300));
      
      // Create fallback issue
      issues.push({
        id: uuidv4(),
        title: 'AI: Citation Analysis Available',
        description: 'AI analyzed citations but response needs manual review',
        severity: 'Minor',
        category: 'ai-citations',
        text: null,
        location: { type: 'citations', section: 'general' },
        hasFix: false,
        fixAction: null,
        explanation: 'AI citation analysis completed. Check console for raw results.',
        aiGenerated: true,
        aiDetails: {
          type: 'parsing-error',
          rawResponse: aiResult.content?.substring(0, 500)
        }
      });
    }
    
    return issues;
  }

  /**
   * Generate AI-powered fix suggestions for existing issues
   */
  async generateFixSuggestion(issue, documentText) {
    try {
      // Extract context around the issue
      const context = this.extractIssueContext(issue, documentText);
      
      const result = await groqService.generateFixSuggestions(issue, context);
      
      if (result.success) {
        // Clean the AI response like we do for other AI methods
        let cleanContent = result.content;
        cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanContent = jsonMatch[0];
        }
        
        console.log('🔍 Parsing AI fix suggestion:', cleanContent.substring(0, 200));
        
        const suggestion = JSON.parse(cleanContent);
        return {
          success: true,
          suggestion: {
            explanation: suggestion.explanation,
            steps: suggestion.steps || [],
            examples: suggestion.examples || {},
            tips: suggestion.tips || [],
            resources: suggestion.resources || []
          }
        };
      }
      
      return { success: false, error: result.error };
      
    } catch (error) {
      console.error('Error generating AI fix suggestion:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper methods
   */
  
  truncateIntelligently(text, maxLength) {
    if (text.length <= maxLength) return text;
    
    // Try to cut at sentence boundaries
    const truncated = text.substring(0, maxLength);
    const lastSentence = truncated.lastIndexOf('. ');
    
    if (lastSentence > maxLength * 0.7) {
      return truncated.substring(0, lastSentence + 1);
    }
    
    return truncated + '...';
  }

  hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  formatIssueTitle(type) {
    const typeMap = {
      'tone': 'Academic Tone Issue',
      'clarity': 'Clarity Improvement Needed',
      'structure': 'Structure Enhancement',
      'evidence': 'Evidence Quality Issue',
      'transitions': 'Transition Improvement',
      'hierarchy': 'Heading Hierarchy Issue',
      'flow': 'Logical Flow Issue'
    };
    
    return typeMap[type] || `${type.charAt(0).toUpperCase() + type.slice(1)} Issue`;
  }

  mapAISeverity(aiSeverity) {
    const severityMap = {
      'minor': 'Minor',
      'moderate': 'Major', 
      'major': 'Critical',
      'critical': 'Critical'
    };
    
    return severityMap[aiSeverity?.toLowerCase()] || 'Minor';
  }

  extractIssueContext(issue, text) {
    if (issue.text && text.includes(issue.text)) {
      const index = text.indexOf(issue.text);
      const start = Math.max(0, index - 200);
      const end = Math.min(text.length, index + issue.text.length + 200);
      return text.substring(start, end);
    }
    
    // Return first part of document as context
    return text.substring(0, 800);
  }

  enhanceHighlightText(aiIssues) {
    return aiIssues.map(issue => {
      // If issue already has text, keep it
      if (issue.text && issue.text.length > 0) {
        return issue;
      }
      
      // Try to find relevant text based on issue type and description
      const enhancedText = this.findRelevantText(issue);
      
      if (enhancedText) {
        return {
          ...issue,
          text: enhancedText
        };
      }
      
      return issue;
    });
  }
  
  findRelevantText(issue) {
    if (!this.documentText) return null;
    
    const text = this.documentText;
    const description = issue.description.toLowerCase();
    
    // Look for common patterns based on issue type
    if (issue.category === 'ai-content') {
      // For tone issues, look for informal language
      if (description.includes('formal') || description.includes('tone')) {
        const informalPhrases = [
          'a lot of', 'lots of', 'tons of', 'bunch of', 'kind of', 'sort of',
          'pretty much', 'really good', 'very good', 'bad thing', 'good thing',
          'thing is', 'the fact that', 'in order to'
        ];
        
        for (const phrase of informalPhrases) {
          const index = text.toLowerCase().indexOf(phrase);
          if (index !== -1) {
            // Return the actual text with original casing
            const actualText = text.substring(index, index + phrase.length);
            return actualText;
          }
        }
      }
      
      // For clarity issues, look for wordy constructions
      if (description.includes('clarity') || description.includes('concise')) {
        const wordyPhrases = [
          'due to the fact that', 'in spite of the fact that', 'it is important to note that',
          'it should be noted that', 'it is worth mentioning that', 'the reason why'
        ];
        
        for (const phrase of wordyPhrases) {
          const index = text.toLowerCase().indexOf(phrase);
          if (index !== -1) {
            const actualText = text.substring(index, index + phrase.length);
            return actualText;
          }
        }
      }
    }
    
    // For missing citations, look for unsupported claims (numbers, statistics)
    if (issue.category === 'ai-citations' && description.includes('missing')) {
      const statPatterns = [
        /\d+%[^\(\)]*(?!.*\([^\)]*\d{4}[^\)]*\))/g,  // Percentages without citations
        /\d+\.\d+%[^\(\)]*(?!.*\([^\)]*\d{4}[^\)]*\))/g,  // Decimal percentages
        /(most|many|majority of) (people|students|researchers|studies)[^\(\)]*(?!.*\([^\)]*\d{4}[^\)]*\))/gi
      ];
      
      for (const pattern of statPatterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
          return matches[0].trim();
        }
      }
    }
    
    return null;
  }

  mergeIssues(existingIssues, aiIssues) {
    // Simple merge - in production you might want to deduplicate more intelligently
    return [...existingIssues, ...aiIssues];
  }
}

// Export singleton
export const aiEnhancedAnalyzer = new AIEnhancedAnalyzer();
export default aiEnhancedAnalyzer;