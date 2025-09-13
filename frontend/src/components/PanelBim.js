import React, { useState } from 'react';
import TablaComponentes from './ComponentesTabla';
import TablaUbicaciones from './UbicacionesTabla';
import TablaMantenimientos from './MantenimientosTabla';

const PanelBim = () => {
  const [tab, setTab] = useState('componentes');

  return (
    <div className="container mt-5">
      <h1 className="mb-4 text-center">📊 Panel BIM</h1>

      {/* Tabs */}
      <div className="d-flex justify-content-center mb-4">
        <button
          className={`btn me-2 ${tab === 'componentes' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setTab('componentes')}
        >
          Componentes
        </button>
        <button
          className={`btn me-2 ${tab === 'ubicaciones' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setTab('ubicaciones')}
        >
          Ubicaciones
        </button>
        <button
          className={`btn ${tab === 'mantenimientos' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setTab('mantenimientos')}
        >
          Mantenimientos
        </button>
      </div>

      {/* Render dinámico */}
      {tab === 'componentes' && <TablaComponentes />}
      {tab === 'ubicaciones' && <TablaUbicaciones />}
      {tab === 'mantenimientos' && <TablaMantenimientos />}
    </div>
  );
};

export default PanelBim;
