"use client";
import Link from "next/link";
import { useState } from "react";
import {
  FileCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Zap,
  BookOpen,
  Award,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import DisclaimerModal from "@/components/DisclaimerModal";

const FeatureCard = ({ icon, title, children, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true }}
    className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300"
  >
    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl flex items-center justify-center mb-6">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-slate-800 mb-3">{title}</h3>
    <p className="text-slate-500 leading-relaxed">{children}</p>
  </motion.div>
);

const Step = ({ number, title, children, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true }}
    className="text-center"
  >
    <div className="relative mb-6">
      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto flex items-center justify-center shadow-lg">
        <span className="text-2xl font-bold text-white">{number}</span>
      </div>
    </div>
    <h3 className="text-2xl font-bold text-slate-800 mb-3">{title}</h3>
    <p className="text-slate-500 max-w-xs mx-auto">{children}</p>
  </motion.div>
);

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Disclaimer Modal - Shows once for new visitors */}
      <DisclaimerModal />

      {/* Hero Section */}
      <main>
        <section className="relative pt-24 pb-32">
          <div className="absolute inset-0 bg-gradient-to-b from-white to-slate-100"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold mb-8">
                <Award className="h-5 w-5" />
                <span>APA 7th Edition Compliant</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 leading-tight">
                Flawless APA Formatting,
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-700 mt-2">
                  Instantly.
                </span>
              </h1>

              <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                Upload your DOCX file and let our AI-powered engine identify and
                help you fix every APA 7th edition formatting error.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold rounded-xl hover:shadow-lg transition-shadow duration-300 text-lg"
                >
                  <span>Analyze Your Document</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center space-x-2 px-8 py-4 bg-white text-slate-700 font-semibold rounded-xl border border-slate-300 hover:border-slate-400 hover:bg-slate-100 transition-all duration-200 text-lg"
                >
                  <span>Try the Editor</span>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative mx-auto max-w-4xl mt-20"
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
                <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="text-sm text-slate-600 font-medium">
                    document_final_draft.docx
                  </div>
                  <div className="w-12"></div>
                </div>
                <div className="p-8 text-left">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4">
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-slate-800">
                          Title Page
                        </h4>
                        <p className="text-slate-500">
                          Formatting validated and compliant.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-slate-800">
                          In-text Citations
                        </h4>
                        <p className="text-slate-500">
                          All 47 citations verified against reference list.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">
                          Reference List
                        </h4>
                        <p className="text-slate-500">
                          3 formatting suggestions available.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
                The Ultimate APA Toolkit
              </h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                Go beyond basic spell-checking. Our AI understands the nuances
                of academic writing and APA guidelines.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Zap className="h-6 w-6" />}
                title="Comprehensive Analysis"
                delay={0.1}
              >
                From title page to references, we check every detail:
                citations, formatting, structure, and bias-free language.
              </FeatureCard>
              <FeatureCard
                icon={<Sparkles className="h-6 w-6" />}
                title="Smart Corrections"
                delay={0.2}
              >
                Get one-click fixes for common APA errors and receive
                context-aware suggestions for more complex issues.
              </FeatureCard>
              <FeatureCard
                icon={<BookOpen className="h-6 w-6" />}
                title="Educational Insights"
                delay={0.3}
              >
                Learn as you go. Each suggestion is linked to detailed
                explanations and official APA guidelines.
              </FeatureCard>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
                Get Feedback in Three Simple Steps
              </h2>
              <p className="text-lg text-slate-600">
                Our streamlined process makes APA compliance effortless.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12 relative">
              {/* Dashed Line Connector */}
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-px -translate-y-20">
                <svg
                  width="100%"
                  height="100%"
                  className="text-slate-300"
                >
                  <line
                    x1="0"
                    y1="50%"
                    x2="100%"
                    y2="50%"
                    strokeWidth="2"
                    strokeDasharray="8, 8"
                  />
                </svg>
              </div>

              <Step number="1" title="Upload Document" delay={0.1}>
                Securely drag and drop or select your DOCX file. Your work is
                always private and protected.
              </Step>
              <Step number="2" title="Instant Analysis" delay={0.3}>
                Our AI scans your document in seconds, cross-referencing every
                line with APA 7th edition rules.
              </Step>
              <Step number="3" title="Review & Correct" delay={0.5}>
                Explore the interactive report, understand the issues, and
                apply one-click fixes.
              </Step>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-br from-blue-600 to-indigo-700">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
              Ready to Elevate Your Writing?
            </h2>
            <p className="text-xl text-blue-100 mb-10">
              Stop worrying about formatting and focus on your ideas. Get
              started for free today.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-slate-100 transition-colors duration-300 shadow-2xl text-lg"
            >
              <span>Sign Up and Start Checking</span>
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}