import Link from "next/link";
import { FileCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-6 md:mb-0">
            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
              <FileCheck className="h-4 w-4 text-blue-400" />
            </div>
            <span className="text-xl font-bold">APA Pro</span>
          </div>
          <div className="flex space-x-6">
            <Link href="#" className="text-slate-400 hover:text-white">
              Privacy
            </Link>
            <Link href="#" className="text-slate-400 hover:text-white">
              Terms
            </Link>
            <Link href="#" className="text-slate-400 hover:text-white">
              Contact
            </Link>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-700 pt-8 text-center text-slate-500">
          <p>&copy; {new Date().getFullYear()} APA Pro. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
