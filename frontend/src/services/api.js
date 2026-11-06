const API_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export async function api(ruta, opciones = {}) {
  const token = sessionStorage.getItem('nova_token');

  let response;

  try {
    response = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opciones.headers
      }
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Error en la solicitud');
  }

  return data;
}