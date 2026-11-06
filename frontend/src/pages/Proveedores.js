import { useEffect, useState } from 'react';
import { api } from '../services/api';

const inicial = {
  razon_social: '',
  ruc: '',
  telefono: '',
  correo: '',
  direccion: ''
};

export default function Proveedores({ usuario, informar, confirmar }) {
  const [proveedores, setProveedores] = useState([]);
  const [formulario, setFormulario] = useState(inicial);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [buscar, setBuscar] = useState('');

  const administrador = usuario.rol === 'ADMINISTRADOR';

  async function cargar() {
    try {
      const respuesta = await api('/proveedores');
      setProveedores(respuesta.proveedores);
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
      const respuesta = await api(
        editando ? `/proveedores/${editando}` : '/proveedores',
        {
          method: editando ? 'PATCH' : 'POST',
          body: JSON.stringify(formulario)
        }
      );

      setFormulario(inicial);
      setEditando(null);
      await cargar();
      informar('Operación exitosa', respuesta.message);
    } catch (error) {
      informar('No se pudo guardar', error.message);
    } finally {
      setGuardando(false);
    }
  }

  function editar(item) {
    setEditando(item.id);

    setFormulario({
      razon_social: item.razon_social || '',
      ruc: item.ruc || '',
      telefono: item.telefono || '',
      correo: item.correo || '',
      direccion: item.direccion || ''
    });
  }

  function cambiarEstado(item) {
    confirmar(
      item.activo ? 'Desactivar proveedor' : 'Activar proveedor',
      `¿Deseas cambiar el estado de "${item.razon_social}"?`,
      async () => {
        try {
          const respuesta = await api(`/proveedores/${item.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ activo: !item.activo })
          });

          await cargar();
          informar('Operación exitosa', respuesta.message);
        } catch (error) {
          informar('Error', error.message);
        }
      }
    );
  }

  const filtrados = proveedores.filter((item) =>
    `${item.razon_social} ${item.ruc}`
      .toLowerCase()
      .includes(buscar.toLowerCase())
  );

  return (
    <div className="pagina-modulo">
      <div className="modulo-encabezado">
        <h2>Proveedores</h2>
        <p>Administración de proveedores farmacéuticos.</p>
      </div>

      {administrador && (
        <section className="tarjeta">
          <h3>{editando ? 'Editar proveedor' : 'Registrar proveedor'}</h3>

          <form className="formulario-grid" onSubmit={guardar}>
            {[
              ['razon_social', 'Razón social'],
              ['ruc', 'RUC'],
              ['telefono', 'Teléfono'],
              ['correo', 'Correo electrónico'],
              ['direccion', 'Dirección']
            ].map(([campo, etiqueta]) => (
              <div key={campo}>
                <label>{etiqueta}</label>
                <input
                  type={campo === 'correo' ? 'email' : 'text'}
                  value={formulario[campo]}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      [campo]: e.target.value
                    })
                  }
                  required={campo === 'razon_social' || campo === 'ruc'}
                  maxLength={campo === 'ruc' ? 11 : undefined}
                  pattern={campo === 'ruc' ? '[0-9]{11}' : undefined}
                />
              </div>
            ))}

            <div className="acciones-formulario">
              <button disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar proveedor'}
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
        <div className="modulo-barra">
          <h3>Proveedores registrados</h3>
          <input
            placeholder="Buscar proveedor o RUC"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>

        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Razón social</th>
                <th>RUC</th>
                <th>Teléfono</th>
                <th>Estado</th>
                {administrador && <th>Acciones</th>}
              </tr>
            </thead>

            <tbody>
              {filtrados.map((item) => (
                <tr key={item.id}>
                  <td>{item.razon_social}</td>
                  <td>{item.ruc}</td>
                  <td>{item.telefono || '—'}</td>
                  <td>{item.activo ? 'Activo' : 'Inactivo'}</td>

                  {administrador && (
                    <td>
                      <div className="acciones-tabla">
                        <button
                          className="boton-pequeno"
                          onClick={() => editar(item)}
                        >
                          Editar
                        </button>

                        <button
                          className="boton-pequeno boton-secundario"
                          onClick={() => cambiarEstado(item)}
                        >
                          {item.activo ? 'Desactivar' : 'Activar'}
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