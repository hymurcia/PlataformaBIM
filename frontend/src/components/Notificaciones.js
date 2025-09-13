import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import axios from "axios";

// 🔹 URLs del backend
const API_URL = "http://localhost:5000/notificaciones";
const SOCKET_URL = "http://localhost:5000";

const Notificaciones = () => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [open, setOpen] = useState(false);
  const [socket, setSocket] = useState(null);

  // 🔹 Recuperar usuario_id desde localStorage
  const usuarioId = localStorage.getItem("usuario_id");

  // 🔹 Contador de no leídas
  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  // 🔹 Cargar notificaciones desde API
  const cargarNotificaciones = async () => {
    if (!usuarioId) return;
    try {
      const res = await axios.get(`${API_URL}/${usuarioId}`);
      setNotificaciones(res.data);
    } catch (error) {
      console.error("❌ Error cargando notificaciones:", error);
    }
  };

  // 🔹 Marcar como leída
  const marcarComoLeida = async (id) => {
    try {
      await axios.put(`${API_URL}/${id}/leida`);
      setNotificaciones((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, leida: true, fecha_lectura: new Date() } : n
        )
      );
    } catch (error) {
      console.error("❌ Error marcando notificación:", error);
    }
  };

  useEffect(() => {
    if (!usuarioId) return;

    // Conectar a Socket.IO
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    setSocket(newSocket);

    // 🔹 Unirse a la sala personal del usuario
    newSocket.emit("join", usuarioId);

    // 🔹 Escuchar nuevas notificaciones
    newSocket.on("nueva_notificacion", (notificacion) => {
      setNotificaciones((prev) => [notificacion, ...prev]);
    });

    // 🔹 Cargar notificaciones iniciales
    cargarNotificaciones();

    // Cleanup al desmontar
    return () => {
      newSocket.disconnect();
    };
  }, [usuarioId]);

  return (
    <div style={{ position: "relative" }}>
      {/* 🔔 Botón de campana */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "transparent",
          border: "none",
          fontSize: "24px",
          cursor: "pointer",
          position: "relative",
        }}
      >
        🔔
        {noLeidas > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              background: "red",
              color: "white",
              borderRadius: "50%",
              padding: "2px 6px",
              fontSize: "12px",
            }}
          >
            {noLeidas}
          </span>
        )}
      </button>

      {/* 📋 Lista de notificaciones */}
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            marginTop: "10px",
            width: "320px",
            maxHeight: "400px",
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "8px",
            boxShadow: "0px 4px 8px rgba(0,0,0,0.1)",
            zIndex: 1000,
          }}
        >
          {notificaciones.length === 0 ? (
            <p style={{ padding: "10px", textAlign: "center", color: "#888" }}>
              No tienes notificaciones
            </p>
          ) : (
            notificaciones.map((n) => (
              <div
                key={n.id}
                onClick={() => marcarComoLeida(n.id)}
                style={{
                  padding: "10px",
                  borderBottom: "1px solid #eee",
                  background: n.leida ? "#f9f9f9" : "#e6f7ff",
                  cursor: "pointer",
                }}
              >
                <strong>{n.titulo}</strong>
                <p style={{ margin: "5px 0", fontSize: "14px" }}>{n.mensaje}</p>
                <small style={{ fontSize: "12px", color: "#666" }}>
                  {new Date(n.fecha_creacion).toLocaleString()}
                </small>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Notificaciones;
