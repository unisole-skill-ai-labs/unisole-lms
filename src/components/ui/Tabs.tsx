import React, { createContext, useContext, useState } from "react";
import { cn } from "../../lib/utils";

interface TabsContextValue {
  activeValue?: string;
  changeValue: (val: string) => void;
}

const TabsContext = createContext<TabsContextValue>({
  activeValue: undefined,
  changeValue: () => {},
});

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, value, onValueChange, children, className = "" }: TabsProps) {
  const [selected, setSelected] = useState(defaultValue);
  const activeValue = value !== undefined ? value : selected;
  const changeValue = onValueChange || setSelected;

  return (
    <TabsContext.Provider value={{ activeValue, changeValue }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-1.5 p-1 bg-slate-100 border border-slate-200/80 rounded-xl", className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className = "" }: { value: string; children: React.ReactNode; className?: string }) {
  const { activeValue, changeValue } = useContext(TabsContext);
  const isActive = activeValue === value;

  return (
    <button
      type="button"
      onClick={() => changeValue(value)}
      className={cn(
        "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
        isActive
          ? "bg-white text-indigo-900 shadow-xs"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className = "" }: { value: string; children: React.ReactNode; className?: string }) {
  const { activeValue } = useContext(TabsContext);
  if (activeValue !== value) return null;

  return <div className={cn("mt-4", className)}>{children}</div>;
}
