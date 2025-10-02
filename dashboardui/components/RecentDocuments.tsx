import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  FileText, 
  Image, 
  File, 
  Eye, 
  Download, 
  Trash2,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const recentDocuments = [
  {
    id: 1,
    name: "Transcript_Fall_2024.pdf",
    type: "PDF",
    size: "2.3 MB",
    uploadDate: "2 hours ago",
    category: "Academic",
    icon: FileText,
    color: "text-red-600"
  },
  {
    id: 2,
    name: "Student_ID_Card.jpg",
    type: "Image",
    size: "1.8 MB",
    uploadDate: "1 day ago",
    category: "Government ID",
    icon: Image,
    color: "text-green-600"
  },
  {
    id: 3,
    name: "Scholarship_Certificate.pdf",
    type: "PDF",
    size: "945 KB",
    uploadDate: "3 days ago",
    category: "Certificates",
    icon: FileText,
    color: "text-red-600"
  },
  {
    id: 4,
    name: "Course_Registration.docx",
    type: "Document",
    size: "1.2 MB",
    uploadDate: "5 days ago",
    category: "Academic",
    icon: File,
    color: "text-blue-600"
  },
  {
    id: 5,
    name: "Birth_Certificate.pdf",
    type: "PDF",
    size: "756 KB",
    uploadDate: "1 week ago",
    category: "Government ID",
    icon: FileText,
    color: "text-red-600"
  },
  {
    id: 6,
    name: "Internship_Offer.pdf",
    type: "PDF",
    size: "1.5 MB",
    uploadDate: "1 week ago",
    category: "Others",
    icon: FileText,
    color: "text-red-600"
  }
];

export function RecentDocuments() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Documents</CardTitle>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {recentDocuments.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <doc.icon className={`w-5 h-5 ${doc.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{doc.name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{doc.size}</span>
                  <span>•</span>
                  <span>{doc.uploadDate}</span>
                </div>
                <Badge variant="secondary" className="text-xs mt-1">
                  {doc.category}
                </Badge>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}