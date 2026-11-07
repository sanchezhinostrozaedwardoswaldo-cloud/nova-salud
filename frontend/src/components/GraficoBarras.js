
function numero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function fechaCorta(valor) {
  const texto = String(valor ?? '');

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return `${texto.slice(8, 10)}/${texto.slice(5, 7)}`;
  }

  return texto;
}

function formatoValor(valor, moneda) {
  return moneda
    ? `S/ ${numero(valor).toFixed(2)}`
    : numero(valor).toLocaleString('es-PE');
}

export default function GraficoBarras({
  datos = [],
  campoEtiqueta,
  campoValor,
  moneda = false,
  maximoBarras = 12,
  horizontal = false
}) {
  const elementos = datos.slice(0, maximoBarras);

  if (!elementos.length) {
    return (
      <p className="reporte-vacio">
        No hay información para mostrar.
      </p>
    );
  }

  const maximo = Math.max(
    1,
    ...elementos.map((item) => numero(item[campoValor]))
  );

  if (horizontal) {
    return (
      <div className="grafico-ranking">
        {elementos.map((item, indice) => {
          const valor = numero(item[campoValor]);
          const porcentaje = (valor / maximo) * 100;

          return (
            <div className="grafico-ranking-fila" key={indice}>
              <div className="grafico-ranking-cabecera">
                <span title={String(item[campoEtiqueta])}>
                  {indice + 1}. {item[campoEtiqueta]}
                </span>

                <strong>
                  {formatoValor(valor, moneda)}
                </strong>
              </div>

              <div className="grafico-ranking-pista">
                <div
                  className="grafico-ranking-barra"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const ancho = 800;
  const alto = 270;
  const izquierda = 55;
  const derecha = 18;
  const arriba = 30;
  const abajo = 48;

  const anchoUtil = ancho - izquierda - derecha;
  const altoUtil = alto - arriba - abajo;
  const anchoGrupo = anchoUtil / elementos.length;
  const anchoBarra = Math.min(38, anchoGrupo * 0.6);

  return (
    <div className="grafico-contenedor">
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        role="img"
        aria-label="Gráfico de ventas por día"
      >
        {[0, 1, 2, 3, 4].map((indice) => {
          const y = arriba + (altoUtil / 4) * indice;
          const valor = maximo * (1 - indice / 4);

          return (
            <g key={indice}>
              <line
                x1={izquierda}
                x2={ancho - derecha}
                y1={y}
                y2={y}
                stroke="var(--borde)"
              />

              <text
                x={izquierda - 9}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--texto-secundario)"
              >
                {moneda
                  ? valor.toFixed(0)
                  : Math.round(valor)}
              </text>
            </g>
          );
        })}

        {elementos.map((item, indice) => {
          const valor = numero(item[campoValor]);
          const altura = (valor / maximo) * altoUtil;

          const x =
            izquierda +
            indice * anchoGrupo +
            (anchoGrupo - anchoBarra) / 2;

          const y = arriba + altoUtil - altura;
          const nombre = String(item[campoEtiqueta] ?? '');

          return (
            <g key={indice}>
              <title>
                {nombre}: {formatoValor(valor, moneda)}
              </title>

              <rect
                x={x}
                y={y}
                width={anchoBarra}
                height={altura}
                rx="5"
                fill="var(--texto-secundario)"
              />

              {valor > 0 && (
                <text
                  x={x + anchoBarra / 2}
                  y={Math.max(14, y - 8)}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="var(--texto-secundario)"
                >
                  {moneda ? valor.toFixed(0) : valor}
                </text>
              )}

              <text
                x={x + anchoBarra / 2}
                y={arriba + altoUtil + 20}
                textAnchor="middle"
                fontSize="11"
                fill="var(--texto-secundario)"
              >
                {fechaCorta(nombre)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
