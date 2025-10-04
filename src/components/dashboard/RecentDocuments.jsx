'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function RecentDocuments({ documents, onDelete }) {
  const router = useRouter();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusInfo = (status) => {
    const styles = {
      uploaded: { bg: 'bg-slate-100', text: 'text-slate-600', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
      processing: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
      completed: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
      failed: { bg: 'bg-red-100', text: 'text-red-700', icon: <AlertTriangle className="w-4 h-4" /> },
    };
    return styles[status] || styles.uploaded;
  };

  return (
    <Card className="shadow-lg border-none">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-slate-800">Recent Documents</CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold">No Documents Yet</h3>
            <p>Upload your first document to see it here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const statusInfo = getStatusInfo(doc.status);
              return (
                <div
                  key={doc.id}
                  className="grid grid-cols-6 items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors duration-200 cursor-pointer"
                  onClick={() => router.push(`/document/${doc.id}`)}
                >
                  <div className="col-span-3 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{doc.filename}</p>
                      <p className="text-sm text-slate-500">{formatDate(doc.created_at)}</p>
                    </div>
                  </div>

                  <div className="text-sm text-slate-500 text-center">{formatFileSize(doc.file_size)}</div>

                  <div className="flex justify-center">
                    <div className={`flex items-center gap-2 ${statusInfo.bg} ${statusInfo.text} text-xs py-1 px-3 rounded-full bottom-0`}>
                      {statusInfo.icon}
                      <span>{doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-9 h-9 text-slate-500 hover:text-red-600 hover:bg-red-100"
                      onClick={() => onDelete(doc.id, doc.file_path)}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}