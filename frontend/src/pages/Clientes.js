import { useEffect, useState } from 'react';
import { api } from '../services/api';

const inicial = {
  nombre: '',
  apellido: '',
  tipo_documento: 'DNI',
  numero_documento: '',
  telefono: '',
  correo: ''
};

export default function Clientes({ informar }) {
  const [clientes, setClientes] = useState([]);
  const [formulario, setFormulario] = useState(inicial);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [buscar, setBuscar] = useState('');

  async function cargar() {
    try {
      const respuesta = await api('/clientes');
      setClientes(respuesta.clientes);
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
        editando ? `/clientes/${editando}` : '/clientes',
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
      informar('No se pudo guardar el cliente', error.message);
    } finally {
      setGuardando(false);
    }
  }

  function editar(cliente) {
    setEditando(cliente.id);

    setFormulario({
      nombre: cliente.nombre || '',
      apellido: cliente.apellido || '',
      tipo_documento: cliente.tipo_documento || 'DNI',
      numero_documento: cliente.numero_documento || '',
      telefono: cliente.telefono || '',
      correo: cliente.correo || ''
    });
  }

  const filtrados = clientes.filter((cliente) =>
    `${cliente.nombre} ${cliente.apellido} ${cliente.numero_documento}`
      .toLowerCase()
      .includes(buscar.toLowerCase())
  );

  return (
    <div className="pagina-modulo">
      <div className="modulo-encabezado">
        <h2>Clientes</h2>
        <p>Registro y administración de clientes de la farmacia.</p>
      </div>

      <section className="tarjeta">
        <h3>{editando ? 'Editar cliente' : 'Registrar cliente'}</h3>

        <form className="formulario-grid" onSubmit={guardar}>
          <div>
            <label>Nombre</label>
            <input
              required
              minLength={2}
              value={formulario.nombre}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  nombre: e.target.value
                })
              }
            />
          </div>

          <div>
            <label>Apellido</label>
            <input
              required
              minLength={2}
              value={formulario.apellido}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  apellido: e.target.value
                })
              }
            />
          </div>

          <div>
            <label>Tipo de documento</label>
            <select
              value={formulario.tipo_documento}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  tipo_documento: e.target.value
                })
              }
            >
              <option value="DNI">DNI</option>
              <option value="CE">Carné de extranjería</option>
              <option value="RUC">RUC</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          <div>
            <label>Número de documento</label>
            <input
              required
              minLength={4}
              maxLength={30}
              value={formulario.numero_documento}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  numero_documento: e.target.value
                })
              }
            />
          </div>

          <div>
            <label>Teléfono</label>
            <input
              value={formulario.telefono}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  telefono: e.target.value
                })
              }
            />
          </div>

          <div>
            <label>Correo electrónico</label>
            <input
              type="email"
              value={formulario.correo}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  correo: e.target.value
                })
              }
            />
          </div>

          <div className="acciones-formulario">
            <button disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar cliente'}
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

      <section className="tarjeta">
        <div className="modulo-barra">
          <h3>Clientes registrados</h3>

          <input
            placeholder="Buscar nombre o documento"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>

        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Documento</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {filtrados.map((cliente) => (
                <tr key={cliente.id}>
                  <td>{cliente.nombre} {cliente.apellido}</td>
                  <td>
                    {cliente.tipo_documento} — {cliente.numero_documento}
                  </td>
                  <td>{cliente.telefono || '—'}</td>
                  <td>{cliente.correo || '—'}</td>
                  <td>
                    <button
                      className="boton-pequeno"
                      onClick={() => editar(cliente)}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}

              {filtrados.length === 0 && (
                <tr>
                  <td colSpan="5">No se encontraron clientes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}