# APA 7th Edition Document Checker

A professional web application that validates academic documents against APA 7th edition guidelines, providing real-time feedback and suggested fixes.

## Features

- **Document Upload**: Import .docx files for analysis
- **Real-Time Analysis**: Receive immediate feedback on APA compliance
- **Split-View Interface**: Document viewer and issues panel side-by-side
- **Interactive Feedback**: Navigate between document and issues with clickable elements
- **Categorized Issues**: Critical, Major, and Minor APA violations
- **Fix Suggestions**: One-click fixes for common APA issues
- **Document Statistics**: Word count and compliance score

## Technical Stack

- **Frontend Framework**: Next.js (JavaScript)
- **Styling**: Tailwind CSS with Typography plugin
- **Rendering**: Client-side for real-time document analysis
- **State Management**: Zustand
- **Document Processing**: Mammoth.js for .docx parsing

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the development server:
   ```
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Component Architecture

The application is built with the following core components:

- **DocumentViewer**: Displays the uploaded document with highlighted issues
- **IssuesPanel**: Shows categorized APA issues with fix options
- **Header**: Contains upload button, export option, and document stats

State management is handled through Zustand with the following stores:
- **documentStore**: Manages document content, analysis, and issues

## APA Rule Implementation

The application validates documents against the following APA 7th Edition guidelines:

### Citation Rules
- In-text citation format (Author, year)
- Parenthetical citations
- Multiple author handling rules
- Quote formatting and page numbers

### Reference List Rules
- Alphabetical ordering
- Author formatting
- Publication details for different source types

### Document Structure Rules
- Heading levels and formatting
- Abstract structure
- Title page elements
- Section organization

### Formatting Rules
- Font requirements (12pt Times New Roman)
- Double spacing
- Margins and indentation
- Page numbering

## License

MIT