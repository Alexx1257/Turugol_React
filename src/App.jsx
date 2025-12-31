import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; 
import Home from './pages/Home';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import ForgotPassword from './pages/ForgotPassword'; 

// Importación de Sonner
import { Toaster } from 'sonner';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import UserLayout from './layouts/UserLayout';

// Usuario Pages
import UserDashboardPage from './pages/user/Dashboard'; 
import AvailableQuinielas from './pages/user/AvailableQuinielas';
import PlayQuiniela from './pages/user/PlayQuiniela'; 
import UserHistory from './pages/user/UserHistory';   
import UserProfile from './pages/user/UserProfile';   
import Leaderboard from './pages/user/Leaderboard';

// Admin Pages
import AdminDashboardPage from './pages/admin/Dashboard';
import CreateQuiniela from './pages/admin/CreateQuiniela';
import ManageQuinielas from './pages/admin/ManageQuinielas'; 
import UserManagement from './pages/admin/UserManagement';

// Submódulos de quiniela
import QuinielaDetail from './pages/admin/quinielas/QuinielaDetail';
import ResultsManager from './pages/admin/quinielas/ResultsManager';
import ParticipantsManager from './pages/admin/quinielas/ParticipantsManager';

import ProtectedRoute from './components/ProtectedRoute'; 

function App() {
    return (
        <div className="App">
            <Toaster position="top-right" richColors closeButton />

            <Routes>
                {/* 1. RUTAS PÚBLICAS */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* 2. RUTAS DE USUARIO */}
                <Route element={<ProtectedRoute requiredRole="user" />}>
                    <Route element={<UserLayout />}>
                        <Route path="/dashboard/user" element={<UserDashboardPage />} />
                        <Route path="/dashboard/user/available-quinielas" element={<AvailableQuinielas />} /> 
                        <Route path="/dashboard/user/play/:quinielaId" element={<PlayQuiniela />} />
                        <Route path="/dashboard/user/history" element={<UserHistory />} />
                        <Route path="/dashboard/user/profile" element={<UserProfile />} />
                        <Route path="/dashboard/user/leaderboard/:quinielaId" element={<Leaderboard />} />
                    </Route>
                </Route>

                {/* 3. RUTAS DE ADMIN */}
                <Route element={<ProtectedRoute requiredRole="admin" />}>
                    <Route element={<AdminLayout />}>
                        <Route path="/dashboard/admin" element={<AdminDashboardPage />} />
                        <Route path="/dashboard/admin/users" element={<UserManagement />} /> 
                        
                        {/* Creación */}
                        <Route path="/dashboard/admin/create" element={<CreateQuiniela />} />

                        {/* Módulo de Gestión de Quinielas */}
                        <Route path="/dashboard/admin/quinielas" element={<ManageQuinielas />} />
                        
                        {/* Detalle y Submódulos */}
                        <Route path="/dashboard/admin/quinielas/:id" element={<QuinielaDetail />} />
                        <Route path="/dashboard/admin/quinielas/:id/results" element={<ResultsManager />} />
                        <Route path="/dashboard/admin/quinielas/:id/participants" element={<ParticipantsManager />} />
                        
                        {/* [NUEVO] Ruta para que el Admin vea el Leaderboard */}
                        <Route path="/dashboard/admin/quinielas/:id/leaderboard" element={<Leaderboard />} />

                        {/* Redirección de compatibilidad */}
                        <Route path="/dashboard/admin/manage" element={<Navigate to="/dashboard/admin/quinielas" replace />} />
                    </Route>
                </Route>
                
                {/* 4. CATCH ALL */}
                <Route path="*" element={<Home />} /> 
            </Routes>
        </div>
    );
}

export default App;