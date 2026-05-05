import { Routes, Route } from 'react-router'
import Layout from './components/Layout'
import Home from './pages/Home'
import Games from './pages/Games'
import GameDetail from './pages/GameDetail'
import Checkout from './pages/Checkout'
import Status from './pages/Status'
import AdminDashboard from './pages/AdminDashboard'
import GameThumbnails from './pages/GameThumbnails'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/games" element={<Games />} />
        <Route path="/game/:slug" element={<GameDetail />} />
        <Route path="/checkout/:referenceId" element={<Checkout />} />
        <Route path="/status" element={<Status />} />
        <Route path="/status/:referenceId" element={<Status />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/thumbnails" element={<GameThumbnails />} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
