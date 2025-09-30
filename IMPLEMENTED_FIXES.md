# Implemented APA Fixes

This document tracks which automatic fixes are currently implemented in the APA Document Checker.

## Currently Implemented Fixes (8 total)

### Server-Side Formatting Fixes (5)
These fixes modify the DOCX file structure on the server and return a reprocessed document.

1. ✅ **fixFont** - Corrects font family to Times New Roman
2. ✅ **fixFontSize** - Adjusts font size to 12pt
3. ✅ **fixLineSpacing** - Sets line spacing to double (2.0)
4. ✅ **fixMargins** - Adjusts margins to 1 inch
5. ✅ **fixIndentation** - Corrects paragraph indentation (0.5 inches)

### Client-Side Content Fixes (3)
These fixes modify text content in the document model without regenerating the DOCX.

6. ✅ **addCitationComma** - Adds missing comma between author and year in citations
   - Example: `(Smith 2023)` → `(Smith, 2023)`

7. ✅ **fixParentheticalConnector** - Replaces "and" with "&" in parenthetical citations
   - Example: `(Smith and Jones, 2023)` → `(Smith & Jones, 2023)`

8. ✅ **fixEtAlFormatting** - Removes comma before "et al." per APA 7th edition
   - Example: `(Smith, et al., 2023)` → `(Smith et al., 2023)`

---

## Unimplemented Fixes

The following fix actions are declared in validators but not yet implemented. Issues with these fix actions will NOT show the "Apply Fix" button.

### Citation & Reference Fixes
- `fixReferenceConnector` - Replace "and" with "&" in reference lists
- `sortReferences` - Sort reference list alphabetically
- `sortReferencesByYear` - Sort references by year for same author
- `addReferencePeriod` - Add missing period at end of reference
- `removeRetrievedFrom` - Remove unnecessary "Retrieved from" for URLs with DOI
- `formatDOI` - Format DOI as hyperlink
- `fixReferenceIndent` - Apply hanging indent to references
- `fixAuthorComma` - Fix comma placement in author names
- `fixAuthorInitials` - Format author initials correctly
- `fixPageRangeDash` - Use en-dash for page ranges
- `simplifyEtAlCitation` - Simplify citations with 3+ authors to et al.
- `addReferencesHeader` - Add "References" header
- `addReferencesSection` - Create references section

### Table & Figure Fixes
- `fixTableTitleCase` - Convert table titles to title case
- `fixFigureCaptionCase` - Convert figure captions to sentence case
- `fixTableNoteFormat` - Format table notes correctly
- `removeTableVerticalLines` - Remove vertical lines from tables (APA style)
- `fixTableBorders` - Apply APA-compliant table borders
- `fixTableBorderStyle` - Fix table border styles
- `fixTableNumbering` - Fix table numbering sequence
- `fixAppendixTableNumbering` - Fix table numbering in appendices

### Heading & Structure Fixes
- `fixAllCapsHeading` - Convert ALL CAPS headings to proper case
- `fixHeadingLevel` - Correct heading level formatting
- `fixLevel5HeadingCase` - Format Level 5 headings correctly
- `indentLevel5Heading` - Indent Level 5 headings
- `capitalizeSubtitle` - Capitalize subtitle after colon
- `addAbstract` - Add abstract section
- `addRunningHeadLabel` - Add "Running head:" label
- `fixRunningHeadCaps` - Format running head in all caps

### Quotation Fixes
- `convertToBlockQuote` - Convert 40+ word quotes to block format
- `removeBlockQuoteMarks` - Remove quotation marks from block quotes
- `fixEllipsisFormat` - Format ellipsis correctly (three dots with spaces)
- `fixFourDots` - Use four dots for sentence-ending ellipsis
- `addSpaceBeforeSic` - Add space before [sic]
- `removeEllipsisBrackets` - Remove brackets around ellipsis
- `addEmphasisNote` - Add note about added emphasis
- `fixBlockQuote` - General block quote formatting

### Statistical & Number Fixes
- `fixPValueDecimals` - Format p-values with correct decimals
- `fixPValueZero` - Remove leading zero from p-values
- `addLeadingZero` - Add leading zero where needed
- `removeLeadingZero` - Remove leading zero from correlations
- `fixChiSquareSymbol` - Use correct chi-square symbol
- `addOperatorSpaces` - Add spaces around mathematical operators
- `addMinusSpaces` - Add spaces around minus signs
- `spellOutNumber` - Spell out numbers at sentence start
- `removePercentSpace` - Remove space before percent symbol
- `usePercentSymbol` - Use % symbol instead of "percent"
- `fixStatSymbol` - General statistical symbol formatting
- `fixNumberFormat` - General number formatting

### Language & Style Fixes
- `replaceGenderedTerm` - Replace gendered language with neutral terms
- `usePersonFirst` - Use person-first language for disabilities
- `replaceAgeTerm` - Replace age-related terms with appropriate language
- `capitalizeRacialTerm` - Capitalize racial/ethnic terms (Black, White)
- `updateSOGITerm` - Update sexual orientation/gender identity terms
- `replaceBiasedTerm` - General bias-free language replacement

### List & Punctuation Fixes
- `addSerialComma` - Add serial comma in lists
- `fixListNumbering` - Fix list numbering format
- `fixComplexSeries` - Fix punctuation in complex series
- `replaceLatinAbbr` - Replace Latin abbreviations with English
- `fixPluralAbbr` - Fix plural forms of abbreviations

### Header & Footer Fixes
- `fixPageNumberPosition` - Position page numbers correctly
- `movePageNumbersToHeader` - Move page numbers to header
- `addPageNumber` - Add page numbers to citations

### Publisher Fixes
- `removePublisherLocation` - Remove publisher location (APA 7th edition)

---

## Implementation Notes

### How Fix Implementation Works

1. **Validation Phase**: Validators detect issues and set `hasFix: true` for fixable issues
2. **Implementation Check**: `DocumentService.isFixImplemented()` checks if fix is actually coded
3. **UI Filtering**: Store's `getIssues()` filters out unimplemented fixes before displaying to user
4. **Fix Application**:
   - Server fixes: Send to `/api/apply-fix` → modify DOCX → reprocess → update model
   - Client fixes: Modify paragraph text in memory → regenerate runs → sync editor

### Adding New Fixes

To implement a new fix:

1. **For Server Formatting Fixes**:
   - Add fix action to `DocumentService._isServerFormattingFix()`
   - Implement fix logic in `server/processors/DocxModifier.js`

2. **For Client Content Fixes**:
   - Add fix action to `DocumentService._isClientContentFix()`
   - Add case in `DocumentService._applyClientContentFix()` switch statement
   - Implement helper method (e.g., `_applyYourFixName()`)

3. **Ensure validators provide `fixValue`**:
   ```javascript
   {
     hasFix: true,
     fixAction: "yourFixAction",
     fixValue: {
       original: "text to find",
       replacement: "corrected text"
     }
   }
   ```

---

## Related Files

- **Fix Detection**: `src/services/DocumentService.js:510` - `isFixImplemented()`
- **Issue Filtering**: `src/store/unifiedDocumentStore.js:487` - `getIssues()`
- **Server Fixes**: `server/processors/DocxModifier.js`
- **Client Fixes**: `src/services/DocumentService.js:612` - `_applyClientContentFix()`
- **All Validators**: `src/utils/*Validator.js`