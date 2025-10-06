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
import Footer from './components/PiePagina';
import CrudUsuarios from './components/CrudUsuarios';
import Notificaciones from './components/Notificaciones';
import PanelInformes from './components/PanelInformes';
import PanelSolicitudes from './components/GestionSolicitudes';



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
        backgroundColor: '#00482B', // Fondo verde institucional
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          {/* Botón del escudo que redirecciona a la página de inicio */}
          <Link to="/">
            <img 
              src={escudoBlanco} 
              alt="Escudo de la Universidad de Cundinamarca" 
              style={{ height: '40px', marginRight: '10px' }} 
            />
          </Link>
          {!auth.isAuthenticated ? (
            <>
              <Link
                to="/registro"
                style={buttonStyle}
                onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
              >
                Registrarse
              </Link>
              <Link
                to="/login"
                style={buttonStyle}
                onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/reporte/invitado"
                style={buttonStyle}
                onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
              >
                Reportar como Invitado
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/reportes"
                style={buttonStyle}
                onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
              >
                Lista de Reportes
              </Link>
              {auth.user?.rol_id === 1 && (
                <>
                  <Link
                    to="/admin/usuarios"
                    style={buttonStyle}
                    onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                    onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
                  >
                    Usuarios
                  </Link>
                  <Link
                    to="/informes"
                    style={buttonStyle}
                    onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                    onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
                  >
                    Informes
                  </Link>
                </>
              )}
              {auth.user?.rol_id === 2 && (
                <>
                  <Link
                    to="/admin/tareas"
                    style={buttonStyle}
                    onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                    onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
                  >
                    Tareas
                  </Link>
                  <Link
                    to="/mantenimientos"
                    style={buttonStyle}
                    onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                    onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
                  >
                    Mantenimientos
                  </Link>
                  <Link
                    to="/bim"
                    style={buttonStyle}
                    onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                    onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
                  >
                    BIM
                  </Link>
                  <Link
                    to="/dashboard"
                    style={buttonStyle}
                    onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                    onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
                  >
                    Metricas
                  </Link>
                  <Link
                    to="/inventario"
                    style={buttonStyle}
                    onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                    onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
                  >
                    Inventario
                  </Link>
                  <Link
                    to="/Gsolicitudes"
                    style={buttonStyle}
                    onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                    onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
                  >
                    Solicitudes
                  </Link>
                  <Link
                    to="/predictivo"
                    style={buttonStyle}
                    onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                    onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
                  >
                    Recomendacion
                  </Link>
                  <Link
                    to="/clima"
                    style={buttonStyle}
                    onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                    onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
                  >
                    Clima
                  </Link>
                  <Link
                    to="/informes"
                    style={buttonStyle}
                    onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                    onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
                  >
                    Informes
                  </Link>
                </>
              )}
              {auth.user?.rol_id === 3 && (
                <>
                  <Link
                    to="/mis-tareas"
                    style={buttonStyle}
                    onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                    onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
                  >
                    Mis Tareas
                  </Link>
                  <Link
                    to="/inventario"
                    style={buttonStyle}
                    onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                    onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
                  >
                    Inventario
                  </Link>
                  <Link
                    to="/solicitudes"
                    style={buttonStyle}
                    onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                    onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
                  >
                    Solicitudes
                  </Link>
                </>
              )}
              <Link
                to="/reportar"
                style={buttonStyle}
                onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
              >
                Reportar Incidente
              </Link>
              <Link
                to="/perfil"
                style={buttonStyle}
                onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                onMouseOut={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
              >
                Perfil
              </Link>
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

      <Routes>
        <Route
          path="/"
          element={auth.isAuthenticated ? <CalendarioReportes /> : <Home auth={auth} />}
        />
        <Route
          path="/registro"
          element={auth.isAuthenticated ? <Navigate to="/perfil" /> : <Registro />}
        />
        <Route
          path="/login"
          element={auth.isAuthenticated ? <Navigate to="/perfil" /> : <Login setAuth={setAuth} />}
        />
        <Route
          path="/perfil"
          element={auth.isAuthenticated ? <Perfil auth={auth} setAuth={setAuth} /> : <Navigate to="/" />}
        />
        <Route
          path="/reportar"
          element={auth.isAuthenticated ? <ReporteIncidente auth={auth} /> : <Navigate to="/login" />}
        />
        <Route
          path="/reporte/invitado"
          element={<ReporteInvitado />}
        />
        <Route
          path="/reportes"
          element={auth.isAuthenticated ? <ListaReportes auth={auth} /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/tareas"
          element={auth.isAuthenticated && auth.user?.rol_id === 2 ? <AdminTareas auth={auth} /> : <Navigate to="/" />}
        />
        <Route
          path="/mis-tareas"
          element={auth.isAuthenticated ? <TareasResponsable auth={auth} /> : <Navigate to="/login" />}
        />
        <Route
          path="/dashboard"
          element={auth.isAuthenticated && auth.user?.rol_id === 2 ? <PanelMetricas auth={auth} /> : <Navigate to="/" />}
        />
        <Route
          path="/incidentes/:id"
          element={auth.isAuthenticated ? <DetalleReporte auth={auth} /> : <Navigate to="/login" />}
        />
        <Route
          path="/inventario"
          element={
            <PrivateRoute roles={[2, 3]} auth={auth}>
              <PanelInventario />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/usuarios"
          element={auth.isAuthenticated && auth.user?.rol_id === 1 ? <CrudUsuarios auth={auth} /> : <Navigate to="/" />}
        />
        <Route
          path="/solicitudes"
          element={
            <PrivateRoute roles={[2, 3]} auth={auth}>
              <SolicitudesAdquisicion />
            </PrivateRoute>
          }
        />
        <Route
          path="/mantenimientos"
          element={
            <PrivateRoute roles={[2, 3]} auth={auth}>
              <Mantenimientos />
            </PrivateRoute>
          }
        />
        <Route
          path="/clima"
          element={auth.isAuthenticated ? <Clima /> : <Navigate to="/login" />}
        />
        <Route
          path="/bim"
          element={
            <PrivateRoute roles={[2, 3]} auth={auth}>
              <PanelBim />
            </PrivateRoute>
          }
        />
        <Route
          path="/predictivo"
          element={
            <PrivateRoute roles={[2]} auth={auth}>
              <PredictivoMantenimiento />
            </PrivateRoute>
          }
        />
        <Route
          path="/informes"
          element={
            <PrivateRoute roles={[1,2]} auth={auth}>
              <PanelInformes />
            </PrivateRoute>
          }
          
        />
        <Route
          path="/Gsolicitudes"
          element={
            <PrivateRoute roles={[2]} auth={auth}>
              <PanelSolicitudes />
            </PrivateRoute>
          }
          
        />
      </Routes>
      {/* <Footer /> */}
    </Router>
  );
}

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

      {/* Capa de color oscuro semitransparente */}
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

      {/* Contenido principal */}
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

        <h1
          style={{
            fontSize: "2.8rem",
            fontWeight: "bold",
            marginBottom: "1rem",
            color: "#FBE122",
          }}
        >
          Plataforma de Mantenimiento Locativo
        </h1>

        <p
          style={{
            fontSize: "1.4rem",
            fontWeight: "300",
            marginBottom: "2rem",
          }}
        >
          Gestión eficiente basada en la metodología BIM para la Universidad de
          Cundinamarca.
        </p>

        {/* Mostrar solo si NO está autenticado */}
        {!auth?.isAuthenticated && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "20px",
              }}
            >
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
                  transition:
                    "background-color 0.3s ease, transform 0.2s ease",
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
                  transition:
                    "background-color 0.3s ease, color 0.3s ease, transform 0.2s ease",
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
          </>
        )}
      </div>
    </div>
    
  );
}
            

export default App;
