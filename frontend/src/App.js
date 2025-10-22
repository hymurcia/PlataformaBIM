// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Registro from './Registro';
import Login from './Login';
import Perfil from './Perfil';
import ReporteIncidente from './components/ReporteIncidente';
import ReporteInvitado from './components/ReporteInvitado';
import CalendarioReportes from './components/CalendarioReportes';
import ListaReportes from './components/ListaReportes';
import AdminTareas from './components/AdminTareas';
import TareasResponsable from './components/TareasResponsable';
import PanelMetricas from './components/PanelMetricas';
import DetalleReporte from './components/DetalleReporte';
import PanelInventario from './components/inventario/PanelInventario';
import PrivateRoute from './routes/PrivateRoute';
import SolicitudesAdquisicion from './components/SolicitudesAdquisicion';
import Mantenimientos from './components/Mantenimientos';
import Clima from './components/Clima';
import PanelBim from './components/PanelBim';
import PredictivoMantenimiento from './components/Predictivo';
import CrudUsuarios from './components/CrudUsuarios';
import Notificaciones from './components/Notificaciones';
import PanelInformes from './components/PanelInformes';
import PanelSolicitudes from './components/GestionSolicitudes';
import ResetPassword from './components/RestablecerContraseña';

import logoHorizontalBlanco from './assets/IMAGOTIPO HORIZONTAL BLANCO.png';
import escudoBlanco from './assets/ESCUDO BLANCO.png';
import fondo from './assets/entrada.jpg';

function App() {
  const [auth, setAuth] = useState({
    isAuthenticated: false,
    user: null
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      setAuth({
        isAuthenticated: true,
        user: JSON.parse(user)
      });
    }
  }, []);

  const buttonStyle = {
    color: 'white',
    backgroundColor: 'transparent',
    padding: '8px 12px',
    borderRadius: '6px',
    textDecoration: 'none',
    marginRight: '10px',
    fontWeight: 'bold',
    transition: 'background-color 0.3s ease, transform 0.2s ease',
    display: 'inline-block'
  };

  const buttonHoverStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: 'scale(1.05)'
  };

  return (
    <Router>
      <nav style={{
        padding: '10px 20px',
        backgroundColor: '#00482B',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <Link to="/">
            <img
              src={escudoBlanco}
              alt="Escudo de la Universidad de Cundinamarca"
              style={{ height: '40px', marginRight: '10px' }}
            />
          </Link>

          {/* 🔐 MENÚ DE NAVEGACIÓN */}
          {!auth.isAuthenticated ? (
            <>
              <NavLink to="/registro" text="Registrarse" style={buttonStyle} hover={buttonHoverStyle} />
              <NavLink to="/login" text="Iniciar Sesión" style={buttonStyle} hover={buttonHoverStyle} />
              <NavLink to="/reporte/invitado" text="Reportar como Invitado" style={buttonStyle} hover={buttonHoverStyle} />
            </>
          ) : (
            <>
              <NavLink to="/reportes" text="Lista de Reportes" style={buttonStyle} hover={buttonHoverStyle} />

              {auth.user?.rol_id === 1 && (
                <>
                  <NavLink to="/admin/usuarios" text="Usuarios" style={buttonStyle} hover={buttonHoverStyle} />
                  <NavLink to="/informes" text="Informes" style={buttonStyle} hover={buttonHoverStyle} />
                </>
              )}

              {auth.user?.rol_id === 2 && (
                <>
                  <NavLink to="/admin/tareas" text="Tareas" style={buttonStyle} hover={buttonHoverStyle} />
                  <NavLink to="/mantenimientos" text="Mantenimientos" style={buttonStyle} hover={buttonHoverStyle} />
                  <NavLink to="/bim" text="BIM" style={buttonStyle} hover={buttonHoverStyle} />
                  <NavLink to="/dashboard" text="Métricas" style={buttonStyle} hover={buttonHoverStyle} />
                  <NavLink to="/inventario" text="Inventario" style={buttonStyle} hover={buttonHoverStyle} />
                  <NavLink to="/Gsolicitudes" text="Solicitudes" style={buttonStyle} hover={buttonHoverStyle} />
                  <NavLink to="/predictivo" text="Recomendación" style={buttonStyle} hover={buttonHoverStyle} />
                  <NavLink to="/clima" text="Clima" style={buttonStyle} hover={buttonHoverStyle} />
                  <NavLink to="/informes" text="Informes" style={buttonStyle} hover={buttonHoverStyle} />
                </>
              )}

              {auth.user?.rol_id === 3 && (
                <>
                  <NavLink to="/mis-tareas" text="Mis Tareas" style={buttonStyle} hover={buttonHoverStyle} />
                  <NavLink to="/inventario" text="Inventario" style={buttonStyle} hover={buttonHoverStyle} />
                  <NavLink to="/solicitudes" text="Solicitudes" style={buttonStyle} hover={buttonHoverStyle} />
                </>
              )}

              <NavLink to="/reportar" text="Reportar Incidente" style={buttonStyle} hover={buttonHoverStyle} />
              <NavLink to="/perfil" text="Perfil" style={buttonStyle} hover={buttonHoverStyle} />
            </>
          )}
        </div>

        {auth.isAuthenticated && (
          <div style={{
            display: "flex",
            alignItems: "center",
            fontWeight: "bold",
            color: 'white',
            gap: '10px'
          }}>
            <Notificaciones />
            <span>Bienvenido, {auth.user?.nombre}</span>
          </div>
        )}
      </nav>

      {/* ✅ TODAS LAS RUTAS EN UN SOLO BLOQUE */}
      <Routes>
        <Route path="/" element={auth.isAuthenticated ? <CalendarioReportes /> : <Home auth={auth} />} />
        <Route path="/registro" element={auth.isAuthenticated ? <Navigate to="/perfil" /> : <Registro />} />
        <Route path="/login" element={auth.isAuthenticated ? <Navigate to="/perfil" /> : <Login setAuth={setAuth} />} />
        <Route path="/perfil" element={auth.isAuthenticated ? <Perfil auth={auth} setAuth={setAuth} /> : <Navigate to="/" />} />
        <Route path="/reportar" element={auth.isAuthenticated ? <ReporteIncidente auth={auth} /> : <Navigate to="/login" />} />
        <Route path="/reporte/invitado" element={<ReporteInvitado />} />
        <Route path="/reportes" element={auth.isAuthenticated ? <ListaReportes auth={auth} /> : <Navigate to="/login" />} />
        <Route path="/admin/tareas" element={<PrivateRoute roles={[2]} auth={auth}><AdminTareas auth={auth} /></PrivateRoute>} />
        <Route path="/mis-tareas" element={<PrivateRoute roles={[3]} auth={auth}><TareasResponsable auth={auth} /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute roles={[2]} auth={auth}><PanelMetricas auth={auth} /></PrivateRoute>} />
        <Route path="/incidentes/:id" element={<PrivateRoute roles={[1, 2, 3]} auth={auth}><DetalleReporte auth={auth} /></PrivateRoute>} />
        <Route path="/inventario" element={<PrivateRoute roles={[2, 3]} auth={auth}><PanelInventario /></PrivateRoute>} />
        <Route path="/admin/usuarios" element={<PrivateRoute roles={[1]} auth={auth}><CrudUsuarios auth={auth} /></PrivateRoute>} />
        <Route path="/solicitudes" element={<PrivateRoute roles={[2, 3]} auth={auth}><SolicitudesAdquisicion /></PrivateRoute>} />
        <Route path="/mantenimientos" element={<PrivateRoute roles={[2, 3]} auth={auth}><Mantenimientos /></PrivateRoute>} />
        <Route path="/clima" element={<PrivateRoute roles={[2, 3]} auth={auth}><Clima /></PrivateRoute>} />
        <Route path="/bim" element={<PrivateRoute roles={[2, 3]} auth={auth}><PanelBim /></PrivateRoute>} />
        <Route path="/predictivo" element={<PrivateRoute roles={[2]} auth={auth}><PredictivoMantenimiento /></PrivateRoute>} />
        <Route path="/informes" element={<PrivateRoute roles={[1, 2]} auth={auth}><PanelInformes /></PrivateRoute>} />
        <Route path="/Gsolicitudes" element={<PrivateRoute roles={[2]} auth={auth}><PanelSolicitudes /></PrivateRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Página no encontrada */}
        <Route path="*" element={<h2 style={{ textAlign: 'center', marginTop: '50px' }}>Página no encontrada</h2>} />
      </Routes>
    </Router>
  );
}

/* 🔹 Componente NavLink reutilizable para el menú */
function NavLink({ to, text, style, hover }) {
  return (
    <Link
      to={to}
      style={style}
      onMouseOver={(e) => Object.assign(e.currentTarget.style, hover)}
      onMouseOut={(e) => Object.assign(e.currentTarget.style, style)}
    >
      {text}
    </Link>
  );
}

/* 🔹 Componente Home */
function Home({ auth }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "calc(100vh - 60px)",
        backgroundImage: `url(${fondo})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
        fontFamily: "Arial, sans-serif",
        overflow: "hidden",
        color: "white",
      }}
    >
      <style>
        {`
          @keyframes fadeInScale {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
        `}
      </style>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 72, 43, 0.7)",
          zIndex: 1,
        }}
      ></div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          textAlign: "center",
          padding: "20px",
          maxWidth: "800px",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          borderRadius: "12px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
          animation: "fadeInScale 1s ease-out",
        }}
      >
        <img
          src={logoHorizontalBlanco}
          alt="Universidad de Cundinamarca"
          style={{
            display: "block",
            margin: "0 auto 1rem",
            width: "400px",
            maxWidth: "80%",
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
          }}
        />

        <h1 style={{ fontSize: "2.8rem", fontWeight: "bold", marginBottom: "1rem", color: "#FBE122" }}>
          Plataforma de Mantenimiento Locativo
        </h1>

        <p style={{ fontSize: "1.4rem", fontWeight: "300", marginBottom: "2rem" }}>
          Gestión eficiente basada en la metodología BIM para la Universidad de Cundinamarca.
        </p>

        {!auth?.isAuthenticated && (
          <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
            <Link
              to="/login"
              style={{
                backgroundColor: "#FBE122",
                color: "#00482B",
                padding: "12px 25px",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "bold",
                fontSize: "1.1rem",
                transition: "background-color 0.3s ease, transform 0.2s ease",
                boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#DAAA00";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#FBE122";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              Iniciar Sesión
            </Link>

            <Link
              to="/registro"
              style={{
                backgroundColor: "transparent",
                color: "#FBE122",
                border: "2px solid #FBE122",
                padding: "12px 25px",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "bold",
                fontSize: "1.1rem",
                transition: "background-color 0.3s ease, color 0.3s ease, transform 0.2s ease",
                boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#FBE122";
                e.currentTarget.style.color = "#00482B";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#FBE122";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              Registrarse
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
