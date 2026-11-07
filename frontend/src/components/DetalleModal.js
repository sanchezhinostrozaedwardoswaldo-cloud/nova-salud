
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function DetalleModal({
  abierto,
  titulo,
  subtitulo,
  onCerrar,
  children
}) {
  useEffect(() => {
    if (!abierto) return;

    function alPresionarTecla(evento) {
      if (evento.key === 'Escape') {
        onCerrar();
      }
    }

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', alPresionarTecla);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener(
        'keydown',
        alPresionarTecla
      );
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return createPortal(
    <div
      className="detalle-modal-fondo"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) {
          onCerrar();
        }
      }}
    >
      <section
        className="detalle-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detalle-modal-titulo"
      >
        <div className="detalle-modal-cabecera">
          <div>
            <h2 id="detalle-modal-titulo">
              {titulo}
            </h2>

            {subtitulo && <p>{subtitulo}</p>}
          </div>

          <button
            type="button"
            className="detalle-modal-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar detalle"
          >
            ✕
          </button>
        </div>

        {children}
      </section>
    </div>,
    document.body
  );
}
