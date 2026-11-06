import { useEffect, useState } from 'react';
import { api } from '../services/api';

const inicial = {
  codigo: '',
  nombre: '',
  categoria_id: '',
  descripcion: '',
  laboratorio: '',
  presentacion: '',
  precio_venta: '',
  stock_minimo: 10
};

export default function Productos({ usuario, informar, confirmar }) {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [formulario, setFormulario] = useState(inicial);
  const [editando, setEditando] = useState(null);
  const [buscar, setBuscar] = useState('');
  const [guardando, setGuardando] = useState(false);

  const administrador = usuario.rol === 'ADMINISTRADOR';

  async function cargar() {
    try {
      const [resProductos, resCategorias] = await Promise.all([
        api('/productos'),
        api('/categorias')
      ]);

      setProductos(resProductos.productos);
      setCategorias(resCategorias.categorias);
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
      const datos = {
        ...formulario,
        categoria_id: Number(formulario.categoria_id),
        precio_venta: Number(formulario.precio_venta).toFixed(2),
        stock_minimo: Number(formulario.stock_minimo)
      };

      const respuesta = await api(
        editando ? `/productos/${editando}` : '/productos',
        {
          method: editando ? 'PATCH' : 'POST',
          body: JSON.stringify(datos)
        }
      );

      setFormulario(inicial);
      setEditando(null);
      await cargar();
      informar('Operación exitosa', respuesta.message);
    } catch (error) {
      informar('Error', error.message);
    } finally {
      setGuardando(false);
    }
  }

  function editar(producto) {
    setEditando(producto.id);

    setFormulario({
      codigo: producto.codigo,
      nombre: producto.nombre,
      categoria_id: String(producto.categoria_id),
      descripcion: producto.descripcion || '',
      laboratorio: producto.laboratorio || '',
      presentacion: producto.presentacion || '',
      precio_venta: producto.precio_venta,
      stock_minimo: producto.stock_minimo
    });
  }

  function cambiarEstado(producto) {
    confirmar(
      producto.activo ? 'Desactivar producto' : 'Activar producto',
      `¿Deseas cambiar el estado de "${producto.nombre}"?`,
      async () => {
        try {
          const respuesta = await api(`/productos/${producto.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ activo: !producto.activo })
          });

          await cargar();
          informar('Operación exitosa', respuesta.message);
        } catch (error) {
          informar('Error', error.message);
        }
      }
    );
  }

  const filtrados = productos.filter((producto) => {
    const texto = `${producto.nombre} ${producto.codigo} ${producto.laboratorio || ''}`;
    return texto.toLowerCase().includes(buscar.toLowerCase());
  });

  return (
    <div className="pagina-modulo">
      <div className="modulo-encabezado">
        <h2>Productos farmacéuticos</h2>
        <p>Registra medicamentos y consulta sus existencias.</p>
      </div>

      {administrador && (
        <section className="tarjeta">
          <h3>{editando ? 'Editar medicamento' : 'Registrar medicamento'}</h3>

          <form className="formulario-grid" onSubmit={guardar}>
            {[
              ['codigo', 'Código'],
              ['nombre', 'Nombre'],
              ['laboratorio', 'Laboratorio'],
              ['presentacion', 'Presentación']
            ].map(([campo, etiqueta]) => (
              <div key={campo}>
                <label>{etiqueta}</label>
                <input
                  value={formulario[campo]}
                  onChange={(e) => setFormulario({
                    ...formulario,
                    [campo]: e.target.value
                  })}
                  required={campo === 'codigo' || campo === 'nombre'}
                />
              </div>
            ))}

            <div>
              <label>Categoría</label>
              <select
                required
                value={formulario.categoria_id}
                onChange={(e) => setFormulario({
                  ...formulario,
                  categoria_id: e.target.value
                })}
              >
                <option value="">Seleccionar categoría</option>
                {categorias
                  .filter((c) => c.activo || String(c.id) === formulario.categoria_id)
                  .map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label>Precio de venta (S/)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formulario.precio_venta}
                onChange={(e) => setFormulario({
                  ...formulario,
                  precio_venta: e.target.value
                })}
              />
            </div>

            <div>
              <label>Stock mínimo</label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={formulario.stock_minimo}
                onChange={(e) => setFormulario({
                  ...formulario,
                  stock_minimo: e.target.value
                })}
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
                {guardando ? 'Guardando...' : 'Guardar medicamento'}
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
          <h3>Catálogo de medicamentos</h3>
          <input
            placeholder="Buscar por nombre, código o laboratorio"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>

        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Medicamento</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock disponible</th>
                <th>Estado</th>
                {administrador && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((producto) => (
                <tr key={producto.id}>
                  <td>{producto.codigo}</td>
                  <td>
                    <strong>{producto.nombre}</strong>
                    <div className="texto-secundario">
                      {producto.presentacion || ''}
                    </div>
                  </td>
                  <td>{producto.categoria?.nombre}</td>
                  <td>S/ {Number(producto.precio_venta).toFixed(2)}</td>
                  <td>{producto.stock_disponible}</td>
                  <td>{producto.activo ? 'Activo' : 'Inactivo'}</td>
                  {administrador && (
                    <td>
                      <div className="acciones-tabla">
                        <button
                          className="boton-pequeno"
                          onClick={() => editar(producto)}
                        >
                          Editar
                        </button>
                        <button
                          className="boton-pequeno boton-secundario"
                          onClick={() => cambiarEstado(producto)}
                        >
                          {producto.activo ? 'Desactivar' : 'Activar'}
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