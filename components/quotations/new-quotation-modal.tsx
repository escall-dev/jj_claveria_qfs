"use client";

import React, { useState, useEffect, useRef } from "react";
import { Dialog } from "@/components/ui/dialog";
import { QuotationForm } from "./quotation-form";
import type { UomLookupResult } from "@/types/catalog";

export interface NewQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUoms: UomLookupResult[];
  currentUser?: {
    displayName: string;
    username: string;
  };
  onSuccess?: (savedResult: { quotationId: string; qfNumber: string }) => void;
}

export function NewQuotationModal({
  isOpen,
  onClose,
  initialUoms,
  currentUser,
  onSuccess,
}: NewQuotationModalProps) {
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);

  // Sync isDirty state with ref for event closure safety
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Handle explicit close requests (X button, Cancel button, Escape key)
  const handleRequestClose = () => {
    if (isDirtyRef.current) {
      const confirmDiscard = window.confirm(
        "You have unsaved changes in this quotation. Are you sure you want to close and discard your changes?"
      );
      if (!confirmDiscard) {
        return;
      }
    }
    setIsDirty(false);
    isDirtyRef.current = false;
    onClose();
  };

  // Handle backdrop clicks: only close when form has no unsaved data
  const handleBackdropClick = () => {
    if (isDirtyRef.current) {
      // Do not silently discard entered quotation data
      return;
    }
    setIsDirty(false);
    isDirtyRef.current = false;
    onClose();
  };

  const handleSuccess = (savedResult: { quotationId: string; qfNumber: string }) => {
    setIsDirty(false);
    isDirtyRef.current = false;
    onSuccess?.(savedResult);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleRequestClose}
      onBackdropClick={handleBackdropClick}
      title="Create New Quotation"
      description="Compose a new quotation with client details, dynamic item lines, and instant totals."
      maxWidth="6xl"
      contentClassName="p-3 sm:p-5 overflow-y-auto max-h-[calc(94vh-80px)] sm:max-h-[calc(90vh-100px)] flex flex-col min-h-0"
    >
      <QuotationForm
        initialUoms={initialUoms}
        currentUser={currentUser}
        isModal={true}
        onCancel={handleRequestClose}
        onSuccess={handleSuccess}
        onDirtyChange={setIsDirty}
      />
    </Dialog>
  );
}
