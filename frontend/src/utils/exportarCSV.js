function escaparCSV(valor) {
  const texto = String(valor ?? '');

  // Evitar que una hoja de cálculo interprete
  // contenido externo como una fórmula.
  const seguro = /^[\s]*[=+\-@\t\r]/.test(texto)
    ? `'${texto}`
    : texto;

  return `"${seguro.replace(/"/g, '""')}"`;
}

export function exportarCSV(nombre, columnas, filas) {
  const encabezados = columnas.map(
    (columna) => columna.titulo
  );

  const contenido = [
    encabezados,
    ...filas.map((fila) =>
      columnas.map((columna) => fila[columna.campo])
    )
  ];

  const csv = '\uFEFF' + contenido
    .map((fila) => fila.map(escaparCSV).join(';'))
    .join('\r\n');

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');

  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  URL.revokeObjectURL(url);
}