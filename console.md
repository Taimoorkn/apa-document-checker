script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3000/dashboard {o: 'http://localhost:3000/dashboard', sv: '0.1.3', sdkn: '@vercel/analytics/react', sdkv: '1.5.0', ts: 1759519836442, …}
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3000/document/ef1d7e72-517a-48e1-b195-c94e252a7ef7 {o: 'http://localhost:3000/document/ef1d7e72-517a-48e1-b195-c94e252a7ef7', sv: '0.1.3', sdkn: '@vercel/analytics/react', sdkv: '1.5.0', ts: 1759519846483, …}
src\app\document\[id]\DocumentViewerClient.js:88 ☁️ Loading from Supabase document_data (original version)
src\store\unifiedDocumentStore.js:229 ✅ Existing document loaded: Running headd - Copy (1).docx
src\app\document\[id]\DocumentViewerClient.js:118 ✅ Document loaded from Supabase
src\app\document\[id]\DocumentViewerClient.js:123 🧠 Running full APA analysis on frontend...
src\store\unifiedDocumentStore.js:253 🧠 Starting APA analysis (legacy method)... {force: true, hasDocument: true}
src\services\DocumentService.js:404 🔍 Full analysis document data: {textLength: 7484, htmlLength: 12608, hasFormatting: true, hasStructure: true, hasStyles: true, …}
src\utils\IncrementalAPAAnalyzer.js:41 🧠 Starting APA analysis (full)...
src\utils\IncrementalAPAAnalyzer.js:68 ✅ Analysis complete: 64 issues found in 2ms
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
src\utils\IncrementalAPAAnalyzer.js:68 ✅ Analysis complete: 64 issues found in 0ms
src\services\DocumentService.js:421 📊 Analysis results: {totalIssues: 50, bySeverity: {…}}
src\services\DocumentService.js:484 📝 Updating document issues: {totalIssues: 50, sampleIssue: {…}}
src\services\DocumentService.js:509 ✅ Document issues updated: {storedIssues: 50}
src\hooks\useUnifiedDocumentEditor.js:71 ✅ Editor created successfully
src\hooks\useAnalysis.js:128 ⏱️ [useAnalysis] Editor updated, debouncing analysis (8s)...
src\hooks\useAnalysis.js:118 🚀 [useAnalysis] Running immediate initial analysis (editor initialized)
src\hooks\useAnalysis.js:48 
╔═══════════════════════════════════════════════════════╗
src\hooks\useAnalysis.js:49 ║      🧠 [useAnalysis] ANALYSIS TRIGGERED             ║
src\hooks\useAnalysis.js:50 ╚═══════════════════════════════════════════════════════╝
src\utils\tiptapApaAnalyzer.js:37 
═══════════════════════════════════════════════════════
src\utils\tiptapApaAnalyzer.js:38 🔬 [TiptapAPAAnalyzer] ANALYSIS START
src\utils\tiptapApaAnalyzer.js:39 ═══════════════════════════════════════════════════════
src\utils\tiptapApaAnalyzer.js:57 📊 [TiptapAPAAnalyzer] Built paragraph map:
src\utils\tiptapApaAnalyzer.js:58    • Total Tiptap paragraphs: 48
src\utils\tiptapApaAnalyzer.js:59    • Document size: 7533 positions
src\utils\tiptapApaAnalyzer.js:70 📝 [TiptapAPAAnalyzer] Created document data for base analyzer
src\utils\enhancedApaAnalyzer.js:124 📊 Analyzing document: 7484 chars text, 15945 chars HTML, formatting: true, structure: true
src\utils\enhancedApaAnalyzer.js:156 📚 Using basic citation analysis for better coverage...
src\utils\enhancedApaAnalyzer.js:289 ✅ Analysis complete: 51 issues found
src\utils\tiptapApaAnalyzer.js:75 🔍 [TiptapAPAAnalyzer] Base analyzer results:
src\utils\tiptapApaAnalyzer.js:76    • Raw issues found: 51
src\utils\tiptapApaAnalyzer.js:78 
🎯 [TiptapAPAAnalyzer] POSITION ENRICHMENT PHASE
src\utils\tiptapApaAnalyzer.js:79 ───────────────────────────────────────────────────────
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 1: "Incorrect font family..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 2: "Incorrect font size..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 3: "Journal name not italicized..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 4: "Orphaned reference..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=41, charOffset=0, length=100
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=6653, nodeSize=155, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "Miller, C., Thompson, D., and Rodriguez, M. (2021)..."
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "Brown, L. (2021). Academic engagement in..."
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=5946, to=6046
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 5: "Orphaned reference..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=43, charOffset=0, length=100
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=6936, nodeSize=120, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "Smith, J. (2020). Social media research: Current t..."
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "Davis, K., & Brown, P. (2018). Social me..."
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=6171, to=6271
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 6: "Orphaned reference..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=45, charOffset=0, length=100
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=7166, nodeSize=117, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "Thompson, K., & Lee, M. (2019). Multitasking and a..."
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "Johnson, A. (2020). Measuring academic s..."
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=6411, to=6511
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 7: "Missing running head (professional paper..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 8: "Missing page numbers..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 9: "Number at sentence beginning..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=14, charOffset=303, length=50
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=2593, nodeSize=33, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "ACADEMIC PERFORMANCE INDICATORS"
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: ". 45). The current study aims to clarify..."
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=1492, to=1542
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 10: "Number at sentence beginning..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=19, charOffset=308, length=7
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=3175, nodeSize=221, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "The study included 250 undergraduate students (145..."
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: ". 123)."
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=2585, to=2592
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 11: "ALL CAPS heading detected..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=8, charOffset=483, length=8
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=1188, nodeSize=366, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "Social media has become an integral part of modern..."
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "ABSTRACT"
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=490, to=498
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 12: "ALL CAPS heading detected..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=12, charOffset=1166, length=12
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=2004, nodeSize=272, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "College students demonstrate distinct patterns in ..."
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "INTRODUCTION"
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=1175, to=1187
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 13: "ALL CAPS heading detected..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=15, charOffset=1945, length=45
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=2626, nodeSize=256, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "Academic performance is typically measured through..."
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "LITERATURE REVIEW
SOCIAL MEDIA USAGE PAT..."
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:139    ❌ Document search failed
src\utils\tiptapApaAnalyzer.js:143    ❌ No position found for this issue
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 14: "ALL CAPS heading detected..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=19, charOffset=2578, length=31
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=3175, nodeSize=221, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "The study included 250 undergraduate students (145..."
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "ACADEMIC PERFORMANCE INDICATORS"
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=2594, to=2625
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 15: "ALL CAPS heading detected..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=22, charOffset=3130, length=11
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=3695, nodeSize=9, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "RESULTS"
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "METHODOLOGY"
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=3149, to=3160
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 16: "ALL CAPS heading detected..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=27, charOffset=3672, length=7
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=4576, nodeSize=282, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "Several limitations should be noted. First, the st..."
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "RESULTS"
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=3696, to=3703
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 17: "ALL CAPS heading detected..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=30, charOffset=4271, length=10
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=5168, nodeSize=233, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "The results also suggest that not all social media..."
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "DISCUSSION"
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=4298, to=4308
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 18: "ALL CAPS heading detected..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=33, charOffset=4829, length=12
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=5819, nodeSize=12, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "REFERENCES"
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "IMPLICATIONS"
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=4859, to=4871
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 19: "ALL CAPS heading detected..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=36, charOffset=5369, length=10
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=6051, nodeSize=119, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "Clark, R., and Adams, S. (2019). Attention theory ..."
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "CONCLUSION"
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=5402, to=5412
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 20: "ALL CAPS heading detected..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=38, charOffset=5785, length=10
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=6294, nodeSize=116, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "Evans, J., & Moore, T. (2020). Educational uses of..."
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "REFERENCES"
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=5820, to=5830
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 21: "Citations on title page..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 22: "Incorrect connector in parenthetical cit..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=11, charOffset=350, length=28
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=1975, nodeSize=29, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "SOCIAL MEDIA USAGE PATTERNS"
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "(Johnson and Williams, 2019)"
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=850, to=878
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 23: "Missing comma in citation..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=14, charOffset=181, length=12
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=2593, nodeSize=33, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "ACADEMIC PERFORMANCE INDICATORS"
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "(Smith 2020)"
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=1370, to=1382
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 24: "Incorrect connector in parenthetical cit..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=14, charOffset=278, length=30
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=2593, nodeSize=33, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "ACADEMIC PERFORMANCE INDICATORS"
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "(Davis and Brown, 2018, p. 45)"
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=1467, to=1497
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 25: "Incorrect connector in parenthetical cit..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=19, charOffset=282, length=32
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=3175, nodeSize=221, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "The study included 250 undergraduate students (145..."
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "(Wilson and Davis, 2020, p. 123)"
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=2559, to=2591
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 26: "Incorrect connector in parenthetical cit..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=22, charOffset=240, length=23
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=3695, nodeSize=9, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "RESULTS"
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "(White and Green, 2020)"
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=3123, to=3146
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 27: "Incorrect connector in parenthetical cit..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=32, charOffset=241, length=23
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=5413, nodeSize=406, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "This study contributes to the growing body of lite..."
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "(Clark and Adams, 2019)"
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=4551, to=4574
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 28: "Incorrect connector in parenthetical cit..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=36, charOffset=207, length=23
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=6051, nodeSize=119, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "Clark, R., and Adams, S. (2019). Attention theory ..."
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "(Evans and Moore, 2020)"
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=5376, to=5399
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 29: "Missing DOI or URL..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 30: "Missing DOI or URL..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 31: "Missing DOI or URL..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 32: "Same author references not in chronologi..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 33: "Volume number not italicized..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 34: "Hyphen instead of en dash in page range..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 35: "Missing DOI or URL in journal article..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 36: "Incorrect connector in reference..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=40, charOffset=0, length=117
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=6529, nodeSize=124, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "Johnson, A., and Williams, R. (2019). Digital nati..."
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "Clark, R., and Adams, S. (2019). Attenti..."
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=6052, to=6169
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 37: "Incorrect connector in reference..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=44, charOffset=0, length=122
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=7056, nodeSize=110, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "Taylor, R. (2019). Assessment methods in education..."
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "Johnson, A., and Williams, R. (2019). Di..."
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=6530, to=6652
src\utils\tiptapApaAnalyzer.js:97 
🔹 Issue 38: "Incorrect connector in reference..."
src\utils\tiptapApaAnalyzer.js:98    Location: paragraphIndex=45, charOffset=0, length=153
src\utils\tiptapApaAnalyzer.js:103    Found paragraph: pos=7166, nodeSize=117, type=paragraph
src\utils\tiptapApaAnalyzer.js:104    Paragraph text: "Thompson, K., & Lee, M. (2019). Multitasking and a..."
src\utils\tiptapApaAnalyzer.js:110    🔍 Searching within paragraph for: "Miller, C., Thompson, D., and Rodriguez,..."
src\utils\tiptapApaAnalyzer.js:120    ⚠️ Text not found in expected paragraph
src\utils\tiptapApaAnalyzer.js:129    🔍 Falling back to document-wide search...
src\utils\tiptapApaAnalyzer.js:132    ✅ Found via document search: from=6654, to=6807
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 39: "Statistical symbol 'p' not italicized..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 40: "Statistical symbol 'r' not italicized..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 41: "Statistical symbol 'M' not italicized..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 42: "Statistical symbol 'SD' not italicized..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 43: "Single digit not spelled out..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 44: "Single digit not spelled out..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 45: "Single digit not spelled out..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 46: "Missing serial comma..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 47: "Undefined abbreviation..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 48: "Undefined abbreviation..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 49: "Level 5 heading not indented..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 50: "Potential Level 5 heading case error..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:90 ⚪ Issue 51: "Level 5 heading not indented..." - Document-level (no position)
src\utils\tiptapApaAnalyzer.js:148 
═══════════════════════════════════════════════════════
src\utils\tiptapApaAnalyzer.js:149 📊 [TiptapAPAAnalyzer] ANALYSIS COMPLETE
src\utils\tiptapApaAnalyzer.js:150 ═══════════════════════════════════════════════════════
src\utils\tiptapApaAnalyzer.js:151 Total issues: 51
src\utils\tiptapApaAnalyzer.js:152 ✅ Position calculated: 0
src\utils\tiptapApaAnalyzer.js:153 🔍 Paragraph search used: 0
src\utils\tiptapApaAnalyzer.js:154 🔍 Document search used: 24
src\utils\tiptapApaAnalyzer.js:155 ❌ No position found: 1
src\utils\tiptapApaAnalyzer.js:156 ═══════════════════════════════════════════════════════

src\hooks\useAnalysis.js:62 
📦 [useAnalysis] Updating state with 51 issues...
src\hooks\useAnalysis.js:77 ✅ [useAnalysis] DocumentModel updated with 51 issues
src\hooks\useAnalysis.js:80 ╔═══════════════════════════════════════════════════════╗
src\hooks\useAnalysis.js:81 ║      ✅ [useAnalysis] ANALYSIS COMPLETE              ║
src\hooks\useAnalysis.js:82 ╚═══════════════════════════════════════════════════════╝

src\utils\tiptapIssueHighlighter.js:254 
╔═══════════════════════════════════════════════════════╗
src\utils\tiptapIssueHighlighter.js:255 ║   🎨 [TiptapIssueHighlighter] CREATING DECORATIONS   ║
src\utils\tiptapIssueHighlighter.js:256 ╚═══════════════════════════════════════════════════════╝
src\utils\tiptapIssueHighlighter.js:257 Total issues to highlight: 51
src\utils\tiptapIssueHighlighter.js:258 Active issue ID: none
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Incorrect font family..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:139    ⚪ Document-level issue, no text to highlight
src\utils\tiptapIssueHighlighter.js:288 ⚠️ No position found for issue: {id: 'issue-pjbhe2-0', title: 'Incorrect font family', category: 'formatting', highlightText: undefined, text: undefined, …}
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Incorrect font size..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:139    ⚪ Document-level issue, no text to highlight
src\utils\tiptapIssueHighlighter.js:288 ⚠️ No position found for issue: {id: 'issue-phb6v-1', title: 'Incorrect font size', category: 'formatting', highlightText: undefined, text: undefined, …}
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Journal name not italicized..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Orphaned reference..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=5946, to=6046
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "Brown, L. (2021). Academic eng..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Orphaned reference..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=6171, to=6271
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "Davis, K., & Brown, P. (2018)...."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Orphaned reference..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=6411, to=6511
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "Johnson, A. (2020). Measuring ..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Missing running head (professional paper..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:288 ⚠️ No position found for issue: {id: 'issue-63pch6-6', title: 'Missing running head (professional paper)', category: 'headers', highlightText: undefined, text: undefined, …}
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Missing page numbers..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:288 ⚠️ No position found for issue: {id: 'issue-721j4m-7', title: 'Missing page numbers', category: 'headers', highlightText: undefined, text: undefined, …}
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Number at sentence beginning..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=1492, to=1542
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: ". 45). The current study aims ..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "Number at sentence beginning..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=2585, to=2592
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: ". 123)...."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "ALL CAPS heading detected..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=490, to=498
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "ABSTRACT..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "ALL CAPS heading detected..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=1175, to=1187
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "INTRODUCTION..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "ALL CAPS heading detected..."
src\utils\tiptapIssueHighlighter.js:132    ⚪ No pmPosition, using legacy search
src\utils\tiptapIssueHighlighter.js:52 🔍 Paragraph search failed: para 15/48, text: "Academic performance is typically measured through multiple ", search: "LITERATURE REVIEW
SOCIAL MEDIA USAGE PAT"
src\utils\tiptapIssueHighlighter.js:52 🔍 Paragraph search failed: para 15/48, text: "Academic performance is typically measured through multiple ", search: "LITERATURE REVIEW"
src\utils\tiptapIssueHighlighter.js:52 🔍 Paragraph search failed: para 15/48, text: "Academic performance is typically measured through multiple ", search: "LITERATURE REVIEW"
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "ALL CAPS heading detected..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=2594, to=2625
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "ACADEMIC PERFORMANCE INDICATOR..."
src\utils\tiptapIssueHighlighter.js:112 
🎨 [TiptapIssueHighlighter] Finding position for: "ALL CAPS heading detected..."
src\utils\tiptapIssueHighlighter.js:117    📍 Has pmPosition: from=3149, to=3160
src\utils\tiptapIssueHighlighter.js:122    ✅ pmPosition valid, text: "METHODOLOGY..."
src\utils\tiptapIssueHighlighter.js:112 
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
src\utils\tiptapIssueHighlighter.js:288 ⚠️ No position found for issue: {id: 'issue-6dpcvc-20', title: 'Citations on title page', category: 'structure', highlightText: undefined, text: undefined, …}
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
src\utils\tiptapIssueHighlighter.js:288 ⚠️ No position found for issue: {id: 'issue-cvbtvq-31', title: 'Same author references not in chronological order', category: 'references', highlightText: undefined, text: '2020 comes before 2019', …}
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
🎨 [TiptapIssueHighlighter] Finding position for: "Level 5 heading not indented..."
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
src\utils\tiptapIssueHighlighter.js:330 ✅ Issues with positions: 45
src\utils\tiptapIssueHighlighter.js:331 ❌ Issues without positions: 6
src\utils\tiptapIssueHighlighter.js:332 🎨 Total decorations created: 68
src\utils\tiptapIssueHighlighter.js:333 ═══════════════════════════════════════════════════════

src\hooks\useIssueDecorations.js:29 🎨 Updated decorations for 51 issues
src\utils\indexedDBManager.js:98 💾 Saved to IndexedDB: ef1d7e72-517a-48e1-b195-c94e252a7ef7 {size: 65428, timestamp: '2025-10-03T19:30:53.226Z'}
src\hooks\useAutoSave.js:46 💾 Auto-saved to IndexedDB
src\hooks\useAutoSave.js:60 ✅ Auto-saved to Supabase
