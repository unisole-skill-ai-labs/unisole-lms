import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, Layers, ArrowRight, Sparkles, Building2 } from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

export default function PathwayCard({ pathway, isEnrolled }) {
  const priceRupees = (pathway.pricePaise || 0) / 100;
  const categories = pathway.categories || [];
  const colleges = pathway.colleges || [];
  const courseCount = pathway.courseCount ?? (pathway.courses ? pathway.courses.length : 0);

  return (
    <Card hover className="p-6 flex flex-col justify-between h-full group border-slate-200/80 bg-white transition-all duration-300 hover:shadow-xl hover:border-indigo-200">
      <div>
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.slice(0, 2).map((cat) => (
              <Badge key={cat.id || cat} variant="indigo" size="sm">
                {cat.name || cat}
              </Badge>
            ))}
            {isEnrolled && (
              <Badge variant="emerald" size="sm">
                Enrolled
              </Badge>
            )}
          </div>

          {colleges.length > 0 && (
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              {colleges[0].shortName || colleges[0].name}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-extrabold text-lg text-slate-900 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
          {pathway.title}
        </h3>

        {/* Short Description */}
        <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {pathway.shortDescription || pathway.description || "Comprehensive multi-course learning pathway designed for mastery."}
        </p>

        {/* Meta details */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>{courseCount} {courseCount === 1 ? "Course" : "Courses"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-500" />
            <span>Modular Pathway</span>
          </div>
        </div>
      </div>

      {/* Footer Pricing & CTA */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Price
          </span>
          <span className="text-lg font-black text-slate-900">
            {priceRupees === 0 ? "Free" : `₹${priceRupees.toLocaleString("en-IN")}`}
          </span>
        </div>

        {isEnrolled ? (
          <Link to={`/learn/${pathway.id}`}>
            <Button size="sm" variant="primary" icon={ArrowRight}>
              Continue
            </Button>
          </Link>
        ) : (
          <Link to={`/pathways/${pathway.slug || pathway.id}`}>
            <Button size="sm" variant="outline" icon={ArrowRight}>
              View Details
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
