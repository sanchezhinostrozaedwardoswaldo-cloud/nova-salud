import { useEffect, useState } from 'react';
import { api } from '../services/api';

import GraficoBarras from '../components/GraficoBarras';
import GraficoCircular from '../components/GraficoCircular';

import { exportarCSV } from '../utils/exportarCSV';

const moneda = (valor) =>
  `S/ ${Number(valor || 0).toFixed(2)}`;

function hoyPeru() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const obtener = (tipo) =>
    partes.find((parte) => parte.type === tipo)?.value;

  return `${obtener('year')}-${obtener('month')}-${obtener('day')}`;
}

function haceDias(fecha, dias) {
  const valor = new Date(`${fecha}T12:00:00Z`);
  valor.setUTCDate(valor.getUTCDate() - dias);
  return valor.toISOString().slice(0, 10);
}

function TarjetaIndicador({ titulo, valor, detalle }) {
  return (
    <article className="reporte-indicador">
      <span>{titulo}</span>
      <strong>{valor}</strong>
      {detalle && <small>{detalle}</small>}
    </article>
  );
}

export default function Reportes({ informar }) {
  const hoy = hoyPeru();

  const [desde, setDesde] = useState(haceDias(hoy, 29));
  const [hasta, setHasta] = useState(hoy);
  const [reporte, setReporte] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState('general');

  async function cargarReporte(inicio, fin) {
    setCargando(true);

    try {
      const parametros = new URLSearchParams({
        desde: inicio,
        hasta: fin
      });

      const respuesta = await api(
        `/reportes?${parametros.toString()}`
      );

      setReporte(respuesta.reporte);
    } catch (error) {
      informar('Error al generar reporte', error.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarReporte(haceDias(hoy, 29), hoy);
    // Carga inicial del módulo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function filtrar(evento) {
    evento.preventDefault();

    if (desde > hasta) {
      informar(
        'Fechas incorrectas',
        'La fecha inicial no puede ser posterior a la final.'
      );
      return;
    }

    cargarReporte(desde, hasta);
  }

  function descargarVentas() {
    if (!reporte) return;

    exportarCSV(
      `nova-salud-ventas-${reporte.periodo.desde}-${reporte.periodo.hasta}.csv`,
      [
        { titulo: 'Fecha', campo: 'fecha' },
        { titulo: 'Cantidad de ventas', campo: 'ventas' },
        { titulo: 'Ingresos (S/)', campo: 'ingresos' }
      ],
      reporte.financiero.ventas_por_dia
    );
  }

  function descargarInventario() {
    if (!reporte) return;

    exportarCSV(
      'nova-salud-stock-bajo.csv',
      [
        { titulo: 'Código', campo: 'codigo' },
        { titulo: 'Medicamento', campo: 'producto' },
        { titulo: 'Stock disponible', campo: 'disponible' },
        { titulo: 'Stock mínimo', campo: 'minimo' }
      ],
      reporte.inventario.stock_bajo
    );
  }

  function descargarVencimientos() {
    if (!reporte) return;

    exportarCSV(
      'nova-salud-proximos-vencimientos.csv',
      [
        { titulo: 'Medicamento', campo: 'producto' },
        { titulo: 'Lote', campo: 'lote' },
        { titulo: 'Vencimiento', campo: 'vencimiento' },
        { titulo: 'Cantidad', campo: 'cantidad' }
      ],
      reporte.inventario.proximos_vencer
    );
  }

  const financiero = reporte?.financiero;
  const inventario = reporte?.inventario;

  // Para no saturar el gráfico, se muestran los últimos
  // 12 días. La tabla conserva todos los días del período.
  const ultimosDias = financiero?.ventas_por_dia.slice(-12) || [];

  return (
    <div className="pagina-modulo">
      <p className="reporte-descripcion">
        Consulta el rendimiento comercial y el estado
        del inventario de Nova Salud.
      </p>

      <section className="tarjeta">
        <h3>Seleccionar período</h3>

        <form
          className="reporte-filtros"
          onSubmit={filtrar}
        >
          <div>
            <label>Desde</label>
            <input
              type="date"
              required
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>

          <div>
            <label>Hasta</label>
            <input
              type="date"
              required
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>

          <button type="submit" disabled={cargando}>
            {cargando ? 'Consultando...' : 'Generar reporte'}
          </button>
        </form>
      </section>

      {cargando && !reporte && (
        <section className="tarjeta">
          <p>Generando estadísticas...</p>
        </section>
      )}

      {reporte && (
        <>
          <div className="reporte-pestanas">
            {[
              ['general', 'Resumen general'],
              ['ventas', 'Análisis de ventas'],
              ['inventario', 'Inventario y alertas']
            ].map(([id, nombre]) => (
              <button
                key={id}
                className={
                  vista === id ? '' : 'boton-secundario'
                }
                onClick={() => setVista(id)}
              >
                {nombre}
              </button>
            ))}
          </div>

          {vista === 'general' && (
            <>
              <div className="reporte-indicadores">
                <TarjetaIndicador
                  titulo="Ingresos por ventas"
                  valor={moneda(financiero.ingresos_ventas)}
                  detalle={`${financiero.cantidad_ventas} ventas`}
                />

                <TarjetaIndicador
                  titulo="Compras registradas"
                  valor={moneda(financiero.gastos_compras)}
                  detalle={`${financiero.cantidad_compras} compras`}
                />

                <TarjetaIndicador
                  titulo="Ticket promedio"
                  valor={moneda(financiero.ticket_promedio)}
                  detalle="Promedio por venta"
                />

                <TarjetaIndicador
                  titulo="Valor del inventario disponible"
                  valor={moneda(inventario.valorizacion_inventario)}
                  detalle="Costo estimado"
                />

                <TarjetaIndicador
                  titulo="Medicamentos"
                  valor={inventario.total_productos}
                  detalle="Productos activos"
                />

                <TarjetaIndicador
                  titulo="Unidades disponibles"
                  valor={inventario.unidades_disponibles}
                  detalle="Sin contar unidades vencidas"
                />

                <TarjetaIndicador
                  titulo="Productos con stock bajo"
                  valor={inventario.cantidad_stock_bajo}
                  detalle="Requieren revisión"
                />

                <TarjetaIndicador
                  titulo="Lotes próximos a vencer"
                  valor={inventario.cantidad_proximos_vencer}
                  detalle="Próximos 30 días"
                />
              </div>

              <div className="reporte-dos-columnas">
                <section className="tarjeta">
                  <h3>Ventas de los últimos días</h3>

                  <GraficoBarras
                    datos={ultimosDias}
                    campoEtiqueta="fecha"
                    campoValor="ingresos"
                    moneda
                    maximoBarras={12}
                  />
                </section>

                <section className="tarjeta">
                  <h3>Métodos de pago</h3>

                  <GraficoCircular
                    datos={financiero.metodos_pago}
                  />
                </section>
              </div>

              <section className="tarjeta">
                <h3>Medicamentos más vendidos</h3>

                <GraficoBarras
                  datos={reporte.mas_vendidos}
                  campoEtiqueta="producto"
                  campoValor="unidades"
                  maximoBarras={10}
                  horizontal
                />
              </section>
            </>
          )}

          {vista === 'ventas' && (
            <>
              <section className="tarjeta">
                <div className="modulo-barra">
                  <h3>Ventas diarias</h3>

                  <button
                    onClick={descargarVentas}
                    className="boton-secundario"
                  >
                    Exportar CSV
                  </button>
                </div>

                <div className="tabla-contenedor">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Cantidad de ventas</th>
                        <th>Ingresos</th>
                      </tr>
                    </thead>

                    <tbody>
                      {financiero.ventas_por_dia
                        .filter((item) => Number(item.ventas) > 0)
                        .map((item) => (
                          <tr key={item.fecha}>
                            <td>{item.fecha}</td>
                            <td>{item.ventas}</td>
                            <td>{moneda(item.ingresos)}</td>
                          </tr>
                        ))}
                      {!financiero.ventas_por_dia.some(
                        (item) => Number(item.ventas) > 0
                      ) && (
                          <tr>
                            <td colSpan="3">
                              No se registraron ventas en este período.
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="tarjeta">
                <h3>Ranking de medicamentos</h3>

                <div className="tabla-contenedor">
                  <table>
                    <thead>
                      <tr>
                        <th>Posición</th>
                        <th>Código</th>
                        <th>Medicamento</th>
                        <th>Unidades vendidas</th>
                        <th>Ingresos</th>
                      </tr>
                    </thead>

                    <tbody>
                      {reporte.mas_vendidos.map((item, indice) => (
                        <tr key={item.producto_id}>
                          <td>{indice + 1}</td>
                          <td>{item.codigo}</td>
                          <td>{item.producto}</td>
                          <td>{item.unidades}</td>
                          <td>{moneda(item.ingresos)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {vista === 'inventario' && (
            <>
              <div className="reporte-indicadores">
                <TarjetaIndicador
                  titulo="Unidades totales"
                  valor={inventario.unidades_totales}
                />

                <TarjetaIndicador
                  titulo="Unidades disponibles"
                  valor={inventario.unidades_disponibles}
                />

                <TarjetaIndicador
                  titulo="Unidades vencidas"
                  valor={inventario.unidades_vencidas}
                />

                <TarjetaIndicador
                  titulo="Valor disponible"
                  valor={moneda(inventario.valorizacion_inventario)}
                />
              </div>

              <section className="tarjeta">
                <div className="modulo-barra">
                  <h3>Medicamentos con stock bajo</h3>

                  <button
                    className="boton-secundario"
                    onClick={descargarInventario}
                  >
                    Exportar CSV
                  </button>
                </div>

                <div className="tabla-contenedor">
                  <table>
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Medicamento</th>
                        <th>Disponible</th>
                        <th>Stock mínimo</th>
                      </tr>
                    </thead>

                    <tbody>
                      {inventario.stock_bajo.map((item) => (
                        <tr key={item.producto_id}>
                          <td>{item.codigo}</td>
                          <td>{item.producto}</td>
                          <td>{item.disponible}</td>
                          <td>{item.minimo}</td>
                        </tr>
                      ))}

                      {!inventario.stock_bajo.length && (
                        <tr>
                          <td colSpan="4">
                            No hay productos con stock bajo.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="tarjeta">
                <div className="modulo-barra">
                  <h3>Lotes próximos a vencer</h3>

                  <button
                    className="boton-secundario"
                    onClick={descargarVencimientos}
                  >
                    Exportar CSV
                  </button>
                </div>

                <div className="tabla-contenedor">
                  <table>
                    <thead>
                      <tr>
                        <th>Medicamento</th>
                        <th>Lote</th>
                        <th>Vencimiento</th>
                        <th>Unidades</th>
                      </tr>
                    </thead>

                    <tbody>
                      {inventario.proximos_vencer.map((item, indice) => (
                        <tr key={`${item.producto_id}-${item.lote}-${indice}`}>
                          <td>{item.producto}</td>
                          <td>{item.lote}</td>
                          <td>{item.vencimiento}</td>
                          <td>{item.cantidad}</td>
                        </tr>
                      ))}

                      {!inventario.proximos_vencer.length && (
                        <tr>
                          <td colSpan="4">
                            No hay lotes próximos a vencer.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="tarjeta">
                <h3>Lotes vencidos</h3>

                <div className="tabla-contenedor">
                  <table>
                    <thead>
                      <tr>
                        <th>Medicamento</th>
                        <th>Lote</th>
                        <th>Vencimiento</th>
                        <th>Unidades</th>
                      </tr>
                    </thead>

                    <tbody>
                      {inventario.vencidos.map((item, indice) => (
                        <tr key={`${item.producto_id}-${item.lote}-${indice}`}>
                          <td>{item.producto}</td>
                          <td>{item.lote}</td>
                          <td>{item.vencimiento}</td>
                          <td>{item.cantidad}</td>
                        </tr>
                      ))}

                      {!inventario.vencidos.length && (
                        <tr>
                          <td colSpan="4">
                            No existen lotes vencidos con existencias.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
