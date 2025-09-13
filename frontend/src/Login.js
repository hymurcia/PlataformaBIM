import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = ({ setAuth }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Estado para recuperación de contraseña
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // ======================
  // LOGIN
  // ======================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('http://localhost:5000/auth/login', formData);
      
      if (!response.data.token || !response.data.user?.rol_id) {
        throw new Error('Respuesta del servidor incompleta');
      }

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      setAuth({
        isAuthenticated: true,
        user: response.data.user,
        role: response.data.user.rol_id
      });

      if (response.data.user.rol_id === 2) {
        navigate('/admin');
      } else {
        navigate('/perfil');
      }

    } catch (err) {
      console.error('Error durante login:', {
        error: err,
        response: err.response
      });
      
      setError(
        err.response?.data?.error || 
        err.message || 
        'Error al iniciar sesión'
      );
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // FORGOT PASSWORD
  // ======================
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setForgotMessage('');

    try {
      const res = await axios.post('http://localhost:5000/auth/forgot', { email: forgotEmail });

      setForgotMessage(res.data.message);
    } catch (err) {
      console.error('Error durante recuperación:', err);
      setError(err.response?.data?.error || 'Error al solicitar recuperación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: '400px', 
      margin: '2rem auto', 
      padding: '2rem',
      boxShadow: '0 0 10px rgba(0,0,0,0.1)',
      borderRadius: '8px'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        {forgotMode ? 'Recuperar Contraseña' : 'Iniciar Sesión'}
      </h2>
      
      {error && (
        <div style={{ 
          color: 'white',
          backgroundColor: '#ff4444',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {/* Mensaje de forgot */}
      {forgotMessage && (
        <div style={{ 
          color: 'white',
          backgroundColor: '#007B3E',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          {forgotMessage}
        </div>
      )}

      {!forgotMode ? (
        // FORM LOGIN
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Correo Electrónico:
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Contraseña:
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: loading ? '#cccccc' : '#007B3E',
              color: 'white',
              padding: '12px',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s'
            }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => { setForgotMode(true); setError(''); setForgotMessage(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#007B3E',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </p>
        </form>
      ) : (
        // FORM RECUPERAR CONTRASEÑA
        <form onSubmit={handleForgotPassword}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Ingresa tu correo electrónico:
            </label>
            <input
              type="email"
              name="forgotEmail"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: loading ? '#cccccc' : '#007B3E',
              color: 'white',
              padding: '12px',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s'
            }}
          >
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => { setForgotMode(false); setError(''); setForgotMessage(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#007B3E',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
            >
              Volver a iniciar sesión
            </button>
          </p>
        </form>
      )}
    </div>
  );
};

export default Login;
