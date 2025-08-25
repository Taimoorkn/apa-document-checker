// Test libreoffice-convert directly
const libre = require('libreoffice-convert');
const { promisify } = require('util');
const fs = require('fs');

libre.convertAsync = promisify(libre.convert);

async function testConvert() {
  console.log('🧪 Testing libreoffice-convert package...');
  
  try {
    // Create a simple test buffer (minimal DOCX-like data)
    const testBuffer = Buffer.from('PK'); // ZIP signature start
    
    console.log('Attempting conversion...');
    const result = await libre.convertAsync(testBuffer, '.html', undefined);
    console.log('✅ Conversion successful! Result size:', result.length);
    console.log('🎉 LibreOffice is working!');
    
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    
    // Check if it's a LibreOffice path issue
    if (error.message.includes('spawn') || error.message.includes('ENOENT')) {
      console.log('💡 This suggests LibreOffice binary is not found or accessible');
      console.log('💡 Check if LibreOffice is properly installed and in PATH');
    } else {
      console.log('💡 This might be due to invalid test data, but LibreOffice seems accessible');
    }
  }
}

testConvert();