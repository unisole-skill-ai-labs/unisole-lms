import React from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, ArrowUp } from "lucide-react";

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="w-full bg-zinc-950 text-zinc-300 border-t border-zinc-900 relative overflow-hidden pb-24 md:pb-12 text-xs">
      {/* Navigation Links Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10">
        
        {/* Col 1: Brand & Bio */}
        <div className="col-span-2 md:col-span-1 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-black border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
              <img
                src="https://res.cloudinary.com/hehmsemf/image/upload/f_auto,q_auto,w_64/v1785299421/Unisole_logo_new_mhqbma.png"
                alt="Unisole Skill AI Labs"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-sm text-white tracking-tight">
              Unisole <span className="text-zinc-400 font-normal">Skill AI Labs</span>
            </span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Building sustainable AI ecosystems, state-of-the-art laboratory setups, and rigorous engineering pathways for institutions across India.
          </p>
        </div>

        {/* Col 2: Learning Platform */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono text-zinc-300 uppercase tracking-wider">Learning Platform</h4>
          <ul className="space-y-2 text-xs text-zinc-400">
            <li><Link to="/" className="hover:text-white transition-colors">Pathways Catalog</Link></li>
            <li><Link to="/enrolled" className="hover:text-white transition-colors">My Enrolled Curriculums</Link></li>
            <li><Link to="/profile" className="hover:text-white transition-colors">Learner Profile</Link></li>
          </ul>
        </div>

        {/* Col 3: Platform & Resources */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono text-zinc-300 uppercase tracking-wider">Platform</h4>
          <ul className="space-y-2 text-xs text-zinc-400">
            <li><Link to="/" className="hover:text-white transition-colors">Curated Pathways</Link></li>
            <li><a href="mailto:unisole.empower@gmail.com" className="hover:text-white transition-colors">Help & Support</a></li>
          </ul>
        </div>

        {/* Col 4: Contact & Social */}
        <div className="col-span-2 sm:col-span-1 space-y-3">
          <h4 className="text-xs font-mono text-zinc-300 uppercase tracking-wider">Contact</h4>
          <div className="flex flex-col gap-2 text-xs text-zinc-400">
            <a href="mailto:unisole.empower@gmail.com" className="hover:text-white transition-colors flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
              <span className="break-all sm:break-normal">unisole.empower@gmail.com</span>
            </a>
            <a href="tel:+918219691201" className="hover:text-white transition-colors flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
              <span>+91 8219691201</span>
            </a>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <a 
              href="https://www.instagram.com/unisole_empower/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-7 h-7 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
              aria-label="Instagram"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
            <a 
              href="https://www.facebook.com/profile.php?id=61553977302008" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-7 h-7 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
              aria-label="Facebook"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a 
              href="https://www.linkedin.com/company/unisole-empower/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-7 h-7 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
              aria-label="LinkedIn"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            </a>
          </div>
        </div>

      </div>

      {/* Copyright Bottom Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
        <div>
          © {new Date().getFullYear()} Unisole Skill AI Labs Private Limited. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <span className="hover:text-zinc-300 transition-colors cursor-pointer">Privacy Policy</span>
          <span className="hover:text-zinc-300 transition-colors cursor-pointer">Terms of Service</span>
          <button
            onClick={scrollToTop}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-indigo-600 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
