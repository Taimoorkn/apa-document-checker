# Fix Action Mappings Documentation

This document describes the mapping between fix actions and their implementations across the client and server.

## Architecture Overview

Fixes are divided into two categories:
1. **Server-side formatting fixes** - Modify the DOCX file structure directly
2. **Client-side content fixes** - Modify text content in the editor

## Server-Side Formatting Fixes (DOCX Modification)

These fixes modify the document's XML structure and require server-side processing:

| Fix Action | Description | Implementation | Modified Elements |
|------------|-------------|----------------|-------------------|
| `fixFont` | Changes font family to Times New Roman | `DocxModifier.fixFontFamily()` | `<w:rFonts>` elements |
| `fixFontSize` | Sets font size to 12pt | `DocxModifier.fixFontSize()` | `<w:sz>` and `<w:szCs>` elements |
| `fixLineSpacing` | Sets line spacing to double | `DocxModifier.fixLineSpacing()` | `<w:spacing>` elements |
| `fixMargins` | Sets margins to 1 inch | `DocxModifier.fixMargins()` | `<w:pgMar>` elements |
| `fixIndentation` | Sets first-line indent to 0.5 inch | `DocxModifier.fixIndentation()` | `<w:ind>` elements |

## Client-Side Content Fixes (Text Replacement)

These fixes modify text content and are applied directly in the editor:

### Citation Fixes
| Fix Action | Description | Pattern | Replacement |
|------------|-------------|---------|-------------|
| `addCitationComma` | Adds missing comma before year | `(Author 2021)` | `(Author, 2021)` |
| `fixParentheticalConnector` | Changes "and" to "&" in parenthetical | `(Smith and Jones, 2021)` | `(Smith & Jones, 2021)` |
| `fixEtAlFormatting` | Removes comma before et al. (APA 7th) | `(Smith, et al., 2021)` | `(Smith et al., 2021)` |

### Reference Fixes
| Fix Action | Description | Pattern | Replacement |
|------------|-------------|---------|-------------|
| `fixReferenceConnector` | Changes ", and" to ", &" | `Author, A., and Author, B.` | `Author, A., & Author, B.` |
| `addReferencePeriod` | Adds missing period at end | `...2021` | `...2021.` |
| `removeRetrievedFrom` | Removes "Retrieved from" | `Retrieved from http://...` | `http://...` |
| `formatDOI` | Converts DOI to hyperlink format | `doi:10.1234/abc` | `https://doi.org/10.1234/abc` |
| `sortReferences` | Alphabetizes reference list | Unsorted references | Alphabetically sorted |
| `fixReferenceIndent` | Adds hanging indent | First line flush | 0.5" hanging indent |

### Heading/Title Fixes
| Fix Action | Description | Pattern | Replacement |
|------------|-------------|---------|-------------|
| `fixAllCapsHeading` | Converts ALL CAPS to Title Case | `INTRODUCTION` | `Introduction` |
| `capitalizeSubtitle` | Capitalizes after colon | `Title: subtitle` | `Title: Subtitle` |

### Table/Figure Fixes
| Fix Action | Description | Pattern | Replacement |
|------------|-------------|---------|-------------|
| `fixTableTitleCase` | Converts to title case | `table title example` | `Table Title Example` |
| `fixFigureCaptionCase` | Converts to sentence case | `Figure Caption Example` | `Figure caption example` |
| `fixTableNoteFormat` | Adds "Note." prefix | `This is a note` | `Note. This is a note` |
| `fixTableNumbering` | Corrects sequence | `Table 1, Table 3` | `Table 1, Table 2` |
| `fixFigureNumbering` | Corrects sequence | `Figure 1, Figure 3` | `Figure 1, Figure 2` |

### List/Seriation Fixes
| Fix Action | Description | Pattern | Replacement |
|------------|-------------|---------|-------------|
| `addSerialComma` | Adds Oxford comma | `a, b and c` | `a, b, and c` |
| `fixListNumbering` | Corrects list format | `1), 2), 3)` | `(1), (2), (3)` |
| `fixComplexSeries` | Adds semicolons | Complex series with commas | Semicolon-separated |

### Abbreviation Fixes
| Fix Action | Description | Pattern | Replacement |
|------------|-------------|---------|-------------|
| `replaceLatinAbbr` | Replaces Latin abbreviations | `e.g.`, `i.e.`, `etc.` | English equivalents |
| `fixPluralAbbr` | Removes apostrophe | `URL's`, `DVD's` | `URLs`, `DVDs` |

### Quotation Fixes
| Fix Action | Description | Pattern | Replacement |
|------------|-------------|---------|-------------|
| `fixBlockQuote` | Formats as block quote | Quote >40 words inline | Indented block format |
| `addPageNumber` | Adds page number to quote | `(Author, 2021)` | `(Author, 2021, p. 1)` |

### Statistical Fixes
| Fix Action | Description | Pattern | Replacement |
|------------|-------------|---------|-------------|
| `fixStatSymbol` | Italicizes statistical symbols | `M = 5.23` | `*M* = 5.23` |
| `fixNumberFormat` | Corrects number formatting | Various patterns | APA-compliant format |
| `removeLeadingZero` | Removes leading zero | `p = 0.05` | `p = .05` |
| `spellOutNumber` | Spells out numbers <10 | `5 participants` | `five participants` |

### Bias-Free Language Fixes
| Fix Action | Description | Pattern | Replacement |
|------------|-------------|---------|-------------|
| `replaceGenderedTerm` | Replaces gendered language | `chairman` | `chairperson` |
| `replaceBiasedTerm` | Replaces biased terminology | Various terms | Preferred alternatives |

## Implementation Details

### Server-Side Fix Flow
1. Client sends fix request with `documentBuffer` and `fixAction`
2. Server loads buffer into PizZip
3. `DocxModifier` applies XML modifications
4. Modified buffer sent back to client
5. Client updates document display

### Client-Side Fix Flow  
1. Issue identified with `fixAction` and `text`
2. Replacement text calculated based on fix type
3. Custom event dispatched to editor
4. Editor applies text replacement
5. Issue removed from list

## Adding New Fix Actions

### For Server-Side Fixes:
1. Add fix action to `DocxModifier.supportedFixes` array
2. Implement fix logic in `DocxModifier.modifyDocumentXML()`
3. Add to server-side list in `enhancedDocumentStore.js`

### For Client-Side Fixes:
1. Add case in `applyClientSideFix()` switch statement
2. Add to client-side list in `enhancedDocumentStore.js`
3. Implement replacement logic

## Testing Fix Actions

Each fix action should be tested with:
- Valid input that needs fixing
- Edge cases (empty text, special characters)
- Already-correct input (should not modify)
- Multiple occurrences in same document

## Performance Considerations

- Client-side fixes are instant (no server round-trip)
- Server-side fixes require document regeneration
- Batch multiple fixes when possible
- Cache processed documents to avoid reprocessing