import { useState, useEffect, useMemo } from 'react'
import { exportarPedidos, importarPedidos, getExternos, eliminarImportacion } from '../api/interop'
import { getInforme } from '../api/pedidos'
import './Interoperabilidad.css'

const POR_PAGINA = 10

const PALETA = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

function colorSistema(nombre) {
  if (nombre === 'OrByte') return PALETA[0]
  let h = 0
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return PALETA[(Math.abs(h) % (PALETA.length - 1)) + 1]
}

function formatFecha(str) {
  if (!str) return '—'
  const d = new Date(str)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

function formatPrecio(val) {
  return `$${Number(val).toLocaleString('es-CO')}`
}

export default function Interoperabilidad() {
  const [pedidosPropios, setPedidosPropios]   = useState([])
  const [importaciones, setImportaciones]     = useState([])
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState(null)

  const [sistemaFiltro, setSistemaFiltro]     = useState('')
  const [estadoFiltro, setEstadoFiltro]       = useState('')
  const [fechaIni, setFechaIni]               = useState('')
  const [fechaFin, setFechaFin]               = useState('')
  const [pagina, setPagina]                   = useState(1)

  const [mostrarModal, setMostrarModal]       = useState(false)
  const [jsonTexto, setJsonTexto]             = useState('')
  const [preview, setPreview]                 = useState(null)
  const [errorImport, setErrorImport]         = useState(null)
  const [importando, setImportando]           = useState(false)
  const [exportando, setExportando]           = useState(false)
  const [eliminandoId, setEliminandoId]       = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    setError(null)
    try {
      const [informe, externos] = await Promise.all([getInforme({}), getExternos()])
      setPedidosPropios(informe.pedidos)
      setImportaciones(externos)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const todosPedidos = useMemo(() => {
    const propios = pedidosPropios.map(p => ({
      _key:       `o-${p.id}`,
      sistema:    'OrByte',
      id_display: `#${p.id}`,
      cliente:    p.cliente_nombre,
      vendedor:   p.registrado_por,
      estado:     p.estado,
      total:      Number(p.total),
      fecha:      p.creado_en,
      productos:  p.productos.map(pr => ({ nombre: pr.producto_nombre, cantidad: pr.cantidad })),
    }))

    const externos = importaciones.flatMap(imp =>
      imp.pedidos.map((p, i) => ({
        _key:       `e-${imp.id}-${i}`,
        sistema:    imp.sistema_origen,
        id_display: p.id_externo ? `#${p.id_externo}` : '—',
        cliente:    p.cliente  || '—',
        vendedor:   p.vendedor || '—',
        estado:     p.estado   || '—',
        total:      Number(p.total) || 0,
        fecha:      p.fecha,
        productos:  p.productos || [],
      }))
    )

    return [...propios, ...externos].sort((a, b) => {
      if (!a.fecha) return 1
      if (!b.fecha) return -1
      return new Date(b.fecha) - new Date(a.fecha)
    })
  }, [pedidosPropios, importaciones])

  const sistemas = useMemo(() => [...new Set(todosPedidos.map(p => p.sistema))].sort(), [todosPedidos])

  const filtrados = useMemo(() => {
    return todosPedidos.filter(p => {
      if (sistemaFiltro && p.sistema !== sistemaFiltro) return false
      if (estadoFiltro && !p.estado.toLowerCase().includes(estadoFiltro.toLowerCase())) return false
      if (fechaIni && p.fecha && p.fecha.slice(0, 10) < fechaIni) return false
      if (fechaFin && p.fecha && p.fecha.slice(0, 10) > fechaFin) return false
      return true
    })
  }, [todosPedidos, sistemaFiltro, estadoFiltro, fechaIni, fechaFin])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaItems  = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  function resetFiltros() { setSistemaFiltro(''); setEstadoFiltro(''); setFechaIni(''); setFechaFin(''); setPagina(1) }

  async function handleExportar() {
    setExportando(true)
    try {
      const data = await exportarPedidos()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `orbyte_pedidos_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Error al exportar: ' + e.message)
    } finally {
      setExportando(false)
    }
  }

  function abrirModal() { setMostrarModal(true); setJsonTexto(''); setPreview(null); setErrorImport(null) }
  function cerrarModal() { setMostrarModal(false) }

  function parsearPreview(texto) {
    try {
      const json = JSON.parse(texto)
      if (!json.sistema) throw new Error('Falta el campo "sistema".')
      if (!Array.isArray(json.pedidos)) throw new Error('Falta el campo "pedidos" (debe ser un array).')
      setPreview({ sistema: json.sistema, total: json.pedidos.length })
      setErrorImport(null)
    } catch (e) {
      setPreview(null)
      setErrorImport(e.message)
    }
  }

  function handleArchivoJson(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setJsonTexto(ev.target.result); parsearPreview(ev.target.result) }
    reader.readAsText(file)
  }

  function handleTextoChange(e) { setJsonTexto(e.target.value); setPreview(null); setErrorImport(null) }

  async function handleImportar() {
    if (!preview) { parsearPreview(jsonTexto); return }
    setImportando(true)
    try {
      await importarPedidos(JSON.parse(jsonTexto))
      cerrarModal()
      await cargar()
    } catch (e) {
      setErrorImport('Error al importar: ' + e.message)
    } finally {
      setImportando(false)
    }
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar esta importación? Se perderán todos los pedidos importados de ese sistema.')) return
    setEliminandoId(id)
    try {
      await eliminarImportacion(id)
      setImportaciones(prev => prev.filter(i => i.id !== id))
    } catch (e) {
      alert('Error al eliminar: ' + e.message)
    } finally {
      setEliminandoId(null)
    }
  }

  if (loading) return <p className="interop-status">Cargando datos...</p>
  if (error)   return <p className="interop-status interop-status-error">{error}</p>

  return (
    <div className="interop-root">

      {/* Barra de acciones */}
      <div className="interop-actions">
        <div className="interop-actions-left">
          <span className="interop-title">Interoperabilidad</span>
          <span className="interop-sub">{todosPedidos.length} pedidos · {sistemas.length} sistemas</span>
        </div>
        <div className="interop-actions-right">
          <button className="btn-interop-export" onClick={handleExportar} disabled={exportando}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {exportando ? 'Exportando...' : 'Exportar mis datos'}
          </button>
          <button className="btn-interop-import" onClick={abrirModal}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Importar datos externos
          </button>
        </div>
      </div>

      {/* Tabla consolidada */}
      <div className="orders-card">
        <div className="orders-card-header">
          <span className="orders-card-title">Tabla Consolidada</span>
          {(sistemaFiltro || estadoFiltro || fechaIni || fechaFin) && (
            <button className="interop-clear" onClick={resetFiltros}>Limpiar filtros</button>
          )}
        </div>

        <div className="filters-grid interop-filters">
          <div className="filter-field">
            <label>Sistema</label>
            <select value={sistemaFiltro} onChange={e => { setSistemaFiltro(e.target.value); setPagina(1) }}>
              <option value="">Todos</option>
              {sistemas.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label>Estado</label>
            <input type="text" placeholder="Ej: Completado" value={estadoFiltro}
              onChange={e => { setEstadoFiltro(e.target.value); setPagina(1) }} />
          </div>
          <div className="filter-field">
            <label>Desde</label>
            <input type="date" value={fechaIni} onChange={e => { setFechaIni(e.target.value); setPagina(1) }} />
          </div>
          <div className="filter-field">
            <label>Hasta</label>
            <input type="date" value={fechaFin} onChange={e => { setFechaFin(e.target.value); setPagina(1) }} />
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Sistema</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Productos</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {paginaItems.length === 0 ? (
                <tr><td colSpan="8" className="table-empty">No se encontraron pedidos.</td></tr>
              ) : paginaItems.map(p => {
                const color = colorSistema(p.sistema)
                return (
                  <tr key={p._key}>
                    <td className="td-id">{p.id_display}</td>
                    <td>
                      <span className="badge-sistema" style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>
                        {p.sistema}
                      </span>
                    </td>
                    <td className="td-cliente">{p.cliente}</td>
                    <td className="td-vendedor">{p.vendedor}</td>
                    <td className="td-productos">
                      <span className="prod-count">{p.productos.reduce((s, pr) => s + (pr.cantidad || 0), 0)} unidades</span>
                      {p.productos.length > 0 && (
                        <span className="prod-detalle">
                          {p.productos.map(pr => `x${pr.cantidad} ${pr.nombre}`).join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="td-total">{formatPrecio(p.total)}</td>
                    <td><span className="badge badge-externo">{p.estado}</span></td>
                    <td className="td-fecha">{formatFecha(p.fecha)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span className="pagination-info">
            Mostrando {filtrados.length === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, filtrados.length)} de {filtrados.length} pedidos
          </span>
          <div className="pagination-controls">
            <button onClick={() => setPagina(p => p - 1)} disabled={pagina === 1}>‹ Anterior</button>
            <span className="pagination-page">Página {pagina} de {totalPaginas}</span>
            <button onClick={() => setPagina(p => p + 1)} disabled={pagina === totalPaginas}>Siguiente ›</button>
          </div>
        </div>
      </div>

      {/* Importaciones guardadas */}
      {importaciones.length > 0 && (
        <div className="interop-imports-section">
          <h3 className="interop-imports-title">Importaciones guardadas</h3>
          <div className="interop-imports-list">
            {importaciones.map(imp => {
              const color = colorSistema(imp.sistema_origen)
              return (
                <div key={imp.id} className="interop-import-row">
                  <span className="badge-sistema" style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>
                    {imp.sistema_origen}
                  </span>
                  <span className="interop-import-meta">
                    {imp.total_pedidos} pedidos · importado el {formatFecha(imp.importado_en)}
                  </span>
                  <span className="interop-import-by">por {imp.importado_por}</span>
                  <button
                    className="btn-accion interop-btn-delete"
                    title="Eliminar importación"
                    onClick={() => handleEliminar(imp.id)}
                    disabled={eliminandoId === imp.id}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal importar */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="interop-modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Importar datos externos</span>
              </div>
              <button className="modal-close" onClick={cerrarModal}>✕</button>
            </div>

            <div className="interop-modal-body">
              <p className="interop-modal-hint">
                Pega el JSON del otro sistema o carga el archivo <code>.json</code>:
              </p>
              <label className="interop-file-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                Cargar archivo JSON
                <input type="file" accept=".json" onChange={handleArchivoJson} className="interop-file-input" />
              </label>
              <textarea
                className="interop-textarea"
                value={jsonTexto}
                onChange={handleTextoChange}
                placeholder={'{\n  "sistema": "GrupoX",\n  "pedidos": [...]\n}'}
                rows={10}
                spellCheck={false}
              />
              {preview && (
                <div className="interop-feedback interop-feedback-ok">
                  ✓ {preview.total} pedidos de &ldquo;{preview.sistema}&rdquo; listos para importar
                </div>
              )}
              {errorImport && (
                <div className="interop-feedback interop-feedback-err">
                  ✗ {errorImport}
                </div>
              )}
            </div>

            <div className="modal-editar-footer">
              <button className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
              {!preview
                ? <button className="btn-guardar" onClick={() => parsearPreview(jsonTexto)} disabled={!jsonTexto.trim()}>
                    Validar JSON
                  </button>
                : <button className="btn-guardar" onClick={handleImportar} disabled={importando}>
                    {importando ? 'Importando...' : 'Confirmar importación'}
                  </button>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
