import React from 'react';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  Award,
  CreditCard,
  Heart,
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 text-xs border-t border-slate-800 pt-8 pb-16 lg:pb-8">
      {/* 1. Value Proposition Strip (Truthful Demo Specifications) */}
      <div className="max-w-7xl mx-auto px-4 pb-6 border-b border-slate-800">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div className="flex items-start gap-2.5">
            <div className="p-2 bg-indigo-950 text-amber-400 rounded-lg shrink-0 border border-indigo-800">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-xs">Curated Craft Templates</div>
              <p className="text-slate-400 mt-0.5 leading-snug text-[11px]">
                Wood, ceramic, and steel gift specifications modeled for commercial production.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-2 bg-indigo-950 text-amber-400 rounded-lg shrink-0 border border-indigo-800">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-xs">Pincode Serviceability</div>
              <p className="text-slate-400 mt-0.5 leading-snug text-[11px]">
                Delivery transit calculators modeled for Indian courier integration in Phase 2.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-2 bg-indigo-950 text-amber-400 rounded-lg shrink-0 border border-indigo-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-xs">Shockproof Packaging Design</div>
              <p className="text-slate-400 mt-0.5 leading-snug text-[11px]">
                Safe transit packaging specifications with transit damage replacement policy.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-2 bg-indigo-950 text-amber-400 rounded-lg shrink-0 border border-indigo-800">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-xs">Dedicated Support Desk</div>
              <p className="text-slate-400 mt-0.5 leading-snug text-[11px]">
                Store owner assistance desk operating Mon-Sat 9 AM - 8 PM IST.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Directory Columns */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-5 gap-6 border-b border-slate-800">
        <div>
          <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-2.5">
            Sample Categories
          </h4>
          <ul className="space-y-1.5 text-slate-400 text-[11px]">
            <li>Teak Wood Frames</li>
            <li>Colour Reveal Magic Mugs</li>
            <li>Spotify Steel Keychains</li>
            <li>Reversible Sequin Cushions</li>
            <li>Stretched Canvas Wall Art</li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-2.5">
            Occasions
          </h4>
          <ul className="space-y-1.5 text-slate-400 text-[11px]">
            <li>Anniversaries</li>
            <li>Birthdays &amp; Milestones</li>
            <li>Family Keepsakes</li>
            <li>Housewarming Gifts</li>
            <li>Corporate Orders</li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-2.5">
            Customer Care
          </h4>
          <ul className="space-y-1.5 text-slate-400 text-[11px]">
            <li>Pincode Serviceability Check</li>
            <li>Customisation Verification Guide</li>
            <li>Shipping &amp; Transit Policies</li>
            <li>Order Tracking (Phase 2)</li>
            <li>Contact Store Owner</li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-2.5">
            Architecture Policies
          </h4>
          <ul className="space-y-1.5 text-slate-400 text-[11px]">
            <li>Single-Owner Store Contract</li>
            <li>Server Authoritative Pricing</li>
            <li>Privacy &amp; Photo Safety</li>
            <li>MySQL 8 Relational Schema</li>
            <li>OpenAPI 3.1 Specification</li>
          </ul>
        </div>

        <div className="col-span-2 md:col-span-1 space-y-2.5">
          <h4 className="text-white font-bold text-xs uppercase tracking-wider">
            Planned Payment Methods
          </h4>
          <p className="text-[11px] text-slate-400 leading-snug">
            Architecture ready for RBI-compliant Indian gateway integration (Razorpay, Cashfree, UPI) in Phase 2.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-bold text-slate-300">
            <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700">UPI</span>
            <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700">RuPay</span>
            <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700">NetBanking</span>
            <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700">Cards</span>
          </div>
        </div>
      </div>

      {/* 3. Bottom Legal & Architecture Disclaimer */}
      <div className="max-w-7xl mx-auto px-4 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500 text-[11px]">
        <div>
          © 2026 <strong>PERSONALISED STORE</strong>. Single-Owner Commercial Platform (Phase 1 Development Demo).
        </div>
        <div className="flex items-center gap-2">
          <span>Node.js 22 + MySQL 8 + Prisma Architecture</span>
          <span aria-hidden="true">·</span>
          <span className="text-amber-400">MySQL Unconnected</span>
        </div>
      </div>
    </footer>
  );
};
