'use client';

import { Button } from "@/components/ui/button";
import {
  LayoutGrid,
  LogOut,
  FileCheck2,
  User,
  Settings
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const navItems = [
  { icon: LayoutGrid, label: "Dashboard", href: "/dashboard" },
  { icon: User, label: "Profile", href: "/profile" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function Sidebar({ user, onNavigate }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleNavigation = (href) => {
    router.push(href);
    if (onNavigate) onNavigate();
  };

  return (
    <div className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col shadow-sm hidden md:flex">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <FileCheck2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-800">
            APA Pro
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Button
                key={index}
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 h-12 text-md font-semibold ${isActive ? 'text-blue-600 bg-blue-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`}
                onClick={() => handleNavigation(item.href)}
              >
                <item.icon className="w-6 h-6" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-slate-200">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-12 text-md font-semibold text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}