'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '@/components/dashboard/Sidebar';
import Dashboard from '@/components/dashboard/Dashboard.jsx';

export default function DashboardClient({ user, initialDocuments }) {
  const router = useRouter();
  const supabase = createClient();
  const [documents, setDocuments] = useState(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.docx')) {
      setError('Please upload a .docx file');
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Upload to Supabase Storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record in database
      const { data: documentData, error: documentError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          filename: file.name,
          file_path: filePath,
          file_size: file.size,
          status: 'uploaded',
        })
        .select()
        .single();

      if (documentError) throw documentError;

      // Add to local state
      setDocuments([documentData, ...documents]);

      // Get current session to extract JWT token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      // Trigger processing on backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/process-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          documentId: documentData.id,
        }),
      });

      if (!response.ok) {
        console.error('Processing failed:', await response.text());
        throw new Error('Failed to process document');
      }

      // Redirect to document viewer to see processing results
      router.push(`/document/${documentData.id}`);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId, filePath) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('user-documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database (cascade will delete analysis_results)
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      // Update local state
      setDocuments(documents.filter((doc) => doc.id !== documentId));
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete document');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col">
        <Dashboard 
          user={user} 
          documents={documents} 
          onFileUpload={handleFileUpload} 
          uploading={uploading} 
          error={error} 
          onDelete={handleDelete} 
        />
      </div>
    </div>
  );
}