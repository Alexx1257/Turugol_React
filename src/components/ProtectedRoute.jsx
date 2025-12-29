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

    // Solo verificamos el rol si la carga terminó (loadingRole es false arriba)
    // Si el rol no coincide (incluyendo si es 'guest' por logout), mandamos al Home directamente
    if (requiredRole && role !== requiredRole) {
        console.warn(`Acceso denegado. Rol requerido: ${requiredRole}, Rol actual: ${role}`);
        return <Navigate to="/" replace />;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;