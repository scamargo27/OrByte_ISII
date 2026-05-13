import { useState } from 'react'
import { editarPedido } from '../api/pedidos'
import './ModalEditar.css'

const TRANSICIONES = {
  'Registrado':     ['En preparación', 'Cancelado'],
  'En preparación': ['Enviado', 'Cancelado'],
  'Enviado':        ['Completado'],
  'Completado':     [],
  'Cancelado':      [],
}

const BADGE_CLASS = {
  'Registrado':     'badge-registrado',
  'En preparación': 'badge-preparacion',
  'Enviado':        'badge-enviado',
  'Completado':     'badge-completado',
  'Cancelado':      'badge-cancelado',
}

export default function ModalEditar({ pedido, estados, onClose, onSaved }) {
  const siguientes = TRANSICIONES[pedido.estado] || []
  const [nuevoNombre, setNuevoNombre] = useState(siguientes[0] || '')
  const [motivo, setMotivo]           = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  async function handleGuardar() {
    if (!nuevoNombre) return
    if (motivo.trim().length < 5) {
      setError('Debe ingresar un motivo para el cambio.')
      return
    }
    const estadoObj = estados.find(e => e.nombre === nuevoNombre)
    if (!estadoObj) return
    setLoading(true)
    setError('')
    try {
      const updated = await editarPedido(pedido.id, estadoObj.id, motivo.trim())
      onSaved(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-editar-box" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div className="modal-header-left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <span>Editar Pedido #{pedido.id}</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-editar-body">
          <div className="modal-editar-row">
            <span className="modal-editar-label">Estado actual</span>
            <span className={`badge ${BADGE_CLASS[pedido.estado] || ''}`}>{pedido.estado}</span>
          </div>

          {siguientes.length === 0 ? (
            <p className="modal-editar-final">Este pedido está en un estado final y no puede modificarse.</p>
          ) : (
            <div className="modal-editar-row">
              <label className="modal-editar-label" htmlFor="nuevo-estado">Nuevo estado</label>
              <select
                id="nuevo-estado"
                value={nuevoNombre}
                onChange={e => setNuevoNombre(e.target.value)}
                className="modal-editar-select"
              >
                {siguientes.map(nombre => (
                  <option key={nombre} value={nombre}>{nombre}</option>
                ))}
              </select>
            </div>
          )}

          {siguientes.length > 0 && (
            <div className="modal-editar-row">
              <label className="modal-editar-label" htmlFor="motivo">Motivo del cambio</label>
              <textarea
                id="motivo"
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Describe el motivo del cambio de estado..."
                className="modal-editar-textarea"
                rows={3}
              />
            </div>
          )}

          {error && <p className="modal-editar-error">{error}</p>}
        </div>

        <div className="modal-editar-footer">
          <button className="btn-cancelar" onClick={onClose}>Cancelar</button>
          {siguientes.length > 0 && (
            <button className="btn-guardar" onClick={handleGuardar} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar cambio'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
