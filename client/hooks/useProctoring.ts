/**
 * Proctoring Hook
 * Detects cheating attempts: tab switching, copy-paste, right-click, etc.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseProctoringOptions {
  sessionId: string;
  onViolation: (eventType: string) => void;
  enabled?: boolean;
}

export function useProctoring({ sessionId, onViolation, enabled = true }: UseProctoringOptions) {
  const [isActive, setIsActive] = useState(false);
  const violationsRef = useRef<Set<string>>(new Set());

  // ─── Event Handlers ──────────────────────────────────────────────────────

  const handleVisibilityChange = useCallback(() => {
    if (!isActive || !enabled) return;

    if (document.hidden) {
      const eventType = 'tab_switch';
      if (!violationsRef.current.has(eventType)) {
        violationsRef.current.add(eventType);
        onViolation(eventType);
      }
    }
  }, [isActive, enabled, onViolation]);

  const handleCopy = useCallback(
    (e: ClipboardEvent) => {
      if (!isActive || !enabled) return;

      e.preventDefault();
      const eventType = 'copy_paste';
      if (!violationsRef.current.has(eventType)) {
        violationsRef.current.add(eventType);
        onViolation(eventType);
      }
    },
    [isActive, enabled, onViolation]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!isActive || !enabled) return;

      e.preventDefault();
      const eventType = 'copy_paste';
      if (!violationsRef.current.has(eventType)) {
        violationsRef.current.add(eventType);
        onViolation(eventType);
      }
    },
    [isActive, enabled, onViolation]
  );

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      if (!isActive || !enabled) return;

      e.preventDefault();
      const eventType = 'right_click';
      if (!violationsRef.current.has(eventType)) {
        violationsRef.current.add(eventType);
        onViolation(eventType);
      }
    },
    [isActive, enabled, onViolation]
  );

  const handleFullscreenChange = useCallback(() => {
    if (!isActive || !enabled) return;

    if (!document.fullscreenElement) {
      const eventType = 'fullscreen_exit';
      if (!violationsRef.current.has(eventType)) {
        violationsRef.current.add(eventType);
        onViolation(eventType);
      }
    }
  }, [isActive, enabled, onViolation]);

  const handleDevTools = useCallback(
    (e: KeyboardEvent) => {
      if (!isActive || !enabled) return;

      const isDevTools =
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'U');

      if (isDevTools) {
        e.preventDefault();
        const eventType = 'devtools_open';
        if (!violationsRef.current.has(eventType)) {
          violationsRef.current.add(eventType);
          onViolation(eventType);
        }
      }
    },
    [isActive, enabled, onViolation]
  );

  // ─── Enable/Disable ─────────────────────────────────────────────────────

  const enableProctoring = useCallback(() => {
    setIsActive(true);
    violationsRef.current.clear();

    // Request fullscreen
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // User might have denied fullscreen
      });
    }

    // Lock pointer if needed (optional)
    // document.pointerLockElement?.requestPointerLock();
  }, []);

  const disableProctoring = useCallback(() => {
    setIsActive(false);

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // ─── Register Events ────────────────────────────────────────────────────

  useEffect(() => {
    if (!isActive || !enabled) return;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', handleCopy as EventListener);
    document.addEventListener('paste', handlePaste as EventListener);
    document.addEventListener('contextmenu', handleContextMenu as EventListener);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleDevTools);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', handleCopy as EventListener);
      document.removeEventListener('paste', handlePaste as EventListener);
      document.removeEventListener('contextmenu', handleContextMenu as EventListener);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleDevTools);
    };
  }, [
    isActive,
    enabled,
    handleVisibilityChange,
    handleCopy,
    handlePaste,
    handleContextMenu,
    handleFullscreenChange,
    handleDevTools,
  ]);

  return {
    isProctoringActive: isActive && enabled,
    enableProctoring,
    disableProctoring,
    violations: Array.from(violationsRef.current),
    hasViolations: violationsRef.current.size > 0,
  };
}