import Link from "next/link";
import { FileCheck, Github, Twitter, Linkedin, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-t border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileCheck className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold">APA Pro</span>
            </div>
            <p className="text-slate-400 leading-relaxed max-w-md mb-6">
              Professional APA 7th edition document analysis and compliance checking.
              Elevate your academic writing with intelligent formatting insights.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors group">
                <Twitter className="h-4 w-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors group">
                <Github className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors group">
                <Linkedin className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </a>
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/#features" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="text-slate-400 hover:text-white transition-colors text-sm">
                  How it Works
                </Link>
              </li>
              <li>
                <Link href="/editor" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Editor
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link href="#" className="text-slate-400 hover:text-white transition-colors text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="#" className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  Contact
                </Link>
              </li>
              <li>
                <Link href="#" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-700/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} APA Pro. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-xs text-slate-500">
              <span>Built with precision for academic excellence</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
