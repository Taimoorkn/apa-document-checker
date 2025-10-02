"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Plus } from "lucide-react";
import { useRef } from "react";

export function UploadSection({ onFileUpload, uploading }) {
  const fileInputRef = useRef(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
      <CardContent className="p-8">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Upload New Document</h3>
            <p className="text-muted-foreground mb-4">
              Click to browse or drag and drop your DOCX file here
            </p>
            <p className="text-sm text-muted-foreground">
              Supports .docx files up to 50MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            onChange={onFileUpload}
            disabled={uploading}
            className="hidden"
          />
          <Button
            className="gap-2"
            onClick={handleClick}
            disabled={uploading}
          >
            <Plus className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Choose File'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
