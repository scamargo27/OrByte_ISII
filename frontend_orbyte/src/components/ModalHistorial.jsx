import { useState, useEffect } from 'react'
import { getHistorial } from '../api/pedidos'
import './ModalHistorial.css'

const BADGE_CLASS = {
  'Registrado':     'badge-registrado',
  'En preparación': 'badge-preparacion',
  'Enviado':        'badge-enviado',
  'Completado':     'badge-completado',
  'Cancelado':      'badge-cancelado',
}

function formatFechaHora(str) {
  const d = new Date(str)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function formatPrecio(val) {
  return `$${Number(val).toLocaleString('es-CO')}`
}

const IconCreacion = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
)

const IconEstado = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
)

const IconUser = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

export default function ModalHistorial({ pedidoId, onClose }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    getHistorial(pedidoId)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [pedidoId])

  return (
    <div className="mh-overlay" onClick={onClose}>
      <div className="mh-modal" onClick={e => e.stopPropagation()}>

        <div className="mh-header">
          <div className="mh-title-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span className="mh-title">
              Historial del Pedido #{data?.pedido?.id ?? pedidoId}
            </span>
          </div>
          <button className="mh-close" onClick={onClose}>✕</button>
        </div>

        {loading && <p className="mh-estado">Cargando historial...</p>}
        {error   && <p className="mh-estado mh-error">{error}</p>}

        {data && (
          <>
            <div className="mh-info-grid">
              <div className="mh-info-field">
                <span className="mh-info-label">Cliente</span>
                <span className="mh-info-value">{data.pedido.cliente_nombre}</span>
              </div>
              <div className="mh-info-field">
                <span className="mh-info-label">Vendedor</span>
                <span className="mh-info-value">{data.pedido.registrado_por}</span>
              </div>
              <div className="mh-info-field">
                <span className="mh-info-label">Total</span>
                <span className="mh-info-value">{formatPrecio(data.pedido.total)}</span>
              </div>
              <div className="mh-info-field">
                <span className="mh-info-label">Estado actual</span>
                <span className={`badge ${BADGE_CLASS[data.pedido.estado] || ''}`}>
                  {data.pedido.estado}
                </span>
              </div>
            </div>

            <div className="mh-section-title">Historial de cambios</div>

            <div className="mh-timeline">
              {data.historial.map((item, i) => (
                <div key={i} className="mh-event">
                  <div className="mh-event-icon">
                    {item.tipo === 'creacion' ? <IconCreacion /> : <IconEstado />}
                  </div>
                  <div className="mh-event-body">
                    <div className="mh-event-row">
                      <span className="mh-event-titulo">
                        {item.tipo === 'creacion' ? 'Pedido creado' : 'Estado actualizado'}
                      </span>
                      <span className="mh-event-fecha">{formatFechaHora(item.fecha)}</span>
                    </div>
                    <div className="mh-event-usuario">
                      <IconUser /> {item.usuario}
                    </div>
                    <p className="mh-event-desc">
                      {item.tipo === 'creacion'
                        ? item.descripcion
                        : `Cambio de estado: ${item.descripcion}`}
                    </p>
                    {item.motivo && (
                      <p className="mh-event-motivo">"{item.motivo}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
