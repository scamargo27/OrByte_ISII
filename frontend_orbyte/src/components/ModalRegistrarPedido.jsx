import { useState, useEffect, useRef } from 'react'
import { getProductos, buscarCliente, registrarPedido } from '../api/pedidos'
import './ModalRegistrarPedido.css'

function formatPrecio(val) {
  return `$${Number(val).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`
}

export default function ModalRegistrarPedido({ onClose, onCreado }) {
  const [cedula, setCedula]               = useState('')
  const [cliente, setCliente]             = useState(null)
  const [clienteError, setClienteError]   = useState('')
  const [buscandoCliente, setBuscandoCliente] = useState(false)

  const [productos, setProductos]         = useState([])
  const [loadingProds, setLoadingProds]   = useState(true)

  const [busqueda, setBusqueda]           = useState('')
  const [showDropdown, setShowDropdown]   = useState(false)
  const searchRef                         = useRef(null)

  const [items, setItems]                 = useState([])

  const [preview, setPreview]             = useState(null)

  const [enviando, setEnviando]           = useState(false)
  const [submitError, setSubmitError]     = useState('')

  useEffect(() => {
    getProductos()
      .then(setProductos)
      .catch(() => {})
      .finally(() => setLoadingProds(false))
  }, [])

  useEffect(() => {
    function handler(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const idsEnCarrito = new Set(items.map(i => i.id))

  const productosFiltrados = busqueda.trim()
    ? productos
        .filter(p => {
          const q = busqueda.toLowerCase()
          return (
            p.nombre.toLowerCase().includes(q) ||
            p.marca.toLowerCase().includes(q) ||
            p.categoria.toLowerCase().includes(q)
          )
        })
        .filter(p => !idsEnCarrito.has(p.id))
    : []

  async function handleBuscarCliente() {
    if (!cedula.trim()) return
    setBuscandoCliente(true)
    setClienteError('')
    setCliente(null)
    try {
      const data = await buscarCliente(cedula.trim())
      setCliente(data)
    } catch (err) {
      setClienteError(err.message)
    } finally {
      setBuscandoCliente(false)
    }
  }

  function agregarProducto(prod) {
    setItems(prev => [...prev, { ...prod, cantidad: 1 }])
    setPreview(prod)
    setBusqueda('')
    setShowDropdown(false)
  }

  function cambiarCantidad(id, delta) {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item
        const nueva = item.cantidad + delta
        if (nueva < 1 || nueva > item.stock_disponible) return item
        return { ...item, cantidad: nueva }
      })
    )
  }

  function eliminarItem(id) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const total = items.reduce((s, i) => s + Number(i.precio_unitario) * i.cantidad, 0)

  async function handleCrear() {
    if (!cliente) { setSubmitError('Busca y selecciona un cliente primero.'); return }
    if (items.length === 0) { setSubmitError('Agrega al menos un producto.'); return }
    setEnviando(true)
    setSubmitError('')
    try {
      const pedido = await registrarPedido(
        cliente.id,
        items.map(i => ({ producto_id: i.id, cantidad: i.cantidad }))
      )
      onCreado(pedido, cliente)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-registrar-box" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div className="modal-header-left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <span>Nuevo Pedido</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className={`modal-registrar-layout${preview ? ' with-preview' : ''}`}>

        {preview && (
          <div className="mr-preview-panel">
            {preview.imagen_url ? (
              <img src={preview.imagen_url} alt={preview.nombre} className="mr-preview-img" />
            ) : (
              <div className="mr-preview-placeholder">Sin imagen</div>
            )}
            <span className="mr-preview-nombre">{preview.nombre}</span>
            <span className="mr-preview-marca">{preview.marca}</span>
          </div>
        )}

        <div className="modal-registrar-body">

          {/* ── CLIENTE ── */}
          <div className="mr-section">
            <div className="mr-section-title">
              <span className="mr-section-num">1</span>
              Cliente
            </div>

            {!cliente ? (
              <>
                <div className="mr-cedula-row">
                  <input
                    type="text"
                    placeholder="Cédula, correo o teléfono"
                    value={cedula}
                    onChange={e => { setCedula(e.target.value); setClienteError('') }}
                    onKeyDown={e => e.key === 'Enter' && handleBuscarCliente()}
                    className="mr-input"
                  />
                  <button
                    className="btn-buscar"
                    onClick={handleBuscarCliente}
                    disabled={buscandoCliente || !cedula.trim()}
                  >
                    {buscandoCliente ? 'Buscando…' : 'Buscar'}
                  </button>
                </div>
                {clienteError && <p className="mr-field-error">{clienteError}</p>}
              </>
            ) : (
              <div className="mr-cliente-card">
                <div className="mr-cliente-avatar">{cliente.nombre.charAt(0).toUpperCase()}</div>
                <div className="mr-cliente-info">
                  <span className="mr-cliente-nombre">{cliente.nombre}</span>
                  <span className="mr-cliente-meta">{cliente.email}</span>
                  {cliente.telefono && <span className="mr-cliente-meta">{cliente.telefono}</span>}
                </div>
                <span className="mr-cliente-cedula">CC {cliente.cedula}</span>
                <button
                  className="mr-cliente-remove"
                  onClick={() => { setCliente(null); setCedula('') }}
                  title="Cambiar cliente"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* ── PRODUCTOS ── */}
          <div className="mr-section">
            <div className="mr-section-title">
              <span className="mr-section-num">2</span>
              Productos
            </div>

            <div className="mr-prod-search" ref={searchRef}>
              <div className="mr-search-wrap">
                <svg className="mr-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder={loadingProds ? 'Cargando productos…' : 'Buscar por nombre, marca o categoría…'}
                  value={busqueda}
                  onChange={e => { setBusqueda(e.target.value); setShowDropdown(true) }}
                  onFocus={() => busqueda.trim() && setShowDropdown(true)}
                  className="mr-search-input"
                  disabled={loadingProds}
                />
              </div>

              {showDropdown && busqueda.trim() && (
                <div className="mr-dropdown">
                  {productosFiltrados.length === 0 ? (
                    <div className="mr-dropdown-empty">No se encontraron productos.</div>
                  ) : (
                    productosFiltrados.slice(0, 8).map(p => (
                      <button key={p.id} className="mr-dropdown-item" onClick={() => agregarProducto(p)}>
                        <div className="mr-dropdown-left">
                          <span className="mr-dropdown-nombre">{p.nombre}</span>
                          <span className="mr-dropdown-meta">
                            {p.categoria} · {p.marca}
                            <span className="mr-dropdown-stock">Stock: {p.stock_disponible}</span>
                          </span>
                        </div>
                        <span className="mr-dropdown-precio">{formatPrecio(p.precio_unitario)}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <div className="mr-items-empty">
                Busca y agrega productos al pedido.
              </div>
            ) : (
              <div className="mr-items-list">
                {items.map(item => (
                  <div key={item.id} className="mr-item">
                    <div className="mr-item-info" onClick={() => setPreview(item)} title="Ver imagen">
                      <span className="mr-item-nombre">{item.nombre}</span>
                      <span className="mr-item-meta">{item.categoria} · {item.marca}</span>
                    </div>
                    <div className="mr-item-controls">
                      <span className="mr-item-precio-unit">{formatPrecio(item.precio_unitario)}/u</span>
                      <div className="mr-qty">
                        <button className="mr-qty-btn" onClick={() => cambiarCantidad(item.id, -1)} disabled={item.cantidad <= 1}>−</button>
                        <span className="mr-qty-val">{item.cantidad}</span>
                        <button className="mr-qty-btn" onClick={() => cambiarCantidad(item.id, 1)} disabled={item.cantidad >= item.stock_disponible}>+</button>
                      </div>
                      <span className="mr-item-subtotal">{formatPrecio(Number(item.precio_unitario) * item.cantidad)}</span>
                      <button className="mr-item-remove" onClick={() => eliminarItem(item.id)} title="Eliminar producto">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6"/><path d="M14 11v6"/>
                          <path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        </div>{/* modal-registrar-layout */}

        {submitError && <p className="mr-submit-error">{submitError}</p>}

        <div className="modal-registrar-footer">
          <div className="mr-total">
            <span className="mr-total-label">Total del pedido</span>
            <span className="mr-total-value">{formatPrecio(total)}</span>
          </div>
          <div className="mr-footer-actions">
            <button className="btn-cancelar" onClick={onClose}>Cancelar</button>
            <button
              className="btn-guardar"
              onClick={handleCrear}
              disabled={enviando || !cliente || items.length === 0}
            >
              {enviando ? 'Creando…' : 'Crear pedido'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
