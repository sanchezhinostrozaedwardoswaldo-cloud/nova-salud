import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Inventario({ informar }) {
  const [resumen, setResumen] = useState(null);
  const [lotes, setLotes] = useState([]);

  async function cargar() {
    try {
      const [datosInventario, datosLotes] = await Promise.all([
        api('/inventario/resumen'),
        api('/inventario/lotes')
      ]);

      setResumen(datosInventario);
      setLotes(datosLotes.lotes);
    } catch (error) {
      informar('Error al cargar inventario', error.message);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  if (!resumen) {
    return <p>Cargando inventario...</p>;
  }

  return (
    <div className="pagina-modulo">
      <div className="modulo-encabezado">
        <h2>Inventario farmacéutico</h2>
        <p>Existencias, lotes y fechas de vencimiento.</p>
      </div>

      <div className="tarjetas">
        <article className="tarjeta">
          <span>Medicamentos</span>
          <h3>{resumen.total_productos}</h3>
        </article>

        <article className="tarjeta">
          <span>Stock bajo</span>
          <h3>{resumen.alertas.stock_bajo.length}</h3>
        </article>

        <article className="tarjeta">
          <span>Próximos a vencer</span>
          <h3>{resumen.alertas.proximos_vencer.length}</h3>
        </article>
      </div>

      <section className="tarjeta">
        <h3>Resumen de existencias</h3>

        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Medicamento</th>
                <th>Stock total</th>
                <th>Disponible</th>
                <th>Vencido</th>
                <th>Stock mínimo</th>
                <th>Alerta</th>
              </tr>
            </thead>
            <tbody>
              {resumen.inventario.map((item) => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                  <td>{item.stock_total}</td>
                  <td>{item.stock_disponible}</td>
                  <td>{item.stock_vencido}</td>
                  <td>{item.stock_minimo}</td>
                  <td>
                    {item.stock_bajo
                      ? <span className="estado-alerta">Stock bajo</span>
                      : <span className="estado-ok">Normal</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tarjeta">
        <h3>Lotes registrados</h3>

        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Medicamento</th>
                <th>Lote</th>
                <th>Vencimiento</th>
                <th>Existencias</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lotes.map((lote) => (
                <tr key={lote.id}>
                  <td>{lote.producto?.nombre}</td>
                  <td>{lote.numero_lote}</td>
                  <td>{lote.fecha_vencimiento}</td>
                  <td>{lote.stock_actual}</td>
                  <td>
                    {lote.vencido
                      ? <span className="estado-alerta">Vencido</span>
                      : <span className="estado-ok">Vigente</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}