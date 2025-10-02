'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, FilePlus2 } from "lucide-react";
import { useRef } from "react";
import { useDropzone } from 'react-dropzone';

export function UploadSection({ onFileUpload, uploading }) {
  const fileInputRef = useRef(null);

  const onDrop = (acceptedFiles) => {
    if (onFileUpload && acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: false,
    disabled: uploading,
  });

  return (
    <Card 
      {...getRootProps()} 
      className={`border-2 border-dashed transition-colors duration-300 h-full flex items-center justify-center ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'}`}>
      <input {...getInputProps()} ref={fileInputRef} />
      <CardContent className="p-8 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors duration-300 ${isDragActive ? 'bg-blue-100' : 'bg-slate-100'}`}>
            <UploadCloud className={`w-10 h-10 transition-colors duration-300 ${isDragActive ? 'text-blue-600' : 'text-slate-500'}`} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {isDragActive ? "Drop it here!" : "Upload New Document"}
            </h3>
            <p className="text-slate-500 mb-4">
              Drag & drop or click to select a DOCX file.
            </p>
          </div>
          <Button
            type="button"
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <FilePlus2 className="w-5 h-5" />
            {uploading ? 'Uploading...' : 'Choose File'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}