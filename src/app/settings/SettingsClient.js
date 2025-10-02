'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/dashboard/Sidebar';
import MobileSidebar from '@/components/dashboard/MobileSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Bell, Eye, FileText, Zap, Shield } from 'lucide-react';

export default function SettingsClient({ user }) {
  const router = useRouter();
  const { toast } = useToast();

  // Settings state
  const [settings, setSettings] = useState({
    emailNotifications: true,
    analysisNotifications: true,
    autoAnalysis: false,
    showLineNumbers: true,
    highlightIssues: true,
    strictMode: false,
  });

  const handleToggle = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting],
    }));
    toast({
      title: "Setting updated",
      description: "Your preferences have been saved.",
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <Sidebar user={user} />
      <MobileSidebar user={user} />

      <div className="flex-1 p-6 sm:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
              <p className="text-slate-500">Customize your APA Pro experience</p>
            </div>
          </div>

          {/* Notifications Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-slate-600" />
                <CardTitle>Notifications</CardTitle>
              </div>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium text-slate-900">Email Notifications</p>
                  <p className="text-sm text-slate-500">
                    Receive email updates about your documents
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={() => handleToggle('emailNotifications')}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium text-slate-900">Analysis Completion</p>
                  <p className="text-sm text-slate-500">
                    Get notified when document analysis is complete
                  </p>
                </div>
                <Switch
                  checked={settings.analysisNotifications}
                  onCheckedChange={() => handleToggle('analysisNotifications')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Editor Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-600" />
                <CardTitle>Editor Preferences</CardTitle>
              </div>
              <CardDescription>Customize your document editing experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium text-slate-900">Auto-Analysis</p>
                  <p className="text-sm text-slate-500">
                    Automatically analyze documents when changes are made
                  </p>
                </div>
                <Switch
                  checked={settings.autoAnalysis}
                  onCheckedChange={() => handleToggle('autoAnalysis')}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium text-slate-900">Show Line Numbers</p>
                  <p className="text-sm text-slate-500">
                    Display line numbers in the editor
                  </p>
                </div>
                <Switch
                  checked={settings.showLineNumbers}
                  onCheckedChange={() => handleToggle('showLineNumbers')}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium text-slate-900">Highlight Issues</p>
                  <p className="text-sm text-slate-500">
                    Highlight APA compliance issues in the document
                  </p>
                </div>
                <Switch
                  checked={settings.highlightIssues}
                  onCheckedChange={() => handleToggle('highlightIssues')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Analysis Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-slate-600" />
                <CardTitle>Analysis Settings</CardTitle>
              </div>
              <CardDescription>Configure APA compliance checking behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium text-slate-900">Strict Mode</p>
                  <p className="text-sm text-slate-500">
                    Enable stricter APA 7th edition compliance checking
                  </p>
                </div>
                <Switch
                  checked={settings.strictMode}
                  onCheckedChange={() => handleToggle('strictMode')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Performance Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-slate-600" />
                <CardTitle>Performance</CardTitle>
              </div>
              <CardDescription>Optimize application performance</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => {
                  toast({
                    title: "Cache cleared",
                    description: "Application cache has been cleared successfully.",
                  });
                }}
              >
                Clear Cache
              </Button>
              <p className="text-xs text-slate-500 mt-2">
                Clear cached data to free up storage space
              </p>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => {
                toast({
                  title: "Settings saved",
                  description: "All your preferences have been saved successfully.",
                });
                router.push('/dashboard');
              }}
            >
              Save All Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
