// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStatusAndRole from '../hooks/useAuthStatusAndRole';

const ProtectedRoute = ({ requiredRole = null, redirectPath = '/login' }) => {
    const { user, authReady, role, loadingRole } = useAuthStatusAndRole();

    if (!authReady || loadingRole) {
        // Muestra un loader mientras Firebase Auth y el Rol se inicializan
        return <div className="text-center py-20 text-gray-600">Verificando sesión y permisos...</div>;
    }

    if (!user) {
        // Si no está autenticado, redirige al login
        return <Navigate to={redirectPath} replace />;
    }

    if (requiredRole && role !== requiredRole) {
        // Si se requiere un rol específico y el usuario no lo tiene,
        // redirigimos a la página de inicio o a una página de acceso denegado.
        const unauthorizedRedirect = role === 'admin' ? '/dashboard/admin' : '/dashboard/user';
        
        // Si intenta acceder a una ruta de admin siendo user, lo mandamos a su dashboard
        if (requiredRole === 'admin' && role === 'user') {
             return <Navigate to={unauthorizedRedirect} replace />;
        }
        
        // Caso de que sea user intentando acceder a admin
        return <Navigate to="/" replace />; 
    }

    // Si el usuario está autenticado y tiene el rol correcto (o no se requiere un rol), renderiza el contenido
    return <Outlet />;
};

export default ProtectedRoute;