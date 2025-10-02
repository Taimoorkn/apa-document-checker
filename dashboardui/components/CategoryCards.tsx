import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { 
  GraduationCap, 
  Award, 
  CreditCard, 
  FolderOpen 
} from "lucide-react";

const categories = [
  {
    title: "Academic Documents",
    count: 28,
    icon: GraduationCap,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    description: "Transcripts, certificates, course materials"
  },
  {
    title: "Certificates",
    count: 12,
    icon: Award,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950",
    description: "Achievement certificates, awards"
  },
  {
    title: "Government IDs",
    count: 5,
    icon: CreditCard,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    description: "ID cards, passports, licenses"
  },
  {
    title: "Others",
    count: 2,
    icon: FolderOpen,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    description: "Miscellaneous documents"
  }
];

export function CategoryCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {categories.map((category, index) => (
        <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${category.bgColor}`}>
                <category.icon className={`w-6 h-6 ${category.color}`} />
              </div>
              <Badge variant="secondary">{category.count}</Badge>
            </div>
            <h3 className="font-semibold mb-2">{category.title}</h3>
            <p className="text-sm text-muted-foreground">{category.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}