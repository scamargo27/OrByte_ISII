import { useState } from 'react'
import { login } from '../api/auth'
import logo from '../assets/logo.png'
import './Login.css'

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(email, password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('usuario', JSON.stringify(data.usuario))
      onLogin(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <img src={logo} alt="OrByte logo" className="login-logo" />
        <h1 className="login-title">OrByte</h1>
        <p className="login-subtitle">Gestor de pedidos de periféricos</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label>Correo electrónico</label>
            <input
              type="email"
              placeholder="correo@orbyte.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="login-footer">© 2026 OrByte · Gestión de pedidos</p>
      </div>
    </div>
  )
}
