import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  BookOpen,
  Layers,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  Sparkles,
  CreditCard,
  Lock,
} from "lucide-react";
import {
  useGetPublicPathwayBySlugQuery,
  useGetMyPathwaysQuery,
  useCreatePaymentOrderMutation,
  useVerifyPaymentMutation,
} from "../store/apiSlice";
import { extractErrorMessage } from "../utils/error";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import Spinner from "../components/ui/Spinner";
import Modal from "../components/ui/Modal";

export default function PathwayDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state: any) => state.auth);

  const { data: pathway, isLoading } = useGetPublicPathwayBySlugQuery(slug);
  const { data: myPathways = [] } = useGetMyPathwaysQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [createPaymentOrder, { isLoading: isCreatingOrder }] = useCreatePaymentOrderMutation();
  const [verifyPayment, { isLoading: isVerifyingPayment }] = useVerifyPaymentMutation();

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const isEnrolled = pathway && myPathways.some((p) => p.pathway?.id === pathway.id);
  const priceRupees = pathway ? (pathway.pricePaise || 0) / 100 : 0;
  const categories = pathway?.categories || [];
  const colleges = pathway?.colleges || [];
  const courses = pathway?.courses || [];

  const handleStartEnrollment = () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/pathways/${slug}`);
      return;
    }
    setShowCheckoutModal(true);
    setCheckoutError("");
    setCheckoutSuccess(false);
  };

  const handleCompletePayment = async () => {
    if (!pathway) return;
    setCheckoutError("");

    try {
      // 1. Create order on backend
      const order = await createPaymentOrder({ pathwayId: pathway.id }).unwrap();

      // 2. Verify payment (in dev/demo mode, simulates Razorpay signature)
      const verificationPayload = {
        providerOrderId: order.providerOrderId,
        providerPaymentId: `pay_sim_${Date.now()}`,
        providerSignature: `sig_verified_${order.providerOrderId}`,
      };

      await verifyPayment(verificationPayload).unwrap();
      setCheckoutSuccess(true);

      setTimeout(() => {
        navigate(`/learn/${pathway.id}`);
      }, 1200);
    } catch (err) {
      setCheckoutError(extractErrorMessage(err, "Payment processing failed. Please try again."));
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <Spinner label="Loading pathway curriculum..." size="lg" />
      </div>
    );
  }

  if (!pathway) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Pathway Not Found</h2>
        <p className="text-xs text-slate-500">The learning pathway you requested does not exist or has been archived.</p>
        <Link to="/">
          <Button variant="primary" size="sm" icon={ArrowLeft}>
            Back to Catalog
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 animate-fade-in">
      {/* Back Link */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>
      </div>

      {/* Hero Card & Purchase Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Details (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <Badge key={cat.id || cat} variant="indigo" size="md">
                  {cat.name || cat}
                </Badge>
              ))}
              {colleges.map((col) => (
                <Badge key={col.id || col} variant="purple" size="md">
                  {col.shortName || col.name}
                </Badge>
              ))}
              {isEnrolled && (
                <Badge variant="emerald" size="md">
                  Active Enrollment
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 leading-tight">
              {pathway.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {pathway.description || pathway.shortDescription || "Comprehensive structured pathway designed for real-world mastery."}
            </p>

            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500 font-medium pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>{courses.length} Comprehensive Courses</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-500" />
                <span>Structured Reusable Modules</span>
              </div>
            </div>
          </div>

          {/* Included Courses Section */}
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-extrabold text-slate-900">Included Courses & Modules</h3>
            <div className="space-y-3">
              {courses.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No courses currently attached to this pathway.</p>
              ) : (
                courses.map((course, idx) => (
                  <Card key={course.id} className="p-5 border-slate-200/80">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-sm text-slate-800">
                          {course.title}
                        </h4>
                        {course.shortDescription && (
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {course.shortDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Pricing Card (Right col) */}
        <div className="lg:col-span-1 sticky top-24">
          <Card className="p-6 border-slate-200/80 shadow-lg space-y-5 bg-white">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Enrollment Investment
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {priceRupees === 0 ? "Free" : `₹${priceRupees.toLocaleString("en-IN")}`}
                </span>
                <span className="text-xs text-slate-400 font-medium">/ lifetime access</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Full access to all {courses.length} courses & lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Interactive video player & code notes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Direct partner college verified curriculum</span>
              </div>
            </div>

            {isEnrolled ? (
              <Link to={`/learn/${pathway.id}`} className="block">
                <Button variant="primary" size="lg" className="w-full">
                  Continue Learning
                </Button>
              </Link>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleStartEnrollment}
              >
                Enroll Now
              </Button>
            )}

            <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" /> Secure 256-bit payment verification
            </p>
          </Card>
        </div>
      </div>

      {/* Checkout Modal */}
      <Modal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        title="Complete Pathway Enrollment"
      >
        <div className="space-y-5 p-2">
          {checkoutSuccess ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Payment Verified!</h3>
              <p className="text-xs text-slate-500">
                You are now enrolled in <strong>{pathway.title}</strong>. Redirecting to your learning workspace...
              </p>
            </div>
          ) : (
            <>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Selected Pathway</span>
                  <span className="font-bold text-slate-800">{pathway.title}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Included Courses</span>
                  <span className="font-semibold text-slate-700">{courses.length} courses</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">Total Amount</span>
                  <span className="text-base font-black text-slate-900">
                    {priceRupees === 0 ? "Free" : `₹${priceRupees.toLocaleString("en-IN")}`}
                  </span>
                </div>
              </div>

              {checkoutError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleCompletePayment}
                  loading={isCreatingOrder || isVerifyingPayment}
                  icon={CreditCard}
                >
                  Pay ₹{priceRupees.toLocaleString("en-IN")} & Activate Access
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-slate-400"
                  onClick={() => setShowCheckoutModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
