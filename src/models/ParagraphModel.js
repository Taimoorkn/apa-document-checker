'use client';

import { v4 as uuidv4 } from 'uuid';

/**
 * Immutable paragraph representation - single source of truth for paragraph content
 * Tracks text, formatting, runs, and issues at the paragraph level
 */
export class ParagraphModel {
  constructor(id = null) {
    this.id = id || uuidv4();
    this.text = '';
    this.index = 0; // Position in document
    this.lastModified = Date.now();
    this.changeSequence = 0;

    // Formatting attributes
    this.formatting = {
      font: { family: null, size: null, bold: false, italic: false, underline: false },
      spacing: { line: null, before: null, after: null },
      indentation: { firstLine: null, left: null, right: null, hanging: null },
      alignment: null,
      styleName: null
    };

    // Text runs (inline formatting)
    this.runs = new Map(); // run-id -> RunModel
    this.runOrder = []; // Maintains run order

    // Issues associated with this paragraph
    this.issues = new Set(); // issue-ids

    // Original server data for reference
    this.originalData = null;
  }

  /**
   * Create from server paragraph data
   */
  static fromServerData(serverParagraph, index = 0) {
    const paragraph = new ParagraphModel();
    paragraph.index = index;
    paragraph.text = serverParagraph.text || '';
    paragraph.originalData = serverParagraph;

    // Extract formatting
    if (serverParagraph.font) {
      paragraph.formatting.font = {
        family: serverParagraph.font.family || null,
        size: serverParagraph.font.size || null,
        bold: serverParagraph.font.bold || false,
        italic: serverParagraph.font.italic || false,
        underline: serverParagraph.font.underline || false
      };
    }

    if (serverParagraph.spacing) {
      paragraph.formatting.spacing = {
        line: serverParagraph.spacing.line || null,
        before: serverParagraph.spacing.before || null,
        after: serverParagraph.spacing.after || null
      };
    }

    if (serverParagraph.indentation) {
      paragraph.formatting.indentation = {
        firstLine: serverParagraph.indentation.firstLine || null,
        left: serverParagraph.indentation.left || null,
        right: serverParagraph.indentation.right || null,
        hanging: serverParagraph.indentation.hanging || null
      };
    }

    if (serverParagraph.alignment) {
      paragraph.formatting.alignment = serverParagraph.alignment;
    }

    if (serverParagraph.style) {
      paragraph.formatting.styleName = serverParagraph.style;
    }

    // Process runs (inline formatting)
    if (serverParagraph.runs && Array.isArray(serverParagraph.runs)) {
      serverParagraph.runs.forEach((runData, runIndex) => {
        if (runData.text && runData.text.length > 0) {
          const runModel = RunModel.fromServerData(runData, runIndex);
          paragraph.runs.set(runModel.id, runModel);
          paragraph.runOrder.push(runModel.id);
        }
      });
    } else if (paragraph.text) {
      // Create a single run from paragraph text
      const runModel = RunModel.fromText(paragraph.text, 0, paragraph.formatting.font);
      paragraph.runs.set(runModel.id, runModel);
      paragraph.runOrder.push(runModel.id);
    }

    return paragraph;
  }

  /**
   * Create from plain text
   */
  static fromText(text, index = 0, formatting = null) {
    const paragraph = new ParagraphModel();
    paragraph.index = index;
    paragraph.text = text;

    if (formatting) {
      paragraph.formatting = { ...paragraph.formatting, ...formatting };
    }

    // Create single run
    const runModel = RunModel.fromText(text, 0, paragraph.formatting.font);
    paragraph.runs.set(runModel.id, runModel);
    paragraph.runOrder.push(runModel.id);

    return paragraph;
  }

  /**
   * Create from Tiptap node
   */
  static fromTiptapNode(tiptapNode, index = 0) {
    const paragraph = new ParagraphModel();
    paragraph.index = index;

    // Extract attributes from Tiptap node
    if (tiptapNode.attrs) {
      const attrs = tiptapNode.attrs;

      if (attrs.lineHeight) paragraph.formatting.spacing.line = attrs.lineHeight;
      if (attrs.spaceBefore) paragraph.formatting.spacing.before = attrs.spaceBefore;
      if (attrs.spaceAfter) paragraph.formatting.spacing.after = attrs.spaceAfter;
      if (attrs.firstLineIndent) paragraph.formatting.indentation.firstLine = attrs.firstLineIndent;
      if (attrs.leftIndent) paragraph.formatting.indentation.left = attrs.leftIndent;
      if (attrs.rightIndent) paragraph.formatting.indentation.right = attrs.rightIndent;
      if (attrs.hangingIndent) paragraph.formatting.indentation.hanging = attrs.hangingIndent;
      if (attrs.textAlign) paragraph.formatting.alignment = attrs.textAlign;
      if (attrs.styleName) paragraph.formatting.styleName = attrs.styleName;
    }

    // Process content (text nodes with marks)
    if (tiptapNode.content && Array.isArray(tiptapNode.content)) {
      let textParts = [];

      tiptapNode.content.forEach((textNode, runIndex) => {
        if (textNode.type === 'text' && textNode.text) {
          textParts.push(textNode.text);

          // Create run with formatting from marks
          const runModel = RunModel.fromTiptapTextNode(textNode, runIndex);
          paragraph.runs.set(runModel.id, runModel);
          paragraph.runOrder.push(runModel.id);
        }
      });

      paragraph.text = textParts.join('');
    }

    return paragraph;
  }

  /**
   * Update paragraph content and formatting
   */
  update(changes) {
    let hasChanges = false;
    const oldVersion = this.changeSequence;

    // Update text
    if (changes.text !== undefined && changes.text !== this.text) {
      this.text = changes.text;
      hasChanges = true;

      // CRITICAL FIX: When text changes without explicit runs, regenerate runs
      // Otherwise toTiptapNode() will use old run text
      if (!changes.runs) {
        // Preserve existing formatting from first run
        const firstRun = this.runs.size > 0 ? Array.from(this.runs.values())[0] : null;
        const formatting = firstRun ? {
          font: firstRun.font,
          color: firstRun.color
        } : {};

        this.runs.clear();
        this.runOrder = [];

        const newRun = RunModel.fromData({
          text: changes.text,
          ...formatting
        }, 0);

        this.runs.set(newRun.id, newRun);
        this.runOrder.push(newRun.id);
      }
    }

    // Update formatting
    if (changes.formatting) {
      const newFormatting = { ...this.formatting, ...changes.formatting };
      if (JSON.stringify(newFormatting) !== JSON.stringify(this.formatting)) {
        this.formatting = newFormatting;
        hasChanges = true;
      }
    }

    // Update runs
    if (changes.runs) {
      this.runs.clear();
      this.runOrder = [];

      changes.runs.forEach((runData, index) => {
        const runModel = RunModel.fromData(runData, index);
        this.runs.set(runModel.id, runModel);
        this.runOrder.push(runModel.id);
      });

      hasChanges = true;
    }

    // Update index if provided
    if (changes.index !== undefined && changes.index !== this.index) {
      this.index = changes.index;
      hasChanges = true;
    }

    if (hasChanges) {
      this.lastModified = Date.now();
      this.changeSequence++;
    }

    return hasChanges;
  }

  /**
   * Get plain text content
   */
  getPlainText() {
    return this.text;
  }

  /**
   * Convert to HTML representation
   */
  toHtml() {
    const styles = [];

    // Apply paragraph-level formatting
    if (this.formatting.spacing.line) {
      styles.push(`line-height: ${this.formatting.spacing.line}`);
    }
    if (this.formatting.spacing.before) {
      styles.push(`margin-top: ${this.formatting.spacing.before}pt`);
    }
    if (this.formatting.spacing.after) {
      styles.push(`margin-bottom: ${this.formatting.spacing.after}pt`);
    }
    if (this.formatting.indentation.firstLine) {
      styles.push(`text-indent: ${this.formatting.indentation.firstLine}in`);
    }
    if (this.formatting.indentation.left) {
      styles.push(`padding-left: ${this.formatting.indentation.left}in`);
    }
    if (this.formatting.indentation.right) {
      styles.push(`padding-right: ${this.formatting.indentation.right}in`);
    }
    if (this.formatting.indentation.hanging) {
      styles.push(`text-indent: -${this.formatting.indentation.hanging}in`);
      styles.push(`padding-left: ${this.formatting.indentation.hanging}in`);
    }
    if (this.formatting.alignment) {
      styles.push(`text-align: ${this.formatting.alignment}`);
    }

    // Build content from runs
    let content = '';
    this.runOrder.forEach(runId => {
      const run = this.runs.get(runId);
      if (run) {
        content += run.toHtml();
      }
    });

    return `<p${styles.length > 0 ? ` style="${styles.join('; ')}"` : ''}${
      this.formatting.styleName ? ` data-style-name="${this.formatting.styleName}"` : ''
    }>${content || this.text}</p>`;
  }

  /**
   * Convert to Tiptap node representation
   */
  toTiptapNode() {
    const attrs = {};

    // Map formatting to Tiptap attributes
    if (this.formatting.spacing.line) attrs.lineHeight = this.formatting.spacing.line;
    if (this.formatting.spacing.before) attrs.spaceBefore = `${this.formatting.spacing.before}pt`;
    if (this.formatting.spacing.after) attrs.spaceAfter = `${this.formatting.spacing.after}pt`;
    if (this.formatting.indentation.firstLine) attrs.firstLineIndent = `${this.formatting.indentation.firstLine}in`;
    if (this.formatting.indentation.left) attrs.leftIndent = `${this.formatting.indentation.left}in`;
    if (this.formatting.indentation.right) attrs.rightIndent = `${this.formatting.indentation.right}in`;
    if (this.formatting.indentation.hanging) attrs.hangingIndent = `${this.formatting.indentation.hanging}in`;
    if (this.formatting.alignment) attrs.textAlign = this.formatting.alignment;
    if (this.formatting.styleName) attrs.styleName = this.formatting.styleName;

    // Store original formatting for preservation
    attrs.originalFormatting = this.originalData;

    // Build content from runs
    const content = [];
    this.runOrder.forEach(runId => {
      const run = this.runs.get(runId);
      if (run) {
        const tiptapTextNode = run.toTiptapTextNode();
        if (tiptapTextNode) {
          content.push(tiptapTextNode);
        }
      }
    });

    // Fallback if no runs
    if (content.length === 0 && this.text) {
      content.push({ type: 'text', text: this.text });
    }

    return {
      type: 'paragraph',
      attrs: Object.keys(attrs).length > 0 ? attrs : undefined,
      content: content.length > 0 ? content : [{ type: 'text', text: ' ' }]
    };
  }

  /**
   * Check if paragraph has changed since given timestamp
   */
  hasChangedSince(timestamp) {
    return this.lastModified > timestamp;
  }

  /**
   * Get paragraph statistics
   */
  getStatistics() {
    const words = this.text.trim().split(/\s+/).filter(Boolean);
    return {
      characters: this.text.length,
      charactersNoSpaces: this.text.replace(/\s/g, '').length,
      words: words.length,
      sentences: this.text.split(/[.!?]+/).filter(s => s.trim()).length,
      runs: this.runs.size
    };
  }

  /**
   * Clone paragraph
   */
  clone() {
    const cloned = new ParagraphModel();
    cloned.id = uuidv4(); // New ID for clone
    cloned.text = this.text;
    cloned.index = this.index;
    cloned.formatting = JSON.parse(JSON.stringify(this.formatting));
    cloned.originalData = this.originalData;

    // Clone runs
    this.runOrder.forEach(runId => {
      const run = this.runs.get(runId);
      if (run) {
        const clonedRun = run.clone();
        cloned.runs.set(clonedRun.id, clonedRun);
        cloned.runOrder.push(clonedRun.id);
      }
    });

    // Copy issues
    cloned.issues = new Set(this.issues);

    return cloned;
  }
}

/**
 * Text run model - represents inline formatting within a paragraph
 */
export class RunModel {
  constructor(id = null) {
    this.id = id || uuidv4();
    this.text = '';
    this.index = 0; // Position within paragraph

    this.font = {
      family: null,
      size: null,
      bold: false,
      italic: false,
      underline: false
    };

    this.color = null;
    this.highlight = null;
  }

  /**
   * Create from server run data
   */
  static fromServerData(serverRun, index = 0) {
    const run = new RunModel();
    run.index = index;
    run.text = serverRun.text || '';

    if (serverRun.font) {
      run.font = {
        family: serverRun.font.family || null,
        size: serverRun.font.size || null,
        bold: serverRun.font.bold || false,
        italic: serverRun.font.italic || false,
        underline: serverRun.font.underline || false
      };
    }

    if (serverRun.color) {
      run.color = serverRun.color;
    }

    if (serverRun.highlight) {
      run.highlight = serverRun.highlight;
    }

    return run;
  }

  /**
   * Create from plain text with formatting
   */
  static fromText(text, index = 0, font = null) {
    const run = new RunModel();
    run.index = index;
    run.text = text;

    if (font) {
      run.font = { ...run.font, ...font };
    }

    return run;
  }

  /**
   * Create from general data
   */
  static fromData(runData, index = 0) {
    const run = new RunModel();
    run.index = index;
    run.text = runData.text || '';

    if (runData.font) {
      run.font = { ...run.font, ...runData.font };
    }

    if (runData.color) {
      run.color = runData.color;
    }

    return run;
  }

  /**
   * Create from Tiptap text node
   */
  static fromTiptapTextNode(textNode, index = 0) {
    const run = new RunModel();
    run.index = index;
    run.text = textNode.text || '';

    // Process marks
    if (textNode.marks) {
      textNode.marks.forEach(mark => {
        switch (mark.type) {
          case 'bold':
            run.font.bold = true;
            break;
          case 'italic':
            run.font.italic = true;
            break;
          case 'underline':
            run.font.underline = true;
            break;
          case 'fontFormatting':
            if (mark.attrs.fontFamily) run.font.family = mark.attrs.fontFamily;
            if (mark.attrs.fontSize) {
              const size = parseFloat(mark.attrs.fontSize);
              if (!isNaN(size)) run.font.size = size;
            }
            if (mark.attrs.color) run.color = mark.attrs.color;
            break;
        }
      });
    }

    return run;
  }

  /**
   * Convert to HTML
   */
  toHtml() {
    if (!this.text) return '';

    const styles = [];
    const tags = [];

    // Font formatting
    if (this.font.family) {
      styles.push(`font-family: "${this.font.family}"`);
    }
    if (this.font.size) {
      styles.push(`font-size: ${this.font.size}pt`);
    }
    if (this.color) {
      styles.push(`color: ${this.color}`);
    }

    // Text formatting
    if (this.font.bold) tags.push('strong');
    if (this.font.italic) tags.push('em');
    if (this.font.underline) tags.push('u');

    let html = this.text;

    // Apply style tags
    tags.forEach(tag => {
      html = `<${tag}>${html}</${tag}>`;
    });

    // Apply span with styles if needed
    if (styles.length > 0) {
      html = `<span style="${styles.join('; ')}">${html}</span>`;
    }

    return html;
  }

  /**
   * Convert to Tiptap text node
   */
  toTiptapTextNode() {
    if (!this.text) return null;

    const textNode = {
      type: 'text',
      text: this.text
    };

    const marks = [];

    // Add formatting marks
    if (this.font.bold) marks.push({ type: 'bold' });
    if (this.font.italic) marks.push({ type: 'italic' });
    if (this.font.underline) marks.push({ type: 'underline' });

    // Add font formatting mark if needed
    const fontAttrs = {};
    if (this.font.family) fontAttrs.fontFamily = this.font.family;
    if (this.font.size) fontAttrs.fontSize = `${this.font.size}pt`;
    if (this.color) fontAttrs.color = this.color;

    if (Object.keys(fontAttrs).length > 0) {
      marks.push({
        type: 'fontFormatting',
        attrs: fontAttrs
      });
    }

    if (marks.length > 0) {
      textNode.marks = marks;
    }

    return textNode;
  }

  /**
   * Clone run
   */
  clone() {
    const cloned = new RunModel();
    cloned.id = uuidv4(); // New ID for clone
    cloned.text = this.text;
    cloned.index = this.index;
    cloned.font = { ...this.font };
    cloned.color = this.color;
    cloned.highlight = this.highlight;
    return cloned;
  }
}