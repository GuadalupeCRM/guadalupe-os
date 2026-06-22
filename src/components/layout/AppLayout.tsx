import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, DollarSign, Users, Calendar, Package,
  Megaphone, Heart, BarChart2, ShoppingBag, FileText,
  Settings, Menu, X, LogOut, Bell
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useUIStore } from '../../store/uiStore'
import { useGlobalAlerts } from '../../hooks/useGlobalAlerts'
import { ROLE_LABELS, ROLE_COLORS } from '../../constants/business'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin','comercial','marketing','eventos','financeiro','vendedor'] },
  { path: '/financeiro', label: 'Financeiro', icon: DollarSign, roles: ['admin','financeiro'] },
  { path: '/crm', label: 'CRM', icon: Users, roles: ['admin','comercial','marketing','eventos','financeiro'] },
  { path: '/eventos', label: 'Eventos', icon: Calendar, roles: ['admin','eventos'] },
  { path: '/estoque', label: 'Estoque', icon: Package, roles: ['admin','financeiro','comercial','eventos'] },
  { path: '/marketing', label: 'Marketing', icon: Megaphone, roles: ['admin','marketing'] },
  { path: '/afiliadas', label: 'Afiliadas', icon: Heart, roles: ['admin','marketing'] },
  { path: '/ads', label: 'Ads', icon: BarChart2, roles: ['admin','marketing'] },
  { path: '/b2c', label: 'B2C', icon: ShoppingBag, roles: ['admin','marketing'] },
  { path: '/relatorios', label: 'Relatórios', icon: FileText, roles: ['admin','financeiro'] },
  { path: '/configuracoes', label: 'Config', icon: Settings, roles: ['admin'] },
]

export default function AppLayout() {
  const { profile, role, isProfileLoading, logout } = useAuth()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  useGlobalAlerts() // alertas realtime: caixa, insights, eventos

  // Enquanto profile carrega, mostra todos os itens (evita sidebar vazio)
  // Após carregar, filtra por role normalmente
  const navItems = isProfileLoading
    ? NAV_ITEMS
    : NAV_ITEMS.filter(item => role && item.roles.includes(role))

  const initials = profile?.full_name
    ?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'

  return (
    <div className="flex h-screen bg-areia overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-areia-warm border-r border-gray-200 transition-all duration-200 ${sidebarOpen ? 'w-60' : 'w-16'}`}>
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-gray-200">
          {sidebarOpen ? (
            <span className="font-serif text-2xl text-verde-vivid">Guadalupe</span>
          ) : (
            <span className="font-serif text-2xl text-verde-vivid">G</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors font-sans font-medium text-sm ${
                  isActive
                    ? 'bg-verde-pale text-verde-vivid border-l-4 border-verde-vivid'
                    : 'text-gray-600 hover:bg-areia hover:text-gray-900'
                }`
              }
            >
              <item.icon size={18} />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-verde-vivid text-white flex items-center justify-center text-xs font-bold font-sans flex-shrink-0">
              {initials}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold font-sans truncate">{profile?.full_name}</p>
                <span className={`text-xs font-sans px-1.5 py-0.5 rounded-full ${role ? ROLE_COLORS[role] : ''}`}>
                  {role ? ROLE_LABELS[role] : ''}
                </span>
              </div>
            )}
            <button onClick={logout} className="text-gray-400 hover:text-rosa-vivid ml-auto">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-areia-warm border-b border-gray-200 h-14 flex items-center px-4">
        <button onClick={() => setMobileOpen(true)} className="text-gray-600">
          <Menu size={22} />
        </button>
        <span className="font-serif text-xl text-verde-vivid mx-auto">Guadalupe</span>
        <Bell size={20} className="text-gray-500" />
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-areia-warm flex flex-col">
            <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200">
              <span className="font-serif text-xl text-verde-vivid">Guadalupe</span>
              <button onClick={() => setMobileOpen(false)}><X size={20} /></button>
            </div>
            <nav className="flex-1 py-4 overflow-y-auto">
              {navItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 font-sans font-medium text-sm ${
                      isActive ? 'text-verde-vivid bg-verde-pale' : 'text-gray-600'
                    }`
                  }
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="p-4 border-t border-gray-200">
              <button onClick={logout} className="flex items-center gap-2 text-gray-500 font-sans text-sm">
                <LogOut size={16} /> Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
