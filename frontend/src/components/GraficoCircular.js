
const COLORES = [
  '#0e8a73',
  '#3c77c2',
  '#e5a43b',
  '#a46ac6'
];

const dinero = (valor) =>
  `S/ ${Number(valor || 0).toFixed(2)}`;

export default function GraficoCircular({
  datos = [],
  campoEtiqueta = 'metodo',
  campoValor = 'total'
}) {
  const total = datos.reduce(
    (suma, item) => suma + Number(item[campoValor] || 0),
    0
  );

  if (total <= 0) {
    return (
      <p className="reporte-vacio">
        No existen ventas para representar.
      </p>
    );
  }

  let acumulado = 0;

  const segmentos = datos.map((item, indice) => {
    const valor = Number(item[campoValor] || 0);
    const porcentaje = (valor / total) * 100;
    const inicio = acumulado;

    acumulado += porcentaje;

    return {
      ...item,
      valor,
      porcentaje,
      inicio,
      color: COLORES[indice % COLORES.length]
    };
  });

  const gradiente = segmentos
    .filter((item) => item.porcentaje > 0)
    .map((item) =>
      `${item.color} ${item.inicio}% ${item.inicio + item.porcentaje}%`
    )
    .join(', ');

  return (
    <div className="grafico-circular-layout">
      <div
        className="grafico-circular"
        style={{
          background: `conic-gradient(${gradiente})`
        }}
        role="img"
        aria-label="Distribución de ventas por método de pago"
      >
        <div className="grafico-circular-centro">
          <span>Total de ventas</span>
          <strong>{dinero(total)}</strong>
        </div>
      </div>

      <div className="grafico-leyenda">
        {segmentos.map((item) => (
          <div
            className="grafico-leyenda-item"
            key={item[campoEtiqueta]}
          >
            <span
              className="grafico-leyenda-color"
              style={{ backgroundColor: item.color }}
            />

            <span className="grafico-leyenda-nombre">
              {item[campoEtiqueta]}
            </span>

            <span className="grafico-leyenda-monto">
              {dinero(item.valor)}
            </span>

            <strong>
              {item.porcentaje.toFixed(1)}%
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}
