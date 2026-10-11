import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Globe, 
  ChevronDown, 
  ChevronUp,
  ArrowRight, 
  Boxes, 
  Barcode, 
  BrainCircuit, 
  Sliders, 
  Truck, 
  FileText, 
  ShieldCheck, 
  Zap, 
  TrendingUp, 
  CheckCircle2, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  Star,
  Quote,
  HelpCircle,
  Package,
  Activity,
  Layers,
  Check
} from 'lucide-react';
import { InveniqLogo } from '../components/common/InveniqLogo';
import { useAuth } from '../context/AuthContext';
import warehouseHero from '../assets/warehouse_hero.jpg';

const LandingPage = () => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [openFaq, setOpenFaq] = useState(0); // First FAQ open by default

  const handleQuickDemo = async (role) => {
    try {
      await login(role, `${role}123`);
      navigate('/app/dashboard');
    } catch (e) {
      navigate('/login');
    }
  };

  const testimonials = [
    {
      name: "Marcus Vance",
      role: "VP of Supply Chain",
      company: "Apex Global Logistics",
      avatarBg: "bg-blue-600",
      avatarInitials: "MV",
      metric: "-34% Holding Costs",
      rating: 5,
      quote: "InvenIQ completely transformed our fulfillment operations. The Wilson EOQ recommendations and automated purchase order generation saved our distribution centers over $45,000 in excess holding costs in our first quarter alone."
    },
    {
      name: "Elena Rostova",
      role: "Warehouse Operations Director",
      company: "Nexa Electronics Hub",
      avatarBg: "bg-emerald-600",
      avatarInitials: "ER",
      metric: "99.8% Floor Accuracy",
      rating: 5,
      quote: "The sub-second barcode scanner terminal combined with instant WebSocket syncing means our floor team never gets out of sync with procurement. We eliminated manual counting errors entirely and prevent overselling during flash promotions."
    },
    {
      name: "David Chen",
      role: "Lead Inventory Controller",
      company: "Summit Retail Enterprises",
      avatarBg: "bg-purple-600",
      avatarInitials: "DC",
      metric: "0 Stockouts in 90 Days",
      rating: 5,
      quote: "The Pareto ABC classification and What-If simulator gave us instant clarity on our dormant capital. The automated safety stock calculation and 1-click supplier replenishment eliminated stockouts across our entire 40+ SKU portfolio."
    }
  ];

  const faqs = [
    {
      question: "How does InvenIQ prevent negative stock and concurrency race conditions?",
      answer: "InvenIQ enforces optimistic version locking and strict transaction-level validation at the database layer. If two operators scan or adjust the same SKU simultaneously, the transaction manager ensures atomic consistency, rejects negative quantities, and immediately broadcasts the updated count to all connected browser tabs via real-time WebSockets."
    },
    {
      question: "Does InvenIQ support physical handheld barcode guns and mobile phone cameras?",
      answer: "Yes, out of the box! The 'Scan & Update' terminal includes an always-focused listener designed specifically for standard USB and Bluetooth barcode scanner guns (Code128). It also includes a built-in webcam / mobile camera scanner with automatic permission detection and a manual SKU search fallback."
    },
    {
      question: "How does the AI Smart Inventory and 1-Click Auto-Order work?",
      answer: "Our analytics engine analyzes your stock transaction ledger to calculate daily velocity, Safety Stock (SS = Z × σd × √L), and Economic Order Quantity (EOQ). When stock drops below the calculated Reorder Point (ROP), the system highlights the risk and allows you to 1-click auto-order individual items or auto-order all deficit items grouped by supplier into consolidated Purchase Orders."
    },
    {
      question: "What user roles and access permissions are supported?",
      answer: "InvenIQ features pre-configured Role-Based Access Control (RBAC): ADMIN (unrestricted access to inventory, user management, audit logs, and settings), MANAGER (full catalog CRUD, purchase order approvals, analytics, and stock adjustments), and STAFF (fast stock IN/OUT barcode scanning and catalog viewing). You can test all three roles with one click on this page."
    },
    {
      question: "Can I export audit logs and valuation reports for finance & tax compliance?",
      answer: "Absolutely. Every stock movement (IN, OUT, ADJUSTMENT, and PO RECEIVE) is recorded in an immutable audit ledger with UTC timestamps and user attribution. You can export the activity feed to CSV at any time, or generate high-resolution, printable PDF stock valuation reports powered by ReportLab."
    },
    {
      question: "Is any external database installation required to run InvenIQ locally?",
      answer: "No external setup is required. InvenIQ runs on a self-contained SQLite database engine with zero external configuration. On initial startup, the automated database seeder populates 42 realistic SKUs, 5 suppliers, 6 categories, and 90 days of historical transactions so all analytics, charts, and forecasts work immediately."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-red-500 selection:text-white">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP CORPORATE NAVBAR                                       */}
      {/* ------------------------------------------------------------- */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-2 group">
              <InveniqLogo showText={true} iconClassName="h-9 w-auto" />
            </Link>

            {/* Navigation Menus with Carets */}
            <nav className="hidden lg:flex items-center gap-8 text-[15px] font-medium text-slate-700">
              {/* Products Dropdown */}
              <div 
                className="relative py-6 group cursor-pointer"
                onMouseEnter={() => setActiveDropdown('products')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <div className="flex items-center gap-1.5 hover:text-[#E11900] transition-colors">
                  <span>Products</span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${activeDropdown === 'products' ? 'rotate-180' : ''}`} />
                </div>
                {activeDropdown === 'products' && (
                  <div className="absolute top-full left-0 w-80 bg-white border border-slate-200 shadow-2xl rounded-sm p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Inventory Core</div>
                    <Link to="/login" className="flex items-start gap-3 p-2.5 rounded hover:bg-slate-50 transition-colors">
                      <Boxes className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">Product Catalog & SKU</div>
                        <div className="text-xs text-slate-500">Comprehensive inventory ledger with batch variants</div>
                      </div>
                    </Link>
                    <Link to="/login" className="flex items-start gap-3 p-2.5 rounded hover:bg-slate-50 transition-colors">
                      <Barcode className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">Scan & Update Terminal</div>
                        <div className="text-xs text-slate-500">Instant USB gun & camera barcode scanner</div>
                      </div>
                    </Link>
                    <Link to="/login" className="flex items-start gap-3 p-2.5 rounded hover:bg-slate-50 transition-colors">
                      <Truck className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">Purchase Order Automation</div>
                        <div className="text-xs text-slate-500">Vendor replenishment with auto-stock receiving</div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              {/* Intelligence Dropdown */}
              <div 
                className="relative py-6 group cursor-pointer"
                onMouseEnter={() => setActiveDropdown('intelligence')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <div className="flex items-center gap-1.5 hover:text-[#E11900] transition-colors">
                  <span>Intelligence</span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${activeDropdown === 'intelligence' ? 'rotate-180' : ''}`} />
                </div>
                {activeDropdown === 'intelligence' && (
                  <div className="absolute top-full left-0 w-80 bg-white border border-slate-200 shadow-2xl rounded-sm p-4 z-50">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">AI Analytics</div>
                    <Link to="/login" className="flex items-start gap-3 p-2.5 rounded hover:bg-slate-50">
                      <BrainCircuit className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">Pareto ABC Classification</div>
                        <div className="text-xs text-slate-500">Identify top 70% value drivers and dead stock</div>
                      </div>
                    </Link>
                    <Link to="/login" className="flex items-start gap-3 p-2.5 rounded hover:bg-slate-50">
                      <Sliders className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">What-If Scenario Simulator</div>
                        <div className="text-xs text-slate-500">Test demand spikes & lead-time shocks</div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              {/* Testimonials anchor */}
              <a href="#testimonials" className="hover:text-[#E11900] transition-colors">
                Testimonials
              </a>

              {/* FAQs anchor */}
              <a href="#faqs" className="hover:text-[#E11900] transition-colors">
                FAQs
              </a>

              {/* Resources */}
              <a href="http://localhost:8080/docs" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#E11900] transition-colors">
                <span>API Docs</span>
                <ExternalLink className="h-3 w-3 text-slate-400" />
              </a>
            </nav>
          </div>

          {/* Right Action Icons & Auth Buttons */}
          <div className="flex items-center gap-6">
            {/* Search */}
            <button 
              onClick={() => setShowSearchModal(true)}
              className="text-slate-700 hover:text-[#E11900] transition-colors"
              title="Search Modules"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Language / Region */}
            <div className="hidden sm:flex items-center gap-1.5 text-[15px] font-medium text-slate-700 cursor-pointer hover:text-[#E11900] transition-colors">
              <Globe className="h-4 w-4" />
              <span>English</span>
            </div>

            {/* Sign In Link */}
            <Link 
              to={isAuthenticated ? "/app/dashboard" : "/login"}
              className="text-[15px] font-semibold text-[#E11900] hover:text-[#b81400] transition-colors"
            >
              {isAuthenticated ? "My Dashboard" : "Sign In"}
            </Link>

            {/* Sign Up / Get Started Red Outlined Button */}
            <Link 
              to={isAuthenticated ? "/app/dashboard" : "/login"}
              className="border-[1.5px] border-[#E11900] text-[#E11900] hover:bg-red-50 text-[14px] font-bold px-5 py-2 rounded-[2px] transition-all tracking-wide"
            >
              {isAuthenticated ? "Open App" : "Sign Up"}
            </Link>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. HERO SECTION WITH WAREHOUSE & INVENTORY MANAGEMENT IMAGE   */}
      {/* ------------------------------------------------------------- */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24 bg-gradient-to-b from-slate-50/70 to-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* LEFT COLUMN: HERO HEADLINE & PITCH */}
            <div className="lg:col-span-6 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-[#E11900] text-xs font-bold uppercase tracking-wider mb-5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Modern Warehouse & Inventory Intelligence</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-slate-900 tracking-[-0.03em] leading-[1.12]">
                Your enterprise inventory,<br />
                powered by real-time intelligence
              </h1>

              {/* Red Accent Horizontal Underline */}
              <div className="w-12 h-1 bg-[#E11900] my-5"></div>

              {/* Subtitle Paragraph */}
              <p className="text-lg sm:text-[20px] text-slate-700 leading-relaxed font-normal max-w-xl">
                A complete, production-grade software suite designed to synchronize your entire supply chain. Built with sub-second barcode tracking, Wilson EOQ optimization, and{' '}
                <span className="border-b-[1.5px] border-dotted border-slate-400 text-slate-900 font-medium">
                  automated 1-click reordering
                </span>
                .
              </p>

              {/* Primary Call to Action Button */}
              <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link
                  to={isAuthenticated ? "/app/dashboard" : "/login"}
                  className="bg-[#E11900] hover:bg-[#c81600] text-white text-[14px] font-bold tracking-wider uppercase px-8 py-4 rounded-[2px] inline-flex items-center gap-3 shadow-md hover:shadow-lg transition-all"
                >
                  <span>GET STARTED FOR FREE</span>
                  <ChevronRight className="h-4 w-4 stroke-[3]" />
                </Link>

                <a 
                  href="#testimonials" 
                  className="text-slate-600 hover:text-slate-900 font-semibold text-sm inline-flex items-center gap-1.5 py-4"
                >
                  <span>Read Customer Stories</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              {/* Fast Evaluator Quick-Login Chips */}
              <div className="mt-8 pt-5 border-t border-slate-200 max-w-lg">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  Quick Demo Evaluation Logins:
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button 
                    onClick={() => handleQuickDemo('admin')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-300 shadow-sm transition-colors"
                  >
                    <span className="h-2 w-2 rounded-full bg-purple-600"></span>
                    Admin <span className="text-slate-400 font-normal">/ admin123</span>
                  </button>
                  <button 
                    onClick={() => handleQuickDemo('manager')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-300 shadow-sm transition-colors"
                  >
                    <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                    Manager <span className="text-slate-400 font-normal">/ manager123</span>
                  </button>
                  <button 
                    onClick={() => handleQuickDemo('staff')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-300 shadow-sm transition-colors"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                    Staff <span className="text-slate-400 font-normal">/ staff123</span>
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: HIGH-TECH WAREHOUSE VISUAL SHOWCASE */}
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-2xl bg-slate-900 group">
                {/* Warehouse Hero Image */}
                <img 
                  src={warehouseHero} 
                  alt="Modern High-Tech Warehouse and Inventory Management Fulfillment Center" 
                  className="w-full h-[440px] sm:h-[480px] object-cover object-center transform group-hover:scale-[1.02] transition-transform duration-500"
                />

                {/* Subtle gradient vignette overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/20 pointer-events-none"></div>

                {/* Floating Telemetry Badge 1: Top Right */}
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-slate-200/80 px-3.5 py-2 flex items-center gap-2.5 animate-in fade-in duration-300">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <div>
                    <div className="text-[11px] font-bold text-slate-900 leading-tight">Live STOMP Sync</div>
                    <div className="text-[10px] text-emerald-600 font-medium">Sub-5ms WebSocket Feed</div>
                  </div>
                </div>

                {/* Floating Telemetry Badge 2: Bottom Left */}
                <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-700/80 px-4 py-3 text-white max-w-[280px] shadow-xl">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Package className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200">Smart Replenishment</span>
                  </div>
                  <div className="text-[11px] text-slate-300 leading-snug">
                    Automated EOQ reorder point triggered for <span className="text-amber-400 font-semibold">Logitech MX Master 3S</span>.
                  </div>
                </div>

                {/* Floating Telemetry Badge 3: Bottom Right */}
                <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-slate-200/80 px-3.5 py-2.5 hidden sm:flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                    <Barcode className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-900">Code128 Scanning</div>
                    <div className="text-[10px] text-slate-500 font-medium">Physical Gun & Camera</div>
                  </div>
                </div>
              </div>

              {/* Bottom decorative stats bar under image */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <div className="text-lg font-extrabold text-[#E11900]">42+ SKUs</div>
                  <div className="text-[11px] text-slate-500 font-medium">Catalog Online</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <div className="text-lg font-extrabold text-emerald-600">99.9%</div>
                  <div className="text-[11px] text-slate-500 font-medium">Scan Precision</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <div className="text-lg font-extrabold text-[#0072BC]">90 Days</div>
                  <div className="text-[11px] text-slate-500 font-medium">Audit Time-Series</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. TESTIMONIALS SECTION                                       */}
      {/* ------------------------------------------------------------- */}
      <section id="testimonials" className="py-20 bg-slate-50 border-t border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-[#E11900] text-xs font-bold uppercase tracking-wider mb-3">
              <Quote className="h-3 w-3" />
              <span>Customer Success</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Trusted by Modern Warehouses & Supply Chains
            </h2>
            <div className="w-12 h-1 bg-[#E11900] mx-auto my-4"></div>
            <p className="text-slate-600 text-base sm:text-lg">
              See how operations leads, logistics directors, and inventory controllers rely on InvenIQ to prevent stockouts and automate replenishment.
            </p>
          </div>

          {/* Testimonial Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((t, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative group"
              >
                <div>
                  {/* Rating Stars & Metric Pill */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400" />
                      ))}
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {t.metric}
                    </span>
                  </div>

                  {/* Quote Text */}
                  <p className="text-slate-700 text-sm sm:text-[15px] leading-relaxed italic mb-6">
                    "{t.quote}"
                  </p>
                </div>

                {/* Author Info */}
                <div className="pt-5 border-t border-slate-100 flex items-center gap-3.5">
                  <div className={`h-11 w-11 rounded-full ${t.avatarBg} text-white font-bold flex items-center justify-center text-sm shadow-sm`}>
                    {t.avatarInitials}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                    <div className="text-xs text-[#0072BC] font-medium">{t.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. FREQUENTLY ASKED QUESTIONS (FAQS) SECTION                  */}
      {/* ------------------------------------------------------------- */}
      <section id="faqs" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#0072BC] text-xs font-bold uppercase tracking-wider mb-3">
              <HelpCircle className="h-3 w-3" />
              <span>Questions & Answers</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <div className="w-12 h-1 bg-[#E11900] mx-auto my-4"></div>
            <p className="text-slate-600 text-base sm:text-lg">
              Everything you need to know about InvenIQ's architecture, hardware compatibility, and automated workflows.
            </p>
          </div>

          {/* FAQ Accordion List */}
          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div 
                  key={index}
                  className={`border rounded-lg transition-all ${
                    isOpen 
                      ? 'border-[#E11900]/40 bg-slate-50/50 shadow-sm' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 font-semibold text-slate-900 text-base sm:text-lg focus:outline-none"
                  >
                    <span className="flex items-center gap-3">
                      <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs shrink-0 font-bold ${
                        isOpen ? 'bg-[#E11900] text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {index + 1}
                      </span>
                      <span>{faq.question}</span>
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-[#E11900] shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-1 text-slate-600 text-sm sm:text-[15px] leading-relaxed border-t border-slate-200/60 ml-9 mr-4">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Support note */}
          <div className="mt-12 text-center p-6 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="font-bold text-slate-900 text-sm">Have more technical or architecture questions?</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Our interactive Swagger API documentation and college viva architecture guide provide complete formulas, schema definitions, and sequence diagrams.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <a 
                href="http://localhost:8080/docs" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 rounded text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <span>Interactive Swagger UI</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Link 
                to="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E11900] text-white rounded text-xs font-bold hover:bg-[#c81600] transition-colors"
              >
                <span>Launch Demo Now</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. CALL TO ACTION BANNER                                      */}
      {/* ------------------------------------------------------------- */}
      <section className="py-20 bg-slate-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800 text-red-300 text-xs font-semibold mb-6">
            <Sparkles className="h-3.5 w-3.5 text-[#E11900]" />
            <span>Zero External Setup Required • Built-in SQLite Persistence</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Ready to streamline your inventory operations?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-xl mx-auto">
            Experience real-time barcode scanning, automated purchase ordering, and AI predictive analytics right inside your browser.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to={isAuthenticated ? "/app/dashboard" : "/login"}
              className="bg-[#E11900] hover:bg-[#c81600] text-white text-sm font-bold tracking-wider uppercase px-8 py-4 rounded-[2px] inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              <span>LAUNCH INVENIQ DASHBOARD</span>
              <ChevronRight className="h-4 w-4 stroke-[3]" />
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 6. CORPORATE FOOTER                                           */}
      {/* ------------------------------------------------------------- */}
      <footer className="bg-slate-100 text-slate-600 text-sm py-16 border-t border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            
            {/* Col 1: Brand & Identity */}
            <div className="col-span-2">
              <InveniqLogo showText={true} iconClassName="h-8 w-auto" />
              <p className="mt-4 text-xs text-slate-500 max-w-sm leading-relaxed">
                InvenIQ is an enterprise-grade Inventory Management and Decision Intelligence platform engineered with a unified Python FastAPI backend, SQLAlchemy SQLite engine, and modern React dashboard.
              </p>
              <div className="mt-4 text-xs text-slate-400">
                &copy; {new Date().getFullYear()} InvenIQ Corporation. All rights reserved.
              </div>
            </div>

            {/* Col 2: Products */}
            <div>
              <div className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-4">Core Apps</div>
              <ul className="space-y-2 text-xs">
                <li><Link to="/login" className="hover:text-[#E11900]">Catalog Management</Link></li>
                <li><Link to="/login" className="hover:text-[#E11900]">Scan & Update Terminal</Link></li>
                <li><Link to="/login" className="hover:text-[#E11900]">Purchase Orders</Link></li>
                <li><Link to="/login" className="hover:text-[#E11900]">Activity Audit Log</Link></li>
                <li><Link to="/login" className="hover:text-[#E11900]">ReportLab PDF Reports</Link></li>
              </ul>
            </div>

            {/* Col 3: Intelligence */}
            <div>
              <div className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-4">Analytics Engine</div>
              <ul className="space-y-2 text-xs">
                <li><Link to="/login" className="hover:text-[#E11900]">Pareto ABC Classification</Link></li>
                <li><Link to="/login" className="hover:text-[#E11900]">What-If Scenario Simulator</Link></li>
                <li><Link to="/login" className="hover:text-[#E11900]">Wilson EOQ Optimization</Link></li>
                <li><Link to="/login" className="hover:text-[#E11900]">Safety Stock Formulas</Link></li>
                <li><Link to="/login" className="hover:text-[#E11900]">Dormant Capital Audits</Link></li>
              </ul>
            </div>

            {/* Col 4: System & Docs */}
            <div>
              <div className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-4">Developer & API</div>
              <ul className="space-y-2 text-xs">
                <li><a href="http://localhost:8080/docs" target="_blank" rel="noreferrer" className="hover:text-[#E11900]">Swagger API Docs</a></li>
                <li><a href="http://localhost:8080/health" target="_blank" rel="noreferrer" className="hover:text-[#E11900]">Backend Health Check</a></li>
                <li><a href="http://localhost:8080/redoc" target="_blank" rel="noreferrer" className="hover:text-[#E11900]">ReDoc Schema</a></li>
                <li><span className="text-slate-400">WebSocket /ws/info</span></li>
                <li><span className="text-slate-400">FastAPI 0.110 + React 18</span></li>
              </ul>
            </div>

          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <div className="flex gap-6">
              <span className="hover:text-slate-800 cursor-pointer">Privacy Policy</span>
              <span className="hover:text-slate-800 cursor-pointer">Terms of Service</span>
              <span className="hover:text-slate-800 cursor-pointer">Security Compliance</span>
              <span className="hover:text-slate-800 cursor-pointer">Cookie Preferences</span>
            </div>
            <div>
              Engineered with clean layered architecture &bull; College Capstone Enterprise Project
            </div>
          </div>
        </div>
      </footer>

      {/* ------------------------------------------------------------- */}
      {/* 7. QUICK SEARCH MODAL POPUP                                   */}
      {/* ------------------------------------------------------------- */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-24 px-4 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 w-full max-w-lg rounded shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-base">Quick Search InvenIQ</h3>
              <button onClick={() => setShowSearchModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>
            <input 
              type="text" 
              placeholder="Search features (e.g. barcode, EOQ, purchase orders, simulator)..."
              autoFocus
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#E11900] mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setShowSearchModal(false);
                  navigate('/login');
                }
              }}
            />
            <div className="text-xs text-slate-500 mb-2 font-semibold">SUGGESTED MODULES</div>
            <div className="space-y-1.5 text-xs">
              <div onClick={() => { setShowSearchModal(false); navigate('/login'); }} className="p-2 hover:bg-slate-50 rounded cursor-pointer flex justify-between">
                <span className="font-medium text-slate-800">Scan & Update Hardware Terminal</span>
                <span className="text-[#0072BC]">Core App</span>
              </div>
              <div onClick={() => { setShowSearchModal(false); navigate('/login'); }} className="p-2 hover:bg-slate-50 rounded cursor-pointer flex justify-between">
                <span className="font-medium text-slate-800">Pareto ABC Classification & Turnover</span>
                <span className="text-purple-600">AI Intelligence</span>
              </div>
              <div onClick={() => { setShowSearchModal(false); navigate('/login'); }} className="p-2 hover:bg-slate-50 rounded cursor-pointer flex justify-between">
                <span className="font-medium text-slate-800">What-If Multi-Variable Simulator</span>
                <span className="text-red-600">Simulator</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
