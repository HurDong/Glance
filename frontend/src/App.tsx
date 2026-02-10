import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light'
  })

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <header className="w-full max-w-2xl flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary">Glance</h1>
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full bg-secondary text-secondary-foreground hover:opacity-80 transition-opacity"
        >
          {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
        </button>
      </header>

      <main className="w-full max-w-2xl bg-card text-card-foreground rounded-lg border shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">금융 소셜 포트폴리오 플랫폼</h2>
        <p className="text-muted-foreground mb-6">
          Vite + React + Tailwind + Capacitor 환경이 성공적으로 구축되었습니다.
          이제 실시간 주식 데이터를 시각화하고 친구들과 공유할 수 있습니다.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-md border bg-muted/50">
            <h3 className="font-medium mb-1">실시간 시세 연동</h3>
            <p className="text-sm text-muted-foreground">백엔드 KIS WebSocket 엔진과 연동 준비 완료</p>
          </div>
          <div className="p-4 rounded-md border bg-muted/50">
            <h3 className="font-medium mb-1">멀티 플랫폼 지원</h3>
            <p className="text-sm text-muted-foreground">Capacitor를 통한 iOS/Android 어플 출시 가능</p>
          </div>
        </div>
      </main>

      <footer className="mt-auto py-8 text-sm text-muted-foreground">
        © 2026 Glance. All rights reserved.
      </footer>
    </div>
  )
}

export default App
