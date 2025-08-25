# LibreOffice Integration Setup

## Overview

The APA Document Checker now supports LibreOffice for better DOCX styling extraction accuracy. LibreOffice provides superior formatting preservation compared to Mammoth.js, especially for:

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

**Without LibreOffice Installation:**
- The application automatically falls back to Mammoth.js
- Document processing still works but with reduced styling accuracy
- You'll see a "LibreOffice fallback" message in processing info

**With LibreOffice Installation:**
- Superior DOCX styling extraction
- Better APA formatting preservation
- More accurate font and spacing detection

## Testing LibreOffice Integration

1. Check processor status:
   ```
   GET http://localhost:3001/api/processing-status
   ```
   
2. Force Mammoth processor (for comparison):
   ```
   POST http://localhost:3001/api/upload-docx?forceMammoth=true
   ```

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

### Robust Fallback System
- Automatic fallback to Mammoth.js if LibreOffice fails
- No interruption to user workflow
- Clear indication of which processor was used

## Configuration Options

The system supports several configuration options:

1. **Automatic Mode** (default): Try LibreOffice first, fallback to Mammoth
2. **Force Mammoth**: Skip LibreOffice entirely (`?forceMammoth=true`)
3. **LibreOffice Only**: Fail if LibreOffice unavailable (can be configured)

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

- LibreOffice processing is slower than Mammoth (~2-3x)
- LibreOffice is not thread-safe (processes one document at a time)
- Memory usage is higher with LibreOffice
- Consider using Mammoth for batch processing scenarios

## Development Notes

The LibreOffice integration:
- Maintains the same API interface as Mammoth
- Preserves all existing APA analysis functionality  
- Adds enhanced formatting data extraction
- Provides graceful degradation when LibreOffice unavailable

No frontend changes are required - the improved formatting data is automatically used by the existing DocumentViewer component.