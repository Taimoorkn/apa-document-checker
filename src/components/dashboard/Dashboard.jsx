'use client';

import { DashboardHeader } from './DashboardHeader';
import { DashboardOverview } from './DashboardOverview';
import { UploadSection } from './UploadSection';
import { RecentDocuments } from './RecentDocuments';

export default function Dashboard({ user, documents, onFileUpload, uploading, error, onDelete }) {
  return (
    <main className="flex-1 p-6 sm:p-8 space-y-8">
      <DashboardHeader user={user} />
      
      <div className="space-y-8">
        <DashboardOverview documents={documents} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <RecentDocuments documents={documents} onDelete={onDelete} />
          </div>
          <div className="lg:col-span-1">
            <UploadSection onFileUpload={onFileUpload} uploading={uploading} />
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg text-sm">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}
      </div>
    </main>
  );
}
