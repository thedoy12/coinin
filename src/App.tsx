import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

const Games = lazy(() => import("./pages/Games"));
const GameDetail = lazy(() => import("./pages/GameDetail"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Status = lazy(() => import("./pages/Status"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const GameThumbnails = lazy(() => import("./pages/GameThumbnails"));
const Login = lazy(() => import("./pages/Login"));
const AboutPage = lazy(() =>
  import("./pages/InfoPages").then((module) => ({ default: module.AboutPage })),
);
const ContactPage = lazy(() =>
  import("./pages/InfoPages").then((module) => ({ default: module.ContactPage })),
);
const PrivacyPolicyPage = lazy(() =>
  import("./pages/InfoPages").then((module) => ({ default: module.PrivacyPolicyPage })),
);
const TermsPage = lazy(() =>
  import("./pages/InfoPages").then((module) => ({ default: module.TermsPage })),
);

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-20 text-sm font-black uppercase tracking-[0.24em] text-cyan-200">
      Loading Arena...
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/games" element={<Games />} />
          <Route path="/game/:slug" element={<GameDetail />} />
          <Route path="/checkout/:referenceId" element={<Checkout />} />
          <Route path="/status" element={<Status />} />
          <Route path="/status/:referenceId" element={<Status />} />
          <Route path="/tentang-kami" element={<AboutPage />} />
          <Route path="/kontak" element={<ContactPage />} />
          <Route path="/kebijakan-privasi" element={<PrivacyPolicyPage />} />
          <Route path="/ketentuan-layanan" element={<TermsPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/thumbnails" element={<GameThumbnails />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
