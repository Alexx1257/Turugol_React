import React, { useState } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';

const UserLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const links = [
        { path: '/dashboard/user', name: 'Mis Quinielas', icon: 'fas fa-list-alt' },
        { path: '/dashboard/user/available-quinielas', name: 'Jugar Quiniela', icon: 'fas fa-futbol' }, 
        { path: '/dashboard/user/profile', name: 'Mi Perfil', icon: 'fas fa-user-circle' },
        { path: '/dashboard/user/history', name: 'Historial', icon: 'fas fa-history' },
    ];

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={toggleSidebar}
                ></div>
            )}

            {/* Sidebar Usuario */}
            <div className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out
                lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex items-center justify-between h-16 px-6 bg-gray-800 border-b border-gray-700">
                    <span className="text-xl font-bold tracking-wider">
                        TURU<span className="text-emerald-400">GOL</span>
                    </span>
                    <button onClick={toggleSidebar} className="lg:hidden text-gray-400 hover:text-white">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <nav className="flex-grow py-6 px-3 overflow-y-auto">
                    <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Menú Principal
                    </p>
                    <ul className="space-y-1">
                        {links.map((link) => (
                            <li key={link.path}>
                                <Link
                                    to={link.path}
                                    onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                                        location.pathname === link.path
                                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                    }`}
                                >
                                    <i className={`${link.icon} w-6 text-center text-lg ${
                                        location.pathname === link.path ? 'text-white' : 'text-gray-500 group-hover:text-emerald-400'
                                    }`}></i>
                                    <span className="font-medium text-sm">{link.name}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
                
                <div className="p-4 border-t border-gray-800 bg-gray-900">
                    <button onClick={handleLogout} className="flex items-center justify-center space-x-2 w-full p-2.5 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-500 transition-colors border border-transparent hover:border-red-500/20">
                        <i className="fas fa-sign-out-alt"></i>
                        <span className="font-medium text-sm">Cerrar Sesión</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-grow flex flex-col min-w-0 h-full overflow-hidden">
                <header className="bg-white shadow-sm p-4 border-b border-gray-200 flex justify-between items-center lg:hidden flex-shrink-0 z-30">
                    <span className="font-bold text-gray-700">Mi Panel</span>
                    <button onClick={toggleSidebar} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg focus:outline-none">
                        <i className="fas fa-bars text-xl"></i>
                    </button>
                </header>
                
                <main className="flex-grow p-4 md:p-8 overflow-y-auto custom-scrollbar">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default UserLayout;