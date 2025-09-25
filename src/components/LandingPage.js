'use client';

import { useState } from 'react';
import { CheckCircle, FileText, Zap, Shield, ArrowRight } from 'lucide-react';
import AuthModal from './AuthModal';

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin');

  const openAuth = (mode = 'signin') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const features = [
    {
      icon: <FileText className="h-8 w-8 text-blue-600" />,
      title: "APA 7th Edition Compliance",
      description: "Comprehensive validation against the latest APA guidelines with real-time feedback"
    },
    {
      icon: <Zap className="h-8 w-8 text-green-600" />,
      title: "Intelligent Analysis",
      description: "Advanced AI-powered checking for citations, references, formatting, and style"
    },
    {
      icon: <CheckCircle className="h-8 w-8 text-purple-600" />,
      title: "One-Click Fixes",
      description: "Automatically apply fixes for common APA formatting issues with a single click"
    },
    {
      icon: <Shield className="h-8 w-8 text-orange-600" />,
      title: "Secure Document Processing",
      description: "Your documents are processed securely with end-to-end encryption and privacy protection"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="px-4 py-6">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">APA Checker</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => openAuth('signin')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => openAuth('signup')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Perfect Your
            <span className="text-blue-600"> APA Style</span>
            <br />
            Documents
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Upload your academic documents and get comprehensive APA 7th edition compliance checking
            with intelligent analysis, real-time highlighting, and automatic fixes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => openAuth('signup')}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold flex items-center justify-center space-x-2"
            >
              <span>Start Checking Documents</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => openAuth('signin')}
              className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors text-lg font-semibold"
            >
              Sign In to Your Account
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Benefits Section */}
        <div className="bg-white rounded-2xl p-8 shadow-xl mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose Our APA Checker?
            </h2>
            <p className="text-xl text-gray-600">
              Save hours of manual formatting and ensure perfect compliance
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Upload Your Document</h3>
              <p className="text-gray-600">Simply drag and drop your .docx file or click to browse</p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Get Instant Analysis</h3>
              <p className="text-gray-600">Our AI analyzes your document against APA 7th edition guidelines</p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Apply Fixes Instantly</h3>
              <p className="text-gray-600">Click to apply automatic fixes and download your perfected document</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Perfect Your Documents?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of students and researchers who trust our APA checker
          </p>
          <button
            onClick={() => openAuth('signup')}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors text-lg font-semibold"
          >
            Create Your Free Account
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2024 APA Document Checker. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
    </div>
  );
}