import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Truck, Award } from 'lucide-react';

interface HeroBannerProps {
  onOpenCustomiser: () => void;
  onExploreCatalog: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onOpenCustomiser,
  onExploreCatalog,
}) => {
  return (
    <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white border-b border-indigo-900">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Left Text & Call to Action (Compact Flipkart Scale) */}
          <div className="lg:col-span-7 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personalised Gifting Platform · Phase 1 Preview</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-snug">
              Turn Your Cherished Memories Into{' '}
              <span className="text-amber-400 underline decoration-amber-400/40">
                Custom Keepsakes
              </span>
            </h1>

            <p className="text-indigo-200 text-xs sm:text-sm max-w-xl leading-relaxed">
              Laser-engraved teakwood frames, thermo-reveal magic mugs, scannable Spotify keychains,
              and stretched canvases. Interactive live digital proofing with server-authoritative
              pricing.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={onOpenCustomiser}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-indigo-950 font-black rounded text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md active:scale-[0.99]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Customiser Studio</span>
              </button>

              <button
                onClick={onExploreCatalog}
                className="px-4 py-2 bg-indigo-900/80 hover:bg-indigo-800 text-white font-semibold rounded text-xs sm:text-sm flex items-center gap-1.5 border border-indigo-700/80 transition-colors"
              >
                <span>Browse Catalog</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>

            {/* Quality & Architecture Badges */}
            <div className="pt-2 grid grid-cols-3 gap-2 border-t border-indigo-800/60 max-w-lg text-[11px] text-indigo-200">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Laser Engraved Wood</span>
              </div>
              <div className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Pincode Delivery Check</span>
              </div>
              <div className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Live Digital Proof</span>
              </div>
            </div>
          </div>

          {/* Right Visual Collage (Compact Height) */}
          <div className="lg:col-span-5 relative">
            <div className="grid grid-cols-2 gap-2.5 relative z-10">
              {/* Teak Frame Showcase */}
              <div className="rounded-md overflow-hidden border border-amber-500/30 shadow-md bg-slate-900 group">
                <img
                  src="https://images.unsplash.com/photo-1544717302-de2939b7ef71?auto=format&fit=crop&w=400&q=80"
                  alt="Teak Wood Photo Frame Demo"
                  className="w-full h-28 sm:h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="p-1.5 bg-slate-900 text-[11px] flex items-center justify-between">
                  <span className="font-bold text-white truncate">Teak Wood Frame</span>
                  <span className="text-amber-400 font-semibold">From ₹899</span>
                </div>
              </div>

              {/* Magic Mug Showcase */}
              <div className="rounded-md overflow-hidden border border-amber-500/30 shadow-md bg-slate-900 group">
                <img
                  src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80"
                  alt="Magic Mug Demo"
                  className="w-full h-28 sm:h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="p-1.5 bg-slate-900 text-[11px] flex items-center justify-between">
                  <span className="font-bold text-white truncate">Magic Mug</span>
                  <span className="text-amber-400 font-semibold">From ₹399</span>
                </div>
              </div>

              {/* Spotify Keychain Showcase */}
              <div className="rounded-md overflow-hidden border border-amber-500/30 shadow-md bg-slate-900 group">
                <img
                  src="https://images.unsplash.com/photo-1614252369475-531eba835eb1?auto=format&fit=crop&w=400&q=80"
                  alt="Spotify Keychain Demo"
                  className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="p-1.5 bg-slate-900 text-[10px] flex items-center justify-between">
                  <span className="font-bold text-white truncate">Steel Keychain</span>
                  <span className="text-amber-400 font-semibold">₹249</span>
                </div>
              </div>

              {/* Reversible Cushion Showcase */}
              <div className="rounded-md overflow-hidden border border-amber-500/30 shadow-md bg-slate-900 group">
                <img
                  src="https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=400&q=80"
                  alt="Magic Cushion Demo"
                  className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="p-1.5 bg-slate-900 text-[10px] flex items-center justify-between">
                  <span className="font-bold text-white truncate">Sequin Cushion</span>
                  <span className="text-amber-400 font-semibold">₹499</span>
                </div>
              </div>
            </div>

            <div className="absolute inset-0 bg-indigo-600/10 blur-xl -z-10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
