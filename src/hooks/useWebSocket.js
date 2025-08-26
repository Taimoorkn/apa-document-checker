'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

export function useWebSocket(documentId) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [realtimeIssues, setRealtimeIssues] = useState([]);
  const analysisQueue = useRef(new Map());

  useEffect(() => {
    // Connect to WebSocket server
    const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    socketInstance.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setIsConnected(true);
      
      // Join document room if documentId exists
      if (documentId) {
        socketInstance.emit('join-document', documentId);
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
    });

    // Handle real-time analysis updates
    socketInstance.on('analysis-update', (data) => {
      const { chunkIndex, issues, timestamp } = data;
      
      setRealtimeIssues(prev => {
        const updated = [...prev];
        // Merge or replace issues for this chunk
        const existingIndex = updated.findIndex(i => i.chunkIndex === chunkIndex);
        
        if (existingIndex >= 0) {
          updated[existingIndex] = { chunkIndex, issues, timestamp };
        } else {
          updated.push({ chunkIndex, issues, timestamp });
        }
        
        return updated;
      });
    });

    // Handle suggestions response
    socketInstance.on('suggestions', (data) => {
      const { issueId, suggestions } = data;
      // This would be handled by the component that requested suggestions
      window.dispatchEvent(new CustomEvent('suggestions-received', { 
        detail: { issueId, suggestions } 
      }));
    });

    // Handle document updates from other users
    socketInstance.on('document-updated', (data) => {
      console.log('📝 Document updated by another user:', data);
      // Handle collaborative updates
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [documentId]);

  // Send text for real-time analysis (debounced)
  const analyzeText = useCallback((text, chunkIndex = 0) => {
    if (!socket || !isConnected) return;

    // Clear existing timeout for this chunk
    const queueKey = `chunk-${chunkIndex}`;
    if (analysisQueue.current.has(queueKey)) {
      clearTimeout(analysisQueue.current.get(queueKey));
    }

    // Set new timeout for debounced analysis
    const timeoutId = setTimeout(() => {
      socket.emit('analyze-text', {
        text,
        documentId,
        chunkIndex
      });
      analysisQueue.current.delete(queueKey);
    }, 500); // 500ms debounce

    analysisQueue.current.set(queueKey, timeoutId);
  }, [socket, isConnected, documentId]);

  // Request suggestions for an issue
  const requestSuggestions = useCallback((text, issueId, context) => {
    if (!socket || !isConnected) return Promise.reject('Not connected');

    return new Promise((resolve) => {
      const handleSuggestions = (event) => {
        if (event.detail.issueId === issueId) {
          window.removeEventListener('suggestions-received', handleSuggestions);
          resolve(event.detail.suggestions);
        }
      };

      window.addEventListener('suggestions-received', handleSuggestions);
      
      socket.emit('request-suggestions', {
        text,
        issueId,
        context
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        window.removeEventListener('suggestions-received', handleSuggestions);
        resolve([]);
      }, 5000);
    });
  }, [socket, isConnected]);

  // Apply a suggestion
  const applySuggestion = useCallback((suggestionId, text, position) => {
    if (!socket || !isConnected) return;

    socket.emit('apply-suggestion', {
      suggestionId,
      text,
      position
    });
  }, [socket, isConnected]);

  return {
    socket,
    isConnected,
    realtimeIssues,
    analyzeText,
    requestSuggestions,
    applySuggestion
  };
}