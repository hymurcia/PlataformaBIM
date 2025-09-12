import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = ({ setAuth }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('http://localhost:5000/auth/login', formData);
      
      // Verificación exhaustiva de la respuesta
      if (!response.data.token || !response.data.user?.rol_id) {
        throw new Error('Respuesta del servidor incompleta');
      }

      // Almacenamiento seguro
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Actualizar estado de autenticación
      setAuth({
        isAuthenticated: true,
        user: response.data.user,
        role: response.data.user.rol_id // Asegurar que el rol está incluido
      });

      // Redirección basada en el rol
      if (response.data.user.rol_id === 2) { // Admin
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

  return (
    <div style={{ 
      maxWidth: '400px', 
      margin: '2rem auto', 
      padding: '2rem',
      boxShadow: '0 0 10px rgba(0,0,0,0.1)',
      borderRadius: '8px'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Iniciar Sesión</h2>
      
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

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem',
            fontWeight: '500'
          }}>
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
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem',
            fontWeight: '500'
          }}>
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
      </form>
    </div>
  );
};

export default Login;