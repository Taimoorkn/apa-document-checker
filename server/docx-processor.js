// server/docx-processor.js
const express = require('express');
const multer = require('multer');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const mammoth = require('mammoth');
const fs = require('fs').promises;

const app = express();
const upload = multer({ dest: 'uploads/' });

// Enhanced DOCX processor that extracts both content AND formatting
class DocxProcessor {
  async processDocument(filePath) {
    try {
      // Read the original DOCX file
      const buffer = await fs.readFile(filePath);
      
      // Extract content with mammoth
      const contentResult = await mammoth.convertToHtml({ buffer });
      
      // Extract raw text for analysis
      const textResult = await mammoth.extractRawText({ buffer });
      
      // CRITICAL: Extract formatting information directly from DOCX XML
      const formattingInfo = await this.extractFormattingDetails(buffer);
      
      // Extract document structure
      const structure = await this.extractDocumentStructure(buffer);
      
      return {
        html: contentResult.value,
        text: textResult.value,
        formatting: formattingInfo,
        structure: structure,
        messages: [...contentResult.messages, ...textResult.messages]
      };
      
    } catch (error) {
      console.error('Error processing DOCX:', error);
      throw error;
    }
  }
  
  async extractFormattingDetails(buffer) {
    // Use docx library to read document properties
    const JSZip = require('jszip');
    const xml2js = require('xml2js');
    
    try {
      const zip = await JSZip.loadAsync(buffer);
      
      // Parse document.xml for content formatting
      const documentXml = await zip.file('word/document.xml').async('text');
      const stylesXml = await zip.file('word/styles.xml').async('text');
      
      const parser = new xml2js.Parser();
      const documentData = await parser.parseStringPromise(documentXml);
      const stylesData = await parser.parseStringPromise(stylesXml);
      
      return this.parseFormattingFromXML(documentData, stylesData);
      
    } catch (error) {
      console.error('Error extracting formatting:', error);
      return this.getDefaultFormatting();
    }
  }
  
  parseFormattingFromXML(documentData, stylesData) {
    const formatting = {
      font: {
        family: null,
        size: null
      },
      spacing: {
        line: null,
        paragraph: null
      },
      margins: {
        top: null,
        bottom: null,
        left: null,
        right: null
      },
      indentation: {
        firstLine: null,
        hanging: null
      },
      paragraphs: []
    };
    
    try {
      // Extract page margins from sectPr
      const sectPr = documentData['w:document']['w:body'][0]['w:sectPr'];
      if (sectPr && sectPr[0]['w:pgMar']) {
        const margins = sectPr[0]['w:pgMar'][0]['$'];
        formatting.margins = {
          top: this.twipsToInches(parseInt(margins['w:top'] || 0)),
          bottom: this.twipsToInches(parseInt(margins['w:bottom'] || 0)),
          left: this.twipsToInches(parseInt(margins['w:left'] || 0)),
          right: this.twipsToInches(parseInt(margins['w:right'] || 0))
        };
      }
      
      // Extract paragraph formatting from each paragraph
      const paragraphs = documentData['w:document']['w:body'][0]['w:p'] || [];
      
      paragraphs.forEach((para, index) => {
        const paraFormatting = {
          index,
          font: { family: null, size: null },
          spacing: { line: null, before: null, after: null },
          indentation: { firstLine: null, hanging: null, left: null },
          alignment: null
        };
        
        // Check paragraph properties
        if (para['w:pPr']) {
          const pPr = para['w:pPr'][0];
          
          // Spacing
          if (pPr['w:spacing']) {
            const spacing = pPr['w:spacing'][0]['$'];
            paraFormatting.spacing.line = spacing['w:line'] ? 
              (parseInt(spacing['w:line']) / 240) : null; // Convert to "line" units
            paraFormatting.spacing.before = spacing['w:before'] ? 
              this.twipsToPoints(parseInt(spacing['w:before'])) : null;
            paraFormatting.spacing.after = spacing['w:after'] ? 
              this.twipsToPoints(parseInt(spacing['w:after'])) : null;
          }
          
          // Indentation
          if (pPr['w:ind']) {
            const ind = pPr['w:ind'][0]['$'];
            paraFormatting.indentation.firstLine = ind['w:firstLine'] ? 
              this.twipsToInches(parseInt(ind['w:firstLine'])) : null;
            paraFormatting.indentation.hanging = ind['w:hanging'] ? 
              this.twipsToInches(parseInt(ind['w:hanging'])) : null;
            paraFormatting.indentation.left = ind['w:left'] ? 
              this.twipsToInches(parseInt(ind['w:left'])) : null;
          }
          
          // Alignment
          if (pPr['w:jc']) {
            paraFormatting.alignment = pPr['w:jc'][0]['$']['w:val'];
          }
        }
        
        // Check run properties for font information
        if (para['w:r']) {
          const runs = para['w:r'];
          const firstRun = runs[0];
          
          if (firstRun && firstRun['w:rPr']) {
            const rPr = firstRun['w:rPr'][0];
            
            // Font family
            if (rPr['w:rFonts']) {
              paraFormatting.font.family = rPr['w:rFonts'][0]['$']['w:ascii'] || null;
            }
            
            // Font size
            if (rPr['w:sz']) {
              paraFormatting.font.size = parseInt(rPr['w:sz'][0]['$']['w:val']) / 2; // Convert half-points to points
            }
          }
        }
        
        formatting.paragraphs.push(paraFormatting);
      });
      
      // Set document-level defaults from first paragraph
      if (formatting.paragraphs.length > 0) {
        const firstPara = formatting.paragraphs[0];
        formatting.font = { ...firstPara.font };
        formatting.spacing.line = firstPara.spacing.line;
        formatting.indentation = { ...firstPara.indentation };
      }
      
    } catch (error) {
      console.error('Error parsing formatting XML:', error);
    }
    
    return formatting;
  }
  
  async extractDocumentStructure(buffer) {
    // Extract headings, sections, citations, references
    const JSZip = require('jszip');
    const xml2js = require('xml2js');
    
    try {
      const zip = await JSZip.loadAsync(buffer);
      const documentXml = await zip.file('word/document.xml').async('text');
      
      const parser = new xml2js.Parser();
      const documentData = await parser.parseStringPromise(documentXml);
      
      return this.parseDocumentStructure(documentData);
      
    } catch (error) {
      console.error('Error extracting structure:', error);
      return { headings: [], sections: [], citations: [], references: [] };
    }
  }
  
  parseDocumentStructure(documentData) {
    const structure = {
      headings: [],
      sections: [],
      citations: [],
      references: []
    };
    
    try {
      const paragraphs = documentData['w:document']['w:body'][0]['w:p'] || [];
      
      paragraphs.forEach((para, index) => {
        // Extract text content
        const textRuns = para['w:r'] || [];
        let text = '';
        
        textRuns.forEach(run => {
          if (run['w:t']) {
            if (Array.isArray(run['w:t'])) {
              text += run['w:t'].map(t => typeof t === 'string' ? t : t._).join('');
            } else {
              text += typeof run['w:t'] === 'string' ? run['w:t'] : (run['w:t']._ || '');
            }
          }
        });
        
        // Detect headings (by style or formatting)
        let isHeading = false;
        let headingLevel = 0;
        
        if (para['w:pPr'] && para['w:pPr'][0]['w:pStyle']) {
          const styleName = para['w:pPr'][0]['w:pStyle'][0]['$']['w:val'];
          const headingMatch = styleName.match(/Heading(\d+)/i);
          if (headingMatch) {
            isHeading = true;
            headingLevel = parseInt(headingMatch[1]);
          }
        }
        
        if (isHeading) {
          structure.headings.push({
            text: text.trim(),
            level: headingLevel,
            paragraphIndex: index
          });
        }
        
        // Detect citations (simple pattern matching)
        const citationPattern = /\(([^)]+),\s*(\d{4})[^)]*\)/g;
        let citationMatch;
        while ((citationMatch = citationPattern.exec(text)) !== null) {
          structure.citations.push({
            text: citationMatch[0],
            author: citationMatch[1],
            year: citationMatch[2],
            paragraphIndex: index
          });
        }
        
        // Detect if we're in References section
        if (text.trim().toLowerCase() === 'references') {
          structure.sections.push({
            type: 'references',
            startIndex: index,
            title: 'References'
          });
        }
      });
      
    } catch (error) {
      console.error('Error parsing document structure:', error);
    }
    
    return structure;
  }
  
  // Helper functions for unit conversion
  twipsToInches(twips) {
    return twips / 1440; // 1440 twips = 1 inch
  }
  
  twipsToPoints(twips) {
    return twips / 20; // 20 twips = 1 point
  }
  
  getDefaultFormatting() {
    return {
      font: { family: null, size: null },
      spacing: { line: null, paragraph: null },
      margins: { top: null, bottom: null, left: null, right: null },
      indentation: { firstLine: null, hanging: null },
      paragraphs: []
    };
  }
}

// API endpoint
app.post('/api/upload-docx', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const processor = new DocxProcessor();
    const result = await processor.processDocument(req.file.path);
    
    // Clean up uploaded file
    await fs.unlink(req.file.path);
    
    res.json({
      success: true,
      document: result
    });
    
  } catch (error) {
    console.error('Error processing document:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process document',
      details: error.message 
    });
  }
});

module.exports = { DocxProcessor, app };