"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle2, Upload, AlertCircle } from "lucide-react";

export function DashboardOverview({ documents }) {
  // Calculate stats from documents
  const totalDocuments = documents.length;
  const completedDocuments = documents.filter(doc => doc.status === 'completed').length;
  const recentUploads = documents.filter(doc => {
    const uploadDate = new Date(doc.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return uploadDate >= weekAgo;
  }).length;

  const averageCompliance = documents.length > 0
    ? Math.round(
        documents
          .filter(doc => doc.compliance_score !== null)
          .reduce((sum, doc) => sum + (doc.compliance_score || 0), 0) /
        documents.filter(doc => doc.compliance_score !== null).length || 0
      )
    : 0;

  const stats = [
    {
      title: "Total Documents",
      value: totalDocuments.toString(),
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950"
    },
    {
      title: "Completed",
      value: completedDocuments.toString(),
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950"
    },
    {
      title: "Recent Uploads",
      value: recentUploads.toString(),
      icon: Upload,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950"
    },
    {
      title: "Avg Compliance",
      value: `${averageCompliance}%`,
      icon: AlertCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="p-6">
          <CardContent className="p-0">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-semibold">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
