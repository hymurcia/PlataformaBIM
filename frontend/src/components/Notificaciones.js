import React, { useState } from "react";

const Notificaciones = () => {
  const [open, setOpen] = useState(false);

  // 🔔 Ejemplo de notificaciones
  const notificaciones = [
    { id: 1, mensaje: "Nuevo reporte asignado", fecha: "2025-09-06" },
    { id: 2, mensaje: "Mantenimiento programado mañana", fecha: "2025-09-07" },
    { id: 3, mensaje: "Solicitud de inventario aprobada", fecha: "2025-09-06" },
  ];

  return (
    <div style={{ position: "relative", marginRight: "15px" }}>
      {/* 🔔 Campana con emoji */}
      <span
        style={{
          fontSize: "22px",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setOpen(!open)}
      >
        🔔
      </span>

      {/* Contador rojo de notificaciones */}
      {notificaciones.length > 0 && (
        <span
          style={{
            position: "absolute",
            top: "-5px",
            right: "-5px",
            backgroundColor: "red",
            color: "white",
            borderRadius: "50%",
            padding: "2px 6px",
            fontSize: "12px",
          }}
        >
          {notificaciones.length}
        </span>
      )}

      {/* Dropdown de notificaciones */}
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "30px",
            backgroundColor: "#fff",
            border: "1px solid #ddd",
            borderRadius: "8px",
            width: "250px",
            boxShadow: "0px 2px 8px rgba(0,0,0,0.2)",
            zIndex: 1000,
          }}
        >
          <ul style={{ listStyle: "none", margin: 0, padding: "10px" }}>
            {notificaciones.map((n) => (
              <li
                key={n.id}
                style={{
                  borderBottom: "1px solid #eee",
                  padding: "8px 5px",
                  fontSize: "14px",
                }}
              >
                <strong>{n.mensaje}</strong>
                <br />
                <small style={{ color: "gray" }}>{n.fecha}</small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Notificaciones;
