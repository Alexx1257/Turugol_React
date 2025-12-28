import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

const StatCard = ({ title, value, icon, color, subtext, loading }) => {

    const safeColor = color || "text-gray-500 bg-gray-500";
    const textColorClass = safeColor.split(' ').find(cls => cls.startsWith('text-')) || "text-gray-500";

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-gray-800">{loading ? '-' : value}</h3>
                {subtext && (
                    <p className={`text-xs mt-2 font-semibold ${textColorClass}`}>
                        {subtext}
                    </p>
                )}
            </div>
            <div className={`p-3 rounded-lg ${safeColor} bg-opacity-10 text-xl`}>
                <i className={icon}></i>
            </div>
        </div>
    );
};

const AdminDashboardPage = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeQuinielas: 0,
        nextDeadline: null
    });
    const [recentQuinielas, setRecentQuinielas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const usersSnap = await getDocs(collection(db, 'users'));
                const totalUsers = usersSnap.size;

                const qQuinielas = query(
                    collection(db, 'quinielas'), 
                    orderBy('metadata.createdAt', 'desc'), 
                    limit(10) 
                );
                const quinielasSnap = await getDocs(qQuinielas);
                const quinielasData = quinielasSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                const now = new Date();
                
                const active = quinielasData.filter(q => 
                    q.metadata?.deadline && new Date(q.metadata.deadline) > now
                );
                
                const deadlines = active
                    .map(q => new Date(q.metadata.deadline))
                    .sort((a,b) => a - b);
                
                const nextDeadline = deadlines.length > 0 ? deadlines[0] : null;

                setStats({
                    totalUsers,
                    activeQuinielas: active.length,
                    nextDeadline
                });
                
                setRecentQuinielas(quinielasData.slice(0, 5));

            } catch (error) {
                console.error("Error cargando dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const handleShareWhatsApp = (quiniela) => {
        
        const link = `${window.location.origin}/dashboard/user/play/${quiniela.id}`;
        const message = `¡Hola! Te invito a participar en la quiniela "${quiniela.metadata?.title || 'TuruGol'}". ⚽🏆\n\nIngresa tus pronósticos aquí: ${link}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleCopyLink = (id) => {
        const link = `${window.location.origin}/dashboard/user/play/${id}`;
        navigator.clipboard.writeText(link)
            .then(() => alert('¡Enlace copiado al portapapeles!'))
            .catch(err => console.error('Error al copiar:', err));
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Panel de Control</h2>
                    <p className="text-gray-500">Bienvenido de nuevo, Administrador.</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/dashboard/admin/create" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center">
                        <i className="fas fa-plus mr-2"></i> Nueva Quiniela
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title="Quinielas Activas"
                    value={stats.activeQuinielas}
                    icon="fas fa-clock"
                    color="text-green-600 bg-green-600"
                    subtext="Disponibles para jugar"
                    loading={loading}
                />
                <StatCard 
                    title="Usuarios Registrados"
                    value={stats.totalUsers}
                    icon="fas fa-users"
                    color="text-blue-600 bg-blue-600"
                    subtext="Comunidad total"
                    loading={loading}
                />
                <StatCard 
                    title="Próximo Cierre"
                    value={stats.nextDeadline ? stats.nextDeadline.toLocaleDateString() : 'N/A'}
                    icon="fas fa-calendar-day"
                    color="text-orange-600 bg-orange-600"
                    subtext={stats.nextDeadline ? stats.nextDeadline.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Sin pendientes'}
                    loading={loading}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Actividad Reciente</h3>
                        <Link to="/dashboard/admin/manage" className="text-sm text-blue-600 hover:text-blue-800 font-medium">Ver todas</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Título</th>
                                    <th className="px-6 py-3">Estado</th>
                                    <th className="px-6 py-3">Fecha Cierre</th>
                                    <th className="px-6 py-3 text-center">Compartir</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="4" className="p-4 text-center text-gray-400">Cargando datos...</td></tr>
                                ) : recentQuinielas.length === 0 ? (
                                    <tr><td colSpan="4" className="p-4 text-center text-gray-400">No hay quinielas creadas.</td></tr>
                                ) : (
                                    recentQuinielas.map(quiniela => {
                                        const deadline = quiniela.metadata?.deadline ? new Date(quiniela.metadata.deadline) : new Date();
                                        const isOpen = new Date() < deadline;
                                        return (
                                            <tr key={quiniela.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-xs">
                                                    {quiniela.metadata?.title || "Sin título"}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {isOpen ? 'ABIERTA' : 'CERRADA'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">
                                                    {deadline.toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 flex justify-center gap-2">
                                                    <button 
                                                        onClick={() => handleShareWhatsApp(quiniela)}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Compartir por WhatsApp"
                                                    >
                                                        <i className="fab fa-whatsapp text-lg"></i>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleCopyLink(quiniela.id)}
                                                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                                        title="Copiar enlace"
                                                    >
                                                        <i className="fas fa-link text-lg"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-fit">
                    <h3 className="font-bold text-gray-800 mb-4">Acciones Rápidas</h3>
                    <div className="space-y-3">
                        <Link to="/dashboard/admin/create" className="block w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-all group">
                            <div className="flex items-center">
                                <div className="bg-blue-100 text-blue-600 p-2 rounded-md mr-3 group-hover:bg-blue-200 transition-colors">
                                    <i className="fas fa-plus"></i>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-700 text-sm">Crear Quiniela</p>
                                    <p className="text-xs text-gray-500">Configurar nuevos partidos</p>
                                </div>
                            </div>
                        </Link>

                        <Link to="/dashboard/admin/manage" className="block w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-200 transition-all group">
                            <div className="flex items-center">
                                <div className="bg-purple-100 text-purple-600 p-2 rounded-md mr-3 group-hover:bg-purple-200 transition-colors">
                                    <i className="fas fa-edit"></i>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-700 text-sm">Ingresar Resultados</p>
                                    <p className="text-xs text-gray-500">Cerrar marcadores y jornadas</p>
                                </div>
                            </div>
                        </Link>

                        <Link to="/dashboard/admin/users" className="block w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-orange-50 hover:border-orange-200 transition-all group">
                            <div className="flex items-center">
                                <div className="bg-orange-100 text-orange-600 p-2 rounded-md mr-3 group-hover:bg-orange-200 transition-colors">
                                    <i className="fas fa-users"></i>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-700 text-sm">Gestionar Usuarios</p>
                                    <p className="text-xs text-gray-500">Revisar roles y bloqueos</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardPage;