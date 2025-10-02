import { Card, CardContent } from "./ui/card";
import { 
  FileText, 
  Award, 
  Upload, 
  HardDrive 
} from "lucide-react";

const stats = [
  {
    title: "Total Documents",
    value: "47",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950"
  },
  {
    title: "Certificates",
    value: "12",
    icon: Award,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950"
  },
  {
    title: "Recent Uploads",
    value: "8",
    icon: Upload,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950"
  },
  {
    title: "Storage Used",
    value: "1.2 GB",
    subtitle: "of 2 GB",
    icon: HardDrive,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    showProgress: true,
    progress: 60
  }
];

export function DashboardOverview() {
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
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  {stat.subtitle && (
                    <p className="text-sm text-muted-foreground">{stat.subtitle}</p>
                  )}
                </div>
                {stat.showProgress && (
                  <div className="mt-2 w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all" 
                      style={{ width: `${stat.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}