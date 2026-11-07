
import { useEffect, useState } from 'react';
import { api } from '../services/api';

const dinero = (n) => `S/ ${Number(n || 0).toFixed(2)}`;

function fechaLima() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const valor = (tipo) =>
    partes.find((p) => p.type === tipo)?.value;

  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

function fechaAnterior(fecha, dias) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

function Indicador({ etiqueta, valor, detalle, tono }) {
  return (
    <article className={`dashboard-indicador ${tono || ''}`}>
      <span>{etiqueta}</span>
      <strong>{valor}</strong>
      <small>{detalle}</small>
    </article>
  );
}

export default function Dashboard({
  usuario,
  cambiarSeccion,
  informar
}) {
  const esAdmin = usuario.rol === 'ADMINISTRADOR';

  const [reporte, setReporte] = useState(null);
  const [cargando, setCargando] = useState(esAdmin);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!esAdmin) return;

    let vigente = true;

    const hasta = fechaLima();
    const desde = fechaAnterior(hasta, 29);

    const parametros = new URLSearchParams({
      desde,
      hasta
    });

    api(`/reportes?${parametros.toString()}`)
      .then((data) => {
        if (vigente) {
          setReporte(data.reporte);
        }
      })
      .catch((err) => {
        if (vigente) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (vigente) {
          setCargando(false);
        }
      });

    return () => {
      vigente = false;
    };
  }, [esAdmin]);

  const financiero = reporte?.financiero;
  const inventario = reporte?.inventario;

  const accesos = [
    {
      titulo: 'Inventario',
      descripcion: 'Consultar lotes y existencias',
      seccion: 'inventario'
    },
    {
      titulo: 'Ventas',
      descripcion: 'Registrar y consultar ventas',
      seccion: 'ventas'
    },
    {
      titulo: 'Clientes',
      descripcion: 'Consultar clientes registrados',
      seccion: 'clientes'
    },
    ...(esAdmin ? [
      {
        titulo: 'Compras',
        descripcion: 'Ingresar medicamentos',
        seccion: 'compras'
      },
      {
        titulo: 'Productos',
        descripcion: 'Administrar catálogo',
        seccion: 'productos'
      },
      {
        titulo: 'Reportes',
        descripcion: 'Ver estadísticas completas',
        seccion: 'reportes'
      }
    ] : [])
  ];

  return (
    <div className="dashboard-nova">

      <section className="dashboard-presentacion">
        <div>
          <span className="dashboard-sobretitulo">
            RESUMEN OPERATIVO
          </span>

          <h2>Bienvenido a Nova Salud</h2>

          <p>
            Consulta el estado de la farmacia y accede
            rápidamente a tus operaciones.
          </p>
        </div>

        <span className="dashboard-fecha">
          {new Intl.DateTimeFormat('es-PE', {
            timeZone: 'America/Lima',
            dateStyle: 'long'
          }).format(new Date())}
        </span>
      </section>

      {esAdmin && cargando && (
        <p className="dashboard-aviso">
          Cargando indicadores...
        </p>
      )}

      {esAdmin && error && (
        <section className="dashboard-aviso" role="alert">
          <span>
            No se pudieron cargar los indicadores: {error}.
            Puedes seguir utilizando los módulos.
          </span>

          <button
            className="boton-secundario"
            onClick={() =>
              informar('Error del dashboard', error)
            }
          >
            Ver detalle
          </button>
        </section>
      )}

      {esAdmin && reporte && (
        <>
          <div className="dashboard-indicadores">

            <Indicador
              etiqueta="Ventas del período"
              valor={dinero(financiero.ingresos_ventas)}
              detalle={`${financiero.cantidad_ventas} ventas · últimos 30 días`}
            />

            <Indicador
              etiqueta="Compras del período"
              valor={dinero(financiero.gastos_compras)}
              detalle={`${financiero.cantidad_compras} compras · últimos 30 días`}
            />

            <Indicador
              etiqueta="Unidades disponibles"
              valor={inventario.unidades_disponibles}
              detalle="Existencias vigentes"
            />

            <Indicador
              etiqueta="Alertas de inventario"
              valor={
                inventario.cantidad_stock_bajo +
                inventario.cantidad_proximos_vencer
              }
              detalle={
                `${inventario.cantidad_stock_bajo} stock bajo · ` +
                `${inventario.cantidad_proximos_vencer} por vencer`
              }
              tono={
                inventario.cantidad_stock_bajo +
                inventario.cantidad_proximos_vencer > 0
                  ? 'dashboard-atencion'
                  : ''
              }
            />

          </div>

          <section className="dashboard-resumen">
            <div>
              <h3>Estado del inventario</h3>

              <p>
                <strong>{inventario.total_productos}</strong>
                {' '}medicamentos activos
              </p>

              <p>
                <strong>{inventario.unidades_vencidas}</strong>
                {' '}unidades vencidas
              </p>

              <p>
                <strong>
                  {dinero(inventario.valorizacion_inventario)}
                </strong>
                {' '}valor disponible a costo estimado
              </p>
            </div>

            <button
              onClick={() => cambiarSeccion('reportes')}
            >
              Ver reportes completos
            </button>
          </section>
        </>
      )}

      <section className="dashboard-accesos">

        <div className="dashboard-seccion-titulo">
          <h3>Accesos rápidos</h3>
          <p>Selecciona un módulo para continuar.</p>
        </div>

        <div className="dashboard-accesos-grid">
          {accesos.map((item) => (
            <button
              key={item.seccion}
              className="dashboard-acceso"
              onClick={() =>
                cambiarSeccion(item.seccion)
              }
            >
              <strong>{item.titulo}</strong>

              <span>{item.descripcion}</span>

              <span className="dashboard-acceso-ir">
                Abrir módulo →
              </span>
            </button>
          ))}
        </div>

      </section>
    </div>
  );
}
