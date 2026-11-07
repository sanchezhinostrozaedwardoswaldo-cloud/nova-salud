
import { useEffect, useState } from 'react';
import { api } from './services/api';
import Modal from './components/Modal';
import Dashboard from './pages/Dashboard';
import Categorias from './pages/Categorias';
import Productos from './pages/Productos';
import Inventario from './pages/Inventario';
import Proveedores from './pages/Proveedores';
import Compras from './pages/Compras';
import Clientes from './pages/Clientes';
import Ventas from './pages/Ventas';
import Reportes from './pages/Reportes';
import './App.css';

const formularioInicial = {
  nombre: '',
  apellido: '',
  correo: '',
  password: '',
  rol: 'VENDEDOR'
};

const titulos = {
  dashboard: 'Panel principal',
  categorias: 'Categorías',
  productos: 'Productos farmacéuticos',
  inventario: 'Inventario farmacéutico',
  proveedores: 'Proveedores',
  compras: 'Compras farmacéuticas',
  clientes: 'Clientes',
  ventas: 'Ventas farmacéuticas',
  usuarios: 'Administración de usuarios',
  reportes: 'Reportes y estadísticas'
};

const navegacion = [
  { id: 'dashboard', nombre: 'Dashboard', icono: '▦' },
  { id: 'categorias', nombre: 'Categorías', icono: '▤' },
  { id: 'productos', nombre: 'Productos', icono: '◈' },
  { id: 'inventario', nombre: 'Inventario', icono: '▥' },
  {
    id: 'proveedores',
    nombre: 'Proveedores',
    icono: '▣',
    soloAdmin: true
  },
  {
    id: 'compras',
    nombre: 'Compras',
    icono: '↓',
    soloAdmin: true
  },
  { id: 'clientes', nombre: 'Clientes', icono: '♙' },
  { id: 'ventas', nombre: 'Ventas', icono: '↑' },
  {
    id: 'usuarios',
    nombre: 'Usuarios',
    icono: '♧',
    soloAdmin: true
  },
  {
    id: 'reportes',
    nombre: 'Reportes',
    icono: '▥',
    soloAdmin: true
  }
];

function temaInicial() {
  try {
    const guardado = localStorage.getItem('nova_tema');
    if (guardado === 'claro' || guardado === 'oscuro') {
      return guardado;
    }
  } catch (_) {}

  return 'oscuro';
}

function App() {
  const [tema, setTema] = useState(temaInicial);
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');

  const [usuarios, setUsuarios] = useState([]);
  const [seccion, setSeccion] = useState('dashboard');
  const [formulario, setFormulario] = useState(formularioInicial);

  const [modal, setModal] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const administrador = usuario?.rol === 'ADMINISTRADOR';

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    document.documentElement.style.colorScheme =
      tema === 'oscuro' ? 'dark' : 'light';

    try {
      localStorage.setItem('nova_tema', tema);
    } catch (_) {}
  }, [tema]);

  useEffect(() => {
    api('/auth/perfil')
      .then((data) => setUsuario(data.usuario))
      .catch(() => sessionStorage.removeItem('nova_token'))
      .finally(() => setCargando(false));
  }, []);

  function informar(titulo, mensaje) {
    setModal({ titulo, mensaje });
  }

  function confirmar(titulo, mensaje, onConfirmar) {
    setModal({
      titulo,
      mensaje,
      confirmar: true,
      onConfirmar: async () => {
        setModal(null);
        try {
          await onConfirmar();
        } catch (error) {
          informar(
            'No se pudo completar la operación',
            error.message
          );
        }
      }
    });
  }

  function alternarTema() {
    setTema((actual) =>
      actual === 'oscuro' ? 'claro' : 'oscuro'
    );
  }

  async function iniciarSesion(evento) {
    evento.preventDefault();
    if (procesando) return;

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
      informar('Error al cargar usuarios', error.message);
    }
  }

  function cambiarSeccion(nuevaSeccion) {
    const opcion = navegacion.find(
      (item) => item.id === nuevaSeccion
    );

    if (!opcion) return;
    if (opcion.soloAdmin && !administrador) return;

    setSeccion(nuevaSeccion);
    setMenuAbierto(false);

    if (nuevaSeccion === 'usuarios') {
      cargarUsuarios();
    }

    document.querySelector('.contenido')?.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  }

  async function crearUsuario(evento) {
    evento.preventDefault();
    if (procesando) return;

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
    confirmar(
      item.activo ? 'Desactivar usuario' : 'Activar usuario',
      `¿Deseas ${item.activo ? 'desactivar' : 'activar'} a ` +
        `${item.nombre} ${item.apellido}?`,
      async () => {
        const data = await api(
          `/usuarios/${item.id}/estado`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              activo: !item.activo
            })
          }
        );

        await cargarUsuarios();
        informar('Operación exitosa', data.message);
      }
    );
  }

  function cerrarSesion() {
    confirmar(
      'Cerrar sesión',
      '¿Deseas salir de Nova Salud?',
      () => {
        sessionStorage.removeItem('nova_token');
        setUsuario(null);
        setUsuarios([]);
        setCorreo('');
        setPassword('');
        setSeccion('dashboard');
        setMenuAbierto(false);
      }
    );
  }

  function renderizarSeccion() {
    const props = {
      usuario,
      informar,
      confirmar
    };

    switch (seccion) {
      case 'dashboard':
        return (
          <Dashboard
            usuario={usuario}
            cambiarSeccion={cambiarSeccion}
            informar={informar}
          />
        );

      case 'categorias':
        return <Categorias {...props} />;

      case 'productos':
        return <Productos {...props} />;

      case 'inventario':
        return <Inventario {...props} />;

      case 'proveedores':
        return administrador
          ? <Proveedores {...props} />
          : null;

      case 'compras':
        return administrador
          ? <Compras {...props} />
          : null;

      case 'clientes':
        return <Clientes informar={informar} />;

      case 'ventas':
        return <Ventas {...props} />;

      case 'reportes':
        return administrador
          ? <Reportes informar={informar} />
          : null;

      case 'usuarios':
        return administrador ? (
          <div className="pagina-modulo">
            <section className="tarjeta">
              <div className="seccion-encabezado">
                <h2>Registrar usuario</h2>
                <p>
                  Crea cuentas para administradores
                  y vendedores.
                </p>
              </div>

              <form
                className="formulario-grid"
                onSubmit={crearUsuario}
              >
                {[
                  'nombre',
                  'apellido',
                  'correo',
                  'password'
                ].map((campo) => (
                  <div key={campo}>
                    <label htmlFor={`usuario-${campo}`}>
                      {campo === 'password'
                        ? 'Contraseña'
                        : campo === 'correo'
                        ? 'Correo electrónico'
                        : campo.charAt(0).toUpperCase() +
                          campo.slice(1)}
                    </label>

                    <input
                      id={`usuario-${campo}`}
                      type={
                        campo === 'password'
                          ? 'password'
                          : campo === 'correo'
                          ? 'email'
                          : 'text'
                      }
                      value={formulario[campo]}
                      onChange={(e) =>
                        setFormulario((actual) => ({
                          ...actual,
                          [campo]: e.target.value
                        }))
                      }
                      minLength={
                        campo === 'password'
                          ? 10
                          : undefined
                      }
                      required
                    />
                  </div>
                ))}

                <div>
                  <label htmlFor="usuario-rol">Rol</label>
                  <select
                    id="usuario-rol"
                    value={formulario.rol}
                    onChange={(e) =>
                      setFormulario((actual) => ({
                        ...actual,
                        rol: e.target.value
                      }))
                    }
                  >
                    <option value="VENDEDOR">
                      Vendedor
                    </option>
                    <option value="ADMINISTRADOR">
                      Administrador
                    </option>
                  </select>
                </div>

                <div className="formulario-accion">
                  <button
                    type="submit"
                    disabled={procesando}
                  >
                    {procesando
                      ? 'Guardando...'
                      : 'Crear usuario'}
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
                        <td>
                          {item.nombre} {item.apellido}
                        </td>
                        <td>{item.correo}</td>
                        <td>
                          <span className="etiqueta-rol">
                            {item.rol}
                          </span>
                        </td>
                        <td>
                          <span
                            className={
                              item.activo
                                ? 'estado-ok'
                                : 'estado-alerta'
                            }
                          >
                            {item.activo
                              ? 'Activo'
                              : 'Inactivo'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={
                              item.activo
                                ? 'boton-pequeno boton-peligro'
                                : 'boton-pequeno'
                            }
                            disabled={
                              item.id === usuario.id
                            }
                            onClick={() =>
                              solicitarCambioEstado(item)
                            }
                          >
                            {item.activo
                              ? 'Desactivar'
                              : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    ))}

                    {usuarios.length === 0 && (
                      <tr>
                        <td colSpan="5">
                          No hay usuarios para mostrar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null;

      default:
        return null;
    }
  }

  const opcionesVisibles = navegacion.filter(
    (item) => !item.soloAdmin || administrador
  );

  if (cargando) {
    return (
      <div className="pantalla-carga">
        <div className="carga-indicador" />
        <span>Cargando Nova Salud...</span>
      </div>
    );
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
              <label htmlFor="login-correo">
                Correo electrónico
              </label>
              <input
                id="login-correo"
                type="email"
                value={correo}
                onChange={(e) =>
                  setCorreo(e.target.value)
                }
                autoComplete="username"
                placeholder="correo@ejemplo.com"
                required
              />

              <label htmlFor="login-password">
                Contraseña
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña"
                required
              />

              <button
                type="submit"
                disabled={procesando}
              >
                {procesando
                  ? 'Ingresando...'
                  : 'Iniciar sesión'}
              </button>
            </form>

            <button
              type="button"
              className="tema-login"
              onClick={alternarTema}
            >
              {tema === 'oscuro'
                ? '☀ Usar tema claro'
                : '☾ Usar tema oscuro'}
            </button>
          </section>
        </main>
      ) : (
        <div className="sistema">
          {menuAbierto && (
            <button
              type="button"
              className="sidebar-overlay"
              aria-label="Cerrar menú"
              onClick={() => setMenuAbierto(false)}
            />
          )}

          <aside
            className={
              `sidebar ${menuAbierto ? 'sidebar-abierta' : ''}`
            }
          >
            <div className="sidebar-marca">
              <span className="marca-icono">✚</span>
              <div>
                <strong>Nova Salud</strong>
                <small>Gestión farmacéutica</small>
              </div>
            </div>

            <div className="sidebar-seccion">
              NAVEGACIÓN
            </div>

            <nav aria-label="Menú principal">
              {opcionesVisibles.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    seccion === item.id ? 'activo' : ''
                  }
                  onClick={() =>
                    cambiarSeccion(item.id)
                  }
                  aria-current={
                    seccion === item.id
                      ? 'page'
                      : undefined
                  }
                >
                  <span
                    className="nav-icono"
                    aria-hidden="true"
                  >
                    {item.icono}
                  </span>
                  <span>{item.nombre}</span>
                </button>
              ))}
            </nav>

            <div className="sidebar-inferior">
              <div className="sidebar-usuario">
                <div className="usuario-avatar">
                  {usuario.nombre?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <strong>
                    {usuario.nombre} {usuario.apellido}
                  </strong>
                  <small>
                    {administrador
                      ? 'Administrador'
                      : 'Vendedor'}
                  </small>
                </div>
              </div>

              <button
                type="button"
                className="sidebar-tema"
                onClick={alternarTema}
              >
                <span aria-hidden="true">
                  {tema === 'oscuro' ? '☀' : '☾'}
                </span>
                {tema === 'oscuro'
                  ? 'Tema claro'
                  : 'Tema oscuro'}
              </button>

              <button
                type="button"
                className="sidebar-salir"
                onClick={cerrarSesion}
              >
                <span aria-hidden="true">↪</span>
                Cerrar sesión
              </button>
            </div>
          </aside>

          <main className="contenido">
            <header className="cabecera">
              <div className="cabecera-principal">
                <button
                  type="button"
                  className="boton-menu-movil"
                  onClick={() =>
                    setMenuAbierto((actual) => !actual)
                  }
                  aria-label="Abrir menú"
                >
                  ☰
                </button>

                <div>
                  <span className="cabecera-contexto">
                    NOVA SALUD / SISTEMA DE GESTIÓN
                  </span>
                  <h1>
                    {titulos[seccion] || 'Panel principal'}
                  </h1>
                  <p>
                    Bienvenido, {usuario.nombre}
                  </p>
                </div>
              </div>

              <div className="cabecera-acciones">
                <button
                  type="button"
                  className="boton-tema"
                  onClick={alternarTema}
                  title="Cambiar tema"
                  aria-label="Cambiar tema"
                >
                  {tema === 'oscuro' ? '☀' : '☾'}
                </button>

                <span className="etiqueta-rol">
                  {administrador
                    ? 'ADMINISTRADOR'
                    : 'VENDEDOR'}
                </span>
              </div>
            </header>

            <div className="contenido-pagina">
              {renderizarSeccion()}
            </div>
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
