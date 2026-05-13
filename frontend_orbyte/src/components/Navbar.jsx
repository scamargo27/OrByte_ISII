import logo from '../assets/logo.png'
import './Navbar.css'

const ROL_LABEL = { admin: 'Admin', trabajador: 'Vendedor', cliente: 'Cliente' }

export default function Navbar({ usuario, activeTab, onTabChange, onLogout }) {
  const esAdmin   = usuario.rol === 'admin'
  const esCliente = usuario.rol === 'cliente'

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <img src={logo} alt="OrByte" className="navbar-logo" />
        <div className="navbar-brand-wrap">
          <span className="navbar-brand">OrByte</span>
          <span className="navbar-tagline">Gestor de pedidos</span>
        </div>
      </div>

      {esAdmin && (
        <div className="navbar-tabs">
          <button
            className={`navbar-tab ${activeTab === 'pedidos' ? 'active' : ''}`}
            onClick={() => onTabChange('pedidos')}
          >
            Mis Pedidos
          </button>
          <button
            className={`navbar-tab ${activeTab === 'consolidado' ? 'active' : ''}`}
            onClick={() => onTabChange('consolidado')}
          >
            Informe Consolidado
          </button>
          {esAdmin && (
            <button
              className={`navbar-tab ${activeTab === 'grafico' ? 'active' : ''}`}
              onClick={() => onTabChange('grafico')}
            >
              Informes Gráficos
            </button>
          )}
          {esAdmin && (
            <button
              className={`navbar-tab ${activeTab === 'interop' ? 'active' : ''}`}
              onClick={() => onTabChange('interop')}
            >
              Interoperabilidad
            </button>
          )}
        </div>
      )}

      <div className="navbar-right">
        <span className="navbar-role">{ROL_LABEL[usuario.rol] || usuario.rol}</span>
        <div className="navbar-user">
          <span className="navbar-user-name">{usuario.nombre}</span>
          <span className="navbar-user-email">{usuario.email}</span>
        </div>
        <button className="navbar-logout" onClick={onLogout} title="Cerrar sesión">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </nav>
  )
}
