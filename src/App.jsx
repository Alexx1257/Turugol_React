import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboardPage from './pages/user/Dashboard'; 
import AdminDashboardPage from './pages/admin/Dashboard';
import CreateQuiniela from './pages/admin/CreateQuiniela';
import SchedulePageWithLayout from './pages/admin/FootballSchedule';

// 🛑 IMPORTAR EL COMPONENTE DE PROTECCIÓN
import ProtectedRoute from './components/ProtectedRoute'; 

function App() {
    return (
        <div className="App">
            <Routes>
                {/* ============================================================== */}
                {/* 1. RUTAS PÚBLICAS (ACCESIBLES POR TODOS) */}
                {/* ============================================================== */}
                <Route path="/" element={<Home />} />
                
                {/* Deberías crear un PublicOnlyRoute si quieres evitar que usuarios logueados vean el login/register */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />


                {/* ============================================================== */}
                {/* 2. RUTAS PROTEGIDAS (REQUIEREN CUALQUIER AUTENTICACIÓN) */}
                {/* ============================================================== */}
                {/* El componente ProtectedRoute usa <Outlet /> y anidamos las rutas dentro */}
                
                <Route element={<ProtectedRoute />}>
                    {/* El usuario normal accederá a su dashboard */}
                    <Route path="/dashboard/user" element={<UserDashboardPage />} />
                </Route>


                {/* ============================================================== */}
                {/* 3. RUTAS PROTEGIDAS POR ROL (REQUIEREN ROL 'admin') */}
                {/* ============================================================== */}
                
                <Route element={<ProtectedRoute requiredRole="admin" />}>
                    {/* Panel principal del Admin */}
                    <Route path="/dashboard/admin" element={<AdminDashboardPage />} />
                    
                    {/* Rutas anidadas de Admin */}
                    <Route path="/dashboard/admin/create" element={<CreateQuiniela />} />
                    <Route path="/dashboard/admin/schedule" element={<SchedulePageWithLayout />} />
                </Route>
                
                {/* Opcional: Ruta para manejar errores de permisos o 404 */}
                <Route path="*" element={<Home />} /> 

            </Routes>
        </div>
    );
}

export default App;