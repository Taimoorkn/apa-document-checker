'use client';
import Link from 'next/link';
import { FileTextIcon, CheckCircleIcon, ChartBarIcon, CloudArrowUpIcon } from '@phosphor-icons/react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation - 60% white, minimal emerald accent */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                <FileTextIcon size={20} weight="bold" className="text-white" />
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">APA Checker</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - 60% white space, 30% gray text, 10% emerald accent */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <div className="inline-block mb-4 px-4 py-2 bg-gray-100 rounded-full">
            <span className="text-sm font-medium text-gray-700">APA 7th Edition Compliance</span>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 sm:text-6xl md:text-7xl mb-6">
            Perfect Your Academic<br/>
            <span className="text-emerald-600">Document Formatting</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600 leading-relaxed">
            Upload your Word document and get instant APA compliance analysis with actionable suggestions to fix formatting issues.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/signup"
              className="bg-emerald-600 text-white hover:bg-emerald-700 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200"
            >
              Get Started Free
            </Link>
            <Link
              href="/editor"
              className="bg-gray-100 text-gray-900 hover:bg-gray-200 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200"
            >
              Try Without Login
            </Link>
          </div>
        </div>

        {/* Features Grid - Gray background for 30%, emerald icons for 10% */}
        <div className="mt-24 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Feature 1 */}
          <div className="bg-gray-50 p-6 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 bg-emerald-600">
              <CloudArrowUpIcon size={24} weight="bold" className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Instant Upload
            </h3>
            <p className="text-gray-600 text-sm">
              Upload your .docx file and get results in seconds with our advanced processing engine.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-gray-50 p-6 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 bg-emerald-600">
              <CheckCircleIcon size={24} weight="bold" className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              APA 7th Compliance
            </h3>
            <p className="text-gray-600 text-sm">
              Comprehensive validation against all APA 7th edition formatting guidelines and rules.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-gray-50 p-6 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 bg-emerald-600">
              <ChartBarIcon size={24} weight="bold" className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Compliance Score
            </h3>
            <p className="text-gray-600 text-sm">
              Get a detailed compliance score with categorized issues and severity levels.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-gray-50 p-6 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 bg-emerald-600">
              <FileTextIcon size={24} weight="bold" className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Save & Track
            </h3>
            <p className="text-gray-600 text-sm">
              Save your documents, track revisions, and monitor compliance improvements over time.
            </p>
          </div>
        </div>

        {/* How It Works Section - Gray background for 30% */}
        <div className="mt-32 bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="bg-emerald-600 text-white w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold shadow-lg">
                  1
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Upload Document</h3>
                <p className="text-gray-600">
                  Upload your Word document (.docx) to our secure platform.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-emerald-600 text-white w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold shadow-lg">
                  2
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Get Analysis</h3>
                <p className="text-gray-600">
                  Our analyzer checks your document against APA 7th edition standards.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-emerald-600 text-white w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold shadow-lg">
                  3
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Fix Issues</h3>
                <p className="text-gray-600">
                  Review issues with severity levels and apply suggested fixes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section - Emerald accent only for button */}
        <div className="mt-32 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Perfect Your APA Formatting?
          </h2>
          <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
            Join students and researchers who trust APA Checker for accurate, comprehensive document analysis.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-emerald-600 text-white hover:bg-emerald-700 px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
          >
            Create Free Account
          </Link>
        </div>
      </div>

      {/* Footer - Gray for 30% */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <FileTextIcon size={16} weight="bold" className="text-white" />
              </div>
              <span className="ml-2 text-lg font-bold text-gray-900">APA Checker</span>
            </div>
            <p className="text-gray-600">
              &copy; 2025 APA Checker. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
