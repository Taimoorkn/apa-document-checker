import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { 
  LayoutDashboard, 
  FileText, 
  Upload, 
  Award, 
  FolderOpen, 
  User, 
  Settings, 
  LogOut,
  GraduationCap
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: FileText, label: "My Documents" },
  { icon: Upload, label: "Upload" },
  { icon: Award, label: "Certificates" },
  { icon: FolderOpen, label: "Categories" },
  { icon: User, label: "Profile" },
  { icon: Settings, label: "Settings" },
];

export function Sidebar() {
  return (
    <div className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-sidebar-foreground">DocLocker</h2>
            <p className="text-sm text-sidebar-foreground/60">Student Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {navItems.map((item, index) => (
            <Button
              key={index}
              variant={item.active ? "secondary" : "ghost"}
              className={`w-full justify-start gap-3 h-11 ${
                item.active 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Button>
          ))}
        </div>

        <div className="my-4 h-px bg-sidebar-border" />

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-11 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </nav>
    </div>
  );
}