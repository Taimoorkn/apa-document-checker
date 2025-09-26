'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  FileText,
  CheckCircle2,
  FileSearch,
  Sparkles,
  ArrowRight,
  Star,
  Users,
  Clock,
  Shield,
  Zap,
  BookOpen
} from 'lucide-react';

const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const features = [
    {
      icon: <CheckCircle2 className="h-6 w-6 text-emerald-500" />,
      title: "Real-time Feedback",
      description: "Get instant validation as you type and edit with advanced APA 7th edition compliance checking"
    },
    {
      icon: <FileSearch className="h-6 w-6 text-blue-500" />,
      title: "Comprehensive Analysis",
      description: "11 specialized validators covering citations, references, formatting, tables, and bias-free language"
    },
    {
      icon: <Sparkles className="h-6 w-6 text-amber-500" />,
      title: "Smart Corrections",
      description: "One-click fixes for common issues with intelligent text replacement and formatting corrections"
    },
    {
      icon: <Shield className="h-6 w-6 text-purple-500" />,
      title: "Secure & Private",
      description: "Your documents are processed securely with enterprise-grade encryption and privacy protection"
    },
    {
      icon: <Zap className="h-6 w-6 text-orange-500" />,
      title: "Lightning Fast",
      description: "Advanced XML processing and memory optimization for instant analysis of large documents"
    },
    {
      icon: <BookOpen className="h-6 w-6 text-teal-500" />,
      title: "Academic Standards",
      description: "Built specifically for APA 7th edition with comprehensive coverage of all formatting requirements"
    }
  ];

  const stats = [
    { number: "50,000+", label: "Documents Processed" },
    { number: "99.9%", label: "Accuracy Rate" },
    { number: "10s", label: "Average Analysis Time" },
    { number: "24/7", label: "Available Support" }
  ];

  const testimonials = [
    {
      name: "Dr. Sarah Chen",
      role: "Psychology Professor, Stanford University",
      content: "This tool has revolutionized how my students approach APA formatting. The real-time feedback helps them learn proper formatting as they write.",
      rating: 5
    },
    {
      name: "Michael Rodriguez",
      role: "Graduate Student, UCLA",
      content: "I've tried many APA checkers, but this one is by far the most comprehensive. It caught formatting issues I never would have noticed.",
      rating: 5
    },
    {
      name: "Dr. Jennifer Park",
      role: "Research Director, Johns Hopkins",
      content: "The citation validation and reference checking features are incredibly thorough. It's become an essential tool for our research team.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mr-3">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-slate-900">APA Checker Pro</span>
            </div>

            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all duration-200"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all duration-200"
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Perfect Your
              <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent"> APA Papers</span>
              <br />
              Every Time
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              The most comprehensive APA 7th edition compliance checker. Get instant feedback,
              smart corrections, and professional formatting for your academic documents.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              {!isAuthenticated ? (
                <>
                  <Link
                    href="/signup"
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg shadow-emerald-500/25"
                  >
                    Start Free Trial
                    <ArrowRight className="inline-block ml-2 h-5 w-5" />
                  </Link>
                  <button
                    onClick={() => setIsVideoModalOpen(true)}
                    className="bg-white text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-xl font-semibold text-lg hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
                  >
                    Watch Demo
                  </button>
                </>
              ) : (
                <Link
                  href="/dashboard"
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg shadow-emerald-500/25"
                >
                  Go to Dashboard
                  <ArrowRight className="inline-block ml-2 h-5 w-5" />
                </Link>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-slate-900 mb-1">{stat.number}</div>
                  <div className="text-slate-600 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Everything You Need for Perfect APA Formatting
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Our advanced AI-powered system analyzes every aspect of your document
              to ensure complete APA 7th edition compliance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-slate-50 rounded-2xl p-8 hover:shadow-lg transition-shadow duration-200">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Get professional APA formatting in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Upload Your Document</h3>
              <p className="text-slate-600">
                Simply drag and drop your DOCX file or browse to select it.
                We support documents up to 50MB in size.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Get Instant Analysis</h3>
              <p className="text-slate-600">
                Our 11 specialized validators analyze your document for comprehensive
                APA compliance across all formatting requirements.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Apply Smart Fixes</h3>
              <p className="text-slate-600">
                Review highlighted issues and apply one-click fixes to automatically
                correct formatting problems and download your perfect document.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Trusted by Academics Worldwide</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              See what professors, researchers, and students are saying about our APA checker
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-slate-50 rounded-2xl p-8">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-amber-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold text-slate-900">{testimonial.name}</div>
                  <div className="text-slate-600 text-sm">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-500 to-teal-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Perfect Your APA Documents?
          </h2>
          <p className="text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">
            Join thousands of students and researchers who trust our APA checker for their academic success.
          </p>

          {!isAuthenticated ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="bg-white text-emerald-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-50 transition-all duration-200"
              >
                Start Free Trial
                <ArrowRight className="inline-block ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-emerald-600 transition-all duration-200"
              >
                Sign In
              </Link>
            </div>
          ) : (
            <Link
              href="/dashboard"
              className="bg-white text-emerald-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-50 transition-all duration-200 inline-flex items-center"
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mr-3">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">APA Checker Pro</span>
            </div>

            <div className="text-slate-400 text-sm">
              © 2024 APA Checker Pro. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;