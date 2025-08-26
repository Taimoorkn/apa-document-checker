// server/processors/DualProcessor.js - Parallel processing pipeline
const PizZip = require('pizzip');
const xml2js = require('xml2js');
const crypto = require('crypto');

class DualProcessor {
  constructor(libreOfficeProcessor) {
    this.libreOffice = libreOfficeProcessor;
    this.parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: false
    });
  }

  /**
   * Process document with dual pipeline - display and analysis in parallel
   */
  async processDocument(buffer, filename = 'document.docx') {
    console.log('🚀 Starting dual pipeline processing...');
    const startTime = Date.now();

    try {
      // Generate document hash for caching
      const documentHash = this.generateHash(buffer);

      // Process in PARALLEL - key optimization
      const [displayResult, analysisResult] = await Promise.allSettled([
        this.processForDisplay(buffer, filename),
        this.processForAnalysis(buffer)
      ]);

      // Handle display result
      let display = null;
      if (displayResult.status === 'fulfilled') {
        display = displayResult.value;
      } else {
        console.warn('Display processing failed, will use fallback:', displayResult.reason);
        display = { html: '<p>Display processing failed. Analysis data available.</p>', css: '' };
      }

      // Handle analysis result
      let analysis = null;
      if (analysisResult.status === 'fulfilled') {
        analysis = analysisResult.value;
      } else {
        console.error('Analysis processing failed:', analysisResult.reason);
        throw new Error('Document analysis failed');
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ Dual pipeline completed in ${processingTime}ms`);

      return {
        documentHash,
        display,
        analysis,
        processingInfo: {
          processingTime,
          filename,
          fileSize: buffer.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Dual processor error:', error);
      throw error;
    }
  }

  /**
   * Process for visual display using LibreOffice
   */
  async processForDisplay(buffer, filename) {
    console.log('📺 Processing for display (LibreOffice)...');
    try {
      // Use existing LibreOffice processor
      const result = await this.libreOffice.processDocumentBuffer(buffer, filename);
      return {
        html: result.html,
        css: this.generateDisplayCSS(),
        processor: 'LibreOffice'
      };
    } catch (error) {
      console.error('LibreOffice processing failed:', error);
      // Fallback to basic HTML
      throw error;
    }
  }

  /**
   * Process for analysis using PizZip (fast extraction)
   */
  async processForAnalysis(buffer) {
    console.log('🔍 Processing for analysis (PizZip)...');
    const startTime = Date.now();

    try {
      const zip = new PizZip(buffer);
      
      // Extract all necessary XML files
      const [docXml, stylesXml, settingsXml] = await Promise.all([
        this.extractAndParse(zip, 'word/document.xml'),
        this.extractAndParse(zip, 'word/styles.xml'),
        this.extractAndParse(zip, 'word/settings.xml')
      ]);

      // Extract formatted data
      const formattingData = this.extractFormattingData(docXml, stylesXml, settingsXml);
      const structureData = this.extractStructureData(docXml);
      const textContent = this.extractTextContent(docXml);

      const processingTime = Date.now() - startTime;
      console.log(`✅ Analysis extraction completed in ${processingTime}ms`);

      return {
        formatting: formattingData,
        structure: structureData,
        text: textContent,
        raw: {
          hasStyles: !!stylesXml,
          hasSettings: !!settingsXml
        }
      };
    } catch (error) {
      console.error('PizZip analysis failed:', error);
      throw error;
    }
  }

  /**
   * Extract and parse XML file from zip
   */
  async extractAndParse(zip, filepath) {
    try {
      const file = zip.file(filepath);
      if (!file) {
        console.warn(`File not found in DOCX: ${filepath}`);
        return null;
      }
      const xmlContent = file.asText();
      return await this.parser.parseStringPromise(xmlContent);
    } catch (error) {
      console.warn(`Failed to parse ${filepath}:`, error.message);
      return null;
    }
  }

  /**
   * Extract formatting data from XML
   */
  extractFormattingData(docXml, stylesXml, settingsXml) {
    const formatting = {
      document: {
        font: { family: null, size: null },
        spacing: { line: null, paragraph: null },
        margins: { top: null, bottom: null, left: null, right: null },
        indentation: { firstLine: null, hanging: null }
      },
      paragraphs: [],
      compliance: {
        font: { family: false, size: false },
        spacing: { line: false },
        margins: { compliant: false },
        indentation: { compliant: false }
      }
    };

    try {
      // Extract document-level formatting
      if (docXml && docXml['w:document']) {
        const body = docXml['w:document']['w:body'];
        
        // Extract section properties (margins, page setup)
        const sectPr = body['w:sectPr']?.[0] || {};
        if (sectPr['w:pgMar']) {
          const pgMar = sectPr['w:pgMar'][0].$;
          formatting.document.margins = {
            top: this.twipsToInches(parseInt(pgMar['w:top'] || 1440)),
            bottom: this.twipsToInches(parseInt(pgMar['w:bottom'] || 1440)),
            left: this.twipsToInches(parseInt(pgMar['w:left'] || 1440)),
            right: this.twipsToInches(parseInt(pgMar['w:right'] || 1440))
          };
        }

        // Extract paragraphs with formatting
        const paragraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']].filter(Boolean);
        formatting.paragraphs = this.extractParagraphFormatting(paragraphs);
      }

      // Extract default styles
      if (stylesXml && stylesXml['w:styles']) {
        const defaultStyle = this.findDefaultParagraphStyle(stylesXml['w:styles']);
        if (defaultStyle) {
          formatting.document = {
            ...formatting.document,
            ...this.extractStyleFormatting(defaultStyle)
          };
        }
      }

      // Check APA compliance
      formatting.compliance = this.checkAPACompliance(formatting.document);

    } catch (error) {
      console.error('Error extracting formatting:', error);
    }

    return formatting;
  }

  /**
   * Extract paragraph-level formatting
   */
  extractParagraphFormatting(paragraphs) {
    return paragraphs.slice(0, 50).map((para, index) => {
      const pPr = para['w:pPr']?.[0] || {};
      const runs = Array.isArray(para['w:r']) ? para['w:r'] : [para['w:r']].filter(Boolean);
      
      // Extract text
      const text = runs.map(run => {
        const texts = Array.isArray(run['w:t']) ? run['w:t'] : [run['w:t']];
        return texts.filter(Boolean).map(t => typeof t === 'string' ? t : t._).join('');
      }).join('');

      // Extract formatting
      const spacing = pPr['w:spacing']?.[0]?.$;
      const ind = pPr['w:ind']?.[0]?.$;
      const jc = pPr['w:jc']?.[0]?.$;

      return {
        index,
        text: text.substring(0, 200), // Limit text for performance
        formatting: {
          spacing: {
            line: spacing ? parseInt(spacing['w:line']) / 240 : null,
            before: spacing ? parseInt(spacing['w:before'] || 0) / 20 : 0,
            after: spacing ? parseInt(spacing['w:after'] || 0) / 20 : 0
          },
          indentation: {
            firstLine: ind ? this.twipsToInches(parseInt(ind['w:firstLine'] || 0)) : 0,
            left: ind ? this.twipsToInches(parseInt(ind['w:left'] || 0)) : 0,
            right: ind ? this.twipsToInches(parseInt(ind['w:right'] || 0)) : 0
          },
          alignment: jc ? jc['w:val'] : 'left'
        },
        runs: runs.length
      };
    });
  }

  /**
   * Extract document structure (headings, sections, etc.)
   */
  extractStructureData(docXml) {
    const structure = {
      headings: [],
      sections: [],
      lists: [],
      tables: [],
      citations: []
    };

    try {
      if (docXml && docXml['w:document']) {
        const body = docXml['w:document']['w:body'];
        const paragraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']].filter(Boolean);

        paragraphs.forEach((para, index) => {
          const pPr = para['w:pPr']?.[0] || {};
          const styleId = pPr['w:pStyle']?.[0]?.$['w:val'];
          
          // Extract text
          const runs = Array.isArray(para['w:r']) ? para['w:r'] : [para['w:r']].filter(Boolean);
          const text = runs.map(run => {
            const texts = Array.isArray(run['w:t']) ? run['w:t'] : [run['w:t']];
            return texts.filter(Boolean).map(t => typeof t === 'string' ? t : t._).join('');
          }).join('');

          // Identify headings
          if (styleId && styleId.toLowerCase().includes('heading')) {
            const level = parseInt(styleId.replace(/\D/g, '')) || 1;
            structure.headings.push({
              level,
              text: text.substring(0, 200),
              index,
              styleId
            });
          }

          // Identify potential citations (basic pattern matching)
          const citationPattern = /\([A-Za-z\s&,]+,?\s*\d{4}\)/g;
          const citations = text.match(citationPattern);
          if (citations) {
            citations.forEach(citation => {
              structure.citations.push({
                text: citation,
                paragraphIndex: index
              });
            });
          }
        });

        // Extract tables
        const tables = Array.isArray(body['w:tbl']) ? body['w:tbl'] : [body['w:tbl']].filter(Boolean);
        structure.tables = tables.map((table, index) => ({
          index,
          rows: Array.isArray(table['w:tr']) ? table['w:tr'].length : 1
        }));
      }
    } catch (error) {
      console.error('Error extracting structure:', error);
    }

    return structure;
  }

  /**
   * Extract plain text content
   */
  extractTextContent(docXml) {
    const textParts = [];

    try {
      if (docXml && docXml['w:document']) {
        const body = docXml['w:document']['w:body'];
        const paragraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']].filter(Boolean);

        paragraphs.forEach(para => {
          const runs = Array.isArray(para['w:r']) ? para['w:r'] : [para['w:r']].filter(Boolean);
          const paraText = runs.map(run => {
            const texts = Array.isArray(run['w:t']) ? run['w:t'] : [run['w:t']];
            return texts.filter(Boolean).map(t => typeof t === 'string' ? t : t._).join('');
          }).join('');
          
          if (paraText.trim()) {
            textParts.push(paraText);
          }
        });
      }
    } catch (error) {
      console.error('Error extracting text:', error);
    }

    return textParts.join('\n');
  }

  /**
   * Find default paragraph style
   */
  findDefaultParagraphStyle(styles) {
    const docDefaults = styles['w:docDefaults']?.[0];
    if (docDefaults) {
      return docDefaults['w:pPrDefault']?.[0]?.['w:pPr']?.[0];
    }
    return null;
  }

  /**
   * Extract formatting from style
   */
  extractStyleFormatting(style) {
    const formatting = {};

    // Extract font
    const rPr = style['w:rPr']?.[0];
    if (rPr) {
      const rFonts = rPr['w:rFonts']?.[0]?.$;
      const sz = rPr['w:sz']?.[0]?.$;
      
      if (rFonts) {
        formatting.font = {
          family: rFonts['w:ascii'] || rFonts['w:hAnsi'],
          size: sz ? parseInt(sz['w:val']) / 2 : 12
        };
      }
    }

    // Extract spacing
    const spacing = style['w:spacing']?.[0]?.$;
    if (spacing) {
      formatting.spacing = {
        line: parseInt(spacing['w:line'] || 240) / 240
      };
    }

    return formatting;
  }

  /**
   * Check APA compliance
   */
  checkAPACompliance(formatting) {
    return {
      font: {
        family: formatting.font?.family?.toLowerCase().includes('times') || false,
        size: Math.abs((formatting.font?.size || 0) - 12) < 0.5
      },
      spacing: {
        line: Math.abs((formatting.spacing?.line || 0) - 2.0) < 0.1
      },
      margins: {
        compliant: Object.values(formatting.margins || {}).every(m => 
          m !== null && Math.abs(m - 1.0) < 0.1
        )
      },
      indentation: {
        compliant: Math.abs((formatting.indentation?.firstLine || 0) - 0.5) < 0.05
      },
      overall: null // Will be calculated based on all factors
    };
  }

  /**
   * Convert twips to inches
   */
  twipsToInches(twips) {
    return twips / 1440;
  }

  /**
   * Generate hash for document
   */
  generateHash(buffer) {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  /**
   * Generate CSS for document display
   */
  generateDisplayCSS() {
    return `
      /* APA Document Display Styles */
      body {
        font-family: 'Times New Roman', Times, serif;
        font-size: 12pt;
        line-height: 2;
        margin: 1in;
        background: white;
        color: #000;
      }
      
      p {
        text-indent: 0.5in;
        margin: 0;
        text-align: left;
      }
      
      h1, h2, h3, h4, h5, h6 {
        font-weight: bold;
        margin: 12pt 0;
      }
      
      .apa-highlight {
        background-color: rgba(255, 235, 59, 0.3);
        border-bottom: 2px solid #FFC107;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .apa-highlight:hover {
        background-color: rgba(255, 235, 59, 0.5);
      }
      
      .apa-highlight.critical {
        background-color: rgba(244, 67, 54, 0.2);
        border-bottom-color: #F44336;
      }
      
      .apa-highlight.major {
        background-color: rgba(255, 152, 0, 0.2);
        border-bottom-color: #FF9800;
      }
      
      .apa-highlight.minor {
        background-color: rgba(33, 150, 243, 0.2);
        border-bottom-color: #2196F3;
      }
    `;
  }
}

module.exports = DualProcessor;