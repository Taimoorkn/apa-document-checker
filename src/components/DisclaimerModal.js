"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

const DISCLAIMER_STORAGE_KEY = "lilo-disclaimer-shown";

export default function DisclaimerModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Check if disclaimer has been shown before
    const hasSeenDisclaimer = localStorage.getItem(DISCLAIMER_STORAGE_KEY);

    if (!hasSeenDisclaimer) {
      // Show modal for first-time visitors
      setIsOpen(true);

      // Countdown timer
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, []);

  const handleClose = () => {
    // Mark disclaimer as shown in localStorage
    localStorage.setItem(DISCLAIMER_STORAGE_KEY, "true");
    setIsOpen(false);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Only allow closing if countdown is finished
        if (!open && countdown === 0) {
          handleClose();
        }
      }}
    >
      <DialogContent
        className="sm:max-w-[600px]"
        hideCloseButton={countdown > 0}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-blue-600" />
            </div>
            <DialogTitle className="text-2xl">Welcome to APA Pro!</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="text-slate-700 leading-relaxed text-base">
            Thank you for visiting! Before you continue:
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 space-y-3">
            <div className="text-slate-700 font-semibold text-base">
              🚧 This website is currently in active development and testing
            </div>
            <div className="text-slate-600 text-sm leading-relaxed">
              Ensuring accuracy and a smooth experience is our priority, but you may
              encounter bugs or features under construction. Your patience is appreciated!
            </div>

            <div className="pt-2 border-t border-blue-200">
              <div className="text-slate-700 font-semibold text-base mb-1">
                ✨ Get started today
              </div>
              <div className="text-slate-600 text-sm leading-relaxed">
                Create a free account to access our APA 7th edition document
                checker and editor.
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 leading-relaxed">
            We only show this once using your browser&apos;s memory—no tracking, no data collection.
          </div>
        </div>

        <div className="flex justify-end pt-4">
          {countdown > 0 ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>You can continue in {countdown} second{countdown !== 1 ? 's' : ''}...</span>
            </div>
          ) : (
            <Button onClick={handleClose}>
              Got it!
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
