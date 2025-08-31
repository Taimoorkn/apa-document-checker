// server/processors/DocxModifier.js - DOCX modification for APA fixes (Memory-based)
const PizZip = require('pizzip');

class DocxModifier {
  constructor() {
    this.supportedFixes = [
      // Formatting fixes (DOCX modification)
      'fixFont', 'fixFontSize', 'fixLineSpacing', 'fixMargins', 'fixIndentation',
      // Content fixes (text replacement in XML)
      'addCitationComma', 'fixParentheticalConnector', 'fixEtAlFormatting', 
      'fixReferenceConnector', 'fixAllCapsHeading', 'addPageNumber'
    ];
  }

  /**
   * Apply formatting fix to a DOCX buffer by modifying the document structure
   */
  async applyFormattingFix(inputBuffer, fixAction, fixValue) {
    try {
      console.log(`🔧 DocxModifier.applyFormattingFix called with:`, {
        bufferSize: inputBuffer?.length,
        fixAction,
        fixValueType: typeof fixValue,
        fixValueKeys: typeof fixValue === 'object' ? Object.keys(fixValue || {}) : 'N/A'
      });
      
      if (!inputBuffer || inputBuffer.length === 0) {
        throw new Error('Invalid or empty input buffer provided');
      }
      
      // Create zip from buffer
      console.log('📦 Creating PizZip from buffer...');
      const zip = new PizZip(inputBuffer);
      console.log('✅ PizZip created successfully');
      
      // Apply the specific fix by modifying document XML
      const modifiedZip = await this.modifyDocumentXML(zip, fixAction, fixValue);
      
      // Generate the modified DOCX buffer
      const outputBuffer = modifiedZip.generate({
        type: 'nodebuffer',
        compression: 'DEFLATE'
      });
      
      return { success: true, buffer: outputBuffer };
      
    } catch (error) {
      console.error('Error modifying DOCX:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Modify the document XML to apply formatting fixes
   */
  async modifyDocumentXML(zip, fixAction, fixValue) {
    try {
      console.log(`🔄 ModifyDocumentXML called with fixAction: ${fixAction}`);
      
      // Get the main document XML
      const docXmlFile = zip.file('word/document.xml');
      if (!docXmlFile) {
        throw new Error('Could not find document.xml in DOCX file');
      }
      
      console.log('📄 Found document.xml, reading content...');
      // Read document content using the correct PizZip API
      let documentContent = docXmlFile.asText();
      console.log(`📄 Document XML content length: ${documentContent.length} characters`);
      
      // Apply specific formatting fixes
      switch (fixAction) {
        case 'fixFont':
          documentContent = this.fixFontFamily(documentContent, fixValue || 'Times New Roman');
          break;
          
        case 'fixFontSize':
          documentContent = this.fixFontSize(documentContent, fixValue || 24); // 24 half-points = 12pt
          break;
          
        case 'fixLineSpacing':
          documentContent = this.fixLineSpacing(documentContent, fixValue || 480); // 480 = double spacing
          break;

        // Text-based content fixes
        case 'addCitationComma':
          documentContent = this.fixTextContent(documentContent, fixValue);
          break;
          
        case 'fixParentheticalConnector':
          documentContent = this.fixTextContent(documentContent, fixValue);
          break;
          
        case 'fixEtAlFormatting':
          documentContent = this.fixTextContent(documentContent, fixValue);
          break;
          
        case 'fixReferenceConnector':
          documentContent = this.fixTextContent(documentContent, fixValue);
          break;
          
        case 'fixAllCapsHeading':
          documentContent = this.fixTextContent(documentContent, fixValue);
          break;
          
        case 'addPageNumber':
          documentContent = this.fixTextContent(documentContent, fixValue);
          break;
          
        default:
          console.warn(`Unsupported fix action: ${fixAction}`);
          return zip; // Return unchanged if fix not supported
      }
      
      // Update the document XML in the zip
      zip.file('word/document.xml', documentContent);
      
      // Also modify styles.xml if it exists for document-wide changes
      const stylesXmlFile = zip.file('word/styles.xml');
      if (stylesXmlFile && ['fixFont', 'fixFontSize', 'fixLineSpacing'].includes(fixAction)) {
        let stylesContent = stylesXmlFile.asText();
        stylesContent = this.modifyStyles(stylesContent, fixAction, fixValue);
        zip.file('word/styles.xml', stylesContent);
      }
      
      return zip;
      
    } catch (error) {
      console.error('Error modifying document XML:', error);
      throw error;
    }
  }

  /**
   * Fix font family in document XML
   */
  fixFontFamily(xmlContent, fontFamily) {
    
    // Replace all font family references in run properties
    // Pattern matches: <w:rFonts w:ascii="..." w:hAnsi="..." ... />
    xmlContent = xmlContent.replace(
      /<w:rFonts[^>]*w:ascii="[^"]*"([^>]*)/g,
      `<w:rFonts w:ascii="${fontFamily}"$1`
    );
    
    xmlContent = xmlContent.replace(
      /<w:rFonts[^>]*w:hAnsi="[^"]*"([^>]*)/g,
      (match, rest) => match.replace(/w:hAnsi="[^"]*"/, `w:hAnsi="${fontFamily}"`)
    );
    
    // Add font family to runs that don't have it
    xmlContent = xmlContent.replace(
      /<w:rPr>(?![^<]*<w:rFonts)/g,
      `<w:rPr><w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}"/>`
    );
    
    return xmlContent;
  }

  /**
   * Fix font size in document XML
   */
  fixFontSize(xmlContent, halfPoints) {
    
    // Replace existing font size declarations
    xmlContent = xmlContent.replace(
      /<w:sz w:val="\d+"/g,
      `<w:sz w:val="${halfPoints}"`
    );
    
    xmlContent = xmlContent.replace(
      /<w:szCs w:val="\d+"/g,
      `<w:szCs w:val="${halfPoints}"`
    );
    
    // Add font size to runs that don't have it
    xmlContent = xmlContent.replace(
      /<w:rPr>(?![^<]*<w:sz)/g,
      `<w:rPr><w:sz w:val="${halfPoints}"/><w:szCs w:val="${halfPoints}"/>`
    );
    
    // Handle cases where rPr exists but doesn't have size
    xmlContent = xmlContent.replace(
      /<w:rPr>([^<]*(?:<w:(?!sz)[^>]*>[^<]*<\/w:[^>]*>)*[^<]*)<\/w:rPr>/g,
      (match, content) => {
        if (!content.includes('<w:sz')) {
          return `<w:rPr>${content}<w:sz w:val="${halfPoints}"/><w:szCs w:val="${halfPoints}"/></w:rPr>`;
        }
        return match;
      }
    );
    
    return xmlContent;
  }

  /**
   * Fix line spacing in document XML
   */
  fixLineSpacing(xmlContent, spacing) {
    
    // Replace existing spacing declarations in paragraph properties
    xmlContent = xmlContent.replace(
      /<w:spacing[^>]*w:line="\d+"[^>]*\/>/g,
      `<w:spacing w:line="${spacing}" w:lineRule="auto"/>`
    );
    
    // Add spacing to paragraphs that don't have it
    xmlContent = xmlContent.replace(
      /<w:pPr>(?![^<]*<w:spacing)/g,
      `<w:pPr><w:spacing w:line="${spacing}" w:lineRule="auto"/>`
    );
    
    return xmlContent;
  }

  /**
   * Modify styles.xml for document-wide formatting changes
   */
  modifyStyles(stylesContent, fixAction, fixValue) {
    
    try {
      switch (fixAction) {
        case 'fixFont':
          // Update the Normal style and other paragraph styles
          stylesContent = stylesContent.replace(
            /<w:rFonts[^>]*w:ascii="[^"]*"/g,
            `<w:rFonts w:ascii="${fixValue}"`
          );
          stylesContent = stylesContent.replace(
            /<w:rFonts[^>]*w:hAnsi="[^"]*"/g,
            (match) => match.replace(/w:hAnsi="[^"]*"/, `w:hAnsi="${fixValue}"`)
          );
          break;
          
        case 'fixFontSize':
          // Update default font sizes in styles
          stylesContent = stylesContent.replace(
            /<w:sz w:val="\d+"/g,
            `<w:sz w:val="${fixValue}"`
          );
          stylesContent = stylesContent.replace(
            /<w:szCs w:val="\d+"/g,
            `<w:szCs w:val="${fixValue}"`
          );
          break;
          
        case 'fixLineSpacing':
          // Update line spacing in paragraph styles
          stylesContent = stylesContent.replace(
            /<w:spacing[^>]*w:line="\d+"[^>]*\/>/g,
            `<w:spacing w:line="${fixValue}" w:lineRule="auto"/>`
          );
          break;
      }
      
      return stylesContent;
      
    } catch (error) {
      console.error('Error modifying styles:', error);
      return stylesContent; // Return unchanged if error
    }
  }

  /**
   * Fix text content in document XML (for citation and content fixes)
   */
  fixTextContent(xmlContent, fixValue) {
    try {
      if (!fixValue || !fixValue.originalText || !fixValue.replacementText) {
        console.warn('Invalid fixValue for text content fix:', fixValue);
        return xmlContent;
      }

      const { originalText, replacementText } = fixValue;
      
      console.log(`🔄 Replacing text in XML: "${originalText}" → "${replacementText}"`);
      
      // Simple and safe text replacement approach
      let modifiedContent = xmlContent;
      
      // Method 1: Replace the exact text as it appears in the XML
      // This handles most cases where text is within single w:t elements
      if (modifiedContent.includes(originalText)) {
        modifiedContent = modifiedContent.replace(new RegExp(this.escapeRegex(originalText), 'g'), replacementText);
        console.log('✅ Direct text replacement successful');
        return modifiedContent;
      }
      
      // Method 2: Replace text within w:t tags (handling XML structure)
      const escapedOriginal = this.escapeXml(originalText);
      const escapedReplacement = this.escapeXml(replacementText);
      
      const replaced = modifiedContent.replace(
        new RegExp(`(<w:t[^>]*>)([^<]*${this.escapeRegex(escapedOriginal)}[^<]*)(</w:t>)`, 'g'),
        (match, openTag, textContent, closeTag) => {
          const newTextContent = textContent.replace(new RegExp(this.escapeRegex(escapedOriginal), 'g'), escapedReplacement);
          return openTag + newTextContent + closeTag;
        }
      );
      
      if (replaced !== modifiedContent) {
        console.log('✅ XML-aware text replacement successful');
        return replaced;
      }
      
      console.warn('⚠️ No text replacement occurred - text might span multiple elements');
      return modifiedContent;
      
    } catch (error) {
      console.error('Error in fixTextContent:', error);
      return xmlContent; // Return original content on error
    }
  }

  /**
   * Escape special regex characters
   */
  escapeRegex(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Escape XML special characters
   */
  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Check if a fix action is supported
   */
  isFixSupported(fixAction) {
    return this.supportedFixes.includes(fixAction);
  }
}

module.exports = DocxModifier;