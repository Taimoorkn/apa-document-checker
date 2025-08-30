# LibreOffice Integration Setup

## Overview

The APA Document Checker requires LibreOffice for DOCX styling extraction and processing. LibreOffice provides accurate formatting preservation for:

- Font family and size accuracy
- Line spacing preservation  
- Paragraph indentation
- Complex document structures

## Installation

### Windows
1. Download LibreOffice from: https://www.libreoffice.org/download/download/
2. Install LibreOffice with default settings
3. Ensure LibreOffice is added to your system PATH
4. Verify installation by running: `soffice --version` in Command Prompt

### macOS
1. Download LibreOffice from: https://www.libreoffice.org/download/download/
2. Drag LibreOffice to Applications folder
3. The system should automatically find LibreOffice

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install libreoffice
```

### Linux (CentOS/RHEL)
```bash
sudo yum install libreoffice
```

## Current Status

**LibreOffice Installation Required:**
- LibreOffice is the only document processor
- The application will not function without LibreOffice
- Provides accurate DOCX styling extraction
- Delivers precise APA formatting preservation
- Ensures accurate font and spacing detection

## Testing LibreOffice Integration

1. Check processor status:
   ```
   GET http://localhost:3001/api/processing-status
   ```
   
2. The application now uses only LibreOffice for processing

## Benefits of LibreOffice Integration

### Improved Styling Accuracy
- **Font Detection**: LibreOffice captures exact font families and sizes as rendered
- **Spacing Preservation**: Line height and paragraph spacing maintained accurately  
- **Indentation**: First-line indents and hanging indents properly detected
- **Visual Fidelity**: Document appears closer to original formatting

### Enhanced APA Analysis
- More accurate compliance scoring based on actual document formatting
- Better detection of formatting violations
- Improved paragraph-level analysis

### Simplified Architecture
- Single processor system using LibreOffice only
- Consistent processing results
- Clear error messages when LibreOffice is unavailable

## Configuration Options

The system configuration:

1. **LibreOffice Only**: The application requires LibreOffice to be installed and available
2. **No Fallback**: If LibreOffice is unavailable, processing will fail with a clear error message

## Troubleshooting

### "LibreOffice not found" Error
- Verify LibreOffice is installed: `soffice --version`
- Check system PATH includes LibreOffice
- Try restarting the Node.js server after installation

### Conversion Timeout
- Increase timeout in LibreOfficeProcessor.js
- Check available system memory
- Try with smaller documents first

### Permission Issues
- Ensure LibreOffice has proper file permissions
- On Linux/macOS, check user permissions for temporary directories

## Performance Considerations

- LibreOffice processes one document at a time (not thread-safe)
- Memory usage varies based on document complexity
- Processing time depends on document size and system resources
- Ensure adequate system memory for large documents

## Development Notes

The LibreOffice integration:
- Provides comprehensive document processing
- Preserves all existing APA analysis functionality  
- Delivers enhanced formatting data extraction
- Requires LibreOffice installation for operation

No frontend changes are required - LibreOffice formatting data is automatically used by the existing DocumentViewer component.