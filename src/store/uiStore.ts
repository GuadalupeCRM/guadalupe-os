import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  activeAlert: string | null
  agentPanelOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setActiveAlert: (alert: string | null) => void
  clearAlert: () => void
  toggleAgentPanel: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeAlert: null,
  agentPanelOpen: false,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveAlert: (alert) => set({ activeAlert: alert }),
  clearAlert: () => set({ activeAlert: null }),
  toggleAgentPanel: () => set((s) => ({ agentPanelOpen: !s.agentPanelOpen })),
}))
