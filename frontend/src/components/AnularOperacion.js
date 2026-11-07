
import { useState } from 'react';
import { api } from '../services/api';

export default function AnularOperacion({
  tipo,
  registro,
  confirmar,
  informar,
  alCompletar
}) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);

  const esVenta = tipo === 'venta';
  const nombre = esVenta ? 'venta' : 'compra';

  const ruta = esVenta
    ? `/operaciones-inventario/ventas/${registro.id}/anular`
    : `/operaciones-inventario/compras/${registro.id}/anular`;

  function solicitarAnulacion(evento) {
    evento.preventDefault();

    const texto = motivo.trim();

    if (texto.length < 10 || texto.length > 180) {
      informar(
        'Motivo inválido',
        'Escribe un motivo de entre 10 y 180 caracteres.'
      );
      return;
    }

    confirmar(
      `Confirmar anulación de ${nombre}`,
      `¿Deseas anular la ${nombre} #${registro.id}? ` +
      'Esta operación modificará las existencias del inventario.',
      () => ejecutarAnulacion(texto)
    );
  }

  async function ejecutarAnulacion(texto) {
    if (procesando) return;

    setProcesando(true);

    try {
      const respuesta = await api(ruta, {
        method: 'POST',
        body: JSON.stringify({ motivo: texto })
      });

      setAbierto(false);
      setMotivo('');

      try {
        await alCompletar();
      } catch (error) {
        informar(
          'Operación realizada',
          `${respuesta.message}. No se pudo actualizar ` +
          `el historial: ${error.message}`
        );
        return;
      }

      informar(
        'Operación realizada',
        respuesta.message ||
          `La ${nombre} fue anulada correctamente.`
      );
    } catch (error) {
      informar(
        `No se pudo anular la ${nombre}`,
        error.message
      );
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="anulacion-operacion">
      {!abierto ? (
        <button
          type="button"
          className="boton-pequeno boton-peligro"
          onClick={() => setAbierto(true)}
        >
          Anular
        </button>
      ) : (
        <form
          className="anulacion-formulario"
          onSubmit={solicitarAnulacion}
        >
          <label htmlFor={`motivo-${tipo}-${registro.id}`}>
            Motivo de anulación
          </label>

          <textarea
            id={`motivo-${tipo}-${registro.id}`}
            rows="3"
            maxLength={180}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Explica por qué se anula esta operación"
            required
            disabled={procesando}
          />

          <small>{motivo.trim().length}/180 caracteres</small>

          <div className="anulacion-acciones">
            <button
              type="button"
              className="boton-pequeno boton-secundario"
              disabled={procesando}
              onClick={() => {
                setAbierto(false);
                setMotivo('');
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="boton-pequeno boton-peligro"
              disabled={procesando}
            >
              {procesando ? 'Procesando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
