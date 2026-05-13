import { useState } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [usuario, setUsuario] = useState(() => {
    const stored = localStorage.getItem('usuario')
    return stored ? JSON.parse(stored) : null
  })

  function handleLogin(data) {
    setUsuario(data.usuario)
  }

  function handleLogout() {
    setUsuario(null)
  }

  if (!usuario) return <Login onLogin={handleLogin} />
  return <Dashboard usuario={usuario} onLogout={handleLogout} />
}
