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
import { AlertCircle, X } from "lucide-react";

const DISCLAIMER_STORAGE_KEY = "apa-pro-disclaimer-shown";

export default function DisclaimerModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(false);

  useEffect(() => {
    // Check if disclaimer has been shown before
    const hasSeenDisclaimer = localStorage.getItem(DISCLAIMER_STORAGE_KEY);

    if (!hasSeenDisclaimer) {
      // Show modal for first-time visitors
      setIsOpen(true);

      // Enable close button after 5 seconds
      const timer = setTimeout(() => {
        setShowCloseButton(true);
      }, 5000);

      return () => clearTimeout(timer);
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
        // Only allow closing if close button is visible
        if (!open && showCloseButton) {
          handleClose();
        }
      }}
    >
      <DialogContent
        className="sm:max-w-[600px]"
        hideCloseButton={!showCloseButton}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-blue-600" />
            </div>
            <DialogTitle className="text-2xl">Welcome to APA Pro!</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="text-slate-700 leading-relaxed text-base">
            Thank you for visiting! Before you continue:
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <div className="text-slate-700 font-semibold text-base">
              🚧 This website is currently in active development and testing.
            </div>
            <div className="text-slate-600 text-sm leading-relaxed">
              Ensuring accuracy and smooth experience is our prioriy but you may
              encounter bugs or features under construction right now. Your
              patience is appreciated.
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-lg p-4 space-y-2">
            <div className="text-slate-700 font-semibold text-base">
              Get started today!
            </div>
            <div className="text-slate-600 text-sm leading-relaxed">
              Create a free account to access our APA 7th edition document
              checker and editor.
            </div>
          </div>
          <p>This dialog will be shown only once. We place a flag in your browsers local storage to do this. This makes it possible to not show this dialog box everytime you visit and we dont have to use any user data to show this. Enjoy the website</p>
        </div>

        <div className="flex justify-end pt-4">
          {showCloseButton ? (
            <Button onClick={handleClose} className="gap-2">
              Got it!
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Please read the message above...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
