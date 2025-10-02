import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Upload, Plus } from "lucide-react";

export function UploadSection() {
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
              Drag and drop your files here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              Supports PDF, DOC, DOCX, JPG, PNG up to 10MB
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Choose Files
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}