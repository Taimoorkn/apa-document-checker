import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { 
  User, 
  Calendar, 
  BookOpen, 
  AlertCircle 
} from "lucide-react";

export function StudentProfile() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Student Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Profile Info */}
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src="https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=100&h=100&fit=crop&crop=face" />
            <AvatarFallback>SJ</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">Sarah Johnson</h3>
            <p className="text-sm text-muted-foreground">CS-2024-001</p>
            <Badge variant="outline" className="mt-1">
              Active Student
            </Badge>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Computer Science</p>
              <p className="text-xs text-muted-foreground">Bachelor's Degree</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Year 3 of 4</p>
              <p className="text-xs text-muted-foreground">Expected Graduation: 2025</p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Document Reminder
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300">
                Your student ID expires in 30 days
              </p>
            </div>
          </div>
        </div>

        <Button variant="outline" className="w-full">
          Edit Profile
        </Button>
      </CardContent>
    </Card>
  );
}