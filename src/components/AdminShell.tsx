import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  KeyRound,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Sparkles,
  Sliders,
  AlertTriangle,
  CheckCircle,
  Database,
  ArrowLeft,
  Activity,
  FileText,
} from 'lucide-react';
import { HealthStatusResponse } from '../../shared/types';

interface CapabilitiesState {
  phase: string;
  architecture: string;
  capabilities: {
    singleOwnerStore: { status: string; notes: string };
    adminAuthentication: { status: string; notes: string };
    totpMfa: { status: string; notes: string };
    privateImageStorage: { status: string; notes: string };
    paymentProcessing: { status: string; notes: string };
    productionSeo: { status: string; notes: string };
    nativeAndroidClient: { status: string; notes: string };
  };
}

interface AdminShellProps {
  onBackToStore: () => void;
  health: HealthStatusResponse | null;
}

export const AdminShell: React.FC<AdminShellProps> = ({ onBackToStore, health }) => {
  const [activeTab, setActiveTab] = useState<'kpis' | 'products' | 'templates' | 'orders' | 'logs'>('kpis');
  const [email, setEmail] = useState('admin@personalisedstore.in');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capabilities, setCapabilities] = useState<CapabilitiesState | null>(null);

  const isDbConnected = Boolean(health?.database.connected);
  const isLoginBlocked = !isDbConnected;

  useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/auth/capabilities')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) {
          setCapabilities(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAttemptLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoginBlocked) {
      setAuthError('Authentication blocked: Live MySQL 8 / compatible MariaDB is not connected. No mock bypass permitted.');
      return;
    }
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/v1/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, mfaCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.message || 'Access Denied: Authentication credentials rejected.');
      }
    } catch {
      setAuthError('Connection error or server rejected admin request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 min-h-screen text-slate-100 py-6">
      <div className="max-w-7xl mx-auto px-4">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToStore}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Store</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg text-white">PERSONALISED STORE</span>
              <span className="bg-amber-500 text-indigo-950 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                Admin Shell
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isDbConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span className="text-slate-400">
              Database: {isDbConnected ? 'Connected' : 'MySQL 8 / compatible MariaDB Unconnected (Preview)'}
            </span>
          </div>
        </div>

        {/* Security Warning Notice */}
        <div className="mt-6 p-4 bg-amber-950/60 border border-amber-800/80 rounded-lg text-amber-200 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>SECURITY ARCHITECTURE CONTRACT ENFORCED (Phase 2B-1)</span>
          </div>
          <p className="text-amber-200/90 leading-relaxed">
            Administrative operations and live database modifications require a live MySQL 8 or compatible MariaDB 10+ database.
            Simulated mock logins are prohibited. Single-owner identity is bootstrapped exclusively via the local CLI:
            <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 mx-1 font-mono">npm run owner:bootstrap</code>
            with scrypt password hashing and mandatory RFC 6238 TOTP MFA (awaiting DB connection and owner enrollment).
          </p>
        </div>

        {/* Main Grid: Staff Authentication Gate & Dashboard Shell Preview */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Staff Login Form */}
          <div className="lg:col-span-4 bg-slate-800/80 border border-slate-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Store Owner / Staff Login</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                isDbConnected
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : 'bg-amber-950 text-amber-300 border-amber-700'
              }`}>
                {isDbConnected ? 'DB Active' : 'DB Gated'}
              </span>
            </div>

            {/* Prominent Login Disabled / Gated Banner when database unavailable */}
            {isLoginBlocked && (
              <div className="p-3 bg-amber-950/70 border border-amber-800 rounded-lg text-amber-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Admin Login Blocked (Awaiting Database)</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Live staff authentication strictly fails closed while MySQL 8 / compatible MariaDB is unconnected. No mock login bypass is permitted.
                </p>
              </div>
            )}

            <form onSubmit={handleAttemptLogin} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Staff Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoginBlocked || isSubmitting}
                  className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Staff Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isLoginBlocked || isSubmitting}
                  className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span>TOTP MFA Token {isDbConnected ? '(RFC 6238 Required)' : '(Awaiting Owner Enrollment)'}</span>
                  <span className="text-[10px] text-amber-400">6 digits</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    disabled={isLoginBlocked || isSubmitting}
                    className="w-full text-xs pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded text-white font-mono tracking-widest focus:outline-none focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  RFC 6238 TOTP engine compiled. Requires database connection &amp; CLI owner enrollment to activate.
                </div>
              </div>

              {authError && (
                <div className="p-2.5 bg-rose-950/80 border border-rose-800 text-rose-300 rounded text-xs flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoginBlocked || isSubmitting}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-950 font-black text-xs rounded transition-colors shadow-md"
              >
                {isLoginBlocked
                  ? 'Login Blocked (Database Unconnected)'
                  : isSubmitting
                  ? 'Verifying with Server...'
                  : 'Authorize Admin Session'}
              </button>
            </form>

            {/* Live Capability Readiness from GET /api/v1/auth/capabilities */}
            {capabilities && (
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-700 text-[10px] space-y-1.5">
                <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between border-b border-slate-800 pb-1">
                  <span>Backend Capability Readiness</span>
                  <span className="text-amber-400 font-mono text-[9px] uppercase">
                    {capabilities.phase.split(' ')[0]}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Auth Engine:</span>
                  <span className={`font-mono font-semibold ${
                    capabilities.capabilities.adminAuthentication.status === 'OPERATIONAL'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}>
                    {capabilities.capabilities.adminAuthentication.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>TOTP MFA:</span>
                  <span className={`font-mono font-semibold ${
                    capabilities.capabilities.totpMfa.status === 'OPERATIONAL'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}>
                    {capabilities.capabilities.totpMfa.status}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-700 text-[11px] text-slate-400 space-y-1.5">
              <div className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span>
                  <strong className="text-slate-300">MFA Engine:</strong> RFC 6238 TOTP (HMAC-SHA1) with AES-256-GCM encrypted secrets at rest; awaiting live DB &amp; owner enrollment via CLI.
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span>
                  <strong className="text-slate-300">Session Engine:</strong> 32-byte opaque crypto-random tokens (SHA-256 hashed in DB, HttpOnly SameSite=Strict cookie, CSRF protected — not JWT).
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span>
                  <strong className="text-slate-300">Password Security:</strong> Node.js 22 crypto.scrypt (N=16384, r=8, p=1, maxmem=32MB ceiling for shared hosting).
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span>
                  <strong className="text-slate-300">Access Gating:</strong> Staff authentication strictly blocked when database is unconnected (zero mock bypass).
                </span>
              </div>
            </div>
          </div>

          {/* Right: Operational Dashboard Shell (Design Preview) */}
          <div className="lg:col-span-8 bg-slate-800/80 border border-slate-700 rounded-xl p-5 space-y-5">
            {/* Nav Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-700 pb-3 overflow-x-auto">
              <button
                onClick={() => setActiveTab('kpis')}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'kpis'
                    ? 'bg-amber-500 text-indigo-950'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Operational KPIs</span>
              </button>

              <button
                onClick={() => setActiveTab('products')}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'products'
                    ? 'bg-amber-500 text-indigo-950'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Catalog (6 Active)</span>
              </button>

              <button
                onClick={() => setActiveTab('templates')}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'templates'
                    ? 'bg-amber-500 text-indigo-950'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Personalisation Templates</span>
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'orders'
                    ? 'bg-amber-500 text-indigo-950'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Print &amp; Orders Queue</span>
              </button>

              <button
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'logs'
                    ? 'bg-amber-500 text-indigo-950'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Security Audit Log</span>
              </button>
            </div>

            {/* Tab: KPIs (Explicitly marked DEMO METRICS) */}
            {activeTab === 'kpis' && (
              <div className="space-y-4">
                <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded text-[11px] text-amber-300 font-semibold">
                  ⚠️ DEMO METRICS: The figures below are simulated layout telemetry for the Phase 1 dashboard shell, not live business revenue.
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                    <span className="text-[10px] text-amber-400 block font-bold uppercase tracking-wider">Demo Metric</span>
                    <span className="text-[11px] text-slate-400 block">Sample Daily GMV</span>
                    <span className="text-lg font-black text-white">₹42,850</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Simulated projection</span>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                    <span className="text-[10px] text-amber-400 block font-bold uppercase tracking-wider">Demo Metric</span>
                    <span className="text-[11px] text-slate-400 block">Sample Print Queue</span>
                    <span className="text-lg font-black text-amber-400">14 Orders</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Workshop pipeline model</span>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                    <span className="text-[10px] text-amber-400 block font-bold uppercase tracking-wider">Demo Metric</span>
                    <span className="text-[11px] text-slate-400 block">Sample Proof Queue</span>
                    <span className="text-lg font-black text-sky-400">5 Pending</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Digital proof review</span>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                    <span className="text-[10px] text-amber-400 block font-bold uppercase tracking-wider">Demo Metric</span>
                    <span className="text-[11px] text-slate-400 block">Sample Dispatches</span>
                    <span className="text-lg font-black text-emerald-400">28 Orders</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Simulated courier batch</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>Database &amp; API Health Status</span>
                    <span className="text-[11px] text-slate-400">
                      Uptime: {health?.uptimeSeconds || 0}s
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">
                    Provider: <strong className="text-white">MySQL 8.0 / Compatible MariaDB 10+ (Single Owner)</strong>
                  </div>
                  <div className="text-xs text-slate-400">
                    Message: {health?.database.message}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Products */}
            {activeTab === 'products' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Product Catalog Management (Single-Owner Store)</span>
                  <span className="text-slate-400 text-[11px]">Database modifications locked</span>
                </div>
                <div className="divide-y divide-slate-700 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden text-xs">
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">Heritage Teak Wood 3-Photo Frame</span>
                      <div className="text-[11px] text-slate-400">SKU: IND-FRM-001 · ₹899 · 3 Variants</div>
                    </div>
                    <span className="text-emerald-400 font-semibold">Active</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">Colour Reveal Magic Photo Mug</span>
                      <div className="text-[11px] text-slate-400">SKU: IND-MUG-002 · ₹399 · 2 Finishes</div>
                    </div>
                    <span className="text-emerald-400 font-semibold">Active</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">Spotify Code Stainless Steel Keychain</span>
                      <div className="text-[11px] text-slate-400">SKU: IND-KEY-005 · ₹249 · 3 Colors</div>
                    </div>
                    <span className="text-emerald-400 font-semibold">Active</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Templates */}
            {activeTab === 'templates' && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300">
                  Customisation Template Schema Specifications
                </div>
                <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 text-xs font-mono text-slate-300 space-y-2">
                  <div className="text-amber-400">// Example: CustomisationSlot Schema Definition</div>
                  <pre className="text-[11px] leading-relaxed text-slate-300 overflow-x-auto">
{`{
  "templateKey": "teak_collage_3",
  "schemaVersion": 1,
  "slots": [
    { "slotKey": "family_title", "slotType": "TEXT", "maxLength": 35, "required": true },
    { "slotKey": "special_year", "slotType": "TEXT", "maxLength": 20, "required": false },
    { "slotKey": "photo_slot_1", "slotType": "PHOTO", "aspectRatio": "3:4", "maxFileSizeMb": 12 },
    { "slotKey": "photo_slot_2", "slotType": "PHOTO", "aspectRatio": "3:4", "maxFileSizeMb": 12 },
    { "slotKey": "photo_slot_3", "slotType": "PHOTO", "aspectRatio": "3:4", "maxFileSizeMb": 12 }
  ]
}`}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab: Orders Queue */}
            {activeTab === 'orders' && (
              <div className="p-8 text-center text-slate-400 space-y-2 bg-slate-900 rounded-lg border border-slate-700">
                <ShoppingBag className="w-8 h-8 mx-auto text-amber-500/80" />
                <div className="font-bold text-white text-sm">Print Workshop Queue</div>
                <div className="text-xs max-w-sm mx-auto">
                  Live orders are queued here once customers checkout. Connect MySQL 8 or compatible MariaDB to store customer orders.
                </div>
              </div>
            )}

            {/* Tab: Audit Logs */}
            {activeTab === 'logs' && (
              <div className="space-y-2 text-xs">
                <div className="text-xs font-bold text-slate-300">Immutable Audit Trail (PII-Scrubbed)</div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="p-2 bg-slate-900 rounded border border-slate-700 text-slate-300 flex justify-between">
                    <span>[SYSTEM_INIT] Server started with Node.js 22 + Express REST API v1</span>
                    <span className="text-slate-500">2026-10-26T03:45:00Z</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-700 text-slate-300 flex justify-between">
                    <span>[AUTH_GATE] Admin login blocked (MySQL 8 / compatible MariaDB unconnected preview mode)</span>
                    <span className="text-amber-400">503 Service Unavailable</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-700 text-slate-300 flex justify-between">
                    <span>[RATE_LIMIT] Sliding window in-memory limiter active (120 req/min)</span>
                    <span className="text-emerald-400">Enforced</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
