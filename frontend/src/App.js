import { useEffect, useState } from 'react';
import { api } from './services/api';
import Modal from './components/Modal';
import Categorias from './pages/Categorias';
import Productos from './pages/Productos';
import Inventario from './pages/Inventario';
import './App.css';

const formularioInicial = {
  nombre: '',
  apellido: '',
  correo: '',
  password: '',
  rol: 'VENDEDOR'
};

function App() {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [seccion, setSeccion] = useState('dashboard');
  const [formulario, setFormulario] = useState(formularioInicial);
  const [modal, setModal] = useState(null);

  const informar = (titulo, mensaje) => {
    setModal({ titulo, mensaje });
  };

  const confirmar = (titulo, mensaje, onConfirmar) => {
    setModal({
      titulo,
      mensaje,
      confirmar: true,
      onConfirmar: async () => {
        setModal(null);
        await onConfirmar();
      }
    });
  };

  useEffect(() => {
    api('/auth/perfil')
      .then((data) => setUsuario(data.usuario))
      .catch(() => sessionStorage.removeItem('nova_token'))
      .finally(() => setCargando(false));
  }, []);

  async function iniciarSesion(evento) {
    evento.preventDefault();
    setProcesando(true);

    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ correo, password })
      });

      sessionStorage.setItem('nova_token', data.token);
      setUsuario(data.usuario);
      setPassword('');
      setSeccion('dashboard');
    } catch (error) {
      informar('No se pudo iniciar sesión', error.message);
    } finally {
      setProcesando(false);
    }
  }

  async function cargarUsuarios() {
    try {
      const data = await api('/usuarios');
      setUsuarios(data.usuarios);
    } catch (error) {
      informar('Error', error.message);
    }
  }

  function cambiarSeccion(nuevaSeccion) {
    setSeccion(nuevaSeccion);

    if (nuevaSeccion === 'usuarios') {
      cargarUsuarios();
    }
  }

  async function crearUsuario(evento) {
    evento.preventDefault();
    setProcesando(true);

    try {
      const data = await api('/usuarios', {
        method: 'POST',
        body: JSON.stringify(formulario)
      });

      setFormulario(formularioInicial);
      await cargarUsuarios();
      informar('Operación exitosa', data.message);
    } catch (error) {
      informar('No se pudo crear el usuario', error.message);
    } finally {
      setProcesando(false);
    }
  }

  function solicitarCambioEstado(item) {
    setModal({
      titulo: item.activo ? 'Desactivar usuario' : 'Activar usuario',
      mensaje: `¿Deseas ${item.activo ? 'desactivar' : 'activar'} a ${item.nombre} ${item.apellido}?`,
      confirmar: true,
      onConfirmar: async () => {
        setModal(null);

        try {
          const data = await api(`/usuarios/${item.id}/estado`, {
            method: 'PATCH',
            body: JSON.stringify({ activo: !item.activo })
          });

          await cargarUsuarios();
          informar('Operación exitosa', data.message);
        } catch (error) {
          informar('Error', error.message);
        }
      }
    });
  }

  function cerrarSesion() {
    setModal({
      titulo: 'Cerrar sesión',
      mensaje: '¿Deseas salir de Nova Salud?',
      confirmar: true,
      onConfirmar: () => {
        sessionStorage.removeItem('nova_token');
        setUsuario(null);
        setUsuarios([]);
        setCorreo('');
        setPassword('');
        setSeccion('dashboard');
        setModal(null);
      }
    });
  }

  if (cargando) {
    return <div className="pantalla-carga">Cargando Nova Salud...</div>;
  }

  return (
    <>
      {!usuario ? (
        <main className="login-pagina">
          <section className="login-tarjeta">
            <div className="marca">✚</div>
            <h1>Nova Salud</h1>
            <p>Gestión farmacéutica</p>

            <form onSubmit={iniciarSesion}>
              <label>Correo electrónico</label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
                autoComplete="username"
                placeholder="correo@ejemplo.com"
              />

              <label>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña"
              />

              <button disabled={procesando} type="submit">
                {procesando ? 'Ingresando...' : 'Iniciar sesión'}
              </button>
            </form>
          </section>
        </main>
      ) : (
        <div className="sistema">
          <aside className="sidebar">
            <div className="sidebar-marca">✚ Nova Salud</div>

            <nav>
              <button
                className={seccion === 'dashboard' ? 'activo' : ''}
                onClick={() => cambiarSeccion('dashboard')}
              >
                Dashboard
              </button>
              <button
                className={seccion === 'categorias' ? 'activo' : ''}
                onClick={() => cambiarSeccion('categorias')}
              >
                Categorías
              </button>

              <button
                className={seccion === 'productos' ? 'activo' : ''}
                onClick={() => cambiarSeccion('productos')}
              >
                Productos
              </button>

              <button
                className={seccion === 'inventario' ? 'activo' : ''}
                onClick={() => cambiarSeccion('inventario')}
              >
                Inventario
              </button>

              {usuario.rol === 'ADMINISTRADOR' && (
                <button
                  className={seccion === 'usuarios' ? 'activo' : ''}
                  onClick={() => cambiarSeccion('usuarios')}
                >
                  Usuarios
                </button>
              )}
            </nav>

            <div className="sidebar-inferior">
              <span>{usuario.rol}</span>
              <button onClick={cerrarSesion}>Cerrar sesión</button>
            </div>
          </aside>

          <main className="contenido">
            <header className="cabecera">
              <div>
                <h1>
                  {({
                    dashboard: 'Panel principal',
                    usuarios: 'Administración de usuarios',
                    categorias: 'Gestión de categorías',
                    productos: 'Gestión de productos',
                    inventario: 'Inventario farmacéutico'
                  })[seccion] || 'Panel principal'}
                </h1>
                <p>
                  Bienvenido, {usuario.nombre} {usuario.apellido}
                </p>
              </div>
              <span className="etiqueta-rol">{usuario.rol}</span>
            </header>

            {seccion === 'dashboard' ? (
              <>
                <section className="bienvenida">
                  <h2>Bienvenido a Nova Salud</h2>
                  <p>
                    Has iniciado sesión correctamente.
                    El sistema reconoce tu cuenta y tus permisos.
                  </p>
                </section>

                <div className="tarjetas">
                  <article className="tarjeta">
                    <span>Inventario</span>
                    <h3>Próximamente</h3>
                    <p>Medicamentos y lotes</p>
                  </article>
                  <article className="tarjeta">
                    <span>Ventas</span>
                    <h3>Próximamente</h3>
                    <p>Registro de operaciones</p>
                  </article>
                  <article className="tarjeta">
                    <span>Alertas</span>
                    <h3>Próximamente</h3>
                    <p>Stock y vencimientos</p>
                  </article>
                </div>
              </>
            ) : seccion === 'categorias' ? (
              <Categorias
                usuario={usuario}
                informar={informar}
                confirmar={confirmar}
              />
            ) : seccion === 'productos' ? (
              <Productos
                usuario={usuario}
                informar={informar}
                confirmar={confirmar}
              />
            ) : seccion === 'inventario' ? (
              <Inventario informar={informar} />
            ) : seccion === 'usuarios' && usuario.rol === 'ADMINISTRADOR' ? (
              <>
                <section className="tarjeta">
                  <h2>Registrar usuario</h2>

                  <form className="formulario-grid" onSubmit={crearUsuario}>
                    {['nombre', 'apellido', 'correo', 'password'].map((campo) => (
                      <div key={campo}>
                        <label>
                          {campo === 'password'
                            ? 'Contraseña'
                            : campo.charAt(0).toUpperCase() + campo.slice(1)}
                        </label>

                        <input
                          type={
                            campo === 'password' ? 'password'
                              : campo === 'correo' ? 'email' : 'text'
                          }
                          value={formulario[campo]}
                          onChange={(e) =>
                            setFormulario({
                              ...formulario,
                              [campo]: e.target.value
                            })
                          }
                          minLength={campo === 'password' ? 10 : undefined}
                          required
                        />
                      </div>
                    ))}

                    <div>
                      <label>Rol</label>
                      <select
                        value={formulario.rol}
                        onChange={(e) =>
                          setFormulario({
                            ...formulario,
                            rol: e.target.value
                          })
                        }
                      >
                        <option value="VENDEDOR">Vendedor</option>
                        <option value="ADMINISTRADOR">Administrador</option>
                      </select>
                    </div>

                    <div className="formulario-accion">
                      <button disabled={procesando} type="submit">
                        {procesando ? 'Guardando...' : 'Crear usuario'}
                      </button>
                    </div>
                  </form>
                </section>

                <section className="tarjeta">
                  <h2>Usuarios registrados</h2>

                  <div className="tabla-contenedor">
                    <table>
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Correo</th>
                          <th>Rol</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usuarios.map((item) => (
                          <tr key={item.id}>
                            <td>{item.nombre} {item.apellido}</td>
                            <td>{item.correo}</td>
                            <td>{item.rol}</td>
                            <td>{item.activo ? 'Activo' : 'Inactivo'}</td>
                            <td>
                              <button
                                className="boton-pequeno"
                                disabled={item.id === usuario.id}
                                onClick={() => solicitarCambioEstado(item)}
                              >
                                {item.activo ? 'Desactivar' : 'Activar'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : null}
          </main>
        </div>
      )}

      <Modal
        abierto={Boolean(modal)}
        titulo={modal?.titulo}
        mensaje={modal?.mensaje}
        confirmar={modal?.confirmar}
        onConfirmar={modal?.onConfirmar}
        onCerrar={() => setModal(null)}
      />
    </>
  );
}

export default App;