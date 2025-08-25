// server/processors/DocxProcessor.js - Fixed bracket notation
const JSZip = require('jszip');
const xml2js = require('xml2js');
const mammoth = require('mammoth');
const fs = require('fs').promises;

class DocxProcessor {
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
  }
  
  /**
   * Main processing function
   */
  async processDocument(filePath) {
    try {
      console.log('Starting DOCX processing for:', filePath);
      
      const buffer = await fs.readFile(filePath);
      
      // Extract content with mammoth with enhanced formatting preservation
      const contentResult = await mammoth.convertToHtml({ 
        buffer,
        options: {
          styleMap: [
            "p[style-name='Normal'] => p:fresh",
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh", 
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Heading 4'] => h4:fresh",
            "p[style-name='Heading 5'] => h5:fresh",
            "p[style-name='Title'] => h1.title:fresh",
            "r[style-name='Strong'] => strong",
            "r[style-name='Emphasis'] => em"
          ],
          includeDefaultStyleMap: true,
          convertImage: mammoth.images.imgElement(function(image) {
            return image.read("base64").then(function(imageBuffer) {
              return {
                src: "data:" + image.contentType + ";base64," + imageBuffer
              };
            });
          }),
          preserveEmptyParagraphs: true
        }
      });
      
      const textResult = await mammoth.extractRawText({ buffer });
      
      // Extract rich formatting information
      const formattingInfo = await this.extractFormattingDetails(buffer);
      
      // Extract document structure
      const structure = await this.extractDocumentStructure(buffer);
      
      // Extract styles information
      const styles = await this.extractStyles(buffer);
      
      // Enhance HTML with actual formatting data
      const enhancedHtml = this.applyFormattingToHtml(contentResult.value, formattingInfo);
      
      console.log('DOCX processing completed successfully');
      
      return {
        html: enhancedHtml,
        text: textResult.value,
        formatting: formattingInfo,
        structure: structure,
        styles: styles,
        messages: [...contentResult.messages, ...textResult.messages],
        processingInfo: {
          timestamp: new Date().toISOString(),
          fileSize: buffer.length,
          wordCount: textResult.value.split(/\s+/).filter(Boolean).length
        }
      };
      
    } catch (error) {
      console.error('Error processing DOCX:', error);
      throw new Error(`DOCX processing failed: ${error.message}`);
    }
  }
  
  /**
   * Extract detailed formatting information from DOCX XML
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
   * Parse formatting information from XML data
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
      runs: [], // Individual text runs with their formatting
      compliance: {}
    };
    
    try {
      const body = documentData['w:document']['w:body'];
      
      // Extract page setup and margins from sectPr (Section Properties)
      const sectPr = body['w:sectPr'];
      if (sectPr) {
        // Page margins - FIXED bracket notation
        const pgMar = sectPr['w:pgMar'];
        if (pgMar && pgMar.$) {
          formatting.document.margins = {
            top: this.twipsToInches(parseInt(pgMar.$['w:top'] || 0)),
            bottom: this.twipsToInches(parseInt(pgMar.$['w:bottom'] || 0)),
            left: this.twipsToInches(parseInt(pgMar.$['w:left'] || 0)),
            right: this.twipsToInches(parseInt(pgMar.$['w:right'] || 0))
          };
        }
        
        // Page size - FIXED bracket notation
        const pgSz = sectPr['w:pgSz'];
        if (pgSz && pgSz.$) {
          formatting.document.pageSetup = {
            width: this.twipsToInches(parseInt(pgSz.$['w:w'] || 0)),
            height: this.twipsToInches(parseInt(pgSz.$['w:h'] || 0)),
            orientation: pgSz.$['w:orient'] || 'portrait'
          };
        }
      }
      
      // Extract paragraph-level formatting
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
          // Paragraph style
          if (pPr['w:pStyle'] && pPr['w:pStyle'].$) {
            paraFormatting.style = pPr['w:pStyle'].$['w:val'];
          }
          
          // Spacing - enhanced detection
          const spacing = pPr['w:spacing'];
          if (spacing && spacing.$) {
            const attrs = spacing.$;
            paraFormatting.spacing = {
              line: attrs['w:line'] ? this.lineSpacingToDecimal(attrs['w:line'], attrs['w:lineRule']) : null,
              before: attrs['w:before'] ? this.twipsToPoints(parseInt(attrs['w:before'])) : null,
              after: attrs['w:after'] ? this.twipsToPoints(parseInt(attrs['w:after'])) : null
            };
            console.log(`📏 Spacing found for paragraph ${index}:`, paraFormatting.spacing);
          } else {
            // Set default double spacing if no explicit spacing found
            paraFormatting.spacing = {
              line: 2.0, // Default APA double spacing
              before: null,
              after: null
            };
          }
          
          // Indentation - FIXED bracket notation
          const ind = pPr['w:ind'];
          if (ind && ind.$) {
            const attrs = ind.$;
            paraFormatting.indentation = {
              firstLine: attrs['w:firstLine'] ? this.twipsToInches(parseInt(attrs['w:firstLine'])) : null,
              hanging: attrs['w:hanging'] ? this.twipsToInches(parseInt(attrs['w:hanging'])) : null,
              left: attrs['w:left'] ? this.twipsToInches(parseInt(attrs['w:left'])) : null,
              right: attrs['w:right'] ? this.twipsToInches(parseInt(attrs['w:right'])) : null
            };
          }
          
          // Alignment
          const jc = pPr['w:jc'];
          if (jc && jc.$) {
            paraFormatting.alignment = jc.$['w:val'];
          }
        }
        
        // Extract run-level formatting (individual text pieces)
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
          
          // Extract run properties
          const rPr = run['w:rPr'];
          if (rPr) {
            // Font family - FIXED bracket notation
            const rFonts = rPr['w:rFonts'];
            if (rFonts && rFonts.$) {
              runFormatting.font.family = rFonts.$['w:ascii'] || rFonts.$['w:hAnsi'] || null;
            }
            
            // Font size - FIXED bracket notation
            const sz = rPr['w:sz'];
            if (sz && sz.$) {
              runFormatting.font.size = parseInt(sz.$['w:val']) / 2; // Convert half-points to points
            }
            
            // Bold
            runFormatting.font.bold = !!rPr['w:b'];
            
            // Italic
            runFormatting.font.italic = !!rPr['w:i'];
            
            // Underline
            runFormatting.font.underline = !!rPr['w:u'];
            
            // Color - FIXED bracket notation
            const color = rPr['w:color'];
            if (color && color.$) {
              runFormatting.color = color.$['w:val'];
            }
          }
          
          // Extract text content
          const textElements = Array.isArray(run['w:t']) ? run['w:t'] : [run['w:t']].filter(Boolean);
          textElements.forEach(t => {
            if (t) {
              const text = typeof t === 'string' ? t : (t._ || '');
              runFormatting.text += text;
              paragraphText += text;
            }
          });
          
          // Handle line breaks
          if (run['w:br']) {
            runFormatting.text += '\n';
            paragraphText += '\n';
          }
          
          paraFormatting.runs.push(runFormatting);
        });
        
        paraFormatting.text = paragraphText;
        
        // Set paragraph-level font info from first run if not set in paragraph properties
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
      
      // Set document-level defaults from most common paragraph settings
      if (formatting.paragraphs.length > 0) {
        const firstPara = formatting.paragraphs.find(p => p.font.family && p.font.size) || formatting.paragraphs[0];
        
        // Set font info
        formatting.document.font = { 
          family: firstPara.font.family || null,
          size: firstPara.font.size || null
        };
        
        // Set spacing info - with fallback to common settings
        formatting.document.spacing.line = firstPara.spacing.line || null;
        
        // Set indentation info
        formatting.document.indentation = { 
          firstLine: firstPara.indentation.firstLine || null,
          hanging: firstPara.indentation.hanging || null 
        };
        
        // Debug log what we extracted
        console.log('📊 Document-level formatting extracted:');
        console.log('  Font:', formatting.document.font);
        console.log('  Spacing:', formatting.document.spacing);
        console.log('  Indentation:', formatting.document.indentation);
        console.log('📝 Sample paragraph data:', {
          font: firstPara.font,
          spacing: firstPara.spacing,
          indentation: firstPara.indentation
        });
      }
      
      // Calculate APA compliance
      formatting.compliance = this.calculateAPACompliance(formatting);
      
    } catch (error) {
      console.error('Error parsing formatting XML:', error);
    }
    
    return formatting;
  }
  
  /**
   * Extract document structure (headings, sections, etc.)
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
          
          // Check for heading styles
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
            
            // Consider it a heading if it's bold and larger than normal text
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
        } else if (textLower.includes('result') && text.length < 50) {
          structure.sections.push({
            type: 'results',
            startIndex: index,
            title: text
          });
        } else if (textLower.includes('discussion') && text.length < 50) {
          structure.sections.push({
            type: 'discussion',
            startIndex: index,
            title: text
          });
        }
        
        // Detect reference entries (in References section)
        const referencesSection = structure.sections.find(s => s.type === 'references');
        if (referencesSection && index > referencesSection.startIndex) {
          // Check if this looks like a reference entry
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
   * Extract styles information
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
            
            // Extract style formatting
            const pPr = style['w:pPr'];
            const rPr = style['w:rPr'];
            
            if (pPr) {
              // Paragraph formatting
              if (pPr['w:spacing'] && pPr['w:spacing'].$) {
                styleInfo.formatting.spacing = pPr['w:spacing'].$;
              }
              if (pPr['w:ind'] && pPr['w:ind'].$) {
                styleInfo.formatting.indentation = pPr['w:ind'].$;
              }
            }
            
            if (rPr) {
              // Character formatting - FIXED bracket notation
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
   * Helper functions for unit conversion and analysis
   */
  twipsToInches(twips) {
    return twips / 1440; // 1440 twips = 1 inch
  }
  
  twipsToPoints(twips) {
    return twips / 20; // 20 twips = 1 point
  }
  
  lineSpacingToDecimal(value, rule) {
    if (rule === 'auto') {
      // Auto spacing - value is in 240ths of a line
      return value / 240;
    } else if (rule === 'atLeast' || rule === 'exact') {
      // Exact spacing - value is in twips
      return this.twipsToPoints(value) / 12; // Assuming 12pt base font
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
  
  /**
   * Apply actual document formatting to HTML output
   */
  applyFormattingToHtml(html, formattingInfo) {
    if (!formattingInfo || !formattingInfo.paragraphs) {
      return html;
    }
    
    try {
      // Create a wrapper with document-level styles
      const docFont = formattingInfo.document.font;
      const docSpacing = formattingInfo.document.spacing;
      
      let documentStyles = '';
      if (docFont.family) {
        documentStyles += `font-family: "${docFont.family}", serif; `;
      }
      if (docFont.size) {
        documentStyles += `font-size: ${docFont.size}pt; `;
      }
      if (docSpacing.line) {
        documentStyles += `line-height: ${docSpacing.line}; `;
      }
      
      // Apply paragraph-specific formatting
      let enhancedHtml = html;
      
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
      enhancedHtml = `${cssStyles}<div class="apa-document">${enhancedHtml}</div>`;
      
      // Apply paragraph-specific indentation based on formatting data
      formattingInfo.paragraphs.forEach((para, index) => {
        if (para.indentation && para.indentation.firstLine > 0.4) {
          // Replace paragraph tags with indented versions
          const paragraphRegex = new RegExp(`(<p[^>]*>)([^<]*(?:<[^/][^>]*>[^<]*</[^>]*>[^<]*)*)</p>`, 'g');
          enhancedHtml = enhancedHtml.replace(paragraphRegex, (match, openTag, content) => {
            if (content.trim().length > 0) {
              return `<p class="indented">${content}</p>`;
            }
            return match;
          });
        }
      });
      
      return enhancedHtml;
      
    } catch (error) {
      console.error('Error applying formatting to HTML:', error);
      return html; // Return original HTML if formatting fails
    }
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

module.exports = DocxProcessor;