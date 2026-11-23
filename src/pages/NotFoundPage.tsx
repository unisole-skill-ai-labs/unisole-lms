import React from "react";
import { Link } from "react-router-dom";
import { Compass, Home, HelpCircle } from "lucide-react";
import Button from "../components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-8 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
          Page Not Found
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          The curriculum or resource you are looking for does not exist or may have been relocated.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link to="/">
            <Button variant="primary" size="sm" icon={Home}>
              Back to Catalog
            </Button>
          </Link>
          <Link to="/enrolled">
            <Button variant="outline" size="sm" icon={Compass}>
              My Learning
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
