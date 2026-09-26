import { useEffect, useRef, useState, useCallback } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<any>;
  delayMs?: number;
  enabled?: boolean;
  itemKey?: string; // Reset baseline snapshot when active item/lesson changes
}

export function useAutosave<T>({
  data,
  onSave,
  delayMs = 1200,
  enabled = true,
  itemKey = "",
}: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const dataRef = useRef(data);
  dataRef.current = data;

  const lastSavedJsonRef = useRef<string>("");
  const isInitializedRef = useRef(false);
  const idleTimerRef = useRef<any>(null);
  const prevKeyRef = useRef(itemKey);

  // Serialize current data for deep equality checking
  const currentJson = JSON.stringify(data);

  // If itemKey changed (user switched lesson), reset initialization state
  if (prevKeyRef.current !== itemKey) {
    prevKeyRef.current = itemKey;
    isInitializedRef.current = false;
    lastSavedJsonRef.current = "";
    if (status !== "idle") setStatus("idle");
  }

  useEffect(() => {
    if (!enabled) {
      isInitializedRef.current = false;
      setStatus("idle");
      return;
    }

    // Baseline snapshot on initial load for the current item
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      lastSavedJsonRef.current = currentJson;
      setStatus("idle");
      return;
    }

    // If data hasn't actually changed from last saved state, remain idle
    if (currentJson === lastSavedJsonRef.current) {
      return;
    }

    // User actually modified content
    setStatus("saving");

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    const timer = setTimeout(async () => {
      try {
        await onSaveRef.current(dataRef.current);
        lastSavedJsonRef.current = JSON.stringify(dataRef.current);
        setStatus("saved");

        // Quietly fade out to idle after 2.5 seconds
        idleTimerRef.current = setTimeout(() => {
          setStatus("idle");
        }, 2500);
      } catch (err) {
        console.error("Autosave failed:", err);
        setStatus("error");
      }
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [currentJson, delayMs, enabled, itemKey]);

  // Clean up idleTimer on unmount
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Keyboard shortcut: Ctrl + S / Cmd + S
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        forceSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);

  // Force Save handler (used by manual button and Ctrl+S)
  const forceSave = useCallback(async () => {
    setStatus("saving");
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    try {
      await onSaveRef.current(dataRef.current);
      lastSavedJsonRef.current = JSON.stringify(dataRef.current);
      setStatus("saved");

      idleTimerRef.current = setTimeout(() => {
        setStatus("idle");
      }, 2500);
    } catch (err) {
      console.error("Manual save failed:", err);
      setStatus("error");
    }
  }, []);

  return { status, forceSave };
}
