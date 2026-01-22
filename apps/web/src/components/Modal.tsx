"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import styles from "./Modal.module.css";

interface ModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Modal({ open, onOpenChange, children }: ModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

export function ModalTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  return (
    <DialogPrimitive.Trigger asChild={asChild}>
      {children}
    </DialogPrimitive.Trigger>
  );
}

interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

export function ModalContent({
  children,
  className,
  showCloseButton = true,
}: ModalContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={styles.overlay} />
      <DialogPrimitive.Content
        className={`${styles.content} ${className || ""}`}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close className={styles.closeButton} aria-label="Close">
            <XIcon size={16} />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function ModalHeader({ children }: { children: React.ReactNode }) {
  return <div className={styles.header}>{children}</div>;
}

export function ModalTitle({ children }: { children: React.ReactNode }) {
  return (
    <DialogPrimitive.Title className={styles.title}>
      {children}
    </DialogPrimitive.Title>
  );
}

export function ModalDescription({ children }: { children: React.ReactNode }) {
  return (
    <DialogPrimitive.Description className={styles.description}>
      {children}
    </DialogPrimitive.Description>
  );
}
