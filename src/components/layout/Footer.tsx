import React from "react";
import { Link } from "react-router-dom";
import { Compass, BookOpen, Award, Instagram, Linkedin, Facebook, Phone, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 pb-24 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <img
                src="/unisole-logo.jpg"
                alt="Unisole Logo"
                className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-700 shadow-sm"
              />
              <span className="font-extrabold text-white text-base tracking-tight">
                Unisole
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Empowering learners with industry-ready skills and interactive assessments.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="inline-flex items-center gap-2 hover:text-white transition-colors">
                  <Compass className="w-4 h-4 text-indigo-400" />
                  <span>Explore Courses</span>
                </Link>
              </li>
              <li>
                <Link to="/enrolled" className="inline-flex items-center gap-2 hover:text-white transition-colors">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>My Enrollments</span>
                </Link>
              </li>
              <li>
                <Link to="/tests" className="inline-flex items-center gap-2 hover:text-white transition-colors">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Practice Assessments</span>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Social Media</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://www.instagram.com/unisole_empower/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Instagram className="w-4 h-4 text-pink-400" />
                  <span>Instagram</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/company/unisole-empower/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Linkedin className="w-4 h-4 text-sky-400" />
                  <span>LinkedIn</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.facebook.com/profile.php?id=61553977302008"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Facebook className="w-4 h-4 text-blue-400" />
                  <span>Facebook</span>
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Support</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="tel:+918219691201"
                  className="inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>+91 8219691201</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:unisole.empower@gmail.com"
                  className="inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4 text-indigo-400" />
                  <span className="break-all">unisole.empower@gmail.com</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Unisole Skill AI Labs. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

