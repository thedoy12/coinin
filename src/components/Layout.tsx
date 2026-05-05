import { Link, Outlet } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Gamepad2, ImageUp, User, LogOut, Shield, Search, Radio } from "lucide-react";

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col gaming-bg text-white relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 neon-grid opacity-50" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-40 scanline opacity-40" />
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-cyan-300/20 bg-slate-950/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="angle-card bg-cyan-300 p-2 pulse-pop">
                <Gamepad2 className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <span className="block text-xl font-black uppercase italic tracking-wide bg-gradient-to-r from-cyan-200 via-white to-amber-300 bg-clip-text text-transparent">
                  CoinIn
                </span>
                <span className="hidden text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300/70 sm:block">
                  top up arena
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <Link to="/games">
                <Button variant="ghost" size="sm" className="rounded-none text-slate-300 hover:bg-cyan-300/10 hover:text-cyan-100">
                  <Gamepad2 className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Games</span>
                </Button>
              </Link>
              <Link to="/status">
                <Button variant="ghost" size="sm" className="rounded-none text-slate-300 hover:bg-cyan-300/10 hover:text-cyan-100">
                  <Search className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Status</span>
                </Button>
              </Link>
              {isAuthenticated && user?.role === "admin" && (
                <>
                  <Link to="/admin/thumbnails">
                    <Button variant="ghost" size="sm" className="rounded-none text-slate-300 hover:text-white hover:bg-cyan-300/10">
                      <ImageUp className="w-4 h-4 mr-1.5" />
                      <span className="hidden sm:inline">Images</span>
                    </Button>
                  </Link>
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" className="rounded-none text-slate-300 hover:text-white hover:bg-cyan-300/10">
                      <Shield className="w-4 h-4 mr-1.5" />
                      Admin
                    </Button>
                  </Link>
                </>
              )}

              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">{user?.name || "User"}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="rounded-none text-slate-400 hover:text-red-400 hover:bg-red-950/30"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Link to="/login">
                  <Button
                    size="sm"
                    className="angle-card rounded-none bg-cyan-300 hover:bg-cyan-200 text-slate-950 font-black uppercase"
                  >
                    Masuk
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-cyan-300/15 bg-slate-950/70 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="angle-card bg-cyan-300 p-1.5">
                <Radio className="w-4 h-4 text-slate-950" />
              </div>
              <span className="font-black uppercase italic text-slate-200">CoinIn</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              QRIS // VA // E-Wallet // Status Real-Time
            </p>
            <p className="text-sm text-slate-600">
              &copy; {new Date().getFullYear()} CoinIn. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
