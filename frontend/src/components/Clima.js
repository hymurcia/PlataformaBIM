import React, { useEffect, useState } from "react";

const Clima = () => {
  const [clima, setClima] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClima = async () => {
      try {
        const res = await fetch("http://localhost:5000/clima/facatativa"); // 👈 tu backend
        if (!res.ok) throw new Error("Error al obtener el clima");
        const data = await res.json();
        setClima(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClima();
  }, []);

  if (loading) return <p>Cargando clima...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div style={styles.card}>
      <h2>🌤️ Clima en {clima.name}</h2>
      <p><strong>Temperatura:</strong> {clima.main.temp} °C</p>
      <p><strong>Sensación térmica:</strong> {clima.main.feels_like} °C</p>
      <p><strong>Humedad:</strong> {clima.main.humidity}%</p>
      <p><strong>Condición:</strong> {clima.weather[0].description}</p>
      <img
        src={`http://openweathermap.org/img/wn/${clima.weather[0].icon}@2x.png`}
        alt="icono clima"
      />
    </div>
  );
};

const styles = {
  card: {
    maxWidth: "300px",
    margin: "20px auto",
    padding: "15px",
    borderRadius: "12px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
    backgroundColor: "#f9f9f9",
    textAlign: "center",
    fontFamily: "Arial, sans-serif"
  }
};

export default Clima;
