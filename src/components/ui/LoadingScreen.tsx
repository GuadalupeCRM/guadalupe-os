export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-areia flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-verde-pale border-t-verde-vivid rounded-full animate-spin mx-auto mb-4" />
        <p className="text-verde-vivid font-sans text-sm tracking-wider uppercase">Carregando…</p>
      </div>
    </div>
  )
}
