import { useState, useEffect, useMemo } from 'react'
import { getInformeConsolidado } from '../api/pedidos'
import './InformeConsolidado.css'

const CAT_COLORS = ['cat-purple', 'cat-blue', 'cat-pink', 'cat-green', 'cat-orange']
const POR_PAGINA = 5

function formatPrecio(val) {
  return `$${Number(val).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatFecha(str) {
  if (!str) return '—'
  const d = new Date(str)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

function paginar(lista, pagina) {
  const inicio = (pagina - 1) * POR_PAGINA
  return lista.slice(inicio, inicio + POR_PAGINA)
}

function Paginacion({ pagina, total, onChange }) {
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const inicio = (pagina - 1) * POR_PAGINA + 1
  const fin    = Math.min(pagina * POR_PAGINA, total)
  return (
    <div className="ic-pagination">
      <span className="ic-pagination-info">{total === 0 ? '0' : `${inicio}–${fin}`} de {total}</span>
      <div className="ic-pagination-controls">
        <button onClick={() => onChange(pagina - 1)} disabled={pagina === 1}>‹</button>
        <span>{pagina} / {totalPaginas}</span>
        <button onClick={() => onChange(pagina + 1)} disabled={pagina === totalPaginas}>›</button>
      </div>
    </div>
  )
}

export default function InformeConsolidado() {
  const [datos, setDatos]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [pgClientes,   setPgClientes]   = useState(1)
  const [pgVendedores, setPgVendedores] = useState(1)
  const [pgProductos,  setPgProductos]  = useState(1)
  const [pgCategorias, setPgCategorias] = useState(1)

  useEffect(() => {
    getInformeConsolidado()
      .then(setDatos)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const catColorMap = useMemo(() => {
    if (!datos) return {}
    const map = {}
    datos.categorias.forEach((c, i) => {
      map[c.categoria] = CAT_COLORS[i % CAT_COLORS.length]
    })
    return map
  }, [datos])

  if (loading) return <div className="ic-root"><p className="ic-estado">Cargando informe...</p></div>
  if (error)   return <div className="ic-root"><p className="ic-estado ic-error">{error}</p></div>
  if (!datos)  return null

  const { clientes, vendedores, productos, categorias } = datos
  const clientesPagina   = paginar(clientes,   pgClientes)
  const vendedoresPagina = paginar(vendedores, pgVendedores)
  const productosPagina  = paginar(productos,  pgProductos)
  const categoriasPagina = paginar(categorias, pgCategorias)

  return (
    <div className="ic-root">

      <div className="ic-top-row">
        {/* Reporte de Clientes */}
        <div className="ic-card">
          <div className="ic-card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>Reporte de Clientes</span>
          </div>
          <div className="ic-table-wrap">
            <table className="ic-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className="ic-th-center">Pedidos</th>
                  <th className="ic-th-num">Total gastado</th>
                  <th className="ic-th-center">Último pedido</th>
                </tr>
              </thead>
              <tbody>
                {clientesPagina.map((c, i) => (
                  <tr key={i}>
                    <td className="ic-td-nombre">
                      {c.nombre}
                      {c.cedula && (
                        <span className="ic-sub-cancelados">C.C {c.cedula}</span>
                      )}
                    </td>
                    <td className="ic-td-center">{c.total_pedidos}</td>
                    <td className="ic-td-money">{formatPrecio(c.total_gastado)}</td>
                    <td className="ic-td-center">{formatFecha(c.ultimo_pedido)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion pagina={pgClientes} total={clientes.length} onChange={setPgClientes} />
        </div>

        {/* Reporte de Vendedores */}
        <div className="ic-card">
          <div className="ic-card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
            <span>Reporte de Vendedores</span>
          </div>
          <div className="ic-table-wrap">
            <table className="ic-table">
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th className="ic-th-center">Pedidos</th>
                  <th className="ic-th-center">Ventas</th>
                </tr>
              </thead>
              <tbody>
                {vendedoresPagina.map((v, i) => (
                  <tr key={i}>
                    <td className="ic-td-nombre">{v.nombre}</td>
                    <td className="ic-td-center">
                      {v.total_pedidos}
                      {v.cancelados > 0 && (
                        <span className="ic-sub-cancelados">
                          {v.cancelados} cancelado{v.cancelados !== 1 ? 's' : ''}
                        </span>
                      )}
                    </td>
                    <td className="ic-td-money ic-td-center">{formatPrecio(v.ventas)}</td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, POR_PAGINA - vendedoresPagina.length) }).map((_, i) => (
                  <tr key={`empty-${i}`} className="ic-tr-empty">
                    <td colSpan="3">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion pagina={pgVendedores} total={vendedores.length} onChange={setPgVendedores} />
        </div>
      </div>

      {/* Reporte de Productos */}
      <div className="ic-card">
        <div className="ic-card-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          <span>Reporte de Productos</span>
        </div>
        <div className="ic-table-wrap">
          <table className="ic-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th className="ic-th-center">Unidades vendidas</th>
                <th className="ic-th-center">Pedidos</th>
                <th className="ic-th-num">Precio unitario</th>
                <th className="ic-th-num">Ingresos totales</th>
              </tr>
            </thead>
            <tbody>
              {productosPagina.map((p, i) => (
                <tr key={i}>
                  <td className="ic-td-nombre">{p.nombre}</td>
                  <td>
                    <span className={`ic-cat-badge ${catColorMap[p.categoria] || 'cat-purple'}`}>
                      {p.categoria}
                    </span>
                  </td>
                  <td className="ic-td-center">{p.unidades_vendidas}</td>
                  <td className="ic-td-center">{p.pedidos}</td>
                  <td className="ic-td-money">{formatPrecio(p.precio_promedio)}</td>
                  <td className="ic-td-money">{formatPrecio(p.ingresos_totales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginacion pagina={pgProductos} total={productos.length} onChange={setPgProductos} />
      </div>

      {/* Reporte por Categoría */}
      <div className="ic-card">
        <div className="ic-card-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span>Reporte por Categoría</span>
        </div>
        <div className="ic-table-wrap">
          <table className="ic-table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th className="ic-th-center">Unidades vendidas</th>
                <th className="ic-th-center">Pedidos</th>
                <th className="ic-th-num">Ingresos totales</th>
              </tr>
            </thead>
            <tbody>
              {categoriasPagina.map((c, i) => (
                <tr key={i}>
                  <td className="ic-td-nombre">{c.categoria}</td>
                  <td className="ic-td-center">{c.unidades_vendidas}</td>
                  <td className="ic-td-center">{c.pedidos}</td>
                  <td className="ic-td-money">{formatPrecio(c.ingresos_totales)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="ic-tfoot-total">
                <td className="ic-td-nombre">TOTAL</td>
                <td className="ic-td-center">
                  {categorias.reduce((s, c) => s + c.unidades_vendidas, 0)}
                </td>
                <td className="ic-td-center ic-tfoot-nd" title="Un pedido puede contener productos de varias categorías, por lo que sumar esta columna generaría un conteo duplicado.">
                  —
                </td>
                <td className="ic-td-money">
                  {formatPrecio(categorias.reduce((s, c) => s + Number(c.ingresos_totales), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <Paginacion pagina={pgCategorias} total={categorias.length} onChange={setPgCategorias} />
      </div>

    </div>
  )
}
