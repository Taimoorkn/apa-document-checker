'use client';

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { FileSearch, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AnalysisLoadingSkeleton({
  message = "Analyzing document for APA compliance...",
  fileName = "document.docx"
}) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <Card className="max-w-2xl w-full p-8 border-slate-200 shadow-lg">
        <div className="text-center space-y-6">
          {/* Animated Icon */}
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full opacity-20 animate-ping"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <FileSearch className="h-10 w-10 text-white animate-pulse" />
            </div>
          </div>

          {/* Main Message */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">{message}</h2>
            <p className="text-slate-600">Processing: <span className="font-semibold">{fileName}</span></p>
          </div>

          {/* Progress Steps */}
          <div className="space-y-3 py-6">
            <div className="flex items-center gap-3 text-left">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Document uploaded</p>
                <p className="text-xs text-slate-500">File received and validated</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-left">
              <div className="relative flex-shrink-0">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Analyzing content</p>
                <p className="text-xs text-slate-500">Checking citations, references, and formatting</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-left opacity-50">
              <AlertCircle className="h-5 w-5 text-slate-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Generating report</p>
                <p className="text-xs text-slate-500">Compiling issues and compliance score</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-pulse" style={{ width: '66%' }}></div>
          </div>

          <p className="text-sm text-slate-500">
            This may take a few moments for larger documents...
          </p>
        </div>
      </Card>
    </div>
  );
}
