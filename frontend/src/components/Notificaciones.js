// src/components/Notificaciones.js
import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// 🔹 Usa una sola constante base, configurable por variable de entorno
const BASE_URL = process.env.REACT_APP_API_URL || "http://192.168.56.1:5000";
const API_URL = `${BASE_URL}/notificaciones`;

const Notificaciones = () => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [open, setOpen] = useState(false);
  const [mostrarSoloNoLeidas, setMostrarSoloNoLeidas] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const usuarioId = localStorage.getItem("usuario_id");
  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  // 🔹 Filtra notificaciones de las últimas 2 semanas
  const filtrarRecientes = (lista) => {
    const hoy = new Date();
    return lista.filter((n) => {
      const fecha = new Date(n.fecha_creacion);
      return (hoy - fecha) / (1000 * 60 * 60 * 24) <= 14;
    });
  };

  // 🔹 Cargar notificaciones iniciales
  const cargarNotificaciones = async () => {
    if (!usuarioId) return;
    try {
      const res = await axios.get(`${API_URL}/${usuarioId}`);
      setNotificaciones(filtrarRecientes(res.data));
    } catch (error) {
      console.error("❌ Error cargando notificaciones:", error);
    }
  };

  // 🔹 Marcar notificación como leída y redirigir
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

      // Redirección dinámica según tipo o link
      if (notificacion.link) return navigate(notificacion.link);

      const rutas = {
        nuevo_proyecto: "/proyectos",
        tarea_asignada: "/tareas",
        documento_compartido: "/documentos",
        mensaje: "/mensajes",
        revision: "/revisiones",
      };

      navigate(rutas[notificacion.tipo] || "/notificaciones");
    } catch (error) {
      console.error("❌ Error manejando notificación:", error);
    }
  };

  // 🔹 Conexión WebSocket establecida una sola vez
  useEffect(() => {
    if (!usuarioId) return;

    const socket = io(BASE_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.emit("join", usuarioId);

    socket.on("connect", () => {
      console.log("✅ Conectado al servidor WebSocket");
    });

    socket.on("disconnect", (reason) => {
      console.warn("⚠️ WebSocket desconectado:", reason);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Error al conectar WebSocket:", err.message);
    });

    socket.on("nueva_notificacion", (n) => {
      setNotificaciones((prev) => filtrarRecientes([n, ...prev]));
    });

    cargarNotificaciones();

    // 🔹 Limpieza al desmontar el componente
    return () => {
      socket.disconnect();
      console.log("🔌 WebSocket cerrado correctamente");
    };
  }, [usuarioId]);

  // 🔹 Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const notificacionesFiltradas = mostrarSoloNoLeidas
    ? notificaciones.filter((n) => !n.leida)
    : notificaciones;

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      {/* 🔔 Botón campana */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "transparent",
          border: "none",
          fontSize: "26px",
          cursor: "pointer",
          position: "relative",
          color: "#FBE122",
        }}
      >
        🔔
        {noLeidas > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-6px",
              right: "-6px",
              background: "#FBE122",
              color: "#00482B",
              borderRadius: "50%",
              padding: "2px 6px",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            {noLeidas}
          </span>
        )}
      </button>

      {/* 📋 Lista desplegable */}
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            marginTop: "10px",
            width: "370px",
            maxHeight: "450px",
            overflowY: "auto",
            background: "#1B1B1B",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "10px",
            boxShadow: "0px 4px 12px rgba(0,0,0,0.5)",
            zIndex: 1000,
            animation: "fadeIn 0.3s ease-in-out",
          }}
        >
          {/* Encabezado */}
          <div
            style={{
              padding: "10px 12px",
              background: "#00482B",
              color: "#FBE122",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTopLeftRadius: "10px",
              borderTopRightRadius: "10px",
              fontWeight: "bold",
            }}
          >
            <span>Notificaciones ({notificacionesFiltradas.length})</span>
            <button
              onClick={() => setMostrarSoloNoLeidas(!mostrarSoloNoLeidas)}
              style={{
                background: mostrarSoloNoLeidas
                  ? "#FBE122"
                  : "rgba(255,255,255,0.2)",
                color: mostrarSoloNoLeidas ? "#00482B" : "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "12px",
                cursor: "pointer",
                transition: "0.2s",
              }}
            >
              {mostrarSoloNoLeidas ? "Ver todas" : "Solo no leídas"}
            </button>
          </div>

          {/* Contenido */}
          {notificacionesFiltradas.length === 0 ? (
            <p
              style={{
                padding: "20px",
                textAlign: "center",
                color: "#bbb",
                margin: 0,
              }}
            >
              No tienes notificaciones recientes
            </p>
          ) : (
            notificacionesFiltradas.map((n) => (
              <div
                key={n.id}
                onClick={() => manejarClickNotificacion(n)}
                style={{
                  padding: "12px",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  background: n.leida ? "#2C2C2C" : "#00482B",
                  color: n.leida ? "#ccc" : "#fff",
                  cursor: "pointer",
                  transition: "background 0.2s ease, transform 0.1s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#036B43")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = n.leida
                    ? "#2C2C2C"
                    : "#00482B")
                }
              >
                <strong style={{ display: "block", marginBottom: "5px" }}>
                  {n.titulo}
                </strong>
                <p
                  style={{
                    margin: "5px 0",
                    fontSize: "14px",
                    color: "#FBE122",
                  }}
                >
                  {n.mensaje}
                </p>
                <small style={{ color: "#aaa" }}>
                  {new Date(n.fecha_creacion).toLocaleString()}
                </small>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#999",
                    marginTop: "5px",
                  }}
                >
                  Tipo: {n.tipo}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Estilos de animación */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Notificaciones;
