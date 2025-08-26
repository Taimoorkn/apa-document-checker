// server/services/WebSocketService.js - Real-time WebSocket service
const { Server } = require('socket.io');

class WebSocketService {
  constructor() {
    this.io = null;
    this.activeSessions = new Map();
    this.analysisQueue = new Map();
  }

  /**
   * Initialize Socket.io with Express server
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://your-domain.com']
          : ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    console.log('✅ WebSocket service initialized');
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`👤 Client connected: ${socket.id}`);

      // Store session
      this.activeSessions.set(socket.id, {
        connectedAt: new Date(),
        documentId: null,
        isAnalyzing: false
      });

      // Join document room for collaborative features
      socket.on('join-document', (documentId) => {
        const session = this.activeSessions.get(socket.id);
        if (session) {
          session.documentId = documentId;
          socket.join(`doc:${documentId}`);
          console.log(`📄 Client ${socket.id} joined document: ${documentId}`);
        }
      });

      // Real-time text analysis request
      socket.on('analyze-text', async (data) => {
        const { text, documentId, chunkIndex } = data;
        
        // Debounce analysis requests
        const queueKey = `${socket.id}:${chunkIndex}`;
        
        if (this.analysisQueue.has(queueKey)) {
          clearTimeout(this.analysisQueue.get(queueKey));
        }

        const timeoutId = setTimeout(() => {
          this.performRealtimeAnalysis(socket, text, documentId, chunkIndex);
          this.analysisQueue.delete(queueKey);
        }, 500); // 500ms debounce

        this.analysisQueue.set(queueKey, timeoutId);
      });

      // Request for inline suggestions
      socket.on('request-suggestions', async (data) => {
        const { text, issueId, context } = data;
        const suggestions = await this.generateSuggestions(text, issueId, context);
        
        socket.emit('suggestions', {
          issueId,
          suggestions,
          timestamp: new Date().toISOString()
        });
      });

      // Apply fix request
      socket.on('apply-suggestion', async (data) => {
        const { suggestionId, text, position } = data;
        
        socket.emit('suggestion-applied', {
          suggestionId,
          success: true,
          newText: text
        });

        // Notify other clients in the same document
        if (this.activeSessions.get(socket.id)?.documentId) {
          socket.to(`doc:${this.activeSessions.get(socket.id).documentId}`)
            .emit('document-updated', {
              type: 'suggestion-applied',
              position,
              text
            });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`👋 Client disconnected: ${socket.id}`);
        
        // Clear any pending analysis
        for (const [key, timeoutId] of this.analysisQueue.entries()) {
          if (key.startsWith(socket.id)) {
            clearTimeout(timeoutId);
            this.analysisQueue.delete(key);
          }
        }
        
        this.activeSessions.delete(socket.id);
      });
    });
  }

  /**
   * Perform real-time analysis on text chunk
   */
  async performRealtimeAnalysis(socket, text, documentId, chunkIndex) {
    try {
      // Import analyzer dynamically to avoid circular dependencies
      const { EnhancedAPAAnalyzer } = require('../../src/utils/enhancedApaAnalyzer');
      const analyzer = new EnhancedAPAAnalyzer();
      
      // Perform lightweight analysis on the chunk
      const issues = this.performQuickAnalysis(text);
      
      // Emit results back to client
      socket.emit('analysis-update', {
        chunkIndex,
        issues,
        timestamp: new Date().toISOString()
      });

      // Store session state
      const session = this.activeSessions.get(socket.id);
      if (session) {
        session.lastAnalysis = new Date();
      }

    } catch (error) {
      console.error('Real-time analysis error:', error);
      socket.emit('analysis-error', {
        chunkIndex,
        error: error.message
      });
    }
  }

  /**
   * Quick analysis for real-time feedback (lightweight checks only)
   */
  performQuickAnalysis(text) {
    const issues = [];
    
    // Quick formatting checks
    const lines = text.split('\n');
    
    lines.forEach((line, index) => {
      // Check for common APA issues
      
      // Double spacing hint
      if (lines.length > 1 && index > 0 && line.trim() && lines[index - 1].trim()) {
        const prevLineEnd = lines[index - 1].slice(-1);
        if (prevLineEnd === '.' && !line.match(/^\s{5}/)) {
          issues.push({
            type: 'spacing',
            line: index,
            message: 'Missing paragraph indentation',
            severity: 'minor',
            quickFix: true
          });
        }
      }
      
      // Citation format
      const citationMatch = line.match(/\([^)]+,\s*\d{4}\)/g);
      if (citationMatch) {
        citationMatch.forEach(citation => {
          if (!citation.match(/\([A-Z][^,]+,\s*\d{4}\)/)) {
            issues.push({
              type: 'citation',
              line: index,
              text: citation,
              message: 'Citation format may be incorrect',
              severity: 'major',
              quickFix: true
            });
          }
        });
      }
      
      // Informal language detection
      const informalWords = ['gonna', 'wanna', 'gotta', 'ain\'t', 'can\'t', 'won\'t', 'don\'t'];
      informalWords.forEach(word => {
        if (line.toLowerCase().includes(word)) {
          issues.push({
            type: 'style',
            line: index,
            text: word,
            message: `Informal language: "${word}"`,
            severity: 'major',
            suggestion: this.getFormalReplacement(word),
            quickFix: true
          });
        }
      });
    });
    
    return issues;
  }

  /**
   * Generate suggestions for an issue (Grammarly-style)
   */
  async generateSuggestions(text, issueId, context) {
    const suggestions = [];
    
    // Common APA fixes
    const commonFixes = {
      'citation': [
        { 
          text: 'Add author and year',
          replacement: '(Author, 2024)',
          confidence: 0.9
        },
        {
          text: 'Fix citation format',
          replacement: text.replace(/\(([^,]+)\s+(\d{4})\)/, '($1, $2)'),
          confidence: 0.85
        }
      ],
      'spacing': [
        {
          text: 'Add paragraph indentation',
          replacement: '     ' + text,
          confidence: 0.95
        },
        {
          text: 'Remove extra spacing',
          replacement: text.replace(/\s+/g, ' '),
          confidence: 0.8
        }
      ],
      'style': [
        {
          text: 'Use formal language',
          replacement: this.getFormalReplacement(text),
          confidence: 0.9
        }
      ]
    };
    
    // Get suggestions based on issue type
    const issueType = context.type || 'general';
    const baseSuggestions = commonFixes[issueType] || [];
    
    // Add AI-powered suggestions if available
    if (context.aiEnabled) {
      try {
        // This would call your AI service
        const aiSuggestions = await this.getAISuggestions(text, context);
        suggestions.push(...aiSuggestions);
      } catch (error) {
        console.warn('AI suggestions unavailable:', error.message);
      }
    }
    
    suggestions.push(...baseSuggestions);
    
    // Sort by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }

  /**
   * Get formal replacement for informal words
   */
  getFormalReplacement(informal) {
    const replacements = {
      'gonna': 'going to',
      'wanna': 'want to',
      'gotta': 'have to',
      'ain\'t': 'is not',
      'can\'t': 'cannot',
      'won\'t': 'will not',
      'don\'t': 'do not',
      'it\'s': 'it is',
      'let\'s': 'let us'
    };
    
    return replacements[informal.toLowerCase()] || informal;
  }

  /**
   * Get AI-powered suggestions (placeholder for AI integration)
   */
  async getAISuggestions(text, context) {
    // This would integrate with your Groq/OpenAI service
    return [];
  }

  /**
   * Broadcast to all clients in a document room
   */
  broadcastToDocument(documentId, event, data) {
    if (this.io) {
      this.io.to(`doc:${documentId}`).emit(event, data);
    }
  }

  /**
   * Send to specific client
   */
  sendToClient(socketId, event, data) {
    if (this.io) {
      this.io.to(socketId).emit(event, data);
    }
  }

  /**
   * Get active sessions count
   */
  getActiveSessions() {
    return {
      total: this.activeSessions.size,
      sessions: Array.from(this.activeSessions.values())
    };
  }
}

// Export singleton instance
module.exports = new WebSocketService();