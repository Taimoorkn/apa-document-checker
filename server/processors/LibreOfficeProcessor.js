// server/processors/LibreOfficeProcessor.js - LibreOffice-based document processing
const libre = require('libreoffice-convert');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const JSZip = require('jszip');
const xml2js = require('xml2js');

// Promisify the convert function
libre.convertAsync = promisify(libre.convert);

// Configure LibreOffice path for Windows
if (process.platform === 'win32') {
  const possiblePaths = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe'
  ];
  
  for (const libPath of possiblePaths) {
    try {
      require('fs').accessSync(libPath, require('fs').constants.F_OK);
      // Set LibreOffice path for libreoffice-convert
      process.env.LIBREOFFICE_PATH = libPath;
      console.log(`🔧 Set LibreOffice path: ${libPath}`);
      break;
    } catch (e) {
      // Path doesn't exist, try next
    }
  }
}

class LibreOfficeProcessor {
  constructor() {
    this.parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: false
    });
    
    // APA formatting standards for comparison
    this.apaStandards = {
      font: { family: 'Times New Roman', size: 12 },
      spacing: { line: 2.0 },
      margins: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0 },
      indentation: { firstLine: 0.5 }
    };
    
    this.conversionTimeout = 30000; // 30 seconds timeout
  }
  
  /**
   * Main processing function using LibreOffice
   */
  async processDocument(filePath) {
    try {
      console.log('Starting LibreOffice processing for:', filePath);
      
      const buffer = await fs.readFile(filePath);
      
      // Process with LibreOffice first for better HTML conversion
      const libreOfficeResult = await this.convertWithLibreOffice(buffer);
      
      // Still extract rich formatting information using our custom XML parser
      const formattingInfo = await this.extractFormattingDetails(buffer);
      
      // Extract document structure
      const structure = await this.extractDocumentStructure(buffer);
      
      // Extract styles information
      const styles = await this.extractStyles(buffer);
      
      // Extract plain text for analysis
      const textResult = await this.extractPlainText(buffer);
      
      // Enhance LibreOffice HTML with our formatting analysis
      const enhancedHtml = this.applyFormattingToHtml(libreOfficeResult.html, formattingInfo);
      
      console.log('LibreOffice processing completed successfully');
      
      return {
        html: enhancedHtml,
        text: textResult,
        formatting: formattingInfo,
        structure: structure,
        styles: styles,
        messages: libreOfficeResult.messages || [],
        processingInfo: {
          timestamp: new Date().toISOString(),
          fileSize: buffer.length,
          wordCount: textResult.split(/\s+/).filter(Boolean).length,
          processor: 'LibreOffice',
          fallback: libreOfficeResult.fallback || false
        }
      };
      
    } catch (error) {
      console.error('Error processing DOCX with LibreOffice:', error);
      
      // Fallback to Mammoth if LibreOffice fails
      console.log('Falling back to Mammoth processor...');
      try {
        const MammothProcessor = require('./DocxProcessor');
        const mammothProcessor = new MammothProcessor();
        const result = await mammothProcessor.processDocument(filePath);
        
        // Mark as fallback
        result.processingInfo.processor = 'Mammoth (LibreOffice fallback)';
        result.processingInfo.fallback = true;
        result.messages = result.messages || [];
        result.messages.push({
          type: 'warning',
          message: 'LibreOffice processing failed, used Mammoth as fallback'
        });
        
        return result;
      } catch (fallbackError) {
        console.error('Both LibreOffice and Mammoth processing failed:', fallbackError);
        throw new Error(`Document processing failed: ${error.message}. Fallback also failed: ${fallbackError.message}`);
      }
    }
  }
  
  /**
   * Convert DOCX to HTML using LibreOffice
   */
  async convertWithLibreOffice(buffer) {
    try {
      console.log('Converting DOCX to HTML with LibreOffice...');
      
      // First check if LibreOffice is available
      await this.checkLibreOfficeAvailability();
      
      // Create a promise that will timeout
      const conversionPromise = libre.convertAsync(buffer, '.html', undefined);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('LibreOffice conversion timeout'));
        }, this.conversionTimeout);
      });
      
      // Race between conversion and timeout
      const htmlBuffer = await Promise.race([conversionPromise, timeoutPromise]);
      
      if (!htmlBuffer || htmlBuffer.length === 0) {
        throw new Error('LibreOffice conversion returned empty result');
      }
      
      // Convert buffer to string
      let htmlString = htmlBuffer.toString('utf8');
      
      // Clean up and enhance the HTML
      htmlString = this.cleanLibreOfficeHtml(htmlString);
      
      console.log('LibreOffice HTML conversion successful, size:', htmlString.length);
      
      return {
        html: htmlString,
        messages: [{
          type: 'info',
          message: 'Document converted using LibreOffice for better formatting preservation'
        }]
      };
      
    } catch (error) {
      console.error('LibreOffice conversion failed:', error);
      
      // Provide more specific error messages
      if (error.message.includes('ENOENT') || error.message.includes('spawn')) {
        throw new Error('LibreOffice not found on system. Please install LibreOffice or use Mammoth fallback.');
      }
      
      throw error;
    }
  }
  
  /**
   * Check if LibreOffice is available on the system
   */
  async checkLibreOfficeAvailability() {
    try {
      console.log('🔍 Checking LibreOffice availability...');
      
      // Test LibreOffice by doing a simple conversion
      // This is more reliable than checking version commands
      const testBuffer = Buffer.from('PK'); // Minimal ZIP signature
      
      // Try a quick conversion test with a very short timeout
      const conversionPromise = libre.convertAsync(testBuffer, '.html', undefined);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('LibreOffice availability check timeout')), 3000);
      });
      
      await Promise.race([conversionPromise, timeoutPromise]);
      
      console.log('✅ LibreOffice is available and working');
      return true;
      
    } catch (error) {
      console.warn('⚠️ LibreOffice availability check failed:', error.message);
      
      // Check if it's a path/spawn error (LibreOffice not found)
      if (error.message.includes('spawn') || error.message.includes('ENOENT')) {
        throw new Error('LibreOffice not found on system. Please install LibreOffice.');
      }
      
      // For other errors (like invalid test data), LibreOffice might still work
      // so we'll let the actual conversion attempt handle it
      console.log('💡 LibreOffice might be available but had issues with test data');
      return true;
    }
  }
  
  /**
   * Clean up LibreOffice HTML output
   */
  cleanLibreOfficeHtml(html) {
    try {
      // Remove LibreOffice-specific meta tags and unnecessary elements
      let cleaned = html
        // Remove DOCTYPE and HTML wrapper if present, keep only body content
        .replace(/<!DOCTYPE[^>]*>/i, '')
        .replace(/<html[^>]*>/i, '')
        .replace(/<\/html>/i, '')
        .replace(/<head>[\s\S]*?<\/head>/i, '')
        .replace(/<\/?body[^>]*>/gi, '')
        
        // Remove LibreOffice meta information
        .replace(/<meta[^>]*name="generator"[^>]*>/gi, '')
        .replace(/<meta[^>]*LibreOffice[^>]*>/gi, '')
        
        // Clean up empty paragraphs and excessive whitespace
        .replace(/<p[^>]*>\s*<\/p>/gi, '')
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        
        // Improve formatting for APA compliance
        .replace(/<p([^>]*)>/gi, '<p$1>')
        
        // Ensure proper encoding
        .trim();
      
      // If we accidentally removed everything, return a basic structure
      if (!cleaned || cleaned.length < 10) {
        cleaned = '<div class="document-content">Document content could not be processed</div>';
      }
      
      // Wrap in a document container for consistent styling
      cleaned = `<div class="libreoffice-document">${cleaned}</div>`;
      
      console.log('HTML cleaned, final size:', cleaned.length);
      return cleaned;
      
    } catch (error) {
      console.error('Error cleaning LibreOffice HTML:', error);
      return html; // Return original if cleaning fails
    }
  }
  
  /**
   * Extract plain text from DOCX (reused from DocxProcessor)
   */
  async extractPlainText(buffer) {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const documentXml = await zip.file('word/document.xml').async('text');
      const documentData = await this.parser.parseStringPromise(documentXml);
      
      let text = '';
      const body = documentData['w:document']['w:body'];
      const paragraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']].filter(Boolean);
      
      paragraphs.forEach((para) => {
        if (!para) return;
        
        const runs = Array.isArray(para['w:r']) ? para['w:r'] : [para['w:r']].filter(Boolean);
        runs.forEach(run => {
          if (run && run['w:t']) {
            const textElements = Array.isArray(run['w:t']) ? run['w:t'] : [run['w:t']];
            textElements.forEach(t => {
              text += typeof t === 'string' ? t : (t._ || '');
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
   * Extract detailed formatting information from DOCX XML (reused from DocxProcessor)
   */
  async extractFormattingDetails(buffer) {
    try {
      const zip = await JSZip.loadAsync(buffer);
      
      // Read document.xml for content and formatting
      const documentXml = await zip.file('word/document.xml').async('text');
      const documentData = await this.parser.parseStringPromise(documentXml);
      
      // Read settings.xml for document-level settings
      let settingsData = null;
      const settingsFile = zip.file('word/settings.xml');
      if (settingsFile) {
        const settingsXml = await settingsFile.async('text');
        settingsData = await this.parser.parseStringPromise(settingsXml);
      }
      
      return this.parseFormattingFromXML(documentData, settingsData);
      
    } catch (error) {
      console.error('Error extracting formatting:', error);
      return this.getDefaultFormatting();
    }
  }
  
  /**
   * Parse formatting information from XML data (reused from DocxProcessor with minor modifications)
   */
  parseFormattingFromXML(documentData, settingsData) {
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
      
      // Extract page setup and margins from sectPr (Section Properties)
      const sectPr = body['w:sectPr'];
      if (sectPr) {
        const pgMar = sectPr['w:pgMar'];
        if (pgMar && pgMar.$) {
          formatting.document.margins = {
            top: this.twipsToInches(parseInt(pgMar.$['w:top'] || 0)),
            bottom: this.twipsToInches(parseInt(pgMar.$['w:bottom'] || 0)),
            left: this.twipsToInches(parseInt(pgMar.$['w:left'] || 0)),
            right: this.twipsToInches(parseInt(pgMar.$['w:right'] || 0))
          };
        }
        
        const pgSz = sectPr['w:pgSz'];
        if (pgSz && pgSz.$) {
          formatting.document.pageSetup = {
            width: this.twipsToInches(parseInt(pgSz.$['w:w'] || 0)),
            height: this.twipsToInches(parseInt(pgSz.$['w:h'] || 0)),
            orientation: pgSz.$['w:orient'] || 'portrait'
          };
        }
      }
      
      // Extract paragraph-level formatting (simplified version)
      const paragraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']].filter(Boolean);
      
      paragraphs.forEach((para, index) => {
        if (!para) return;
        
        const paraFormatting = {
          index,
          text: '',
          font: { family: null, size: null, bold: false, italic: false },
          spacing: { line: null, before: null, after: null },
          indentation: { firstLine: null, hanging: null, left: null, right: null },
          alignment: null,
          style: null,
          runs: []
        };
        
        // Extract paragraph properties
        const pPr = para['w:pPr'];
        if (pPr) {
          if (pPr['w:pStyle'] && pPr['w:pStyle'].$) {
            paraFormatting.style = pPr['w:pStyle'].$['w:val'];
          }
          
          const spacing = pPr['w:spacing'];
          if (spacing && spacing.$) {
            const attrs = spacing.$;
            paraFormatting.spacing = {
              line: attrs['w:line'] ? this.lineSpacingToDecimal(attrs['w:line'], attrs['w:lineRule']) : 2.0,
              before: attrs['w:before'] ? this.twipsToPoints(parseInt(attrs['w:before'])) : null,
              after: attrs['w:after'] ? this.twipsToPoints(parseInt(attrs['w:after'])) : null
            };
          } else {
            paraFormatting.spacing = { line: 2.0, before: null, after: null };
          }
          
          const ind = pPr['w:ind'];
          if (ind && ind.$) {
            const attrs = ind.$;
            paraFormatting.indentation = {
              firstLine: attrs['w:firstLine'] ? this.twipsToInches(parseInt(attrs['w:firstLine'])) : null,
              hanging: attrs['w:hanging'] ? this.twipsToInches(parseInt(attrs['w:hanging'])) : null,
              left: attrs['w:left'] ? this.twipsToInches(parseInt(attrs['w:left'])) : null,
              right: attrs['w:right'] ? this.twipsToInches(parseInt(attrs['w:right'])) : null
            };
          } else {
            const isBodyParagraph = paraFormatting.text.length > 50 && 
                                  !paraFormatting.text.match(/^(ABSTRACT|INTRODUCTION|REFERENCES|METHODOLOGY|RESULTS|DISCUSSION|CONCLUSION)/i);
            paraFormatting.indentation = {
              firstLine: isBodyParagraph ? 0.5 : null,
              hanging: null,
              left: null,
              right: null
            };
          }
          
          const jc = pPr['w:jc'];
          if (jc && jc.$) {
            paraFormatting.alignment = jc.$['w:val'];
          }
        }
        
        // Extract run-level formatting
        const runs = Array.isArray(para['w:r']) ? para['w:r'] : [para['w:r']].filter(Boolean);
        let paragraphText = '';
        
        runs.forEach((run, runIndex) => {
          if (!run) return;
          
          const runFormatting = {
            index: runIndex,
            text: '',
            font: { family: null, size: null, bold: false, italic: false, underline: false },
            color: null
          };
          
          const rPr = run['w:rPr'];
          if (rPr) {
            const rFonts = rPr['w:rFonts'];
            if (rFonts && rFonts.$) {
              runFormatting.font.family = rFonts.$['w:ascii'] || rFonts.$['w:hAnsi'] || null;
            }
            
            const sz = rPr['w:sz'];
            if (sz && sz.$) {
              runFormatting.font.size = parseInt(sz.$['w:val']) / 2;
            }
            
            runFormatting.font.bold = !!rPr['w:b'];
            runFormatting.font.italic = !!rPr['w:i'];
            runFormatting.font.underline = !!rPr['w:u'];
            
            const color = rPr['w:color'];
            if (color && color.$) {
              runFormatting.color = color.$['w:val'];
            }
          }
          
          const textElements = Array.isArray(run['w:t']) ? run['w:t'] : [run['w:t']].filter(Boolean);
          textElements.forEach(t => {
            if (t) {
              const text = typeof t === 'string' ? t : (t._ || '');
              runFormatting.text += text;
              paragraphText += text;
            }
          });
          
          if (run['w:br']) {
            runFormatting.text += '\n';
            paragraphText += '\n';
          }
          
          paraFormatting.runs.push(runFormatting);
        });
        
        paraFormatting.text = paragraphText;
        
        if (paraFormatting.runs.length > 0) {
          const firstRun = paraFormatting.runs[0];
          if (firstRun.font.family && !paraFormatting.font.family) {
            paraFormatting.font.family = firstRun.font.family;
          }
          if (firstRun.font.size && !paraFormatting.font.size) {
            paraFormatting.font.size = firstRun.font.size;
          }
        }
        
        formatting.paragraphs.push(paraFormatting);
      });
      
      // Set document-level defaults
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
        
        console.log('📊 LibreOffice: Document-level formatting extracted:');
        console.log('  Font:', formatting.document.font);
        console.log('  Spacing:', formatting.document.spacing);
        console.log('  Indentation:', formatting.document.indentation);
      }
      
      // Calculate APA compliance
      formatting.compliance = this.calculateAPACompliance(formatting);
      
    } catch (error) {
      console.error('Error parsing formatting XML:', error);
    }
    
    return formatting;
  }
  
  /**
   * Extract document structure (reused from DocxProcessor)
   */
  async extractDocumentStructure(buffer) {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const documentXml = await zip.file('word/document.xml').async('text');
      const documentData = await this.parser.parseStringPromise(documentXml);
      
      const structure = {
        headings: [],
        sections: [],
        citations: [],
        references: [],
        tables: [],
        figures: []
      };
      
      const body = documentData['w:document']['w:body'];
      const paragraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']].filter(Boolean);
      
      paragraphs.forEach((para, index) => {
        if (!para) return;
        
        // Extract text content
        let text = '';
        const runs = Array.isArray(para['w:r']) ? para['w:r'] : [para['w:r']].filter(Boolean);
        runs.forEach(run => {
          if (run && run['w:t']) {
            const textElements = Array.isArray(run['w:t']) ? run['w:t'] : [run['w:t']];
            textElements.forEach(t => {
              text += typeof t === 'string' ? t : (t._ || '');
            });
          }
        });
        
        text = text.trim();
        if (!text) return;
        
        // Detect headings by style
        let isHeading = false;
        let headingLevel = 0;
        
        const pPr = para['w:pPr'];
        if (pPr && pPr['w:pStyle'] && pPr['w:pStyle'].$) {
          const styleName = pPr['w:pStyle'].$['w:val'];
          
          const headingMatch = styleName.match(/(?:Heading|Title)(\d+)?/i);
          if (headingMatch) {
            isHeading = true;
            headingLevel = parseInt(headingMatch[1]) || 1;
          } else if (styleName.toLowerCase() === 'title') {
            isHeading = true;
            headingLevel = 1;
          }
        }
        
        // Detect headings by formatting (bold, larger font, etc.)
        if (!isHeading && runs.length > 0) {
          const firstRun = runs[0];
          if (firstRun && firstRun['w:rPr']) {
            const rPr = firstRun['w:rPr'];
            const isBold = !!rPr['w:b'];
            const fontSize = rPr['w:sz'] ? parseInt(rPr['w:sz'].$['w:val']) / 2 : 12;
            
            if (isBold && fontSize > 12 && text.length < 100) {
              isHeading = true;
              headingLevel = fontSize > 16 ? 1 : fontSize > 14 ? 2 : 3;
            }
          }
        }
        
        if (isHeading) {
          structure.headings.push({
            text,
            level: headingLevel,
            paragraphIndex: index
          });
        }
        
        // Detect citations
        const citationPattern = /\(([^)]+),\s*(\d{4})[^)]*\)/g;
        let citationMatch;
        while ((citationMatch = citationPattern.exec(text)) !== null) {
          structure.citations.push({
            text: citationMatch[0],
            author: citationMatch[1],
            year: citationMatch[2],
            paragraphIndex: index,
            position: citationMatch.index
          });
        }
        
        // Detect special sections
        const textLower = text.toLowerCase();
        if (textLower === 'references' || textLower === 'bibliography') {
          structure.sections.push({
            type: 'references',
            startIndex: index,
            title: text
          });
        } else if (textLower === 'abstract') {
          structure.sections.push({
            type: 'abstract',
            startIndex: index,
            title: text
          });
        } else if (textLower.includes('method') && text.length < 50) {
          structure.sections.push({
            type: 'method',
            startIndex: index,
            title: text
          });
        }
        
        // Detect reference entries
        const referencesSection = structure.sections.find(s => s.type === 'references');
        if (referencesSection && index > referencesSection.startIndex) {
          if (text.match(/^[A-Z][a-zA-Z-']+,\s+[A-Z].*\(\d{4}\)/)) {
            structure.references.push({
              text,
              paragraphIndex: index,
              type: this.detectReferenceType(text)
            });
          }
        }
      });
      
      return structure;
      
    } catch (error) {
      console.error('Error extracting document structure:', error);
      return {
        headings: [],
        sections: [],
        citations: [],
        references: [],
        tables: [],
        figures: []
      };
    }
  }
  
  /**
   * Extract styles information (reused from DocxProcessor)
   */
  async extractStyles(buffer) {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const stylesFile = zip.file('word/styles.xml');
      
      if (!stylesFile) {
        return { styles: [], defaultStyle: null };
      }
      
      const stylesXml = await stylesFile.async('text');
      const stylesData = await this.parser.parseStringPromise(stylesXml);
      
      const styles = [];
      const stylesRoot = stylesData['w:styles'];
      
      if (stylesRoot && stylesRoot['w:style']) {
        const styleElements = Array.isArray(stylesRoot['w:style']) ? 
          stylesRoot['w:style'] : [stylesRoot['w:style']];
        
        styleElements.forEach(style => {
          if (style && style.$) {
            const styleInfo = {
              id: style.$.styleId,
              name: style['w:name'] ? style['w:name'].$['w:val'] : style.$.styleId,
              type: style.$.type,
              isDefault: style.$.default === '1',
              formatting: {}
            };
            
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
      
    } catch (error) {
      console.error('Error extracting styles:', error);
      return { styles: [], defaultStyle: null };
    }
  }
  
  /**
   * Apply actual document formatting to HTML output
   */
  applyFormattingToHtml(html, formattingInfo) {
    if (!formattingInfo || !formattingInfo.paragraphs) {
      return html;
    }
    
    try {
      // LibreOffice HTML already has better formatting preservation
      // We'll enhance it with our detailed formatting analysis
      
      const docFont = formattingInfo.document.font;
      const docSpacing = formattingInfo.document.spacing;
      
      // Add CSS for better formatting preservation - but let client handle document-level styling
      const cssStyles = `
        <style>
          .apa-document p {
            margin: 0 0 12pt 0;
            text-align: left;
          }
          .apa-document p.indented {
            text-indent: 0.5in;
          }
          .apa-document p.hanging {
            padding-left: 0.5in;
            text-indent: -0.5in;
          }
          .apa-document h1, .apa-document h2, .apa-document h3 {
            font-weight: bold;
            text-align: center;
            margin: 12pt 0;
          }
        </style>
      `;
      
      // Wrap the content with class for styling (but don't override font/size - let client handle that)
      let enhancedHtml = `${cssStyles}<div class="apa-document">${html}</div>`;
      
      // Apply paragraph-specific indentation based on formatting data
      if (formattingInfo.paragraphs) {
        formattingInfo.paragraphs.forEach((para, index) => {
          if (para.indentation && para.indentation.firstLine > 0.4) {
            // Try to match paragraphs and apply indentation classes
            const paragraphRegex = new RegExp(`(<p[^>]*>)([^<]*(?:<[^/][^>]*>[^<]*</[^>]*>[^<]*)*)</p>`, 'g');
            let matchCount = 0;
            enhancedHtml = enhancedHtml.replace(paragraphRegex, (match, openTag, content) => {
              if (matchCount === index && content.trim().length > 0) {
                matchCount++;
                return `<p class="indented">${content}</p>`;
              }
              matchCount++;
              return match;
            });
          }
        });
      }
      
      console.log('✅ LibreOffice HTML enhanced with formatting data');
      return enhancedHtml;
      
    } catch (error) {
      console.error('Error applying formatting to LibreOffice HTML:', error);
      return html; // Return original HTML if enhancement fails
    }
  }
  
  // Helper functions (reused from DocxProcessor)
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
    return null;
  }
  
  calculateAPACompliance(formatting) {
    const compliance = {
      font: {
        family: false,
        size: false,
        score: 0
      },
      spacing: {
        line: false,
        score: 0
      },
      margins: {
        all: false,
        individual: {},
        score: 0
      },
      indentation: {
        firstLine: false,
        score: 0
      },
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

  getDefaultFormatting() {
    return {
      document: {
        font: { family: null, size: null },
        spacing: { line: null, paragraph: null },
        margins: { top: null, bottom: null, left: null, right: null },
        indentation: { firstLine: null, hanging: null },
        pageSetup: {}
      },
      paragraphs: [],
      runs: [],
      compliance: {
        font: { family: false, size: false, score: 0 },
        spacing: { line: false, score: 0 },
        margins: { all: false, individual: {}, score: 0 },
        indentation: { firstLine: false, score: 0 },
        overall: 0
      }
    };
  }
}

module.exports = LibreOfficeProcessor;