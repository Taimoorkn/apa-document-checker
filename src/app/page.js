'use client';
import Link from 'next/link';
import { FileTextIcon, CheckCircleIcon, ChartBarIcon, CloudArrowUpIcon } from '@phosphor-icons/react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileTextIcon size={32} weight="bold" className="text-emerald-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">APA Checker</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-700 hover:text-emerald-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 sm:text-6xl md:text-7xl">
            Perfect Your <span className="text-emerald-600">APA Format</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600">
            Upload your academic document and get instant APA 7th edition compliance analysis with actionable suggestions.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/signup"
              className="bg-emerald-600 text-white hover:bg-emerald-700 px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Get Started Free
            </Link>
            <Link
              href="/editor"
              className="bg-white text-emerald-600 hover:bg-emerald-50 px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg border-2 border-emerald-600"
            >
              Try Without Login
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Feature 1 */}
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-emerald-100">
            <div className="bg-emerald-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <CloudArrowUpIcon size={24} weight="bold" className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Instant Upload
            </h3>
            <p className="text-gray-600">
              Upload your .docx file and get results in seconds with our advanced processing engine.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-emerald-100">
            <div className="bg-emerald-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <CheckCircleIcon size={24} weight="bold" className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              APA 7th Compliance
            </h3>
            <p className="text-gray-600">
              Comprehensive validation against all APA 7th edition formatting guidelines and rules.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-emerald-100">
            <div className="bg-emerald-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <ChartBarIcon size={24} weight="bold" className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Compliance Score
            </h3>
            <p className="text-gray-600">
              Get a detailed compliance score with categorized issues and severity levels.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-emerald-100">
            <div className="bg-emerald-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <FileTextIcon size={24} weight="bold" className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Save & Track
            </h3>
            <p className="text-gray-600">
              Save your documents, track revisions, and monitor compliance improvements over time.
            </p>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-emerald-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Document</h3>
              <p className="text-gray-600">
                Upload your Word document (.docx) to our secure platform.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-emerald-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Get Analysis</h3>
              <p className="text-gray-600">
                Our AI analyzes your document against APA 7th edition standards.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-emerald-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Fix Issues</h3>
              <p className="text-gray-600">
                Review issues with severity levels and apply suggested fixes.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl shadow-xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Perfect Your APA Formatting?
          </h2>
          <p className="text-emerald-100 text-lg mb-8 max-w-2xl mx-auto">
            Join students and researchers who trust APA Checker for accurate, comprehensive document analysis.
          </p>
          <Link
            href="/signup"
            className="bg-white text-emerald-600 hover:bg-emerald-50 px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg inline-block"
          >
            Create Free Account
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-emerald-100 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-600">
            &copy; 2025 APA Checker. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
