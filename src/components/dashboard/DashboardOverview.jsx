'use client';

import { Card } from "@/components/ui/card";
import { FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export function DashboardOverview({ documents }) {
  // Calculate stats from documents
  const totalDocuments = documents.length;
  const completedDocuments = documents.filter(doc => doc.status === 'completed').length;
  const processingDocuments = documents.filter(doc => doc.status === 'processing').length;

  const averageCompliance = documents.length > 0
    ? Math.round(
        documents
          .filter(doc => doc.compliance_score !== null)
          .reduce((sum, doc) => sum + (doc.compliance_score || 0), 0) /
        (documents.filter(doc => doc.compliance_score !== null).length || 1)
      )
    : 0;

  const stats = [
    {
      title: "Total Documents",
      value: totalDocuments.toString(),
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Completed Analyses",
      value: completedDocuments.toString(),
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Processing Now",
      value: processingDocuments.toString(),
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      title: "Average Score",
      value: `${averageCompliance}%`,
      icon: AlertCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="p-6 border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center gap-5">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${stat.bgColor}`}>
              <stat.icon className={`w-7 h-7 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-sm font-medium text-slate-500">{stat.title}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}