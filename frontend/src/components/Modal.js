export default function Modal({
  abierto,
  titulo,
  mensaje,
  confirmar,
  onConfirmar,
  onCerrar
}) {
  if (!abierto) return null;

  return (
    <div className="modal-fondo" role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
      >
        <h2 id="modal-titulo">{titulo}</h2>
        <p>{mensaje}</p>

        <div className="modal-acciones">
          {confirmar && (
            <button
              className="boton-secundario"
              onClick={onCerrar}
            >
              Cancelar
            </button>
          )}

          <button onClick={confirmar ? onConfirmar : onCerrar}>
            {confirmar ? 'Confirmar' : 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  );
}