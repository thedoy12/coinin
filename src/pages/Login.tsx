import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/providers/trpc";
import { useSEO } from "@/hooks/useSEO";
import { ArrowLeft, Gamepad2, Lock, Mail, User, Coins, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  useSEO({
    title: "Login CoinIn - Masuk Akun Top Up Game",
    description:
      "Masuk atau daftar akun CoinIn untuk mengelola transaksi top up game, cek status order, dan akses owner console.",
    canonicalPath: "/login",
    keywords: "login coinin, akun top up game, daftar coinin",
    noindex: true,
  });

  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginPending, setLoginPending] = useState(false);
  const [form, setForm] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
  });

  const register = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Akun berhasil dibuat");
      navigate("/");
    },
    onError: (error) => toast.error(error.message),
  });

  const loginDirectly = async () => {
    setLoginPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          login: form.username,
          password: form.password,
        }),
      });
      const result = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Gagal login");
      }
      await utils.auth.me.invalidate();
      toast.success("Berhasil masuk");
      navigate("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal login");
    } finally {
      setLoginPending(false);
    }
  };

  const submit = () => {
    if (mode === "login") {
      void loginDirectly();
      return;
    }

    register.mutate({
      username: form.username,
      name: form.name,
      email: form.email,
      password: form.password,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center gaming-bg px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 neon-grid opacity-50" />
      <Link to="/" className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
        <Button variant="ghost" size="sm" className="rounded-none text-slate-300 hover:bg-cyan-300/10 hover:text-cyan-100">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
      </Link>
      <div className="pointer-events-none absolute left-10 top-20 coin-float rounded-2xl border border-amber-400/30 bg-slate-950/70 p-3">
        <Coins className="h-8 w-8 text-amber-300" />
      </div>
      <div className="pointer-events-none absolute bottom-16 right-10 coin-float-delayed rounded-2xl border border-cyan-300/30 bg-slate-950/70 p-3">
        <Sparkles className="h-8 w-8 text-cyan-200" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-amber-500 p-3 rounded-xl inline-flex mb-4 pulse-pop shadow-lg shadow-amber-500/30">
            <Gamepad2 className="w-8 h-8 text-slate-950" />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-amber-300 via-cyan-200 to-rose-300 bg-clip-text text-transparent">CoinIn</h1>
          <p className="text-slate-400 mt-1">Masuk ke akun pembeli atau owner console</p>
        </div>

        <Card className="hud-frame bg-slate-950/85 border-cyan-300/20 rounded-none backdrop-blur-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-white text-lg">
              {mode === "login" ? "Masuk" : "Buat Akun"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={mode === "login" ? "default" : "outline"}
                onClick={() => setMode("login")}
                className={mode === "login" ? "bg-amber-500 text-slate-950 hover:bg-amber-600" : "border-slate-700 text-slate-300 hover:bg-slate-800"}
              >
                Login
              </Button>
              <Button
                variant={mode === "register" ? "default" : "outline"}
                onClick={() => setMode("register")}
                className={mode === "register" ? "bg-amber-500 text-slate-950 hover:bg-amber-600" : "border-slate-700 text-slate-300 hover:bg-slate-800"}
              >
                Daftar
              </Button>
            </div>

            <Field label={mode === "login" ? "Username atau Email" : "Username"} icon={<User className="w-4 h-4" />}>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder={mode === "login" ? "username atau email" : "username"}
                className="bg-slate-950 border-slate-700 text-white focus-visible:ring-cyan-300/50"
              />
            </Field>

            {mode === "register" && (
              <>
                <Field label="Nama Lengkap" icon={<User className="w-4 h-4" />}>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nama lengkap"
                    className="bg-slate-950 border-slate-700 text-white focus-visible:ring-cyan-300/50"
                  />
                </Field>
                <Field label="Email" icon={<Mail className="w-4 h-4" />}>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com"
                    className="bg-slate-950 border-slate-700 text-white focus-visible:ring-cyan-300/50"
                  />
                </Field>
              </>
            )}

            <Field label="Password" icon={<Lock className="w-4 h-4" />}>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimal 8 karakter"
                className="bg-slate-950 border-slate-700 text-white focus-visible:ring-cyan-300/50"
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </Field>

            <Button
              className="angle-card w-full rounded-none bg-cyan-300 hover:bg-cyan-200 text-slate-950 font-black h-11 shadow-lg shadow-cyan-500/20"
              onClick={submit}
              disabled={loginPending || register.isPending}
            >
              {loginPending || register.isPending
                ? "Memproses..."
                : mode === "login"
                ? "Masuk"
                : "Daftar"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-slate-300 mb-1.5 flex items-center gap-2">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}
