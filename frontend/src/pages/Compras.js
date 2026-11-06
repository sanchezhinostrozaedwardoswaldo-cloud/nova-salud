import { useEffect, useState } from 'react';
import { api } from '../services/api';

const detalleInicial = () => ({
  producto_id: '',
  numero_lote: '',
  fecha_vencimiento: '',
  cantidad: 1,
  precio_unitario: ''
});

function formatoMoneda(valor) {
  return `S/ ${Number(valor || 0).toFixed(2)}`;
}

export default function Compras({ usuario, informar, confirmar }) {
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [compras, setCompras] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [proveedorId, setProveedorId] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [detalles, setDetalles] = useState([detalleInicial()]);
  const [guardando, setGuardando] = useState(false);
  const [compraSeleccionada, setCompraSeleccionada] = useState(null);
  const [vista, setVista] = useState('compras');

  const administrador = usuario.rol === 'ADMINISTRADOR';

  async function cargar() {
    try {
      const [p, m, c, movimientosRespuesta] = await Promise.all([
        api('/proveedores'),
        api('/productos?activo=true'),
        api('/compras'),
        api('/compras/movimientos')
      ]);

      setProveedores(p.proveedores);
      setProductos(m.productos);
      setCompras(c.compras);
      setMovimientos(movimientosRespuesta.movimientos);
    } catch (error) {
      informar('Error al cargar compras', error.message);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function actualizarDetalle(indice, campo, valor) {
    setDetalles((actuales) =>
      actuales.map((item, i) =>
        i === indice ? { ...item, [campo]: valor } : item
      )
    );
  }

  function agregarDetalle() {
    setDetalles((actuales) => [...actuales, detalleInicial()]);
  }

  function quitarDetalle(indice) {
    setDetalles((actuales) =>
      actuales.length > 1
        ? actuales.filter((_, i) => i !== indice)
        : actuales
    );
  }

  const totalCentimos = detalles.reduce((total, item) => {
    const cantidad = Number(item.cantidad);
    const precio = Number(item.precio_unitario);

    if (!Number.isFinite(cantidad) || !Number.isFinite(precio)) {
      return total;
    }

    return total + Math.round(precio * 100) * cantidad;
  }, 0);

  const total = totalCentimos / 100;

  function solicitarRegistro(evento) {
    evento.preventDefault();

    if (guardando) return;

    if (!proveedorId) {
      informar('Datos incompletos', 'Selecciona un proveedor.');
      return;
    }

    if (detalles.some((item) =>
      !item.producto_id ||
      !item.numero_lote.trim() ||
      !item.fecha_vencimiento ||
      !Number.isSafeInteger(Number(item.cantidad)) ||
      Number(item.cantidad) <= 0 ||
      item.precio_unitario === '' ||
      !Number.isFinite(Number(item.precio_unitario)) ||
      Number(item.precio_unitario) < 0
    )) {
      informar(
        'Datos incompletos',
        'Revisa los medicamentos, lotes, cantidades y precios.'
      );
      return;
    }

    confirmar(
      'Confirmar compra',
      `¿Deseas registrar esta compra por ${formatoMoneda(total)}? Se incrementará el inventario.`,
      registrar
    );
  }

  async function registrar() {
    setGuardando(true);

    try {
      const respuesta = await api('/compras', {
        method: 'POST',
        body: JSON.stringify({
          proveedor_id: Number(proveedorId),
          numero_documento: numeroDocumento,
          detalles: detalles.map((item) => ({
            producto_id: Number(item.producto_id),
            numero_lote: item.numero_lote.trim(),
            fecha_vencimiento: item.fecha_vencimiento,
            cantidad: Number(item.cantidad),
            precio_unitario: Number(item.precio_unitario).toFixed(2)
          }))
        })
      });

      setProveedorId('');
      setNumeroDocumento('');
      setDetalles([detalleInicial()]);

      await cargar();

      informar(
        'Compra registrada',
        `Compra #${respuesta.compra_id} registrada correctamente. Total: ${formatoMoneda(respuesta.total)}.`
      );
    } catch (error) {
      informar('No se pudo registrar la compra', error.message);
    } finally {
      setGuardando(false);
    }
  }

  async function verDetalle(id) {
    try {
      const respuesta = await api(`/compras/${id}`);
      setCompraSeleccionada(respuesta.compra);
    } catch (error) {
      informar('Error', error.message);
    }
  }

  return (
    <div className="pagina-modulo">
      <div className="modulo-encabezado">
        <h2>Compras farmacéuticas</h2>
        <p>Registra ingresos de medicamentos y controla sus lotes.</p>
      </div>

      <div className="acciones-tabla">
        <button
          className={vista === 'compras' ? '' : 'boton-secundario'}
          onClick={() => setVista('compras')}
        >
          Compras
        </button>

        <button
          className={vista === 'movimientos' ? '' : 'boton-secundario'}
          onClick={() => setVista('movimientos')}
        >
          Movimientos de inventario
        </button>
      </div>

      {vista === 'compras' && (
        <>
          {administrador && (
            <section className="tarjeta">
              <h3>Registrar nueva compra</h3>

              <form onSubmit={solicitarRegistro}>
                <div className="formulario-grid">
                  <div>
                    <label>Proveedor</label>
                    <select
                      required
                      value={proveedorId}
                      onChange={(e) => setProveedorId(e.target.value)}
                    >
                      <option value="">Seleccionar proveedor</option>

                      {proveedores.filter((p) => p.activo).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.razon_social} — {p.ruc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Número de documento</label>
                    <input
                      value={numeroDocumento}
                      onChange={(e) => setNumeroDocumento(e.target.value)}
                      placeholder="Ejemplo: F001-000123"
                      maxLength={100}
                    />
                  </div>
                </div>

                <h3>Medicamentos de la compra</h3>

                {detalles.map((item, indice) => (
                  <div className="compra-detalle" key={indice}>
                    <div className="compra-detalle-titulo">
                      <strong>Medicamento {indice + 1}</strong>

                      <button
                        type="button"
                        className="boton-pequeno boton-secundario"
                        disabled={detalles.length === 1}
                        onClick={() => quitarDetalle(indice)}
                      >
                        Quitar
                      </button>
                    </div>

                    <div className="formulario-grid">
                      <div>
                        <label>Medicamento</label>
                        <select
                          required
                          value={item.producto_id}
                          onChange={(e) =>
                            actualizarDetalle(
                              indice,
                              'producto_id',
                              e.target.value
                            )
                          }
                        >
                          <option value="">Seleccionar medicamento</option>

                          {productos.map((producto) => (
                            <option key={producto.id} value={producto.id}>
                              {producto.codigo} — {producto.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label>Número de lote</label>
                        <input
                          required
                          maxLength={100}
                          value={item.numero_lote}
                          onChange={(e) =>
                            actualizarDetalle(
                              indice,
                              'numero_lote',
                              e.target.value
                            )
                          }
                          placeholder="Ejemplo: LOT-2026-001"
                        />
                      </div>

                      <div>
                        <label>Fecha de vencimiento</label>
                        <input
                          type="date"
                          required
                          min={new Date().toISOString().slice(0, 10)}
                          value={item.fecha_vencimiento}
                          onChange={(e) =>
                            actualizarDetalle(
                              indice,
                              'fecha_vencimiento',
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div>
                        <label>Cantidad</label>
                        <input
                          type="number"
                          min="1"
                          max="1000000"
                          step="1"
                          required
                          value={item.cantidad}
                          onChange={(e) =>
                            actualizarDetalle(
                              indice,
                              'cantidad',
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div>
                        <label>Precio unitario de compra (S/)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={item.precio_unitario}
                          onChange={(e) =>
                            actualizarDetalle(
                              indice,
                              'precio_unitario',
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="compra-subtotal">
                        <span>Subtotal</span>
                        <strong>
                          {formatoMoneda(
                            Math.round(Number(item.precio_unitario || 0) * 100) *
                            Number(item.cantidad || 0) / 100
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="compra-pie">
                  <button
                    type="button"
                    className="boton-secundario"
                    onClick={agregarDetalle}
                  >
                    + Agregar medicamento
                  </button>

                  <div className="compra-total">
                    <span>Total de compra</span>
                    <strong>{formatoMoneda(total)}</strong>
                  </div>
                </div>

                <button type="submit" disabled={guardando}>
                  {guardando ? 'Registrando...' : 'Registrar compra'}
                </button>
              </form>
            </section>
          )}

          <section className="tarjeta">
            <h3>Historial de compras</h3>

            <div className="tabla-contenedor">
              <table>
                <thead>
                  <tr>
                    <th>N.º</th>
                    <th>Fecha</th>
                    <th>Proveedor</th>
                    <th>Documento</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {compras.map((compra) => (
                    <tr key={compra.id}>
                      <td>#{compra.id}</td>
                      <td>{new Date(compra.fecha).toLocaleString('es-PE')}</td>
                      <td>{compra.proveedor?.razon_social}</td>
                      <td>{compra.numero_documento || '—'}</td>
                      <td>{formatoMoneda(compra.total)}</td>
                      <td>{compra.estado}</td>
                      <td>
                        <button
                          className="boton-pequeno"
                          onClick={() => verDetalle(compra.id)}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {compraSeleccionada && (
            <section className="tarjeta">
              <div className="compra-detalle-titulo">
                <h3>Detalle de compra #{compraSeleccionada.id}</h3>
                <button
                  className="boton-secundario"
                  onClick={() => setCompraSeleccionada(null)}
                >
                  Cerrar detalle
                </button>
              </div>

              <p>
                Proveedor: {compraSeleccionada.proveedor?.razon_social}
              </p>

              <div className="tabla-contenedor">
                <table>
                  <thead>
                    <tr>
                      <th>Medicamento</th>
                      <th>Lote</th>
                      <th>Vencimiento</th>
                      <th>Cantidad</th>
                      <th>Precio</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(compraSeleccionada.detalles || []).map((item) => (
                      <tr key={item.id}>
                        <td>{item.lote?.producto?.nombre}</td>
                        <td>{item.lote?.numero_lote}</td>
                        <td>{item.lote?.fecha_vencimiento}</td>
                        <td>{item.cantidad}</td>
                        <td>{formatoMoneda(item.precio_unitario)}</td>
                        <td>{formatoMoneda(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {vista === 'movimientos' && (
        <section className="tarjeta">
          <h3>Últimos movimientos de inventario</h3>

          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Medicamento</th>
                  <th>Lote</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Stock anterior</th>
                  <th>Stock nuevo</th>
                  <th>Motivo</th>
                </tr>
              </thead>

              <tbody>
                {movimientos.map((movimiento) => (
                  <tr key={movimiento.id}>
                    <td>{movimiento.lote?.producto?.nombre}</td>
                    <td>{movimiento.lote?.numero_lote}</td>
                    <td>{movimiento.tipo}</td>
                    <td>{movimiento.cantidad}</td>
                    <td>{movimiento.stock_anterior}</td>
                    <td>{movimiento.stock_nuevo}</td>
                    <td>{movimiento.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}