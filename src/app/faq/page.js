export const metadata = {
  title: 'Frequently Asked Questions - APA Document Checker',
  description: 'Get answers to common questions about APA 7th edition formatting, citations, references, and document validation. Complete guide for students and researchers.',
  keywords: [
    'APA FAQ',
    'APA 7th edition questions',
    'APA formatting help',
    'citation questions',
    'reference formatting',
    'academic writing help',
    'APA style guide',
    'document formatting FAQ'
  ],
};

const faqData = [
  {
    question: "What is APA 7th edition format?",
    answer: "APA 7th edition is the latest style guide published by the American Psychological Association. It provides guidelines for academic writing including paper formatting, in-text citations, reference lists, and overall document structure commonly used in psychology, education, and social sciences."
  },
  {
    question: "How do I format my paper in APA 7th edition?",
    answer: "APA 7th edition papers should use 12-point Times New Roman font, double-spacing throughout, 1-inch margins on all sides, and include a title page with your paper title, author name(s), institutional affiliation, and author note if required."
  },
  {
    question: "What's the difference between APA 6th and 7th edition?",
    answer: "Key changes in APA 7th edition include simplified headings format, bias-free language guidelines, updated in-text citation rules for multiple authors, new reference formats for digital sources, and updated title page requirements."
  },
  {
    question: "How do I cite sources with multiple authors in APA 7th edition?",
    answer: "For in-text citations: 1-2 authors use '&' (Smith & Jones, 2023), 3+ authors use first author followed by 'et al.' (Smith et al., 2023). In reference list, list up to 20 authors, then use ellipsis and final author name."
  },
  {
    question: "Do I need a running head in APA 7th edition?",
    answer: "Running heads are no longer required for student papers in APA 7th edition, but may still be required by your instructor or institution. Professional papers still require running heads."
  },
  {
    question: "How do I format headings in APA 7th edition?",
    answer: "APA 7th edition uses 5 heading levels: Level 1 (Centered, Bold, Title Case), Level 2 (Flush Left, Bold, Title Case), Level 3 (Flush Left, Bold Italic, Title Case), Level 4 (Indented, Bold, Title Case, Ending with Period), Level 5 (Indented, Bold Italic, Title Case, Ending with Period)."
  },
  {
    question: "What file formats does the APA Document Checker support?",
    answer: "Our APA Document Checker currently supports Microsoft Word documents (.docx format). We analyze the document's formatting, structure, citations, and references to provide comprehensive APA compliance feedback."
  },
  {
    question: "Is the APA Document Checker free to use?",
    answer: "Yes, our APA Document Checker is completely free to use. You can upload and analyze your documents without any cost or subscription requirements."
  },
  {
    question: "How accurate is the APA validation?",
    answer: "Our checker validates against official APA 7th edition guidelines and covers formatting, citations, references, document structure, and academic writing standards. While highly accurate, we recommend reviewing flagged issues and consulting the official APA manual for complex cases."
  },
  {
    question: "Can I use this tool for my thesis or dissertation?",
    answer: "Yes, our APA Document Checker is suitable for all academic documents including theses, dissertations, research papers, and essays. However, always check your institution's specific formatting requirements as they may have additional guidelines."
  }
];

const structuredFAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqData.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
};

export default function FAQ() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredFAQ)
        }}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <header className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get answers to common questions about APA 7th edition formatting and our document checker tool.
            </p>
          </header>

          <div className="space-y-6">
            {faqData.map((faq, index) => (
              <article key={index} className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  {faq.question}
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {faq.answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}