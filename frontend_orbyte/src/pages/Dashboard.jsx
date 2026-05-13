import { useState, useEffect, useMemo } from 'react'
import { getInforme, getEstados } from '../api/pedidos'
import { logout } from '../api/auth'
import Navbar from '../components/Navbar'
import ModalDetalle from '../components/ModalDetalle'
import ModalEditar from '../components/ModalEditar'
import InformesGraficos from '../components/InformesGraficos'
import InformeConsolidado from '../components/InformeConsolidado'
import Interoperabilidad from '../components/Interoperabilidad'
import ModalHistorial from '../components/ModalHistorial'
import ModalRegistrarPedido from '../components/ModalRegistrarPedido'
import './Dashboard.css'

const POR_PAGINA     = 10
const ESTADOS_ACTIVOS = ['Registrado', 'En preparación', 'Enviado']

const BADGE_CLASS = {
  'Registrado':     'badge-registrado',
  'En preparación': 'badge-preparacion',
  'Enviado':        'badge-enviado',
  'Completado':     'badge-completado',
  'Cancelado':      'badge-cancelado',
}

function formatFecha(str) {
  const d = new Date(str)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

function formatPrecio(val) {
  return `$${Number(val).toLocaleString('es-CO')}`
}

function resumirProductos(productos) {
  return productos.map(p => `x${p.cantidad} ${p.producto_nombre}`).join(', ')
}

export default function Dashboard({ usuario, onLogout }) {
  const [pedidos, setPedidos]           = useState([])
  const [estados, setEstados]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [activeTab, setActiveTab]       = useState('pedidos')
  const [buscar, setBuscar]             = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [fechaIni, setFechaIni]         = useState('')
  const [fechaFin, setFechaFin]         = useState('')
  const [pagina, setPagina]             = useState(1)
  const [pedidoDetalle, setPedidoDetalle]     = useState(null)
  const [pedidoEditar, setPedidoEditar]       = useState(null)
  const [pedidoHistorial, setPedidoHistorial] = useState(null)
  const [mostrarRegistrar, setMostrarRegistrar] = useState(false)

  const esAdmin   = usuario.rol === 'admin'
  const esCliente = usuario.rol === 'cliente'

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      try {
        let params
        if (esCliente)       params = { cliente_id: usuario.id }
        else if (esAdmin)    params = {}
        else                 params = { registrado_por_id: usuario.id }

        const promises = [getInforme(params)]
        if (!esCliente) promises.push(getEstados())

        const [informeData, estadosData] = await Promise.all(promises)
        setPedidos(informeData.pedidos)
        if (estadosData) setEstados(estadosData)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [usuario.id])

  useEffect(() => { setPagina(1) }, [buscar, estadoFiltro, fechaIni, fechaFin])

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      if (buscar) {
        const q = buscar.toLowerCase()
        const matchId      = String(p.id).includes(q)
        const matchCliente = p.cliente_nombre.toLowerCase().includes(q)
        const matchCedula  = p.cliente_cedula?.includes(q)
        const matchProd    = p.productos.some(pr => pr.producto_nombre.toLowerCase().includes(q))
        if (!matchId && !matchCliente && !matchCedula && !matchProd) return false
      }
      if (estadoFiltro && p.estado !== estadoFiltro) return false
      if (fechaIni) {
        const fecha = new Date(p.creado_en).toISOString().slice(0, 10)
        if (fecha < fechaIni) return false
      }
      if (fechaFin) {
        const fecha = new Date(p.creado_en).toISOString().slice(0, 10)
        if (fecha > fechaFin) return false
      }
      return true
    })
  }, [pedidos, buscar, estadoFiltro, fechaIni, fechaFin])

  const stats = useMemo(() => {
    const completados  = pedidos.filter(p => p.estado === 'Completado').length
    const porCompletar = pedidos.filter(p => ESTADOS_ACTIVOS.includes(p.estado)).length
    const cancelados   = pedidos.filter(p => p.estado === 'Cancelado').length
    const enCamino     = pedidos.filter(p => p.estado === 'Enviado').length
    const ventas       = pedidos
                           .filter(p => p.estado === 'Completado')
                           .reduce((s, p) => s + Number(p.total), 0)
    return { completados, porCompletar, cancelados, enCamino, ventas }
  }, [pedidos])

  const totalPaginas  = Math.max(1, Math.ceil(pedidosFiltrados.length / POR_PAGINA))
  const pedidosPagina = pedidosFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  function handleCreado(pedido, clienteData) {
    const adaptado = {
      id:             pedido.id,
      cliente_nombre: clienteData.nombre,
      cliente_email:  clienteData.email,
      cliente_cedula: clienteData.cedula,
      registrado_por: pedido.registrado_por,
      estado:         pedido.estado,
      total:          pedido.total,
      creado_en:      pedido.creado_en,
      actualizado_en: pedido.creado_en,
      productos:      pedido.productos,
    }
    setPedidos(prev => [adaptado, ...prev])
    setMostrarRegistrar(false)
  }

  function handleSaved(updated) {
    setPedidos(prev => prev.map(p => p.id === updated.id ? { ...p, estado: updated.estado } : p))
    setPedidoEditar(null)
  }

  async function handleLogout() {
    await logout(localStorage.getItem('token'))
    onLogout()
  }

  return (
    <div className="dashboard-root">
      <Navbar
        usuario={usuario}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />

      <main className="dashboard-main">
        <div className="dashboard-heading">
          <h1>{esCliente ? 'Mis Pedidos' : 'Panel de Ventas'}</h1>
          <p>Bienvenido, {usuario.nombre}</p>
        </div>

        {activeTab === 'pedidos' && <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">Completados</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span className="stat-value">{stats.completados}</span>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">{esCliente ? 'En camino' : 'Por completar'}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <span className="stat-value">{esCliente ? stats.enCamino : stats.porCompletar}</span>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">Cancelados</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <span className="stat-value">{stats.cancelados}</span>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">{esCliente ? 'Total gastado' : 'Ventas totales'}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <span className="stat-value">{formatPrecio(esCliente ? stats.ventas : stats.ventas)}</span>
            <span className="stat-sub">Solo pedidos completados</span>
          </div>
        </div>}

        {activeTab === 'pedidos' && (
          <div className="orders-card">
            <div className="orders-card-header">
              <span className="orders-card-title">
                {esCliente ? 'Mis Pedidos' : 'Gestión de Pedidos'}
              </span>
              {!esCliente && (
                <button className="btn-nuevo" onClick={() => setMostrarRegistrar(true)}>
                  + Nuevo pedido
                </button>
              )}
            </div>

            <div className="filters-grid">
              <div className="filter-field">
                <label>Buscar</label>
                <input
                  type="text"
                  placeholder="Buscar por ID, cédula, cliente o producto..."
                  value={buscar}
                  onChange={e => setBuscar(e.target.value)}
                />
              </div>
              <div className="filter-field">
                <label>Estado</label>
                <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}>
                  <option value="">Todos</option>
                  {estados.map(e => (
                    <option key={e.id} value={e.nombre}>{e.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="filter-field">
                <label>Desde</label>
                <input type="date" value={fechaIni} onChange={e => setFechaIni(e.target.value)} />
              </div>
              <div className="filter-field">
                <label>Hasta</label>
                <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
              </div>
            </div>

            {loading ? (
              <p className="orders-loading">Cargando pedidos...</p>
            ) : (
              <>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Cliente</th>
                        {esAdmin && <th>Vendedor</th>}
                        <th>Productos</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidosPagina.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="table-empty">No se encontraron pedidos.</td>
                        </tr>
                      ) : pedidosPagina.map(p => (
                        <tr key={p.id}>
                          <td className="td-id">#{p.id}</td>
                          <td className="td-cliente">
                            {p.cliente_nombre}
                            {p.cliente_cedula && (
                              <span className="td-sub">C.C {p.cliente_cedula}</span>
                            )}
                          </td>
                          {esAdmin && <td className="td-vendedor">{p.registrado_por}</td>}
                          <td className="td-productos">
                            <span className="prod-count">{p.productos.reduce((s, pr) => s + pr.cantidad, 0)} unidades</span>
                            <span className="prod-detalle">{resumirProductos(p.productos)}</span>
                          </td>
                          <td className="td-total">{formatPrecio(p.total)}</td>
                          <td>
                            <span className={`badge ${BADGE_CLASS[p.estado] || ''}`}>{p.estado}</span>
                          </td>
                          <td className="td-fecha">{formatFecha(p.creado_en)}</td>
                          <td className="td-acciones">
                            <button className="btn-accion" title="Ver detalle" onClick={() => setPedidoDetalle(p)}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                              </svg>
                            </button>
                            {!esCliente && (
                              <button className="btn-accion" title="Editar estado" onClick={() => setPedidoEditar(p)}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                            )}
                            <button className="btn-accion" title="Ver historial" onClick={() => setPedidoHistorial(p.id)}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pagination">
                  <span className="pagination-info">
                    Mostrando {pedidosFiltrados.length === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1} - {Math.min(pagina * POR_PAGINA, pedidosFiltrados.length)} de {pedidosFiltrados.length} pedidos
                  </span>
                  <div className="pagination-controls">
                    <button onClick={() => setPagina(p => p - 1)} disabled={pagina === 1}>‹ Anterior</button>
                    <span className="pagination-page">Página {pagina} de {totalPaginas}</span>
                    <button onClick={() => setPagina(p => p + 1)} disabled={pagina === totalPaginas}>Siguiente ›</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'consolidado' && (
          <InformeConsolidado />
        )}

        {activeTab === 'grafico' && usuario.rol === 'admin' && (
          <InformesGraficos />
        )}

        {activeTab === 'interop' && usuario.rol === 'admin' && (
          <Interoperabilidad />
        )}
      </main>

      {pedidoDetalle && (
        <ModalDetalle pedido={pedidoDetalle} onClose={() => setPedidoDetalle(null)} />
      )}
      {pedidoEditar && (
        <ModalEditar
          pedido={pedidoEditar}
          estados={estados}
          onClose={() => setPedidoEditar(null)}
          onSaved={handleSaved}
        />
      )}
      {pedidoHistorial && (
        <ModalHistorial
          pedidoId={pedidoHistorial}
          onClose={() => setPedidoHistorial(null)}
        />
      )}
      {mostrarRegistrar && (
        <ModalRegistrarPedido
          onClose={() => setMostrarRegistrar(false)}
          onCreado={handleCreado}
        />
      )}
    </div>
  )
}
