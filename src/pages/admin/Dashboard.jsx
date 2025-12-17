// src/pages/admin/Dashboard.jsx

import React from 'react';
import DashboardLayout from '../../components/DashboardLayout';

const AdminDashboardPage = () => {
  return (
    <DashboardLayout isAdmin={true}>
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold text-red-700 mb-4">Resumen de Administración</h2>
        <p className="text-gray-600">Panel para la gestión integral de la plataforma TuriGol. Crea nuevas quinielas y supervisa la actividad.</p>

        {/* Aquí puedes poner métricas y widgets del administrador */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-600">Quinielas Creadas</p>
                <p className="text-3xl font-bold text-red-900">12</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-600">Usuarios Activos</p>
                <p className="text-3xl font-bold text-purple-900">8,500</p>
            </div>
            <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
                <p className="text-sm text-gray-600">Próximo Lanzamiento</p>
                <p className="text-3xl font-bold text-gray-900">Jornada 29</p>
            </div>
            
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboardPage;