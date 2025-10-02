'use client';

import { Button } from "@/components/ui/button";
import {
  LayoutGrid,
  FileText,
  LogOut,
  FileCheck2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const navItems = [
  { icon: LayoutGrid, label: "Dashboard", href: "/dashboard", active: true },
  { icon: FileText, label: "All Documents", href: "/documents" },
];

export default function Sidebar({ user }) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
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
          {navItems.map((item, index) => (
            <Button
              key={index}
              variant={item.active ? "secondary" : "ghost"}
              className={`w-full justify-start gap-3 h-12 text-md font-semibold ${item.active ? 'text-blue-600 bg-blue-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`}
              onClick={() => router.push(item.href)}
            >
              <item.icon className="w-6 h-6" />
              {item.label}
            </Button>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-12 text-md font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800"
          onClick={handleSignOut}
        >
          <LogOut className="w-6 h-6" />
          Logout
        </Button>
      </div>
    </div>
  );
}