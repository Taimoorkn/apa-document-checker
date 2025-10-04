"use client";
import Link from "next/link";
import Image from "next/image";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EditorHeader() {
  return (
    <header className="sticky top-0 bg-white border-b border-slate-200 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <Image
                src="/LiloLogo.svg"
                alt="Lilo"
                width={36}
                height={36}
              />
            </div>
            <span className="text-xl font-bold text-slate-800">
              Lilo
            </span>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <Home className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
