'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import {
  FileCheck,
  CheckCircle2,
  FileSearch,
  Sparkles,
  ArrowRight,
  Users,
  Globe,
  Shield,
  Zap,
  BookOpen,
  Award,
  ChevronRight
} from 'lucide-react';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-slate-900">APA Checker</span>
                <div className="text-xs text-slate-500 font-medium">7th Edition Validator</div>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 transition-colors">
                How It Works
              </a>
              <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition-colors">
                Pricing
              </a>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg shadow-emerald-500/25"
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-emerald-50/30 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium mb-8">
              <Award className="h-4 w-4" />
              <span>APA 7th Edition Compliant</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Perfect Your
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">
                APA Documents
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Get instant, comprehensive feedback on APA 7th edition compliance.
              Upload your DOCX files and receive detailed analysis with smart corrections.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center space-x-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-xl shadow-emerald-500/25 text-lg"
              >
                <span>Start Checking Documents</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center space-x-2 px-8 py-4 bg-white text-slate-700 font-semibold rounded-xl border border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 text-lg"
              >
                <span>Sign In</span>
              </Link>
            </div>

            {/* Hero Visual */}
            <div className="relative mx-auto max-w-4xl">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <div className="ml-4 text-sm text-slate-600 font-medium">Research_Paper.docx</div>
                  </div>
                </div>
                <div className="p-8 text-left">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-slate-700">Title page formatting validated</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-slate-700">Citation format verified</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-slate-700">Reference list organized alphabetically</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      </div>
                      <span className="text-slate-700">3 formatting suggestions available</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Everything You Need for APA Compliance
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Our comprehensive analysis covers all aspects of APA 7th edition guidelines
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-all duration-300">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileSearch className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Comprehensive Analysis
              </h3>
              <p className="text-slate-600">
                Citations, references, formatting, structure, and bias-free language validation
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-all duration-300">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Real-time Feedback
              </h3>
              <p className="text-slate-600">
                Instant validation as you edit with live issue highlighting and suggestions
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-all duration-300">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Smart Corrections
              </h3>
              <p className="text-slate-600">
                One-click fixes for common APA issues with context-aware suggestions
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-8 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-all duration-300">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Privacy Focused
              </h3>
              <p className="text-slate-600">
                Your documents are processed securely and never stored without permission
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-8 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-all duration-300">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BookOpen className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Educational Insights
              </h3>
              <p className="text-slate-600">
                Learn APA guidelines through detailed explanations and examples
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-8 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-all duration-300">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Globe className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Cloud Sync
              </h3>
              <p className="text-slate-600">
                Access your documents and analysis history from anywhere
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Simple 3-Step Process
            </h2>
            <p className="text-xl text-slate-600">
              Get professional APA validation in minutes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Upload Your Document
              </h3>
              <p className="text-slate-600">
                Drag and drop your DOCX file or click to browse. We support documents up to 10MB.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                AI-Powered Analysis
              </h3>
              <p className="text-slate-600">
                Our advanced algorithms check citations, references, formatting, and more against APA 7th edition.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Review & Apply Fixes
              </h3>
              <p className="text-slate-600">
                Review detailed feedback and apply suggested corrections with one-click fixes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-500 to-teal-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Perfect Your APA Documents?
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Join thousands of students and researchers who trust APA Checker for their academic work.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-emerald-600 font-semibold rounded-xl hover:bg-slate-50 transition-all duration-200 shadow-xl text-lg"
          >
            <span>Get Started Free</span>
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <FileCheck className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold text-white">APA Checker</span>
              </div>
              <p className="text-slate-400 mb-4">
                Professional APA 7th edition validation for students, researchers, and academics.
              </p>
              <div className="text-sm text-slate-500">
                © 2024 APA Checker. All rights reserved.
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <div className="space-y-2">
                <a href="#features" className="block text-slate-400 hover:text-white transition-colors">
                  Features
                </a>
                <a href="#pricing" className="block text-slate-400 hover:text-white transition-colors">
                  Pricing
                </a>
                <a href="/login" className="block text-slate-400 hover:text-white transition-colors">
                  Sign In
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <div className="space-y-2">
                <a href="/help" className="block text-slate-400 hover:text-white transition-colors">
                  Help Center
                </a>
                <a href="/contact" className="block text-slate-400 hover:text-white transition-colors">
                  Contact Us
                </a>
                <a href="/privacy" className="block text-slate-400 hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
