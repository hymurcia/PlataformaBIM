// src/routes/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children, roles = [] }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token || !user) {
    return <Navigate to="/login" />;
  }

  if (roles.length && !roles.includes(user.rol_id)) {
    return <Navigate to="/" />;
  }

  return children;
};

export default PrivateRoute;
