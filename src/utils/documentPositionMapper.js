// src/utils/documentPositionMapper.js
// Utility for mapping positions between server document structure and Slate editor nodes

export class DocumentPositionMapper {
  constructor() {
    this.paragraphMap = new Map(); // Maps paragraph index to Slate path
    this.nodeMap = new Map(); // Maps Slate path to paragraph data
    this.textPositionMap = new Map(); // Maps text positions to node paths
  }

  /**
   * Build mapping between server paragraphs and Slate nodes
   */
  buildMapping(serverParagraphs, slateNodes) {
    this.clear();
    
    // Create bidirectional mapping
    slateNodes.forEach((node, nodeIndex) => {
      const path = [nodeIndex];
      const paraIndex = node.paraIndex !== undefined ? node.paraIndex : nodeIndex;
      
      // Map paragraph index to Slate path
      this.paragraphMap.set(paraIndex, path);
      
      // Map Slate path to paragraph data
      this.nodeMap.set(path.toString(), {
        paragraphIndex: paraIndex,
        text: this.extractNodeText(node),
        formatting: node.formatting || {},
        type: node.type
      });
      
      // Build text position map for this node
      this.buildTextPositionMap(node, path, paraIndex);
    });
    
    return this;
  }

  /**
   * Build text position map for accurate text location
   */
  buildTextPositionMap(node, path, paraIndex) {
    let offset = 0;
    
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child, childIndex) => {
        const childPath = [...path, childIndex];
        const text = child.text || '';
        
        // Store position info for this text segment
        this.textPositionMap.set(`${paraIndex}-${offset}`, {
          path: childPath,
          offset: 0,
          length: text.length,
          text: text
        });
        
        offset += text.length;
      });
    }
  }

  /**
   * Extract text from a Slate node
   */
  extractNodeText(node) {
    if (!node.children) return '';
    return node.children.map(child => child.text || '').join('');
  }

  /**
   * Find Slate path for a paragraph index
   */
  getSlatePathForParagraph(paragraphIndex) {
    return this.paragraphMap.get(paragraphIndex);
  }

  /**
   * Find paragraph index for a Slate path
   */
  getParagraphIndexForPath(path) {
    const nodeData = this.nodeMap.get(path.toString());
    return nodeData ? nodeData.paragraphIndex : null;
  }

  /**
   * Find text position in Slate document
   * Returns { path, offset, length } for highlighting
   */
  findTextPosition(searchText, paragraphIndex = null) {
    const positions = [];
    
    // If paragraph index is specified, search only in that paragraph
    if (paragraphIndex !== null) {
      const path = this.getSlatePathForParagraph(paragraphIndex);
      if (path) {
        const nodeData = this.nodeMap.get(path.toString());
        if (nodeData && nodeData.text) {
          const index = nodeData.text.indexOf(searchText);
          if (index !== -1) {
            positions.push({
              path: path,
              offset: index,
              length: searchText.length,
              paragraphIndex: paragraphIndex
            });
          }
        }
      }
    } else {
      // Search across all nodes
      for (const [pathStr, nodeData] of this.nodeMap) {
        if (nodeData.text) {
          let index = nodeData.text.indexOf(searchText);
          while (index !== -1) {
            const path = pathStr.split(',').map(Number);
            positions.push({
              path: path,
              offset: index,
              length: searchText.length,
              paragraphIndex: nodeData.paragraphIndex
            });
            index = nodeData.text.indexOf(searchText, index + 1);
          }
        }
      }
    }
    
    return positions;
  }

  /**
   * Find exact position for text within a paragraph with character offset
   */
  findExactPosition(paragraphIndex, characterOffset, length) {
    const path = this.getSlatePathForParagraph(paragraphIndex);
    if (!path) return null;
    
    // Find the exact child node and offset within it
    let currentOffset = 0;
    const nodeData = this.nodeMap.get(path.toString());
    
    if (!nodeData) return null;
    
    // Search through text position map for this paragraph
    for (const [key, posData] of this.textPositionMap) {
      if (key.startsWith(`${paragraphIndex}-`)) {
        const nextOffset = currentOffset + posData.length;
        
        if (characterOffset >= currentOffset && characterOffset < nextOffset) {
          return {
            path: posData.path,
            offset: characterOffset - currentOffset,
            length: Math.min(length, posData.length - (characterOffset - currentOffset)),
            text: posData.text.substring(
              characterOffset - currentOffset,
              characterOffset - currentOffset + length
            )
          };
        }
        
        currentOffset = nextOffset;
      }
    }
    
    return null;
  }

  /**
   * Clear all mappings
   */
  clear() {
    this.paragraphMap.clear();
    this.nodeMap.clear();
    this.textPositionMap.clear();
  }

  /**
   * Get all paragraph indices that contain specific text
   */
  findParagraphsWithText(searchText) {
    const paragraphs = [];
    
    for (const [pathStr, nodeData] of this.nodeMap) {
      if (nodeData.text && nodeData.text.includes(searchText)) {
        paragraphs.push({
          paragraphIndex: nodeData.paragraphIndex,
          path: pathStr.split(',').map(Number),
          text: nodeData.text
        });
      }
    }
    
    return paragraphs;
  }

  /**
   * Map issue location to Slate position
   */
  mapIssueToSlatePosition(issue) {
    // Handle different issue location formats
    if (!issue.location) {
      // No location info, try text search
      if (issue.text) {
        const positions = this.findTextPosition(issue.text);
        return positions.length > 0 ? positions[0] : null;
      }
      return null;
    }
    
    const location = issue.location;
    
    // Handle paragraph-based location
    if (typeof location.paragraphIndex === 'number') {
      // If we have character offset, use exact position
      if (typeof location.charOffset === 'number' && typeof location.length === 'number') {
        return this.findExactPosition(
          location.paragraphIndex,
          location.charOffset,
          location.length
        );
      }
      
      // Otherwise, search for text within the paragraph
      if (issue.text) {
        const positions = this.findTextPosition(issue.text, location.paragraphIndex);
        return positions.length > 0 ? positions[0] : null;
      }
      
      // If no text, highlight entire paragraph
      const path = this.getSlatePathForParagraph(location.paragraphIndex);
      if (path) {
        const nodeData = this.nodeMap.get(path.toString());
        return {
          path: path,
          offset: 0,
          length: nodeData ? nodeData.text.length : 0,
          wholeParagraph: true
        };
      }
    }
    
    // Handle document-level issues (formatting issues)
    if (location.type === 'document') {
      // For document-level issues, highlight first paragraph or title
      const path = this.getSlatePathForParagraph(0);
      if (path) {
        const nodeData = this.nodeMap.get(path.toString());
        return {
          path: path,
          offset: 0,
          length: Math.min(50, nodeData ? nodeData.text.length : 0),
          isDocumentLevel: true
        };
      }
    }
    
    return null;
  }

  /**
   * Update mapping after document edit
   */
  updateAfterEdit(editPath, editType, editData) {
    // This would handle updates to the mapping after edits
    // For now, we'll rebuild the mapping when needed
    console.log('Position mapping update needed after edit:', { editPath, editType, editData });
  }
}

// Singleton instance
export const positionMapper = new DocumentPositionMapper();