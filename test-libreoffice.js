// Test LibreOffice integration
const LibreOfficeProcessor = require('./server/processors/LibreOfficeProcessor');

async function testLibreOffice() {
  console.log('🧪 Testing LibreOffice integration...');
  
  try {
    const processor = new LibreOfficeProcessor();
    console.log('✅ LibreOfficeProcessor created');
    
    // Test LibreOffice availability
    await processor.checkLibreOfficeAvailability();
    console.log('✅ LibreOffice availability check passed');
    
    console.log('🎉 LibreOffice is ready to use!');
    
  } catch (error) {
    console.error('❌ LibreOffice test failed:', error.message);
    console.log('💡 This means the system will fall back to Mammoth.js');
  }
}

testLibreOffice();