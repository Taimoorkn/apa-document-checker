script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3000/document/b9488543-0e73-46b1-b3bf-c25bb3af42cd {o: 'http://localhost:3000/document/b9488543-0e73-46b1-b3bf-c25bb3af42cd', sv: '0.1.3', sdkn: '@vercel/analytics/react', sdkv: '1.5.0', ts: 1759521541845, …}
src\services\DocumentService.js:24 📊 DocumentService initialized with Incremental APA Analyzer
src\utils\indexedDBManager.js:54 ✅ IndexedDB initialized
src\utils\indexedDBManager.js:54 ✅ IndexedDB initialized
src\app\document\[id]\DocumentViewerClient.js:88 ☁️ Loading from Supabase document_data (original version)
src\store\unifiedDocumentStore.js:229 ✅ Existing document loaded: Running headd - Copy (1).docx
src\app\document\[id]\DocumentViewerClient.js:118 ✅ Document loaded from Supabase
src\app\document\[id]\DocumentViewerClient.js:123 🧠 Running full APA analysis on frontend...
src\store\unifiedDocumentStore.js:253 🧠 Starting APA analysis (legacy method)... {force: true, hasDocument: true}
src\services\DocumentService.js:404 🔍 Full analysis document data: {textLength: 7484, htmlLength: 12608, hasFormatting: true, hasStructure: true, hasStyles: true, …}
src\utils\IncrementalAPAAnalyzer.js:41 🧠 Starting APA analysis (full)...
src\utils\IncrementalAPAAnalyzer.js:68 ✅ Analysis complete: 64 issues found in 4ms
src\services\DocumentService.js:421 📊 Analysis results: {totalIssues: 50, bySeverity: {…}}
src\services\DocumentService.js:484 📝 Updating document issues: {totalIssues: 50, sampleIssue: {…}}
src\services\DocumentService.js:509 ✅ Document issues updated: {storedIssues: 50}
src\hooks\useAnalysis.js:107 ⏸️ [useAnalysis] Analysis disabled: {hasEditor: false, hasDocumentModel: true, enabled: true}
src\hooks\useAnalysis.js:107 ⏸️ [useAnalysis] Analysis disabled: {hasEditor: false, hasDocumentModel: true, enabled: true}
src\hooks\useIssueDecorations.js:29 🎨 Updated decorations for 0 issues
src\app\document\[id]\DocumentViewerClient.js:88 ☁️ Loading from Supabase document_data (original version)
src\store\unifiedDocumentStore.js:229 ✅ Existing document loaded: Running headd - Copy (1).docx
src\app\document\[id]\DocumentViewerClient.js:118 ✅ Document loaded from Supabase
src\app\document\[id]\DocumentViewerClient.js:123 🧠 Running full APA analysis on frontend...
src\store\unifiedDocumentStore.js:253 🧠 Starting APA analysis (legacy method)... {force: true, hasDocument: true}
src\services\DocumentService.js:404 🔍 Full analysis document data: {textLength: 7484, htmlLength: 12608, hasFormatting: true, hasStructure: true, hasStyles: true, …}
src\utils\IncrementalAPAAnalyzer.js:41 🧠 Starting APA analysis (full)...
src\utils\IncrementalAPAAnalyzer.js:68 ✅ Analysis complete: 64 issues found in 1ms
src\services\DocumentService.js:421 📊 Analysis results: {totalIssues: 50, bySeverity: {…}}
src\services\DocumentService.js:484 📝 Updating document issues: {totalIssues: 50, sampleIssue: {…}}
src\services\DocumentService.js:509 ✅ Document issues updated: {storedIssues: 50}
src\hooks\useUnifiedDocumentEditor.js:71 ✅ Editor created successfully
src\hooks\useAnalysis.js:128 ⏱️ [useAnalysis] Editor updated, debouncing analysis (8s)...
 🚀 [useAnalysis] Running immediate initial analysis (editor initialized)
 
╔═══════════════════════════════════════════════════════╗
 ║      🧠 [useAnalysis] ANALYSIS TRIGGERED             ║
 ╚═══════════════════════════════════════════════════════╝
 
═══════════════════════════════════════════════════════
 🔬 [TiptapAPAAnalyzer] ANALYSIS START
 ═══════════════════════════════════════════════════════
 📊 [TiptapAPAAnalyzer] Built paragraph map:
    • Total Tiptap paragraphs: 48
    • Document size: 7533 positions
    • First 10 paragraphs:
       0: "Running head: THE IMPACT OF SOCIAL MEDIA..." (paragraph)
       1: "The Impact of Social Media on Academic P..." (paragraph)
       2: "John Smith Department of Psychology Univ..." (paragraph)
       3: "AuthorNote John  Smith, Department of Ps..." (paragraph)
       4: " ABSTRACT" (paragraph)
       5: "This study examines the relationship bet..." (paragraph)
       6: "Keywords: social media, academic perform..." (paragraph)
       7: "INTRODUCTION" (paragraph)
       8: "Social media has become an integral part..." (paragraph)
       9: "According to recent statistics, the aver..." (paragraph)
 📝 [TiptapAPAAnalyzer] Created document data for base analyzer
    • Text paragraphs after split: 48
 📊 Analyzing document: 7484 chars text, 15945 chars HTML, formatting: true, structure: true
 📚 Using basic citation analysis for better coverage...
 ✅ Analysis complete: 51 issues found
 🔍 [TiptapAPAAnalyzer] Base analyzer results:
    • Raw issues found: 51
 
🎯 [TiptapAPAAnalyzer] POSITION ENRICHMENT PHASE
 ───────────────────────────────────────────────────────
 ⚪ Issue 1: "Incorrect font family..." - Document-level (no position)
 ⚪ Issue 2: "Incorrect font size..." - Document-level (no position)
 ⚪ Issue 3: "Incomplete title page..." - Document-level (no position)
 ⚪ Issue 4: "Journal name not italicized..." - Document-level (no position)
 
🔹 Issue 5: "Orphaned reference..."
    Location: paragraphIndex=35, charOffset=0, length=100
    Found paragraph: pos=5945, nodeSize=106, type=paragraph
    Paragraph text: "Brown, L. (2021). Academic engagement in the digit..."
    🔍 Searching within paragraph for: "Brown, L. (2021). Academic engagement in..."
    ✅ Found via paragraph search: from=5946, to=6046
 
🔹 Issue 6: "Orphaned reference..."
    Location: paragraphIndex=37, charOffset=0, length=100
    Found paragraph: pos=6170, nodeSize=124, type=paragraph
    Paragraph text: "Davis, K., & Brown, P. (2018). Social media effect..."
    🔍 Searching within paragraph for: "Davis, K., & Brown, P. (2018). Social me..."
    ✅ Found via paragraph search: from=6171, to=6271
 
🔹 Issue 7: "Orphaned reference..."
    Location: paragraphIndex=39, charOffset=0, length=100
    Found paragraph: pos=6410, nodeSize=119, type=paragraph
    Paragraph text: "Johnson, A. (2020). Measuring academic success in ..."
    🔍 Searching within paragraph for: "Johnson, A. (2020). Measuring academic s..."
    ✅ Found via paragraph search: from=6411, to=6511
 ⚪ Issue 8: "Missing running head (professional paper..." - Document-level (no position)
 ⚪ Issue 9: "Missing page numbers..." - Document-level (no position)
 
🔹 Issue 10: "Number at sentence beginning..."
    Location: paragraphIndex=8, charOffset=303, length=50
    Found paragraph: pos=1188, nodeSize=366, type=paragraph
    Paragraph text: "Social media has become an integral part of modern..."
    🔍 Searching within paragraph for: ". 45). The current study aims to clarify..."
    ✅ Found via paragraph search: from=1492, to=1542
 
🔹 Issue 11: "Number at sentence beginning..."
    Location: paragraphIndex=13, charOffset=308, length=7
    Found paragraph: pos=2276, nodeSize=317, type=paragraph
    Paragraph text: "The proliferation of smartphones has made social m..."
    🔍 Searching within paragraph for: ". 123)."
    ✅ Found via paragraph search: from=2585, to=2592
 
🔹 Issue 12: "ALL CAPS heading detected..."
    Location: paragraphIndex=3, charOffset=483, length=8
    Found paragraph: pos=225, nodeSize=263, type=paragraph
    Paragraph text: "AuthorNote John  Smith, Department of Psychology, ..."
    🔍 Searching within paragraph for: "ABSTRACT"
    ⚠️ Text not found in expected paragraph
    🔍 Falling back to document-wide search...
    ✅ Found via document search: from=490, to=498
 
🔹 Issue 13: "ALL CAPS heading detected..."
    Location: paragraphIndex=6, charOffset=1166, length=12
src\utils\tiptapApaAnalyzer.js:135    Found paragraph: pos=1089, nodeSize=85, type=paragraph
src\utils\tiptapApaAnalyzer.js:136    Paragraph text: "Keywords: social media, academic performance, coll..."
src\utils\tiptapApaAnalyzer.js:142    🔍 Searching within paragraph for: "INTRODUCTION"
src\utils\tiptapApaAnalyzer.js:152    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:161    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:164    ✅ Found via document search: from=1175, to=1187
src\utils\tiptapApaAnalyzer.js:129 
🔹 Issue 14: "ALL CAPS heading detected..."
src\utils\tiptapApaAnalyzer.js:130    Location: paragraphIndex=9, charOffset=1945, length=45
src\utils\tiptapApaAnalyzer.js:135    Found paragraph: pos=1554, nodeSize=402, type=paragraph
src\utils\tiptapApaAnalyzer.js:136    Paragraph text: "According to recent statistics, the average colleg..."
src\utils\tiptapApaAnalyzer.js:142    🔍 Searching within paragraph for: "LITERATURE REVIEW
SOCIAL MEDIA USAGE PAT..."
src\utils\tiptapApaAnalyzer.js:152    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:161    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:171    ❌ Document search failed
src\utils\tiptapApaAnalyzer.js:175    ❌ No position found for this issue
src\utils\tiptapApaAnalyzer.js:129 
🔹 Issue 15: "ALL CAPS heading detected..."
src\utils\tiptapApaAnalyzer.js:130    Location: paragraphIndex=13, charOffset=2578, length=31
src\utils\tiptapApaAnalyzer.js:135    Found paragraph: pos=2276, nodeSize=317, type=paragraph
src\utils\tiptapApaAnalyzer.js:136    Paragraph text: "The proliferation of smartphones has made social m..."
src\utils\tiptapApaAnalyzer.js:142    🔍 Searching within paragraph for: "ACADEMIC PERFORMANCE INDICATORS"
src\utils\tiptapApaAnalyzer.js:152    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:161    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:164    ✅ Found via document search: from=2594, to=2625
src\utils\tiptapApaAnalyzer.js:129 
🔹 Issue 16: "ALL CAPS heading detected..."
src\utils\tiptapApaAnalyzer.js:130    Location: paragraphIndex=16, charOffset=3130, length=11
src\utils\tiptapApaAnalyzer.js:135    Found paragraph: pos=2882, nodeSize=266, type=paragraph
src\utils\tiptapApaAnalyzer.js:136    Paragraph text: "The concept of "academic engagement" has emerged a..."
src\utils\tiptapApaAnalyzer.js:142    🔍 Searching within paragraph for: "METHODOLOGY"
src\utils\tiptapApaAnalyzer.js:152    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:161    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:164    ✅ Found via document search: from=3149, to=3160
src\utils\tiptapApaAnalyzer.js:129 
🔹 Issue 17: "ALL CAPS heading detected..."
src\utils\tiptapApaAnalyzer.js:130    Location: paragraphIndex=21, charOffset=3672, length=7
src\utils\tiptapApaAnalyzer.js:135    Found paragraph: pos=3407, nodeSize=288, type=paragraph
src\utils\tiptapApaAnalyzer.js:136    Paragraph text: "Data collection occurred over a six-week period du..."
src\utils\tiptapApaAnalyzer.js:142    🔍 Searching within paragraph for: "RESULTS"
src\utils\tiptapApaAnalyzer.js:152    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:161    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:164    ✅ Found via document search: from=3696, to=3703
src\utils\tiptapApaAnalyzer.js:129 
🔹 Issue 18: "ALL CAPS heading detected..."
src\utils\tiptapApaAnalyzer.js:130    Location: paragraphIndex=24, charOffset=4271, length=10
src\utils\tiptapApaAnalyzer.js:135    Found paragraph: pos=4030, nodeSize=267, type=paragraph
src\utils\tiptapApaAnalyzer.js:136    Paragraph text: "Platform-specific analysis showed that Instagram a..."
src\utils\tiptapApaAnalyzer.js:142    🔍 Searching within paragraph for: "DISCUSSION"
src\utils\tiptapApaAnalyzer.js:152    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:161    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:164    ✅ Found via document search: from=4298, to=4308
src\utils\tiptapApaAnalyzer.js:129 
🔹 Issue 19: "ALL CAPS heading detected..."
src\utils\tiptapApaAnalyzer.js:130    Location: paragraphIndex=27, charOffset=4829, length=12
src\utils\tiptapApaAnalyzer.js:135    Found paragraph: pos=4576, nodeSize=282, type=paragraph
src\utils\tiptapApaAnalyzer.js:136    Paragraph text: "Several limitations should be noted. First, the st..."
src\utils\tiptapApaAnalyzer.js:142    🔍 Searching within paragraph for: "IMPLICATIONS"
src\utils\tiptapApaAnalyzer.js:152    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:161    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:164    ✅ Found via document search: from=4859, to=4871
src\utils\tiptapApaAnalyzer.js:129 
🔹 Issue 20: "ALL CAPS heading detected..."
src\utils\tiptapApaAnalyzer.js:130    Location: paragraphIndex=30, charOffset=5369, length=10
src\utils\tiptapApaAnalyzer.js:135    Found paragraph: pos=5168, nodeSize=233, type=paragraph
src\utils\tiptapApaAnalyzer.js:136    Paragraph text: "The results also suggest that not all social media..."
src\utils\tiptapApaAnalyzer.js:142    🔍 Searching within paragraph for: "CONCLUSION"
src\utils\tiptapApaAnalyzer.js:152    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:161    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:164    ✅ Found via document search: from=5402, to=5412
src\utils\tiptapApaAnalyzer.js:129 
🔹 Issue 21: "ALL CAPS heading detected..."
src\utils\tiptapApaAnalyzer.js:130    Location: paragraphIndex=32, charOffset=5785, length=10
src\utils\tiptapApaAnalyzer.js:135    Found paragraph: pos=5413, nodeSize=406, type=paragraph
src\utils\tiptapApaAnalyzer.js:136    Paragraph text: "This study contributes to the growing body of lite..."
src\utils\tiptapApaAnalyzer.js:142    🔍 Searching within paragraph for: "REFERENCES"
src\utils\tiptapApaAnalyzer.js:152    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:161    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:164    ✅ Found via document search: from=5820, to=5830
src\utils\tiptapApaAnalyzer.js:122 ⚪ Issue 22: "Citations on title page..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:129 
🔹 Issue 23: "Incorrect connector in parenthetical cit..."
src\utils\tiptapApaAnalyzer.js:130    Location: paragraphIndex=5, charOffset=350, length=28
src\utils\tiptapApaAnalyzer.js:135    Found paragraph: pos=499, nodeSize=590, type=paragraph
src\utils\tiptapApaAnalyzer.js:136    Paragraph text: "This study examines the relationship between socia..."
src\utils\tiptapApaAnalyzer.js:142    🔍 Searching within paragraph for: "(Johnson and Williams, 2019)"
src\utils\tiptapApaAnalyzer.js:145    ✅ Found via paragraph search: from=850, to=878
src\utils\tiptapApaAnalyzer.js:129 
🔹 Issue 24: "Missing comma in citation..."
src\utils\tiptapApaAnalyzer.js:130    Location: paragraphIndex=8, charOffset=181, length=12
src\utils\tiptapApaAnalyzer.js:135    Found paragraph: pos=1188, nodeSize=366, type=paragraph
src\utils\tiptapApaAnalyzer.js:136    Paragraph text: "Social media has become an integral part of modern..."
src\utils\tiptapApaAnalyzer.js:142    🔍 Searching within paragraph for: "(Smith 2020)"
src\utils\tiptapApaAnalyzer.js:145    ✅ Found via paragraph search: from=1370, to=1382
src\utils\tiptapApaAnalyzer.js:129 
🔹 Issue 25: "Incorrect connector in parenthetical cit..."
src\utils\tiptapApaAnalyzer.js:130    Location: paragraphIndex=8, charOffset=278, length=30
src\utils\tiptapApaAnalyzer.js:135    Found paragraph: pos=1188, nodeSize=366, type=paragraph
src\utils\tiptapApaAnalyzer.js:136    Paragraph text: "Social media has become an integral part of modern..."
src\utils\tiptapApaAnalyzer.js:142    🔍 Searching within paragraph for: "(Davis and Brown, 2018, p. 45)"
src\utils\tiptapApaAnalyzer.js:145    ✅ Found via paragraph search: from=1467, to=1497
src\utils\tiptapApaAnalyzer.js:129 
🔹 Issue 26: "Incorrect connector in parenthetical cit..."
src\utils\tiptapApaAnalyzer.js:130    Location: paragraphIndex=13, charOffset=282, length=32
src\utils\tiptapApaAnalyzer.js:135    Found paragraph: pos=2276, nodeSize=317, type=paragraph
src\utils\tiptapApaAnalyzer.js:136    Paragraph text: "The proliferation of smartphones has made social m..."
src\utils\tiptapApaAnalyzer.js:142    🔍 Searching within paragraph for: "(Wilson and Davis, 2020, p. 123)"
src\utils\tiptapApaAnalyzer.js:145    ✅ Found via paragraph search: from=2559, to=2591
src\utils\tiptapApaAnalyzer.js:129 
🔹 Issue 27: "Incorrect connector in parenthetical cit..."
    Location: paragraphIndex=16, charOffset=240, length=23
    Found paragraph: pos=2882, nodeSize=266, type=paragraph
    Paragraph text: "The concept of "academic engagement" has emerged a..."
    🔍 Searching within paragraph for: "(White and Green, 2020)"
    ✅ Found via paragraph search: from=3123, to=3146
 
🔹 Issue 28: "Incorrect connector in parenthetical cit..."
    Location: paragraphIndex=26, charOffset=241, length=23
    Found paragraph: pos=4309, nodeSize=267, type=paragraph
    Paragraph text: "The findings support previous research suggesting ..."
    🔍 Searching within paragraph for: "(Clark and Adams, 2019)"
    ✅ Found via paragraph search: from=4551, to=4574
 
🔹 Issue 29: "Incorrect connector in parenthetical cit..."
    Location: paragraphIndex=30, charOffset=207, length=23
    Found paragraph: pos=5168, nodeSize=233, type=paragraph
    Paragraph text: "The results also suggest that not all social media..."
    🔍 Searching within paragraph for: "(Evans and Moore, 2020)"
    ✅ Found via paragraph search: from=5376, to=5399
 ⚪ Issue 30: "Missing DOI or URL..." - Document-level (no position)
 ⚪ Issue 31: "Missing DOI or URL..." - Document-level (no position)
 ⚪ Issue 32: "Missing DOI or URL..." - Document-level (no position)
 ⚪ Issue 33: "Same author references not in chronologi..." - Document-level (no position)
 ⚪ Issue 34: "Volume number not italicized..." - Document-level (no position)
 ⚪ Issue 35: "Hyphen instead of en dash in page range..." - Document-level (no position)
 ⚪ Issue 36: "Missing DOI or URL in journal article..." - Document-level (no position)
 
🔹 Issue 37: "Incorrect connector in reference..."
    Location: paragraphIndex=36, charOffset=0, length=117
    Found paragraph: pos=6051, nodeSize=119, type=paragraph
    Paragraph text: "Clark, R., and Adams, S. (2019). Attention theory ..."
    🔍 Searching within paragraph for: "Clark, R., and Adams, S. (2019). Attenti..."
    ✅ Found via paragraph search: from=6052, to=6169
 
🔹 Issue 38: "Incorrect connector in reference..."
    Location: paragraphIndex=40, charOffset=0, length=122
    Found paragraph: pos=6529, nodeSize=124, type=paragraph
    Paragraph text: "Johnson, A., and Williams, R. (2019). Digital nati..."
    🔍 Searching within paragraph for: "Johnson, A., and Williams, R. (2019). Di..."
    ✅ Found via paragraph search: from=6530, to=6652
 
🔹 Issue 39: "Incorrect connector in reference..."
    Location: paragraphIndex=41, charOffset=0, length=153
    Found paragraph: pos=6653, nodeSize=155, type=paragraph
    Paragraph text: "Miller, C., Thompson, D., and Rodriguez, M. (2021)..."
    🔍 Searching within paragraph for: "Miller, C., Thompson, D., and Rodriguez,..."
    ✅ Found via paragraph search: from=6654, to=6807
 ⚪ Issue 40: "Statistical symbol 'p' not italicized..." - Document-level (no position)
 ⚪ Issue 41: "Statistical symbol 'r' not italicized..." - Document-level (no position)
 ⚪ Issue 42: "Statistical symbol 'M' not italicized..." - Document-level (no position)
 ⚪ Issue 43: "Statistical symbol 'SD' not italicized..." - Document-level (no position)
 ⚪ Issue 44: "Single digit not spelled out..." - Document-level (no position)
 ⚪ Issue 45: "Single digit not spelled out..." - Document-level (no position)
 ⚪ Issue 46: "Single digit not spelled out..." - Document-level (no position)
 ⚪ Issue 47: "Missing serial comma..." - Document-level (no position)
 ⚪ Issue 48: "Undefined abbreviation..." - Document-level (no position)
 ⚪ Issue 49: "Undefined abbreviation..." - Document-level (no position)
 ⚪ Issue 50: "Potential Level 5 heading case error..." - Document-level (no position)
 ⚪ Issue 51: "Level 5 heading not indented..." - Document-level (no position)
 
═══════════════════════════════════════════════════════
 📊 [TiptapAPAAnalyzer] ANALYSIS COMPLETE
 ═══════════════════════════════════════════════════════
 Total issues: 51
 ✅ Position calculated: 0
 🔍 Paragraph search used: 15
 🔍 Document search used: 9
 ❌ No position found: 1
 ═══════════════════════════════════════════════════════

 
📦 [useAnalysis] Updating state with 51 issues...
 ✅ [useAnalysis] DocumentModel updated with 51 issues
 ╔═══════════════════════════════════════════════════════╗
 ║      ✅ [useAnalysis] ANALYSIS COMPLETE              ║
 ╚═══════════════════════════════════════════════════════╝

 
╔═══════════════════════════════════════════════════════╗
 ║   🎨 [TiptapIssueHighlighter] CREATING DECORATIONS   ║
 ╚═══════════════════════════════════════════════════════╝
 Total issues to highlight: 51
 Active issue ID: none
 
🎨 [TiptapIssueHighlighter] Finding position for: "Incorrect font family..."
    ⚪ No pmPosition, using legacy search
    ⚪ Document-level issue, no text to highlight
 ⚠️ No position found for issue: {id: 'issue-pjbhe2-0', title: 'Incorrect font family', category: 'formatting', highlightText: undefined, text: undefined, …}
 
🎨 [TiptapIssueHighlighter] Finding position for: "Incorrect font size..."
    ⚪ No pmPosition, using legacy search
    ⚪ Document-level issue, no text to highlight
 ⚠️ No position found for issue: {id: 'issue-phb6v-1', title: 'Incorrect font size', category: 'formatting', highlightText: undefined, text: undefined, …}
 
🎨 [TiptapIssueHighlighter] Finding position for: "Incomplete title page..."
    ⚪ No pmPosition, using legacy search
 ⚠️ No position found for issue: {id: 'issue-9bxnml-2', title: 'Incomplete title page', category: 'structure', highlightText: undefined, text: undefined, …}
 
🎨 [TiptapIssueHighlighter] Finding position for: "Journal name not italicized..."
    ⚪ No pmPosition, using legacy search
 
🎨 [TiptapIssueHighlighter] Finding position for: "Orphaned reference..."
    📍 Has pmPosition: from=5946, to=6046
    ✅ pmPosition valid, text: "Brown, L. (2021). Academic eng..."
 
🎨 [TiptapIssueHighlighter] Finding position for: "Orphaned reference..."
    📍 Has pmPosition: from=6171, to=6271
    ✅ pmPosition valid, text: "Davis, K., & Brown, P. (2018)...."
 
🎨 [TiptapIssueHighlighter] Finding position for: "Orphaned reference..."
    📍 Has pmPosition: from=6411, to=6511
    ✅ pmPosition valid, text: "Johnson, A. (2020). Measuring ..."
 
🎨 [TiptapIssueHighlighter] Finding position for: "Missing running head (professional paper..."
    ⚪ No pmPosition, using legacy search
 ⚠️ No position found for issue: {id: 'issue-63pch6-7', title: 'Missing running head (professional paper)', category: 'headers', highlightText: undefined, text: undefined, …}
 
🎨 [TiptapIssueHighlighter] Finding position for: "Missing page numbers..."
    ⚪ No pmPosition, using legacy search
 ⚠️ No position found for issue: {id: 'issue-721j4m-8', title: 'Missing page numbers', category: 'headers', highlightText: undefined, text: undefined, …}
 
🎨 [TiptapIssueHighlighter] Finding position for: "Number at sentence beginning..."
    📍 Has pmPosition: from=1492, to=1542
    ✅ pmPosition valid, text: ". 45). The current study aims ..."
 
🎨 [TiptapIssueHighlighter] Finding position for: "Number at sentence beginning..."
    📍 Has pmPosition: from=2585, to=2592
    ✅ pmPosition valid, text: ". 123)...."
 
🎨 [TiptapIssueHighlighter] Finding position for: "ALL CAPS heading detected..."
    📍 Has pmPosition: from=490, to=498
    ✅ pmPosition valid, text: "ABSTRACT..."
 
🎨 [TiptapIssueHighlighter] Finding position for: "ALL CAPS heading detected..."
    📍 Has pmPosition: from=1175, to=1187
    ✅ pmPosition valid, text: "INTRODUCTION..."
 
🎨 [TiptapIssueHighlighter] Finding position for: "ALL CAPS heading detected..."
    ⚪ No pmPosition, using legacy search
 🔍 Paragraph search failed: para 9/48, text: "According to recent statistics, the average college student ", search: "LITERATURE REVIEW
SOCIAL MEDIA USAGE PAT"
 🔍 Paragraph search failed: para 9/48, text: "According to recent statistics, the average college student ", search: "LITERATURE REVIEW"
 🔍 Paragraph search failed: para 9/48, text: "According to recent statistics, the average college student ", search: "LITERATURE REVIEW"
 
🎨 [TiptapIssueHighlighter] Finding position for: "ALL CAPS heading detected..."
    📍 Has pmPosition: from=2594, to=2625
    ✅ pmPosition valid, text: "ACADEMIC PERFORMANCE INDICATOR..."
 
🎨 [TiptapIssueHighlighter] Finding position for: "ALL CAPS heading detected..."
    📍 Has pmPosition: from=3149, to=3160
    ✅ pmPosition valid, text: "METHODOLOGY..."
 
🎨 [TiptapIssueHighlighter] Finding position for: "ALL CAPS heading detected..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=3696, to=3703
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "RESULTS..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "ALL CAPS heading detected..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=4298, to=4308
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "DISCUSSION..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "ALL CAPS heading detected..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=4859, to=4871
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "IMPLICATIONS..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "ALL CAPS heading detected..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=5402, to=5412
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "CONCLUSION..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "ALL CAPS heading detected..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=5820, to=5830
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "REFERENCES..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Citations on title page..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:288 ⚠️ No position found for issue: {id: 'issue-6dpcvc-21', title: 'Citations on title page', category: 'structure', highlightText: undefined, text: undefined, …}
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Incorrect connector in parenthetical cit..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=850, to=878
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "(Johnson and Williams, 2019)..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Missing comma in citation..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=1370, to=1382
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "(Smith 2020)..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Incorrect connector in parenthetical cit..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=1467, to=1497
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "(Davis and Brown, 2018, p. 45)..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Incorrect connector in parenthetical cit..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=2559, to=2591
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "(Wilson and Davis, 2020, p. 12..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Incorrect connector in parenthetical cit..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=3123, to=3146
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "(White and Green, 2020)..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Incorrect connector in parenthetical cit..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=4551, to=4574
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "(Clark and Adams, 2019)..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Incorrect connector in parenthetical cit..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=5376, to=5399
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "(Evans and Moore, 2020)..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Missing DOI or URL..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Missing DOI or URL..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Missing DOI or URL..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Same author references not in chronologi..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:101 🔍 Document search failed: "2020 comes before 2019", checked 48 blocks, 70 text nodes
src\utils\tiptapIssueHighlighter.js:101 🔍 Document search failed: "2020 comes before 2019", checked 48 blocks, 70 text nodes
src\utils\tiptapIssueHighlighter.js:214 🔍 DEBUG: Failed to find text for issue "Same author references not in chronological order" {searchText: '2020 comes before 2019', firstLineText: '2020 comes before 2019', hasNewlines: false, paragraphIndex: undefined, documentSampleBlocks: Array(10)}
src\utils\tiptapIssueHighlighter.js:288 ⚠️ No position found for issue: {id: 'issue-cvbtvq-32', title: 'Same author references not in chronological order', category: 'references', highlightText: undefined, text: '2020 comes before 2019', …}
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Volume number not italicized..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Hyphen instead of en dash in page range..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Missing DOI or URL in journal article..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Incorrect connector in reference..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=6052, to=6169
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "Clark, R., and Adams, S. (2019..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Incorrect connector in reference..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=6530, to=6652
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "Johnson, A., and Williams, R. ..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Incorrect connector in reference..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=6654, to=6807
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "Miller, C., Thompson, D., and ..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Statistical symbol 'p' not italicized..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Statistical symbol 'r' not italicized..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Statistical symbol 'M' not italicized..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Statistical symbol 'SD' not italicized..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Single digit not spelled out..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Single digit not spelled out..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Single digit not spelled out..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Missing serial comma..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Undefined abbreviation..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Undefined abbreviation..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Potential Level 5 heading case error..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Level 5 heading not indented..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:327 
╔═══════════════════════════════════════════════════════╗
src\utils\tiptapIssueHighlighter.js:328 ║  📊 [TiptapIssueHighlighter] DECORATION SUMMARY      ║
src\utils\tiptapIssueHighlighter.js:329 ╚═══════════════════════════════════════════════════════╝
src\utils\tiptapIssueHighlighter.js:330 ✅ Issues with positions: 44
src\utils\tiptapIssueHighlighter.js:331 ❌ Issues without positions: 7
src\utils\tiptapIssueHighlighter.js:332 🎨 Total decorations created: 64
src\utils\tiptapIssueHighlighter.js:333 ═══════════════════════════════════════════════════════

src\hooks\useIssueDecorations.js:29 🎨 Updated decorations for 51 issues
src\utils\indexedDBManager.js:98 💾 Saved to IndexedDB: b9488543-0e73-46b1-b3bf-c25bb3af42cd {size: 65428, timestamp: '2025-10-03T19:59:08.931Z'}
src\hooks\useAutoSave.js:46 💾 Auto-saved to IndexedDB
src\hooks\useAutoSave.js:60 ✅ Auto-saved to Supabase
