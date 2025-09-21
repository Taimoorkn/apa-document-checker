// server/processors/XmlDocxProcessor.js - XML-based DOCX processor using xml2js and PizZip
const PizZip = require('pizzip');
const xml2js = require('xml2js');
const fs = require('fs').promises;
const path = require('path');

class XmlDocxProcessor {
  // Static tracking of temporary files for emergency cleanup
  static tempFiles = new Set();
  static cleanupRegistered = false;

  constructor() {
    this.parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: false,
      explicitCharkey: true
    });

    // APA formatting standards for comparison
    this.apaStandards = {
      font: { family: 'Times New Roman', size: 12 },
      spacing: { line: 2.0 },
      margins: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0 },
      indentation: { firstLine: 0.5 }
    };

    // Register process cleanup handlers (only once)
    if (!XmlDocxProcessor.cleanupRegistered) {
      this.registerCleanupHandlers();
      XmlDocxProcessor.cleanupRegistered = true;
    }
  }

  // Register cleanup handlers for process exit events
  registerCleanupHandlers() {
    const cleanup = async () => {
      if (XmlDocxProcessor.tempFiles.size > 0) {
        console.log(`Cleaning up ${XmlDocxProcessor.tempFiles.size} temporary files...`);
        await Promise.allSettled(
          Array.from(XmlDocxProcessor.tempFiles).map(async (filePath) => {
            try {
              await fs.unlink(filePath);
            } catch (error) {
              // Ignore cleanup errors during shutdown
            }
          })
        );
        XmlDocxProcessor.tempFiles.clear();
      }
    };

    // Handle various exit scenarios
    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception, cleaning up temp files:', error);
      cleanup().finally(() => process.exit(1));
    });
  }

  /**
   * Process a DOCX document buffer and extract all necessary data
   */
  async processDocumentBuffer(buffer, filename = 'document.docx') {
    const tempFilePath = path.join(require('os').tmpdir(), `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${filename}`);
    let tempFileCreated = false;

    // Set up cleanup function
    const cleanup = async () => {
      if (tempFileCreated) {
        try {
          await fs.unlink(tempFilePath);
          XmlDocxProcessor.tempFiles.delete(tempFilePath);
          console.log('Temporary file cleaned up:', tempFilePath);
        } catch (error) {
          console.warn('Could not clean up temporary file:', tempFilePath, error.message);
        }
      }
    };

    // Set up timeout cleanup (5 minutes max)
    const timeoutId = setTimeout(async () => {
      console.warn('Temp file cleanup timeout triggered for:', tempFilePath);
      await cleanup();
    }, 5 * 60 * 1000);

    try {
      // Write buffer to temporary file for processing
      await fs.writeFile(tempFilePath, buffer);
      tempFileCreated = true;
      XmlDocxProcessor.tempFiles.add(tempFilePath);

      // Process the temporary file with timeout
      const result = await Promise.race([
        this.processDocument(tempFilePath),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Document processing timeout')), 2 * 60 * 1000)
        )
      ]);

      return result;
    } finally {
      // Clear timeout and clean up
      clearTimeout(timeoutId);
      await cleanup();
    }
  }

  /**
   * Main processing function using xml2js and PizZip
   */
  async processDocument(filePath) {
    try {
      console.log('Starting XML-based DOCX processing for:', filePath);
      
      const buffer = await fs.readFile(filePath);
      
      // Load DOCX as ZIP archive
      const zip = new PizZip(buffer);
      
      // Extract document structure
      const documentData = await this.extractDocumentXml(zip);
      const stylesData = await this.extractStylesXml(zip);
      const settingsData = await this.extractSettingsXml(zip);
      
      // Extract headers and footers
      const headersFooters = await this.extractHeadersFooters(zip);
      
      // Extract tables with border information
      const tables = await this.extractTablesWithFormatting(zip, documentData);
      
      // Process the extracted XML data
      const textResult = this.extractPlainText(documentData);
      const htmlResult = this.convertToHtml(documentData, stylesData);
      const formattingInfo = this.extractFormattingDetails(documentData, stylesData, settingsData);
      const structure = this.extractDocumentStructure(documentData);
      const styles = this.processStyles(stylesData);
      
      // Add headers/footers and tables to structure
      structure.headersFooters = headersFooters;
      structure.tables = tables;
      
      // Extract italicized text for reference validation
      structure.italicizedText = this.extractItalicizedText(documentData);
      
      console.log('XML-based DOCX processing completed successfully');
      
      return {
        html: htmlResult,
        text: textResult,
        formatting: formattingInfo,
        structure: structure,
        styles: styles,
        headersFooters: headersFooters,
        messages: [{
          type: 'info',
          message: 'Document processed using XML parser for accurate structure extraction'
        }],
        processingInfo: {
          timestamp: new Date().toISOString(),
          fileSize: buffer.length,
          wordCount: textResult.split(/\s+/).filter(Boolean).length,
          processor: 'XmlDocxProcessor'
        }
      };
      
    } catch (error) {
      console.error('Error processing DOCX with XML parser:', error);
      throw new Error(`XML document processing failed: ${error.message}`);
    }
  }

  /**
   * Extract and parse document.xml
   */
  async extractDocumentXml(zip) {
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) {
      throw new Error('document.xml not found in DOCX file');
    }
    
    const xmlContent = docXmlFile.asText();
    return await this.parser.parseStringPromise(xmlContent);
  }

  /**
   * Extract and parse styles.xml
   */
  async extractStylesXml(zip) {
    const stylesFile = zip.file('word/styles.xml');
    if (!stylesFile) {
      return null;
    }
    
    const xmlContent = stylesFile.asText();
    return await this.parser.parseStringPromise(xmlContent);
  }

  /**
   * Extract and parse settings.xml
   */
  async extractSettingsXml(zip) {
    const settingsFile = zip.file('word/settings.xml');
    if (!settingsFile) {
      return null;
    }
    
    const xmlContent = settingsFile.asText();
    return await this.parser.parseStringPromise(xmlContent);
  }

  /**
   * Extract plain text from document XML
   */
  extractPlainText(documentData) {
    try {
      let text = '';
      const body = documentData['w:document']['w:body'];
      const paragraphs = this.ensureArray(body['w:p']);
      
      paragraphs.forEach((para) => {
        if (!para) return;
        
        const runs = this.ensureArray(para['w:r']);
        runs.forEach(run => {
          if (run && run['w:t']) {
            const textElements = this.ensureArray(run['w:t']);
            textElements.forEach(t => {
              if (typeof t === 'string') {
                text += t;
              } else if (t._ !== undefined) {
                text += t._;
              }
            });
          }
        });
        text += '\n';
      });
      
      return text.trim();
      
    } catch (error) {
      console.error('Error extracting plain text:', error);
      return 'Text extraction failed';
    }
  }

  /**
   * Convert document XML to HTML with proper formatting
   */
  convertToHtml(documentData, stylesData) {
    try {
      let html = '<div class="docx-document">';
      
      const body = documentData['w:document']['w:body'];
      const paragraphs = this.ensureArray(body['w:p']);
      
      paragraphs.forEach((para, index) => {
        if (!para) return;
        
        // Extract paragraph properties
        const pPr = para['w:pPr'] || {};
        const paraStyle = this.extractParagraphStyle(pPr);
        
        // Check if this is a heading
        const isHeading = this.isHeadingParagraph(pPr);
        const tag = isHeading ? this.getHeadingTag(pPr) : 'p';
        
        html += `<${tag} data-para-index="${index}" style="${paraStyle}">`;
        
        // Process runs within paragraph
        const runs = this.ensureArray(para['w:r']);
        runs.forEach((run, runIndex) => {
          if (!run) return;
          
          const runStyle = this.extractRunStyle(run['w:rPr'] || {});
          const runText = this.extractRunText(run);
          
          if (runText) {
            html += `<span data-run-index="${runIndex}" style="${runStyle}">${this.escapeHtml(runText)}</span>`;
          }
        });
        
        html += `</${tag}>`;
      });
      
      html += '</div>';
      return html;
      
    } catch (error) {
      console.error('Error converting to HTML:', error);
      return '<div class="error">HTML conversion failed</div>';
    }
  }

  /**
   * Extract detailed formatting information
   */
  extractFormattingDetails(documentData, stylesData, settingsData) {
    const formatting = {
      document: {
        font: { family: null, size: null },
        spacing: { line: null, paragraph: null },
        margins: { top: null, bottom: null, left: null, right: null },
        indentation: { firstLine: null, hanging: null },
        pageSetup: {}
      },
      paragraphs: [],
      runs: [],
      compliance: {}
    };
    
    try {
      const body = documentData['w:document']['w:body'];
      
      // Extract page setup and margins from sectPr
      const sectPr = body['w:sectPr'];
      if (sectPr) {
        this.extractPageMargins(sectPr, formatting);
        this.extractPageSetup(sectPr, formatting);
      }
      
      // Extract paragraph-level formatting
      const paragraphs = this.ensureArray(body['w:p']);
      
      paragraphs.forEach((para, index) => {
        if (!para) return;
        
        const paraFormatting = this.extractParagraphFormatting(para, index);
        formatting.paragraphs.push(paraFormatting);
      });
      
      // Set document-level defaults
      this.setDocumentDefaults(formatting);
      
      // Calculate APA compliance
      formatting.compliance = this.calculateAPACompliance(formatting);
      
    } catch (error) {
      console.error('Error extracting formatting details:', error);
    }
    
    return formatting;
  }

  /**
   * Extract headers and footers from document
   */
  async extractHeadersFooters(zip) {
    const headersFooters = {
      headers: [],
      footers: [],
      firstPageHeader: null,
      firstPageFooter: null,
      evenPageHeader: null,
      evenPageFooter: null,
      runningHead: null,
      pageNumbers: {
        present: false,
        position: null,
        format: null,
        startNumber: 1
      }
    };
    
    try {
      // Extract header files
      for (let i = 1; i <= 10; i++) {
        const headerFile = zip.file(`word/header${i}.xml`);
        if (headerFile) {
          const headerXml = headerFile.asText();
          const headerData = await this.parser.parseStringPromise(headerXml);
          const headerContent = this.extractHeaderContent(headerData, i);
          
          headersFooters.headers.push(headerContent);
          
          // Check for running head
          if (headerContent.text) {
            const runningHeadMatch = headerContent.text.match(/Running head:\s*(.+)|([A-Z\s]{2,50})/);
            if (runningHeadMatch) {
              headersFooters.runningHead = {
                text: runningHeadMatch[1] || runningHeadMatch[2],
                allCaps: runningHeadMatch[2] === runningHeadMatch[2]?.toUpperCase(),
                length: (runningHeadMatch[1] || runningHeadMatch[2]).length,
                headerIndex: i
              };
            }
          }
        }
        
        // Extract footer files
        const footerFile = zip.file(`word/footer${i}.xml`);
        if (footerFile) {
          const footerXml = footerFile.asText();
          const footerData = await this.parser.parseStringPromise(footerXml);
          const footerContent = this.extractFooterContent(footerData, i);
          
          headersFooters.footers.push(footerContent);
          
          // Check for page numbers
          if (footerContent.hasPageNumber) {
            headersFooters.pageNumbers.present = true;
            headersFooters.pageNumbers.position = footerContent.pageNumberPosition;
          }
        }
      }
      
      // Check document.xml for header/footer references
      const docRelsFile = zip.file('word/_rels/document.xml.rels');
      if (docRelsFile) {
        const relsXml = docRelsFile.asText();
        const relsData = await this.parser.parseStringPromise(relsXml);
        this.mapHeaderFooterTypes(relsData, headersFooters);
      }
      
    } catch (error) {
      console.error('Error extracting headers/footers:', error);
    }
    
    return headersFooters;
  }
  
  /**
   * Extract header content
   */
  extractHeaderContent(headerData, index) {
    const content = {
      index: index,
      text: '',
      hasPageNumber: false,
      pageNumberPosition: null,
      formatting: {}
    };
    
    try {
      const header = headerData['w:hdr'];
      if (header) {
        const paragraphs = this.ensureArray(header['w:p']);
        
        paragraphs.forEach(para => {
          const text = this.extractParagraphText(para);
          content.text += text + ' ';
          
          // Check for page number field
          const runs = this.ensureArray(para['w:r']);
          runs.forEach(run => {
            if (run['w:fldChar'] || run['w:instrText']) {
              const instrText = run['w:instrText'];
              if (instrText && (instrText.includes('PAGE') || instrText.includes('NUMPAGES'))) {
                content.hasPageNumber = true;
                
                // Determine position based on alignment
                const alignment = para['w:pPr']?.['w:jc']?.['$']?.['w:val'];
                content.pageNumberPosition = alignment || 'left';
              }
            }
          });
        });
        
        content.text = content.text.trim();
      }
    } catch (error) {
      console.error('Error extracting header content:', error);
    }
    
    return content;
  }
  
  /**
   * Extract footer content
   */
  extractFooterContent(footerData, index) {
    const content = {
      index: index,
      text: '',
      hasPageNumber: false,
      pageNumberPosition: null,
      formatting: {}
    };
    
    try {
      const footer = footerData['w:ftr'];
      if (footer) {
        const paragraphs = this.ensureArray(footer['w:p']);
        
        paragraphs.forEach(para => {
          const text = this.extractParagraphText(para);
          content.text += text + ' ';
          
          // Check for page number
          const runs = this.ensureArray(para['w:r']);
          runs.forEach(run => {
            if (run['w:fldChar'] || run['w:instrText']) {
              const instrText = run['w:instrText'];
              if (instrText && (instrText.includes('PAGE') || instrText.includes('NUMPAGES'))) {
                content.hasPageNumber = true;
                
                // Determine position
                const alignment = para['w:pPr']?.['w:jc']?.['$']?.['w:val'];
                content.pageNumberPosition = alignment === 'right' ? 'right' : 
                                            alignment === 'center' ? 'center' : 'left';
              }
            }
          });
        });
        
        content.text = content.text.trim();
      }
    } catch (error) {
      console.error('Error extracting footer content:', error);
    }
    
    return content;
  }

  /**
   * Extract document structure (headings, citations, etc.)
   */
  extractDocumentStructure(documentData) {
    const structure = {
      headings: [],
      sections: [],
      citations: [],
      references: [],
      tables: [],
      figures: [],
      italicizedText: []  // Track italicized text for reference validation
    };
    
    try {
      const body = documentData['w:document']['w:body'];
      const paragraphs = this.ensureArray(body['w:p']);
      
      paragraphs.forEach((para, index) => {
        if (!para) return;
        
        const text = this.extractParagraphText(para);
        if (!text.trim()) return;
        
        // Detect headings
        if (this.isHeadingParagraph(para['w:pPr'])) {
          const level = this.getHeadingLevel(para['w:pPr']);
          structure.headings.push({
            text: text.trim(),
            level: level,
            paragraphIndex: index
          });
        }
        
        // Detect citations
        this.extractCitations(text, index, structure.citations);
        
        // Detect special sections
        this.detectSpecialSections(text, index, structure.sections);
        
        // Detect reference entries
        this.detectReferenceEntries(text, index, structure);
      });
      
    } catch (error) {
      console.error('Error extracting document structure:', error);
    }
    
    return structure;
  }

  /**
   * Extract tables with border and formatting information
   */
  async extractTablesWithFormatting(zip, documentData) {
    const tables = [];
    
    try {
      const body = documentData['w:document']['w:body'];
      const tablElements = this.ensureArray(body['w:tbl']);
      
      tablElements.forEach((table, index) => {
        if (!table) return;
        
        const tableInfo = {
          index: index,
          hasVerticalLines: false,
          hasFullBorders: false,
          borderStyle: {},
          cells: [],
          text: ''
        };
        
        // Check table properties for borders
        const tblPr = table['w:tblPr'];
        if (tblPr) {
          const borders = tblPr['w:tblBorders'];
          if (borders) {
            // Check for vertical borders (inside vertical lines)
            if (borders['w:insideV']) {
              const insideV = borders['w:insideV']['$'];
              if (insideV && insideV['w:val'] !== 'nil' && insideV['w:val'] !== 'none') {
                tableInfo.hasVerticalLines = true;
              }
            }
            
            // Check for full borders
            const hasBorder = (borderType) => {
              const border = borders[borderType];
              return border && border['$'] && 
                     border['$']['w:val'] !== 'nil' && 
                     border['$']['w:val'] !== 'none';
            };
            
            tableInfo.hasFullBorders = hasBorder('w:top') && 
                                       hasBorder('w:bottom') && 
                                       hasBorder('w:left') && 
                                       hasBorder('w:right');
            
            // Store border style details
            tableInfo.borderStyle = {
              top: hasBorder('w:top'),
              bottom: hasBorder('w:bottom'),
              left: hasBorder('w:left'),
              right: hasBorder('w:right'),
              insideH: hasBorder('w:insideH'),
              insideV: hasBorder('w:insideV')
            };
          }
        }
        
        // Extract table text content
        const rows = this.ensureArray(table['w:tr']);
        rows.forEach(row => {
          const cells = this.ensureArray(row['w:tc']);
          cells.forEach(cell => {
            const paragraphs = this.ensureArray(cell['w:p']);
            paragraphs.forEach(para => {
              const text = this.extractParagraphText(para);
              tableInfo.text += text + ' ';
            });
          });
        });
        
        tableInfo.text = tableInfo.text.trim();
        tables.push(tableInfo);
      });
      
    } catch (error) {
      console.error('Error extracting tables with formatting:', error);
    }
    
    return tables;
  }
  
  /**
   * Extract italicized text for reference validation
   */
  extractItalicizedText(documentData) {
    const italicizedText = [];
    
    try {
      const body = documentData['w:document']['w:body'];
      const paragraphs = this.ensureArray(body['w:p']);
      
      paragraphs.forEach((para, paraIndex) => {
        if (!para) return;
        
        const runs = this.ensureArray(para['w:r']);
        runs.forEach((run, runIndex) => {
          if (!run) return;
          
          // Check if run has italic formatting
          const rPr = run['w:rPr'];
          if (rPr && rPr['w:i']) {
            const italic = rPr['w:i'];
            // Check if italic is enabled (no val attribute means true, or val="1" or val="true")
            const isItalic = !italic['$'] || 
                           italic['$']['w:val'] === '1' || 
                           italic['$']['w:val'] === 'true' ||
                           italic['$']['w:val'] === 'on';
            
            if (isItalic) {
              const text = this.extractRunText(run);
              if (text) {
                italicizedText.push({
                  text: text,
                  paragraphIndex: paraIndex,
                  runIndex: runIndex,
                  context: this.extractParagraphText(para)
                });
              }
            }
          }
        });
      });
      
    } catch (error) {
      console.error('Error extracting italicized text:', error);
    }
    
    return italicizedText;
  }
  
  /**
   * Map header/footer types from relationships
   */
  mapHeaderFooterTypes(relsData, headersFooters) {
    try {
      const relationships = relsData['Relationships']['Relationship'];
      if (relationships) {
        const rels = this.ensureArray(relationships);
        
        rels.forEach(rel => {
          const type = rel['$']['Type'];
          const target = rel['$']['Target'];
          
          if (type && type.includes('header')) {
            // Determine header type based on target
            if (target.includes('first')) {
              headersFooters.firstPageHeader = target;
            } else if (target.includes('even')) {
              headersFooters.evenPageHeader = target;
            }
          } else if (type && type.includes('footer')) {
            if (target.includes('first')) {
              headersFooters.firstPageFooter = target;
            } else if (target.includes('even')) {
              headersFooters.evenPageFooter = target;
            }
          }
        });
      }
    } catch (error) {
      console.error('Error mapping header/footer types:', error);
    }
  }

  /**
   * Helper methods
   */
  
  ensureArray(item) {
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
  }

  extractParagraphStyle(pPr) {
    let style = '';
    
    // Line spacing
    if (pPr['w:spacing'] && pPr['w:spacing'].$) {
      const spacing = pPr['w:spacing'].$;
      if (spacing['w:line']) {
        const lineHeight = this.lineSpacingToDecimal(spacing['w:line'], spacing['w:lineRule']);
        style += `line-height: ${lineHeight}; `;
      }
    }
    
    // Indentation
    if (pPr['w:ind'] && pPr['w:ind'].$) {
      const ind = pPr['w:ind'].$;
      if (ind['w:firstLine']) {
        const indent = this.twipsToInches(parseInt(ind['w:firstLine']));
        style += `text-indent: ${indent}in; `;
      }
    }
    
    // Alignment
    if (pPr['w:jc'] && pPr['w:jc'].$) {
      const align = pPr['w:jc'].$['w:val'];
      const cssAlign = this.wordAlignToCss(align);
      style += `text-align: ${cssAlign}; `;
    }
    
    return style;
  }

  extractRunStyle(rPr) {
    let style = '';
    
    // Font family
    if (rPr['w:rFonts'] && rPr['w:rFonts'].$) {
      const fontFamily = rPr['w:rFonts'].$['w:ascii'] || rPr['w:rFonts'].$['w:hAnsi'];
      if (fontFamily) {
        style += `font-family: "${fontFamily}", serif; `;
      }
    }
    
    // Font size
    if (rPr['w:sz'] && rPr['w:sz'].$) {
      const fontSize = parseInt(rPr['w:sz'].$['w:val']) / 2;
      style += `font-size: ${fontSize}pt; `;
    }
    
    // Bold
    if (rPr['w:b']) {
      style += 'font-weight: bold; ';
    }
    
    // Italic
    if (rPr['w:i']) {
      style += 'font-style: italic; ';
    }
    
    // Underline
    if (rPr['w:u']) {
      style += 'text-decoration: underline; ';
    }
    
    // Color
    if (rPr['w:color'] && rPr['w:color'].$) {
      const color = rPr['w:color'].$['w:val'];
      if (color && color !== 'auto') {
        style += `color: #${color}; `;
      }
    }
    
    return style;
  }

  extractRunText(run) {
    let text = '';
    
    // Process all child elements in order
    if (run) {
      const children = Object.keys(run);
      children.forEach(key => {
        if (key === 'w:t') {
          // Text content
          const textElements = this.ensureArray(run['w:t']);
          textElements.forEach(t => {
            if (typeof t === 'string') {
              text += t;
            } else if (t._ !== undefined) {
              text += t._;
            }
          });
        } else if (key === 'w:br') {
          // Line breaks - preserve them as actual breaks
          text += '\n';
        } else if (key === 'w:cr') {
          // Carriage returns
          text += '\n';
        } else if (key === 'w:tab') {
          // Tabs
          text += '\t';
        }
      });
    }
    
    return text;
  }

  extractParagraphText(para) {
    let text = '';
    const runs = this.ensureArray(para['w:r']);
    
    runs.forEach(run => {
      text += this.extractRunText(run);
    });
    
    return text;
  }

  isHeadingParagraph(pPr) {
    if (!pPr || !pPr['w:pStyle']) return false;
    
    const styleName = pPr['w:pStyle'].$?.['w:val'] || '';
    return /heading|title/i.test(styleName);
  }

  getHeadingTag(pPr) {
    if (!pPr || !pPr['w:pStyle']) return 'p';
    
    const styleName = pPr['w:pStyle'].$?.['w:val'] || '';
    const match = styleName.match(/heading(\d+)/i);
    
    if (match) {
      const level = Math.min(6, Math.max(1, parseInt(match[1])));
      return `h${level}`;
    }
    
    return styleName.toLowerCase().includes('title') ? 'h1' : 'p';
  }

  getHeadingLevel(pPr) {
    if (!pPr || !pPr['w:pStyle']) return 1;
    
    const styleName = pPr['w:pStyle'].$?.['w:val'] || '';
    const match = styleName.match(/heading(\d+)/i);
    
    return match ? parseInt(match[1]) : 1;
  }

  extractCitations(text, paragraphIndex, citations) {
    const citationPattern = /\(([^)]+),\s*(\d{4})[^)]*\)/g;
    let match;
    
    while ((match = citationPattern.exec(text)) !== null) {
      citations.push({
        text: match[0],
        author: match[1],
        year: match[2],
        paragraphIndex: paragraphIndex,
        position: match.index
      });
    }
  }

  detectSpecialSections(text, index, sections) {
    const textLower = text.toLowerCase().trim();
    
    if (textLower === 'references' || textLower === 'bibliography') {
      sections.push({
        type: 'references',
        startIndex: index,
        title: text
      });
    } else if (textLower === 'abstract') {
      sections.push({
        type: 'abstract',
        startIndex: index,
        title: text
      });
    } else if (textLower.includes('method') && text.length < 50) {
      sections.push({
        type: 'method',
        startIndex: index,
        title: text
      });
    }
  }

  detectReferenceEntries(text, index, structure) {
    const referencesSection = structure.sections.find(s => s.type === 'references');
    if (referencesSection && index > referencesSection.startIndex) {
      if (text.match(/^[A-Z][a-zA-Z-']+,\s+[A-Z].*\(\d{4}\)/)) {
        structure.references.push({
          text: text.trim(),
          paragraphIndex: index,
          type: this.detectReferenceType(text)
        });
      }
    }
  }

  detectReferenceType(text) {
    if (text.match(/\b(?:journal|quarterly|review|proceedings|bulletin)\b/i)) {
      return 'journal';
    }
    if (text.match(/\b(?:publisher|press|books|publication)\b/i)) {
      return 'book';
    }
    if (text.match(/\b(?:http|www\.|\.com|\.org|\.edu|retrieved)\b/i)) {
      return 'website';
    }
    if (text.match(/\b(?:in\s+[A-Z]|\(eds?\.\)|\(ed\.\))\b/i)) {
      return 'chapter';
    }
    return 'unknown';
  }

  // Utility conversion methods
  twipsToInches(twips) {
    return twips / 1440;
  }

  twipsToPoints(twips) {
    return twips / 20;
  }

  lineSpacingToDecimal(value, rule) {
    if (rule === 'auto') {
      return value / 240;
    } else if (rule === 'atLeast' || rule === 'exact') {
      return this.twipsToPoints(value) / 12;
    }
    return 2.0; // Default double spacing
  }

  wordAlignToCss(align) {
    const alignMap = {
      'left': 'left',
      'center': 'center', 
      'right': 'right',
      'both': 'justify',
      'justify': 'justify'
    };
    return alignMap[align] || 'left';
  }

  escapeHtml(text) {
    const div = { innerHTML: '' };
    const textNode = { textContent: text };
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Additional helper methods for formatting extraction
  extractPageMargins(sectPr, formatting) {
    const pgMar = sectPr['w:pgMar'];
    if (pgMar && pgMar.$) {
      formatting.document.margins = {
        top: this.twipsToInches(parseInt(pgMar.$['w:top'] || 0)),
        bottom: this.twipsToInches(parseInt(pgMar.$['w:bottom'] || 0)),
        left: this.twipsToInches(parseInt(pgMar.$['w:left'] || 0)),
        right: this.twipsToInches(parseInt(pgMar.$['w:right'] || 0))
      };
    }
  }

  extractPageSetup(sectPr, formatting) {
    const pgSz = sectPr['w:pgSz'];
    if (pgSz && pgSz.$) {
      formatting.document.pageSetup = {
        width: this.twipsToInches(parseInt(pgSz.$['w:w'] || 0)),
        height: this.twipsToInches(parseInt(pgSz.$['w:h'] || 0)),
        orientation: pgSz.$['w:orient'] || 'portrait'
      };
    }
  }

  extractParagraphFormatting(para, index) {
    const paraText = this.extractParagraphText(para);
    const paraFormatting = {
      index,
      text: paraText,
      font: { family: null, size: null, bold: false, italic: false },
      spacing: { line: null, before: null, after: null },
      indentation: { firstLine: null, hanging: null, left: null, right: null },
      alignment: null,
      style: null,
      runs: []
    };

    // Debug paragraph extraction
    if (process.env.NODE_ENV === 'development') {
    }

    // Extract paragraph properties
    const pPr = para['w:pPr'];
    if (pPr) {
      // Style
      if (pPr['w:pStyle'] && pPr['w:pStyle'].$) {
        paraFormatting.style = pPr['w:pStyle'].$['w:val'];
      }

      // Spacing
      if (pPr['w:spacing'] && pPr['w:spacing'].$) {
        const spacing = pPr['w:spacing'].$;
        paraFormatting.spacing = {
          line: spacing['w:line'] ? this.lineSpacingToDecimal(spacing['w:line'], spacing['w:lineRule']) : 2.0,
          before: spacing['w:before'] ? this.twipsToPoints(parseInt(spacing['w:before'])) : null,
          after: spacing['w:after'] ? this.twipsToPoints(parseInt(spacing['w:after'])) : null
        };
      }

      // Indentation
      if (pPr['w:ind'] && pPr['w:ind'].$) {
        const ind = pPr['w:ind'].$;
        paraFormatting.indentation = {
          firstLine: ind['w:firstLine'] ? this.twipsToInches(parseInt(ind['w:firstLine'])) : null,
          hanging: ind['w:hanging'] ? this.twipsToInches(parseInt(ind['w:hanging'])) : null,
          left: ind['w:left'] ? this.twipsToInches(parseInt(ind['w:left'])) : null,
          right: ind['w:right'] ? this.twipsToInches(parseInt(ind['w:right'])) : null
        };
      }

      // Alignment
      if (pPr['w:jc'] && pPr['w:jc'].$) {
        paraFormatting.alignment = pPr['w:jc'].$['w:val'];
      }
    }

    // Extract run-level formatting
    const runs = this.ensureArray(para['w:r']);
    runs.forEach((run, runIndex) => {
      if (!run) return;

      const runFormatting = {
        index: runIndex,
        text: this.extractRunText(run),
        font: { family: null, size: null, bold: false, italic: false, underline: false },
        color: null
      };

      const rPr = run['w:rPr'];
      if (rPr) {
        // Font
        const rFonts = rPr['w:rFonts'];
        if (rFonts && rFonts.$) {
          runFormatting.font.family = rFonts.$['w:ascii'] || rFonts.$['w:hAnsi'] || null;
        }

        // Size - convert from Word's half-points to points
        const sz = rPr['w:sz'];
        if (sz && sz.$) {
          const rawValue = parseInt(sz.$['w:val']);
          runFormatting.font.size = rawValue / 2; // Convert from half-points to points
        }

        // Formatting - check for existence of elements, not their values
        runFormatting.font.bold = 'w:b' in rPr;
        runFormatting.font.italic = 'w:i' in rPr;
        runFormatting.font.underline = 'w:u' in rPr;
        

        // Color
        const color = rPr['w:color'];
        if (color && color.$) {
          runFormatting.color = color.$['w:val'];
        }
      }

      paraFormatting.runs.push(runFormatting);
    });

    // Set paragraph font from first run if available
    if (paraFormatting.runs.length > 0) {
      const firstRun = paraFormatting.runs[0];
      if (firstRun.font.family && !paraFormatting.font.family) {
        paraFormatting.font.family = firstRun.font.family;
      }
      if (firstRun.font.size && !paraFormatting.font.size) {
        paraFormatting.font.size = firstRun.font.size;
      }
    }

    return paraFormatting;
  }

  setDocumentDefaults(formatting) {
    if (formatting.paragraphs.length > 0) {
      const firstPara = formatting.paragraphs.find(p => p.font.family && p.font.size) || formatting.paragraphs[0];
      
      formatting.document.font = { 
        family: firstPara.font.family || null,
        size: firstPara.font.size || null
      };
      
      formatting.document.spacing.line = firstPara.spacing.line || null;
      formatting.document.indentation = { 
        firstLine: firstPara.indentation.firstLine || null,
        hanging: firstPara.indentation.hanging || null 
      };
    }
  }

  processStyles(stylesData) {
    if (!stylesData) {
      return { styles: [], defaultStyle: null };
    }

    const styles = [];
    const stylesRoot = stylesData['w:styles'];
    
    if (stylesRoot && stylesRoot['w:style']) {
      const styleElements = this.ensureArray(stylesRoot['w:style']);
      
      styleElements.forEach(style => {
        if (style && style.$) {
          const styleInfo = {
            id: style.$.styleId,
            name: style['w:name'] ? style['w:name'].$['w:val'] : style.$.styleId,
            type: style.$.type,
            isDefault: style.$.default === '1',
            formatting: {}
          };
          
          // Extract paragraph properties
          const pPr = style['w:pPr'];
          const rPr = style['w:rPr'];
          
          if (pPr) {
            if (pPr['w:spacing'] && pPr['w:spacing'].$) {
              styleInfo.formatting.spacing = pPr['w:spacing'].$;
            }
            if (pPr['w:ind'] && pPr['w:ind'].$) {
              styleInfo.formatting.indentation = pPr['w:ind'].$;
            }
          }
          
          if (rPr) {
            if (rPr['w:rFonts'] && rPr['w:rFonts'].$) {
              styleInfo.formatting.font = rPr['w:rFonts'].$;
            }
            if (rPr['w:sz'] && rPr['w:sz'].$) {
              styleInfo.formatting.fontSize = parseInt(rPr['w:sz'].$['w:val']) / 2;
            }
          }
          
          styles.push(styleInfo);
        }
      });
    }
    
    const defaultStyle = styles.find(s => s.isDefault && s.type === 'paragraph') || 
                        styles.find(s => s.name === 'Normal') ||
                        null;
    
    return { styles, defaultStyle };
  }

  calculateAPACompliance(formatting) {
    const compliance = {
      font: { family: false, size: false, score: 0 },
      spacing: { line: false, score: 0 },
      margins: { all: false, individual: {}, score: 0 },
      indentation: { firstLine: false, score: 0 },
      overall: 0
    };
    
    // Check font compliance
    if (formatting.document.font.family) {
      const fontFamily = formatting.document.font.family.toLowerCase();
      compliance.font.family = fontFamily.includes('times new roman') || 
                              fontFamily.includes('times') ||
                              fontFamily.includes('liberation serif');
    }
    
    if (formatting.document.font.size) {
      compliance.font.size = Math.abs(formatting.document.font.size - 12) < 0.5;
    }
    
    compliance.font.score = (compliance.font.family ? 50 : 0) + (compliance.font.size ? 50 : 0);
    
    // Check spacing compliance
    if (formatting.document.spacing.line) {
      compliance.spacing.line = Math.abs(formatting.document.spacing.line - 2.0) < 0.1;
      compliance.spacing.score = compliance.spacing.line ? 100 : 0;
    }
    
    // Check margins compliance
    if (formatting.document.margins) {
      let marginsCorrect = 0;
      Object.entries(formatting.document.margins).forEach(([side, value]) => {
        const isCorrect = value !== null && Math.abs(value - 1.0) < 0.1;
        compliance.margins.individual[side] = isCorrect;
        if (isCorrect) marginsCorrect++;
      });
      compliance.margins.all = marginsCorrect === 4;
      compliance.margins.score = (marginsCorrect / 4) * 100;
    }
    
    // Check indentation compliance
    const correctIndentation = formatting.paragraphs.filter(p => 
      p.indentation.firstLine !== null && Math.abs(p.indentation.firstLine - 0.5) < 0.05
    ).length;
    
    const totalParagraphs = formatting.paragraphs.filter(p => p.text.trim().length > 0).length;
    
    if (totalParagraphs > 0) {
      compliance.indentation.firstLine = correctIndentation / totalParagraphs > 0.8;
      compliance.indentation.score = (correctIndentation / totalParagraphs) * 100;
    }
    
    // Calculate overall compliance
    const scores = [
      compliance.font.score,
      compliance.spacing.score,
      compliance.margins.score,
      compliance.indentation.score
    ].filter(score => score !== null);
    
    compliance.overall = scores.length > 0 ? scores.reduce((a, b) => a + b) / scores.length : 0;
    
    return compliance;
  }
}

module.exports = XmlDocxProcessor;