// server/processors/DocxModifier.js - DOCX modification for APA fixes (Memory-based)
const PizZip = require('pizzip');

class DocxModifier {
  constructor() {
    this.supportedFixes = ['fixFont', 'fixFontSize', 'fixLineSpacing', 'fixMargins', 'fixIndentation'];
  }

  /**
   * Apply formatting fix to a DOCX buffer by modifying the document structure
   */
  async applyFormattingFix(inputBuffer, fixAction, fixValue) {
    try {
      console.log(`🔧 Applying ${fixAction} to DOCX buffer (${inputBuffer.length} bytes)`);
      
      // Create zip from buffer
      const zip = new PizZip(inputBuffer);
      
      // Apply the specific fix by modifying document XML
      const modifiedZip = await this.modifyDocumentXML(zip, fixAction, fixValue);
      
      // Generate the modified DOCX buffer
      const outputBuffer = modifiedZip.generate({
        type: 'nodebuffer',
        compression: 'DEFLATE'
      });
      
      console.log(`✅ DOCX modification complete: ${outputBuffer.length} bytes`);
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
      // Get the main document XML
      const docXmlFile = zip.file('word/document.xml');
      if (!docXmlFile) {
        throw new Error('Could not find document.xml in DOCX file');
      }
      
      // Read document content using the correct PizZip API
      let documentContent = docXmlFile.asText();
      
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
    console.log(`🎨 Changing font family to: ${fontFamily}`);
    
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
    console.log(`📏 Changing font size to: ${halfPoints / 2}pt (${halfPoints} half-points)`);
    
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
    console.log(`📐 Changing line spacing to: ${spacing / 240} (${spacing} twips)`);
    
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
    console.log(`🎭 Modifying document styles for: ${fixAction}`);
    
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
   * Check if a fix action is supported
   */
  isFixSupported(fixAction) {
    return this.supportedFixes.includes(fixAction);
  }
}

module.exports = DocxModifier;