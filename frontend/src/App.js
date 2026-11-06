import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [estado, setEstado] = useState('Conectando...');
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000/api'}/health`, {
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Error al consultar la API');
        }
        return response.json();
      })
      .then((data) => {
        setEstado(data.message);
        setError(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setEstado('No se pudo conectar con el backend');
        setError(true);
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="app">
      <section className="panel">
        <span className="etiqueta">Sistema de gestión farmacéutica</span>
        <h1>Nova Salud</h1>
        <p>Frontend React + Backend Express</p>

        <div className="estado">
          <span className={error ? 'indicador error' : 'indicador'}></span>
          <span>{estado}</span>
        </div>
      </section>
    </main>
  );
}

export default App;