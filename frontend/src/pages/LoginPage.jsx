import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, AlertCircle, ArrowRight, ShieldCheck, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { InveniqLogo } from '../components/common/InveniqLogo';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/app/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Invalid username or password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userRole, pass) => {
    setUsername(userRole);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 text-slate-900 font-sans selection:bg-red-500 selection:text-white">
      {/* Top Bar with Logo & Return Link */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <InveniqLogo showText={true} iconClassName="h-8 w-auto" />
          </Link>
          <div className="text-xs text-slate-500 font-medium">
            Don't have an account?{' '}
            <Link to="/" className="text-[#E11900] font-bold hover:underline">
              Explore Demo
            </Link>
          </div>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-[440px]">
          
          <div className="bg-white border border-slate-200 rounded-sm p-8 sm:p-10 shadow-sm">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Sign In
              </h1>
              <div className="w-8 h-1 bg-[#E11900] mt-2 mb-3"></div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Access your InvenIQ warehouse catalog, real-time scan terminal, and AI intelligence suite.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-[2px] bg-red-50 p-3.5 text-xs text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#E11900]" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="admin, manager, or staff"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-[2px] border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#E11900] focus:outline-none focus:ring-1 focus:ring-[#E11900] transition-colors"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-[2px] border border-slate-300 bg-white pl-10 pr-11 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#E11900] focus:outline-none focus:ring-1 focus:ring-[#E11900] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button (Zoho Red) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-[2px] bg-[#E11900] hover:bg-[#c81600] py-3.5 text-xs sm:text-sm font-bold text-white tracking-wider uppercase shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-60 transition-all"
              >
                {loading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>SIGN IN TO INVENIQ</span>
                    <ChevronRight className="h-4 w-4 stroke-[3]" />
                  </>
                )}
              </button>
            </form>

            {/* Fast Evaluator Credentials */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center mb-3">
                Pre-Loaded Evaluator Demo Roles
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => fillCredentials('admin', 'admin123')}
                  className="rounded-[2px] border border-slate-200 bg-slate-50 hover:bg-slate-100 p-2 text-center transition-colors group"
                >
                  <div className="text-[11px] font-bold text-purple-700 group-hover:text-purple-900">ADMIN</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">admin123</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('manager', 'manager123')}
                  className="rounded-[2px] border border-slate-200 bg-slate-50 hover:bg-slate-100 p-2 text-center transition-colors group"
                >
                  <div className="text-[11px] font-bold text-blue-700 group-hover:text-blue-900">MANAGER</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">manager123</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('staff', 'staff123')}
                  className="rounded-[2px] border border-slate-200 bg-slate-50 hover:bg-slate-100 p-2 text-center transition-colors group"
                >
                  <div className="text-[11px] font-bold text-emerald-700 group-hover:text-emerald-900">STAFF</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">staff123</div>
                </button>
              </div>
            </div>

          </div>

          <div className="text-center mt-6 text-xs text-slate-400">
            Protected by stateless JWT authentication &amp; BCrypt encryption.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        InvenIQ Inventory Suite &bull; FastAPI + SQLAlchemy SQLite + React 18
      </footer>
    </div>
  );
};

export default LoginPage;
