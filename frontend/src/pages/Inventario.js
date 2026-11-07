
import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Inventario({
  usuario,
  informar,
  confirmar
}) {
  const administrador = usuario?.rol === 'ADMINISTRADOR';

  const [resumen, setResumen] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [totalMovimientos, setTotalMovimientos] = useState(0);

  const [vista, setVista] = useState('inventario');
  const [loteSeleccionado, setLoteSeleccionado] = useState('');
  const [stockNuevo, setStockNuevo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [filtroLote, setFiltroLote] = useState('');

  async function cargarInventario() {
    const [datosInventario, datosLotes] = await Promise.all([
      api('/inventario/resumen'),
      api('/inventario/lotes')
    ]);

    setResumen(datosInventario);
    setLotes(datosLotes.lotes);
  }

  async function cargarAuditoria(
    paginaActual = pagina,
    loteId = filtroLote
  ) {
    if (!administrador) return;

    const params = new URLSearchParams({
      pagina: String(paginaActual),
      limite: '20'
    });

    if (loteId) {
      params.set('lote_id', loteId);
    }

    const respuesta = await api(
      `/operaciones-inventario/auditoria?${params.toString()}`
    );

    setMovimientos(respuesta.movimientos);
    setTotalMovimientos(respuesta.total);
  }

  useEffect(() => {
    let activo = true;

    async function inicializar() {
      try {
        const [datosInventario, datosLotes] = await Promise.all([
          api('/inventario/resumen'),
          api('/inventario/lotes')
        ]);

        if (!activo) return;

        setResumen(datosInventario);
        setLotes(datosLotes.lotes);
      } catch (error) {
        if (activo) {
          informar('Error al cargar inventario', error.message);
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    inicializar();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (!administrador || vista !== 'auditoria') return;

    cargarAuditoria(pagina, filtroLote).catch((error) => {
      informar('Error al cargar auditoría', error.message);
    });
  }, [administrador, vista, pagina, filtroLote]);

  const loteActual = lotes.find(
    (lote) => lote.id === Number(loteSeleccionado)
  );

  function seleccionarLote(id) {
    setLoteSeleccionado(String(id));

    const lote = lotes.find(
      (item) => item.id === Number(id)
    );

    setStockNuevo(
      lote ? String(lote.stock_actual) : ''
    );

    setMotivo('');
    setVista('ajustes');
  }

  function solicitarAjuste(evento) {
    evento.preventDefault();

    if (guardando) return;

    if (!loteActual) {
      informar('Lote inválido', 'Selecciona un lote existente.');
      return;
    }

    const nuevo = Number(stockNuevo);
    const anterior = Number(loteActual.stock_actual);
    const texto = motivo.trim();

    if (
      !Number.isSafeInteger(nuevo) ||
      nuevo < 0 ||
      nuevo > 2147483647
    ) {
      informar(
        'Stock inválido',
        'Indica una cantidad entera no negativa.'
      );
      return;
    }

    if (nuevo === anterior) {
      informar(
        'Sin cambios',
        'El nuevo stock es igual al stock actual.'
      );
      return;
    }

    if (texto.length < 10 || texto.length > 180) {
      informar(
        'Motivo inválido',
        'El motivo debe tener entre 10 y 180 caracteres.'
      );
      return;
    }

    const diferencia = nuevo - anterior;
    const accion = diferencia > 0
      ? `aumentará en ${diferencia}`
      : `disminuirá en ${Math.abs(diferencia)}`;

    confirmar(
      'Confirmar ajuste de inventario',
      `El stock del lote ${loteActual.numero_lote} ` +
      `${accion} unidades. Pasará de ${anterior} a ${nuevo}. ` +
      '¿Deseas continuar?',
      () => ejecutarAjuste(
        loteActual.id,
        nuevo,
        texto
      )
    );
  }

  async function ejecutarAjuste(loteId, nuevo, texto) {
    if (guardando) return;

    setGuardando(true);

    try {
      const respuesta = await api(
        '/operaciones-inventario/ajustes',
        {
          method: 'POST',
          body: JSON.stringify({
            lote_id: loteId,
            stock_nuevo: nuevo,
            motivo: texto
          })
        }
      );

      setLoteSeleccionado('');
      setStockNuevo('');
      setMotivo('');

      try {
        await cargarInventario();
      } catch (error) {
        informar(
          'Ajuste realizado',
          `${respuesta.message}. No se pudo actualizar ` +
          `el inventario: ${error.message}`
        );
        return;
      }

      informar(
        'Inventario actualizado',
        `El lote fue ajustado correctamente. ` +
        `Nuevo stock: ${respuesta.resultado.stock_nuevo}.`
      );
    } catch (error) {
      informar('No se pudo ajustar el inventario', error.message);
    } finally {
      setGuardando(false);
    }
  }

  function cambiarFiltroLote(valor) {
    setFiltroLote(valor);
    setPagina(1);
  }

  const totalPaginas = Math.max(
    1,
    Math.ceil(totalMovimientos / 20)
  );

  if (cargando && !resumen) {
    return <p>Cargando inventario...</p>;
  }

  if (!resumen) {
    return (
      <section className="tarjeta">
        <p>No se pudo cargar el inventario.</p>
        <button
          onClick={() =>
            cargarInventario().catch((error) =>
              informar('Error', error.message)
            )
          }
        >
          Reintentar
        </button>
      </section>
    );
  }

  return (
    <div className="pagina-modulo">
      <div className="modulo-encabezado">
        <h2>Inventario farmacéutico</h2>
        <p>
          Control de existencias, lotes y movimientos.
        </p>
      </div>

      <div className="acciones-tabla">
        <button
          type="button"
          className={
            vista === 'inventario'
              ? ''
              : 'boton-secundario'
          }
          onClick={() => setVista('inventario')}
        >
          Inventario
        </button>

        {administrador && (
          <>
            <button
              type="button"
              className={
                vista === 'ajustes'
                  ? ''
                  : 'boton-secundario'
              }
              onClick={() => setVista('ajustes')}
            >
              Ajustar existencias
            </button>

            <button
              type="button"
              className={
                vista === 'auditoria'
                  ? ''
                  : 'boton-secundario'
              }
              onClick={() => setVista('auditoria')}
            >
              Auditoría
            </button>
          </>
        )}
      </div>

      {vista === 'inventario' && (
        <>

          <div className="tarjetas">
            <article className="tarjeta indicador-neutro">
              <span>Medicamentos</span>
              <h3>{resumen.total_productos}</h3>
            </article>

            <article
              className={
                resumen.alertas.stock_bajo.length > 0
                  ? 'tarjeta indicador-peligro'
                  : 'tarjeta indicador-positivo'
              }
            >
              <span>Stock bajo</span>
              <h3>{resumen.alertas.stock_bajo.length}</h3>
            </article>

            <article
              className={
                resumen.alertas.proximos_vencer.length > 0
                  ? 'tarjeta indicador-advertencia'
                  : 'tarjeta indicador-positivo'
              }
            >
              <span>Próximos a vencer</span>
              <h3>
                {resumen.alertas.proximos_vencer.length}
              </h3>
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
                      <td
                        className={
                          item.stock_bajo
                            ? 'cantidad-negativa'
                            : 'cantidad-positiva'
                        }
                      >
                        {item.stock_disponible}
                      </td>

                      <td
                        className={
                          Number(item.stock_vencido) > 0
                            ? 'cantidad-negativa'
                            : ''
                        }
                      >
                        {item.stock_vencido}
                      </td>

                      <td>{item.stock_minimo}</td>
                      <td>
                        {item.stock_bajo
                          ? (
                            <span className="estado-alerta">
                              Stock bajo
                            </span>
                          )
                          : (
                            <span className="estado-ok">
                              Normal
                            </span>
                          )}
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
                    {administrador && <th>Acción</th>}
                  </tr>
                </thead>

                <tbody>
                  {lotes.map((lote) => (
                    <tr key={lote.id}>
                      <td>{lote.producto?.nombre}</td>
                      <td>{lote.numero_lote}</td>
                      <td>{lote.fecha_vencimiento}</td>
                      <td
                        className={
                          lote.vencido && Number(lote.stock_actual) > 0
                            ? 'cantidad-negativa'
                            : 'cantidad-positiva'
                        }
                      >
                        {lote.stock_actual}
                      </td>
                      <td>
                        {lote.vencido
                          ? (
                            <span className="estado-alerta">
                              Vencido
                            </span>
                          )
                          : (
                            <span className="estado-ok">
                              Vigente
                            </span>
                          )}
                      </td>

                      {administrador && (
                        <td>
                          <button
                            type="button"
                            className="boton-pequeno"
                            onClick={() =>
                              seleccionarLote(lote.id)
                            }
                          >
                            Ajustar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {administrador && vista === 'ajustes' && (
        <section className="tarjeta">
          <h3>Ajuste manual de existencias</h3>

          <p className="texto-ayuda">
            Utiliza esta opción cuando un conteo físico
            detecte diferencias con el inventario registrado.
            Todos los cambios quedarán auditados.
          </p>

          <form onSubmit={solicitarAjuste}>
            <div className="formulario-grid">
              <div>
                <label>Lote</label>
                <select
                  required
                  value={loteSeleccionado}
                  onChange={(e) =>
                    seleccionarLote(e.target.value)
                  }
                >
                  <option value="">
                    Seleccionar lote
                  </option>

                  {lotes.map((lote) => (
                    <option key={lote.id} value={lote.id}>
                      {lote.producto?.nombre} —
                      {' '}{lote.numero_lote}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Stock actual</label>
                <input
                  value={
                    loteActual
                      ? loteActual.stock_actual
                      : ''
                  }
                  readOnly
                  placeholder="Selecciona un lote"
                />
              </div>

              <div>
                <label>Nuevo stock</label>
                <input
                  type="number"
                  min="0"
                  max="2147483647"
                  step="1"
                  required
                  value={stockNuevo}
                  onChange={(e) =>
                    setStockNuevo(e.target.value)
                  }
                />
              </div>
            </div>

            <div className="campo-motivo">
              <label>Motivo del ajuste</label>
              <textarea
                rows="3"
                required
                maxLength={180}
                value={motivo}
                onChange={(e) =>
                  setMotivo(e.target.value)
                }
                placeholder={
                  'Ejemplo: Diferencia detectada ' +
                  'durante el conteo físico'
                }
              />

              <small>
                {motivo.trim().length}/180 caracteres
              </small>
            </div>

            <button
              type="submit"
              disabled={
                guardando ||
                !loteActual
              }
            >
              {guardando
                ? 'Guardando ajuste...'
                : 'Registrar ajuste'}
            </button>
          </form>
        </section>
      )}

      {administrador && vista === 'auditoria' && (
        <section className="tarjeta">
          <div className="modulo-barra">
            <div>
              <h3>Auditoría de inventario</h3>
              <p className="texto-ayuda">
                Historial de entradas, salidas y ajustes.
              </p>
            </div>

            <select
              value={filtroLote}
              onChange={(e) =>
                cambiarFiltroLote(e.target.value)
              }
            >
              <option value="">Todos los lotes</option>

              {lotes.map((lote) => (
                <option key={lote.id} value={lote.id}>
                  {lote.producto?.nombre} —
                  {' '}{lote.numero_lote}
                </option>
              ))}
            </select>
          </div>

          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Lote</th>
                  <th>Usuario ID</th>
                  <th>Tipo</th>
                  <th>Cambio</th>
                  <th>Anterior</th>
                  <th>Nuevo</th>
                  <th>Motivo</th>
                </tr>
              </thead>

              <tbody>
                {movimientos.map((movimiento) => {
                  const lote = lotes.find(
                    (item) =>
                      item.id === movimiento.lote_id
                  );

                  return (
                    <tr key={movimiento.id}>
                      <td>
                        {new Date(
                          movimiento.createdAt
                        ).toLocaleString('es-PE')}
                      </td>

                      <td>
                        {lote
                          ? `${lote.producto?.nombre} — ${lote.numero_lote}`
                          : `Lote #${movimiento.lote_id}`}
                      </td>

                      <td>
                        #{movimiento.usuario_id}
                      </td>

                      <td>{movimiento.tipo}</td>

                      <td
                        className={
                          movimiento.cantidad > 0
                            ? 'cantidad-positiva'
                            : 'cantidad-negativa'
                        }
                      >
                        {movimiento.cantidad > 0
                          ? '+'
                          : ''}
                        {movimiento.cantidad}
                      </td>

                      <td>
                        {movimiento.stock_anterior}
                      </td>

                      <td>
                        {movimiento.stock_nuevo}
                      </td>

                      <td>{movimiento.motivo}</td>
                    </tr>
                  );
                })}

                {movimientos.length === 0 && (
                  <tr>
                    <td colSpan="8">
                      No hay movimientos para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="auditoria-paginacion">
            <span>
              {totalMovimientos} movimientos ·
              Página {pagina} de {totalPaginas}
            </span>

            <div className="acciones-tabla">
              <button
                type="button"
                className="boton-secundario"
                disabled={pagina <= 1}
                onClick={() =>
                  setPagina((p) => p - 1)
                }
              >
                Anterior
              </button>

              <button
                type="button"
                className="boton-secundario"
                disabled={pagina >= totalPaginas}
                onClick={() =>
                  setPagina((p) => p + 1)
                }
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
