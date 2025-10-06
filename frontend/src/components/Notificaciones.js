import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000/notificaciones";
const SOCKET_URL = "http://localhost:5000";

const Notificaciones = () => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [open, setOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const [mostrarSoloNoLeidas, setMostrarSoloNoLeidas] = useState(false); // 👈 estado para filtrar
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const usuarioId = localStorage.getItem("usuario_id");

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  // 🔹 Función para filtrar notificaciones de los últimos 14 días
  const filtrarRecientes = (lista) => {
    const hoy = new Date();
    return lista.filter((n) => {
      const fechaCreacion = new Date(n.fecha_creacion);
      const diferenciaDias = (hoy - fechaCreacion) / (1000 * 60 * 60 * 24);
      return diferenciaDias <= 14; // solo las últimas 2 semanas
    });
  };

  const cargarNotificaciones = async () => {
    if (!usuarioId) return;
    try {
      const res = await axios.get(`${API_URL}/${usuarioId}`);
      setNotificaciones(filtrarRecientes(res.data));
    } catch (error) {
      console.error("❌ Error cargando notificaciones:", error);
    }
  };

  const manejarClickNotificacion = async (notificacion) => {
    try {
      if (!notificacion.leida) {
        await axios.put(`${API_URL}/${notificacion.id}/leida`);
        setNotificaciones((prev) =>
          prev.map((n) =>
            n.id === notificacion.id
              ? { ...n, leida: true, fecha_lectura: new Date() }
              : n
          )
        );
      }

      setOpen(false);

      if (notificacion.link) {
        navigate(notificacion.link);
      } else {
        switch (notificacion.tipo) {
          case "nuevo_proyecto":
            navigate("/proyectos");
            break;
          case "tarea_asignada":
            navigate("/tareas");
            break;
          case "documento_compartido":
            navigate("/documentos");
            break;
          case "mensaje":
            navigate("/mensajes");
            break;
          case "revision":
            navigate("/revisiones");
            break;
          default:
            navigate("/notificaciones");
            break;
        }
      }
    } catch (error) {
      console.error("❌ Error manejando notificación:", error);
    }
  };

  useEffect(() => {
    if (!usuarioId) return;

    // Conectar a Socket.IO
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    setSocket(newSocket);

    newSocket.emit("join", usuarioId);

    // 🔹 Escuchar nuevas notificaciones
    newSocket.on("nueva_notificacion", (notificacion) => {
      setNotificaciones((prev) =>
        filtrarRecientes([notificacion, ...prev])
      );
    });

    // 🔹 Cargar notificaciones iniciales
    cargarNotificaciones();

    // Cleanup al desmontar
    return () => {
      newSocket.disconnect();
    };
  }, [usuarioId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // 🔹 Filtrar lista según "mostrarSoloNoLeidas"
  const notificacionesFiltradas = mostrarSoloNoLeidas
    ? notificaciones.filter((n) => !n.leida)
    : notificaciones;

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
            width: "350px",
            maxHeight: "450px",
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "8px",
            boxShadow: "0px 4px 8px rgba(0,0,0,0.1)",
            zIndex: 1000,
          }}
        >
          {/* 🔹 Header con botón filtro */}
          <div
            style={{
              padding: "10px",
              borderBottom: "1px solid #eee",
              background: "#f7f7f7",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            <span>Notificaciones ({notificacionesFiltradas.length})</span>
            <button
              onClick={() => setMostrarSoloNoLeidas(!mostrarSoloNoLeidas)}
              style={{
                background: mostrarSoloNoLeidas ? "#007bff" : "#ccc",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              {mostrarSoloNoLeidas ? "Ver todas" : "Solo no leídas"}
            </button>
          </div>

          {notificacionesFiltradas.length === 0 ? (
            <p style={{ padding: "15px", textAlign: "center", color: "#888" }}>
              No tienes notificaciones
            </p>
          ) : (
            notificacionesFiltradas.map((n) => (
              <div
                key={n.id}
                onClick={() => manejarClickNotificacion(n)}
                style={{
                  padding: "10px",
                  borderBottom: "1px solid #eee",
                  background: n.leida ? "#f9f9f9" : "#e6f7ff",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  position: "relative",
                }}
              >
                {!n.leida && (
                  <div
                    style={{
                      position: "absolute",
                      top: "12px",
                      right: "12px",
                      width: "8px",
                      height: "8px",
                      backgroundColor: "#007bff",
                      borderRadius: "50%",
                    }}
                  />
                )}
                <strong style={{ display: "block", marginBottom: "5px" }}>
                  {n.titulo}
                </strong>
                <p style={{ margin: "5px 0", fontSize: "14px", color: "#333" }}>
                  {n.mensaje}
                </p>
                <small style={{ fontSize: "12px", color: "#666" }}>
                  {new Date(n.fecha_creacion).toLocaleString()}
                </small>
                <div style={{ fontSize: "11px", color: "#999", marginTop: "5px" }}>
                  Tipo: {n.tipo}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Notificaciones;
