import { useEffect, useState } from 'react';
import { api } from '../services/api';
import AnularOperacion from '../components/AnularOperacion';
import DetalleModal from '../components/DetalleModal';

const nuevaLinea = () => ({
  producto_id: '',
  cantidad: 1
});

const moneda = (valor) =>
  `S/ ${Number(valor || 0).toFixed(2)}`;

export default function Ventas({
  usuario,
  informar,
  confirmar
}) {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [detalles, setDetalles] = useState([nuevaLinea()]);
  const [guardando, setGuardando] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [buscar, setBuscar] = useState('');
  const administrador = usuario?.rol === 'ADMINISTRADOR';

  async function cargar() {
    try {
      const [c, p, v] = await Promise.all([
        api('/clientes'),
        api('/productos?activo=true'),
        api('/ventas')
      ]);

      setClientes(c.clientes);
      setProductos(p.productos);
      setVentas(v.ventas);
    } catch (error) {
      informar('Error al cargar ventas', error.message);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function actualizarLinea(indice, campo, valor) {
    setDetalles((actuales) =>
      actuales.map((item, i) =>
        i === indice
          ? { ...item, [campo]: valor }
          : item
      )
    );
  }

  function agregarLinea() {
    setDetalles((actuales) => [
      ...actuales,
      nuevaLinea()
    ]);
  }

  function quitarLinea(indice) {
    setDetalles((actuales) =>
      actuales.length > 1
        ? actuales.filter((_, i) => i !== indice)
        : actuales
    );
  }

  function obtenerProducto(id) {
    return productos.find(
      (producto) => producto.id === Number(id)
    );
  }

  const totalEstimadoCentimos = detalles.reduce((total, item) => {
    const producto = obtenerProducto(item.producto_id);

    if (!producto) return total;

    const precioCentimos =
      Math.round(Number(producto.precio_venta) * 100);

    return total + precioCentimos * Number(item.cantidad || 0);
  }, 0);

  const totalEstimado = totalEstimadoCentimos / 100;

  function solicitarVenta(evento) {
    evento.preventDefault();

    if (guardando) return;

    const ids = detalles.map((item) => Number(item.producto_id));

    if (new Set(ids).size !== ids.length) {
      informar(
        'Medicamento repetido',
        'Agrega cada medicamento una sola vez y ajusta su cantidad.'
      );
      return;
    }

    for (const item of detalles) {
      const producto = obtenerProducto(item.producto_id);
      const cantidad = Number(item.cantidad);

      if (!producto || !Number.isSafeInteger(cantidad) || cantidad <= 0) {
        informar(
          'Datos incorrectos',
          'Revisa los medicamentos y sus cantidades.'
        );
        return;
      }

      if (cantidad > Number(producto.stock_disponible)) {
        informar(
          'Stock insuficiente',
          `${producto.nombre} tiene ${producto.stock_disponible} unidades disponibles.`
        );
        return;
      }
    }

    confirmar(
      'Confirmar venta',
      `¿Deseas registrar esta venta por ${moneda(totalEstimado)}? Se descontarán las existencias del inventario.`,
      registrar
    );
  }

  async function registrar() {
    if (guardando) return;

    setGuardando(true);

    try {
      const respuesta = await api('/ventas', {
        method: 'POST',
        body: JSON.stringify({
          cliente_id: clienteId ? Number(clienteId) : null,
          metodo_pago: metodoPago,
          detalles: detalles.map((item) => ({
            producto_id: Number(item.producto_id),
            cantidad: Number(item.cantidad)
          }))
        })
      });

      setClienteId('');
      setMetodoPago('EFECTIVO');
      setDetalles([nuevaLinea()]);
      setVentaSeleccionada(null);

      await cargar();

      informar(
        'Venta registrada',
        `Venta #${respuesta.venta_id} completada. Total: ${moneda(respuesta.total)}.`
      );
    } catch (error) {
      informar('No se pudo registrar la venta', error.message);
    } finally {
      setGuardando(false);
    }
  }

  async function verDetalle(id) {
    try {
      const respuesta = await api(`/ventas/${id}`);
      setVentaSeleccionada(respuesta.venta);
    } catch (error) {
      informar('Error', error.message);
    }
  }

  const ventasFiltradas = ventas.filter((venta) => {
    const texto = [
      venta.id,
      venta.cliente?.nombre,
      venta.cliente?.apellido,
      venta.metodo_pago
    ].join(' ').toLowerCase();

    return texto.includes(buscar.toLowerCase());
  });

  return (
    <div className="pagina-modulo">
      <div className="modulo-encabezado">
        <h2>Ventas farmacéuticas</h2>
        <p>
          Registra ventas y descuenta automáticamente
          los medicamentos del inventario.
        </p>
      </div>

      <section className="tarjeta">
        <h3>Registrar nueva venta</h3>

        <form onSubmit={solicitarVenta}>
          <div className="formulario-grid">
            <div>
              <label>Cliente</label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
              >
                <option value="">Venta sin cliente identificado</option>

                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre} {cliente.apellido}
                    {' — '}
                    {cliente.numero_documento}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Método de pago</label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="YAPE">Yape</option>
                <option value="PLIN">Plin</option>
                <option value="TARJETA">Tarjeta</option>
              </select>
            </div>
          </div>

          <h3 id="medicamento-venta">Medicamentos de la venta</h3>

          {detalles.map((item, indice) => {
            const producto = obtenerProducto(item.producto_id);

            const subtotal = producto
              ? Number(producto.precio_venta) *
              Number(item.cantidad || 0)
              : 0;

            return (
              <div className="compra-detalle" key={indice}>
                <div className="compra-detalle-titulo">
                  <strong>Medicamento {indice + 1}</strong>

                  <button
                    type="button"
                    className="boton-pequeno boton-secundario"
                    disabled={detalles.length === 1}
                    onClick={() => quitarLinea(indice)}
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
                        actualizarLinea(
                          indice,
                          'producto_id',
                          e.target.value
                        )
                      }
                    >
                      <option value="">Seleccionar medicamento</option>

                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.codigo} — {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Cantidad</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={item.cantidad}
                      onChange={(e) =>
                        actualizarLinea(
                          indice,
                          'cantidad',
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="venta-dato">
                    <span>Stock disponible: </span>
                    <strong>
                      {producto ? producto.stock_disponible : '—'}
                    </strong>
                  </div>

                  <div className="venta-dato">
                    <span>Precio de venta: </span>
                    <strong>
                      {producto
                        ? moneda(producto.precio_venta)
                        : '—'}
                    </strong>
                  </div>

                  <div className="venta-dato">
                    <span>Subtotal estimado: </span>
                    <strong>{moneda(subtotal)}</strong>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="compra-pie">
            <button
              type="button"
              className="boton-secundario"
              id="agregar-medicamento"
              onClick={agregarLinea}
            >
              + Agregar medicamento
            </button>

            <div className="compra-total">
              <span>Total estimado: </span>
              <strong>{moneda(totalEstimado)}</strong>
            </div>
          </div>

          <button type="submit" disabled={guardando}>
            {guardando ? 'Registrando...' : 'Registrar venta'}
          </button>
        </form>
      </section>

      <section className="tarjeta">
        <div className="modulo-barra">
          <h3>Historial de ventas</h3>

          <input
            placeholder="Buscar venta, cliente o pago"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>

        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>N.º</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Método de pago</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {ventasFiltradas.map((venta) => (
                <tr key={venta.id}>
                  <td>#{venta.id}</td>
                  <td>
                    {new Date(venta.fecha).toLocaleString('es-PE')}
                  </td>
                  <td>
                    {venta.cliente
                      ? `${venta.cliente.nombre} ${venta.cliente.apellido}`
                      : 'No identificado'}
                  </td>
                  <td>
                    {venta.usuario?.nombre}{' '}
                    {venta.usuario?.apellido}
                  </td>
                  <td>{venta.metodo_pago}</td>
                  <td>{moneda(venta.total)}</td>
                  <td>{venta.estado}</td>
                  <td>
                    <div className="operaciones-tabla">
                      <button
                        type="button"
                        className="boton-pequeno"
                        onClick={() => verDetalle(venta.id)}
                      >
                        Ver detalle
                      </button>

                      {administrador && venta.estado === 'COMPLETADA' && (
                        <AnularOperacion
                          tipo="venta"
                          registro={venta}
                          confirmar={confirmar}
                          informar={informar}
                          alCompletar={async () => {
                            setVentaSeleccionada(null);
                            await cargar();
                          }}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {ventasFiltradas.length === 0 && (
                <tr>
                  <td colSpan="8">No hay ventas registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>


      <DetalleModal
        abierto={Boolean(ventaSeleccionada)}
        titulo={
          ventaSeleccionada
            ? `Detalle de venta #${ventaSeleccionada.id}`
            : ''
        }
        subtitulo="Medicamentos vendidos y lotes utilizados"
        onCerrar={() => setVentaSeleccionada(null)}
      >
        {ventaSeleccionada && (
          <>
            <div className="detalle-modal-datos">
              <span>
                <strong>Método de pago: </strong>
                {ventaSeleccionada.metodo_pago}
              </span>

              <span>
                <strong>Estado: </strong>
                {ventaSeleccionada.estado}
              </span>

              <span>
                <strong>Venta: </strong>
                #{ventaSeleccionada.id}
              </span>
            </div>

            <div className="tabla-contenedor">
              <table>
                <thead>
                  <tr>
                    <th>Medicamento</th>
                    <th>Lote utilizado</th>
                    <th>Vencimiento</th>
                    <th>Cantidad</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>

                <tbody>
                  {(ventaSeleccionada.detalles || []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.lote?.producto?.nombre}</td>
                      <td>{item.lote?.numero_lote}</td>
                      <td>{item.lote?.fecha_vencimiento}</td>
                      <td>{item.cantidad}</td>
                      <td>{moneda(item.precio_unitario)}</td>
                      <td>{moneda(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="detalle-modal-total">
              Total: {moneda(ventaSeleccionada.total)}
            </div>
          </>
        )}
      </DetalleModal>

    </div>
  );
}