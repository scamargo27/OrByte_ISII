import './ModalDetalle.css'

function formatFechaLarga(str) {
  return new Date(str).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatPrecio(val) {
  return `$${Number(val).toLocaleString('es-CO')}`
}

const BADGE_CLASS = {
  'Registrado':     'badge-registrado',
  'En preparación': 'badge-preparacion',
  'Enviado':        'badge-enviado',
  'Completado':     'badge-completado',
  'Cancelado':      'badge-cancelado',
}

export default function ModalDetalle({ pedido, onClose }) {
  const totalUnidades = pedido.productos.reduce((s, p) => s + p.cantidad, 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div className="modal-header-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <span>Detalle del Pedido</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-info-grid">
          <div className="modal-info-item">
            <span className="modal-info-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h4"/></svg>
              ID del Pedido
            </span>
            <span className="modal-info-value">#{pedido.id}</span>
          </div>
          <div className="modal-info-item">
            <span className="modal-info-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Fecha
            </span>
            <span className="modal-info-value">{formatFechaLarga(pedido.creado_en)}</span>
          </div>
          <div className="modal-info-item">
            <span className="modal-info-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Cliente
            </span>
            <span className="modal-info-value">
              {pedido.cliente_nombre}
              {pedido.cliente_cedula && (
                <span className="modal-info-sub">C.C {pedido.cliente_cedula}</span>
              )}
            </span>
          </div>
          <div className="modal-info-item">
            <span className="modal-info-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Vendedor
            </span>
            <span className="modal-info-value">{pedido.registrado_por}</span>
          </div>

          <div className="modal-info-item">
            <span className="modal-info-label">Estado</span>
            <span className={`badge ${BADGE_CLASS[pedido.estado] || ''}`}>{pedido.estado}</span>
          </div>
          <div className="modal-info-item modal-total-highlight">
            <span className="modal-info-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Total
            </span>
            <span className="modal-total-value">{formatPrecio(pedido.total)}</span>
          </div>
        </div>

        <div className="modal-productos-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
          <span>Productos ({totalUnidades} unidades)</span>
        </div>

        <div className="modal-productos-list">
          {pedido.productos.map((p, i) => (
            <div key={i} className="modal-producto-row">
              <div className="modal-producto-info">
                <span className="modal-producto-nombre">{p.producto_nombre}</span>
                <span className="modal-producto-meta">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/></svg>
                  Cantidad: {p.cantidad}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{marginLeft:8}}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  Precio unitario: {formatPrecio(p.precio_unitario_snapshot)}
                </span>
              </div>
              <div className="modal-producto-subtotal">
                <span className="modal-subtotal-label">Subtotal</span>
                <span className="modal-subtotal-value">{formatPrecio(p.cantidad * p.precio_unitario_snapshot)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <div>
            <span className="modal-footer-label">Total de productos</span>
            <span className="modal-footer-value">{totalUnidades} unidades</span>
          </div>
          <div>
            <span className="modal-footer-label">Total a pagar</span>
            <span className="modal-footer-total">{formatPrecio(pedido.total)}</span>
          </div>
        </div>

      </div>
    </div>
  )
}
