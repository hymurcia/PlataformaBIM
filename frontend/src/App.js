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

  return (
    <Router>
      <nav style={{
        padding: '10px',
        backgroundColor: '#f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>

          {!auth.isAuthenticated ? (
            <>
              <Link to="/registro" style={{ marginRight: '10px' }}>Registrarse</Link>
              <Link to="/login" style={{ marginRight: '10px' }}>Iniciar Sesión</Link>
              <Link to="/reporte/invitado">Reportar como Invitado</Link>
            </>
          ) : (
            <>
              <Link to="/" style={{ marginRight: '10px' }}>Inicio</Link>
              <Link to="/reportes" style={{ marginRight: '10px' }}>Lista de Reportes</Link>

              {auth.user?.rol_id === 1 && (
                <>
                  <Link to="/admin/usuarios" style={{ marginRight: '10px' }}>Usuarios</Link>
                  <Link to="/informes" style={{ marginRight: '10px' }}>Informes</Link>
                </>
              )}
              {auth.user?.rol_id === 2 && (
                <>

                  <Link to="/admin/tareas" style={{ marginRight: '10px' }}>Tareas</Link>
                  <Link to="/mantenimientos" style={{ marginRight: '10px' }}>Mantenimientos</Link>
                  <Link to="/bim" style={{ marginRight: '10px' }}>BIM</Link>
                  <Link to="/dashboard" style={{ marginRight: '10px' }}>Metricas</Link>
                  <Link to="/inventario" style={{ marginRight: '10px' }}>Inventario</Link>
                  <Link to="/predictivo" style={{ marginRight: '10px' }}>Recomendacion</Link>
                  <Link to="/clima" style={{ marginRight: '10px' }}>Clima</Link>
                  <Link to="/informes" style={{ marginRight: '10px' }}>Informes</Link>

                </>
              )}
              {auth.user?.rol_id === 3 && (
                <>

                  <Link to="/mis-tareas" style={{ marginRight: '10px' }}>Mis Tareas</Link>
                  <Link to="/inventario" style={{ marginRight: '10px' }}>Inventario</Link>
                  <Link to="/solicitudes" style={{ marginRight: '10px' }}>Solicitudes</Link>

                </>
              )}

              <Link to="/reportar" style={{ marginRight: '10px' }}>Reportar Incidente</Link>
              <Link to="/perfil" style={{ marginRight: '10px' }}>Perfil</Link>
            </>
          )}
        </div>

        {auth.isAuthenticated && (
          <div style={{ display: "flex", alignItems: "center", fontWeight: "bold" }}>
            <Notificaciones />
            Bienvenido, {auth.user?.nombre}
          </div>
        )}
      </nav>

      <Routes>
        <Route
          path="/"
          element={auth.isAuthenticated ? <CalendarioReportes /> : <Home />}
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
          element={auth.isAuthenticated ? <Perfil auth={auth} setAuth={setAuth} /> : <Navigate to="/login" />}
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
            <PrivateRoute roles={[2]} auth={auth}>
              <PanelInformes />
            </PrivateRoute>
          }
          
        />
      </Routes>
      {/* <Footer /> */}

    </Router>
  );
}

function Home() {
  return <h1 style={{ textAlign: 'center' }}>Bienvenido a la Plataforma</h1>;
}

export default App;
