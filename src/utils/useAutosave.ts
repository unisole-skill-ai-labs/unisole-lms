import { useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<any>;
  delayMs?: number;
  enabled?: boolean;
}

export function useAutosave<T>({
  data,
  onSave,
  delayMs = 1500,
  enabled = true,
}: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const isFirstRender = useRef(true);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!enabled) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setStatus("saving");
    const timer = setTimeout(async () => {
      try {
        await onSave(dataRef.current);
        setStatus("saved");
      } catch (err) {
        console.error("Autosave failed:", err);
        setStatus("error");
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [data, delayMs, enabled, onSave]);

  // Keyboard shortcut: Ctrl + S / Cmd + S
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        setStatus("saving");
        onSave(dataRef.current)
          .then(() => setStatus("saved"))
          .catch(() => setStatus("error"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onSave]);

  const forceSave = async () => {
    setStatus("saving");
    try {
      await onSave(dataRef.current);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  return { status, forceSave };
}
