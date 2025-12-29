import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom'; 
import useAuthStatusAndRole from '../hooks/useAuthStatusAndRole';

const ProtectedRoute = ({ requiredRole }) => {
    const { user, authReady, role, loadingRole } = useAuthStatusAndRole();
    const location = useLocation(); 

    // MODIFICACIÓN: Ahora loadingRole es más estricto, prevenimos redirecciones erróneas
    if (!authReady || loadingRole) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Solo verificamos el rol si la carga terminó (loadingRole es false arriba)
    if (requiredRole && role !== requiredRole) {
        console.warn(`Acceso denegado. Rol requerido: ${requiredRole}, Rol actual: ${role}`);
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;