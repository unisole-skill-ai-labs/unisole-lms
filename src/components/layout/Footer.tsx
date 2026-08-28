import React from "react";
import { Link } from "react-router-dom";
import { Compass, BookOpen, Instagram, Linkedin, Facebook, Phone, Mail, Sparkles, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-zinc-950 text-zinc-400 py-12 border-t border-zinc-800 pb-24 md:pb-12 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Col */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <img
                src="https://res.cloudinary.com/hehmsemf/image/upload/f_auto,q_auto,w_64/v1785299421/Unisole_logo_new_mhqbma.png"
                alt="Unisole Logo"
                className="w-8 h-8 rounded-lg object-contain ring-1 ring-zinc-800 shadow-sm"
              />
              <span className="font-extrabold text-white text-base tracking-tight">
                Unisole LMS
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              India's premier AI and engineering education ecosystem. Delivering job-ready career pathways and verified modular curriculums.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verified Partner Colleges
            </div>
          </div>

          {/* Quick Nav */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Learning Platform</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="inline-flex items-center gap-2 hover:text-white transition-colors">
                  <Compass className="w-4 h-4 text-indigo-400" />
                  <span>Curated Pathways Catalog</span>
                </Link>
              </li>
              <li>
                <Link to="/enrolled" className="inline-flex items-center gap-2 hover:text-white transition-colors">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>My Enrolled Curriculums</span>
                </Link>
              </li>
              <li>
                <Link to="/profile" className="inline-flex items-center gap-2 hover:text-white transition-colors">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Learner Profile</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Community & Social</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://www.instagram.com/unisole_empower/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Instagram className="w-4 h-4 text-pink-400" />
                  <span>Instagram @unisole_empower</span>
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
                  <span>LinkedIn Community</span>
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
                  <span>Facebook Page</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Support & Mentorship</h4>
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

        <div className="border-t border-zinc-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} Unisole Skill AI Labs. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Support</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
