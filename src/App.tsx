import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import AuthGuard from './components/layout/AuthGuard'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/auth/LoginPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import DashboardPage from './pages/dashboard/DashboardPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
})

// Lazy load módulos
const FinanceiroPage = lazy(() => import('./pages/financeiro/FinanceiroPage'))
const CrmPage = lazy(() => import('./pages/crm/CRMPage'))
const EventosPage = lazy(() => import('./pages/eventos/EventosPage'))
const EstoquePage = lazy(() => import('./pages/estoque/EstoquePage'))
const MarketingPage = lazy(() => import('./pages/marketing/MarketingPage'))
const AfiliadasPage = lazy(() => import('./pages/afiliadas/AfiliadasPage'))
const AdsPage = lazy(() => import('./pages/ads/AdsPage'))
const B2cPage = lazy(() => import('./pages/b2c/B2CPage'))
const RelatoriosPage = lazy(() => import('./pages/relatorios/RelatoriosPage'))
const ConfiguracoesPage = lazy(() => import('./pages/configuracoes/ConfiguracoesPage'))

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-verde-vivid border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            success: { style: { background: '#E6F0D7', color: '#2a6600', border: '1px solid #6BB42E' } },
            error: { style: { background: '#FBE4EA', color: '#c0002c', border: '1px solid #E21655' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
          <Route
            element={
              <AuthGuard>
                <AppLayout />
              </AuthGuard>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/financeiro" element={<Suspense fallback={<LoadingFallback />}><FinanceiroPage /></Suspense>} />
            <Route path="/crm" element={<Suspense fallback={<LoadingFallback />}><CrmPage /></Suspense>} />
            <Route path="/eventos" element={<Suspense fallback={<LoadingFallback />}><EventosPage /></Suspense>} />
            <Route path="/estoque" element={<Suspense fallback={<LoadingFallback />}><EstoquePage /></Suspense>} />
            <Route path="/marketing" element={<Suspense fallback={<LoadingFallback />}><MarketingPage /></Suspense>} />
            <Route path="/afiliadas" element={<Suspense fallback={<LoadingFallback />}><AfiliadasPage /></Suspense>} />
            <Route path="/ads" element={<Suspense fallback={<LoadingFallback />}><AdsPage /></Suspense>} />
            <Route path="/b2c" element={<Suspense fallback={<LoadingFallback />}><B2cPage /></Suspense>} />
            <Route path="/relatorios" element={<Suspense fallback={<LoadingFallback />}><RelatoriosPage /></Suspense>} />
            <Route path="/configuracoes" element={<Suspense fallback={<LoadingFallback />}><ConfiguracoesPage /></Suspense>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
