import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Play, BookOpen, User, Copy, Check, Sparkles } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const paymentId =
    searchParams.get("razorpay_payment_id") ||
    searchParams.get("payment_id") ||
    searchParams.get("id");
  const pathwayId = searchParams.get("pathwayId");

  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (paymentId) {
      navigator.clipboard.writeText(paymentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12 animate-fade-in">
      <Card className="p-6 sm:p-8 text-center shadow-lg border-slate-200/80 relative overflow-hidden bg-white">
        {/* Top decorative gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-600" />

        {/* Success Icon */}
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">
          Enrollment Activated
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
          Welcome to Your Pathway!
        </h1>

        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          Your payment has been securely verified. Your pathway access is live and ready in your workspace.
        </p>

        {/* Transaction ID */}
        {paymentId && (
          <div className="bg-slate-50 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 flex items-center justify-between mb-5 border border-slate-200/80">
            <span className="font-medium text-slate-500">Transaction Ref:</span>
            <div className="flex items-center gap-1.5">
              <code className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px] font-bold text-slate-800">
                {paymentId}
              </code>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-slate-400 hover:text-slate-700"
                title="Copy Reference"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2.5 mb-5">
          {pathwayId ? (
            <Link to={`/learn/${pathwayId}`} className="block">
              <Button variant="primary" size="md" icon={Play} className="w-full">
                Start Learning Now
              </Button>
            </Link>
          ) : (
            <Link to="/enrolled" className="block">
              <Button variant="primary" size="md" icon={BookOpen} className="w-full">
                Go to My Pathways
              </Button>
            </Link>
          )}

          <Link to="/" className="block">
            <Button variant="outline" size="sm" className="w-full">
              Explore More Pathways
            </Button>
          </Link>
        </div>

        {/* Support Note */}
        <p className="text-[11px] text-slate-400 border-t border-slate-100 pt-3">
          Need support? Reach out at{" "}
          <a href="mailto:support@unisole.org" className="font-semibold text-indigo-600 hover:underline">
            support@unisole.org
          </a>
        </p>
      </Card>
    </div>
  );
}
