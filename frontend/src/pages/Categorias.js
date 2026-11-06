import { useEffect, useState } from 'react';
import { api } from '../services/api';

const inicial = {
  nombre: '',
  descripcion: ''
};

export default function Categorias({ usuario, informar, confirmar }) {
  const [categorias, setCategorias] = useState([]);
  const [formulario, setFormulario] = useState(inicial);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const administrador = usuario.rol === 'ADMINISTRADOR';

  async function cargar() {
    try {
      const data = await api('/categorias');
      setCategorias(data.categorias);
    } catch (error) {
      informar('Error', error.message);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function guardar(evento) {
    evento.preventDefault();
    setGuardando(true);

    try {
      const data = await api(
        editando ? `/categorias/${editando}` : '/categorias',
        {
          method: editando ? 'PATCH' : 'POST',
          body: JSON.stringify(formulario)
        }
      );

      setFormulario(inicial);
      setEditando(null);
      await cargar();
      informar('Operación exitosa', data.message);
    } catch (error) {
      informar('Error', error.message);
    } finally {
      setGuardando(false);
    }
  }

  function editar(categoria) {
    setEditando(categoria.id);
    setFormulario({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || ''
    });
  }

  function cambiarEstado(categoria) {
    confirmar(
      categoria.activo ? 'Desactivar categoría' : 'Activar categoría',
      `¿Deseas cambiar el estado de "${categoria.nombre}"?`,
      async () => {
        try {
          const data = await api(`/categorias/${categoria.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ activo: !categoria.activo })
          });

          await cargar();
          informar('Operación exitosa', data.message);
        } catch (error) {
          informar('Error', error.message);
        }
      }
    );
  }

  return (
    <div className="pagina-modulo">
      <div className="modulo-encabezado">
        <h2>Categorías</h2>
        <p>Organiza los medicamentos del catálogo.</p>
      </div>

      {administrador && (
        <section className="tarjeta">
          <h3>{editando ? 'Editar categoría' : 'Nueva categoría'}</h3>

          <form className="formulario-grid" onSubmit={guardar}>
            <div>
              <label>Nombre</label>
              <input
                value={formulario.nombre}
                onChange={(e) => setFormulario({
                  ...formulario,
                  nombre: e.target.value
                })}
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            <div>
              <label>Descripción</label>
              <input
                value={formulario.descripcion}
                onChange={(e) => setFormulario({
                  ...formulario,
                  descripcion: e.target.value
                })}
              />
            </div>

            <div className="acciones-formulario">
              <button disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar categoría'}
              </button>

              {editando && (
                <button
                  type="button"
                  className="boton-secundario"
                  onClick={() => {
                    setEditando(null);
                    setFormulario(inicial);
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      <section className="tarjeta">
        <h3>Categorías registradas</h3>

        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Estado</th>
                {administrador && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {categorias.map((categoria) => (
                <tr key={categoria.id}>
                  <td>{categoria.nombre}</td>
                  <td>{categoria.descripcion || '—'}</td>
                  <td>{categoria.activo ? 'Activa' : 'Inactiva'}</td>
                  {administrador && (
                    <td>
                      <div className="acciones-tabla">
                        <button
                          className="boton-pequeno"
                          onClick={() => editar(categoria)}
                        >
                          Editar
                        </button>
                        <button
                          className="boton-pequeno boton-secundario"
                          onClick={() => cambiarEstado(categoria)}
                        >
                          {categoria.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}