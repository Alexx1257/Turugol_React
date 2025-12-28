import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../../firebase/config';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

// Componente reutilizable para las tarjetas de estadísticas
const StatCard = ({ title, value, icon, color, trend }) => {
  const colorClasses = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
  };

  const textColors = {
    emerald: 'text-emerald-900',
    yellow: 'text-yellow-900',
    blue: 'text-blue-900',
    purple: 'text-purple-900',
  };

  return (
    <div className={`p-6 rounded-xl border shadow-sm transition-transform hover:scale-105 ${colorClasses[color]}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium opacity-80 mb-1">{title}</p>
          <h3 className={`text-3xl font-bold ${textColors[color]}`}>{value}</h3>
        </div>
        <div className={`p-2 rounded-lg bg-white bg-opacity-40`}>
            <i className={`${icon} text-xl`}></i>
        </div>
      </div>
      {trend && (
        <p className="text-xs mt-3 font-medium flex items-center">
          <span className="bg-white bg-opacity-50 px-2 py-0.5 rounded text-current">
            {trend}
          </span>
        </p>
      )}
    </div>
  );
};

const UserDashboardPage = () => {
  const [stats, setStats] = useState({
    activeQuinielasCount: 0,
    totalPoints: 0,
    quinielasPlayed: 0,
    nextDeadline: null,
    nextDeadlineTitle: ''
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchUserData = async () => {
        if (!user) return;

        try {
            // ---------------------------------------------------------
            // 1. OBTENER PARTICIPACIONES (Lógica Robusta "Todoterreno")
            // ---------------------------------------------------------
            
            // Paso A: Traer TODO sin ordenar en base de datos para evitar errores de índices
            const partRef = collection(db, 'userEntries');
            const q = query(partRef, where('userId', '==', user.uid));
            const partSnap = await getDocs(q);
            
            // Paso B: Procesar datos en memoria
            let allEntries = [];
            let points = 0;
            let activeCount = 0;

            partSnap.forEach(doc => {
                const data = doc.data();
                
                // DETECCIÓN INTELIGENTE DE FECHA:
                // Busca 'createdAt', si no existe busca 'submittedAt', si no usa fecha actual.
                const fechaReal = data.createdAt || data.submittedAt || new Date().toISOString();

                // Sumar puntos
                points += (data.puntos || 0);
                
                // Contar activas (Si no está finalizada, cuenta como activa)
                if (data.status !== 'finalized') {
                    activeCount++;
                }

                // Guardamos la entrada con una propiedad extra 'displayDate' para facilitar el uso
                allEntries.push({ 
                    id: doc.id, 
                    ...data,
                    displayDate: fechaReal 
                });
            });

            // Paso C: Ordenar en Javascript (Del más reciente al más antiguo)
            allEntries.sort((a, b) => {
                const dateA = new Date(a.displayDate);
                const dateB = new Date(b.displayDate);
                return dateB - dateA; 
            });

            // Paso D: Extraer las 3 más recientes para el historial visual
            const history = allEntries.slice(0, 3);

            // ---------------------------------------------------------
            // 2. OBTENER PRÓXIMO CIERRE (Lógica estándar)
            // ---------------------------------------------------------
            const quinielasRef = collection(db, 'quinielas');
            const nowStr = new Date().toISOString();
            const qDeadline = query(quinielasRef, where('metadata.deadline', '>', nowStr), orderBy('metadata.deadline', 'asc'), limit(1));
            const deadlineSnap = await getDocs(qDeadline);
            
            let nextDate = null;
            let nextTitle = 'No hay quinielas';

            if (!deadlineSnap.empty) {
                const qData = deadlineSnap.docs[0].data();
                nextDate = new Date(qData.metadata.deadline);
                nextTitle = qData.metadata.title;
            }

            // Actualizar Estado
            setStats({
                activeQuinielasCount: activeCount,
                totalPoints: points,
                quinielasPlayed: partSnap.size,
                nextDeadline: nextDate,
                nextDeadlineTitle: nextTitle
            });

            setRecentActivity(history);

        } catch (error) {
            console.error("Error cargando dashboard usuario:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchUserData();
  }, [user]);

  const getTimeRemaining = (date) => {
      if (!date) return 'Sin pendientes';
      const diff = date - new Date();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours < 24) return `${hours} horas restantes`;
      const days = Math.floor(hours / 24);
      return `${days} días restantes`;
  };

  return (
    <>
      {/* 1. Header de Bienvenida con Gradiente */}
      <div className="mb-8 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">¡Hola, {user?.displayName?.split(' ')[0] || 'Jugador'}! 👋</h1>
            <p className="text-emerald-100 opacity-90 text-lg">
                Tienes <span className="font-bold text-white">{stats.activeQuinielasCount} quinielas</span> activas en este momento.
            </p>
            <div className="mt-6 flex gap-3">
                <Link to="/dashboard/user/available-quinielas" className="bg-white text-emerald-700 px-5 py-2 rounded-lg font-bold shadow hover:bg-emerald-50 transition-colors">
                    <i className="fas fa-plus-circle mr-2"></i>Nueva Quiniela
                </Link>
                <Link to="/dashboard/user/history" className="bg-emerald-700 bg-opacity-40 text-white border border-emerald-400 px-5 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                    Ver Historial
                </Link>
            </div>
        </div>
        <i className="fas fa-futbol absolute -right-4 -bottom-8 text-9xl opacity-10 rotate-12"></i>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Cargando tus estadísticas...</div>
      ) : (
        <>
            {/* 2. Grid de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard 
                    title="Quinielas Jugadas" 
                    value={stats.quinielasPlayed} 
                    color="emerald" 
                    icon="fas fa-ticket-alt"
                />
                <StatCard 
                    title="Puntos Totales" 
                    value={stats.totalPoints} 
                    color="yellow" 
                    icon="fas fa-star"
                    trend="Acumulados"
                />
                <StatCard 
                    title="En Juego" 
                    value={stats.activeQuinielasCount} 
                    color="blue" 
                    icon="fas fa-running"
                    trend="Esperando resultados"
                />
                <StatCard 
                    title="Próximo Cierre" 
                    value={stats.nextDeadline ? stats.nextDeadline.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'} 
                    color="purple" 
                    icon="fas fa-clock"
                    trend={stats.nextDeadline ? getTimeRemaining(stats.nextDeadline) : 'Sin eventos'}
                />
            </div>

            {/* 3. Sección Dividida: Actividad Reciente */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800">Actividad Reciente</h3>
                        <Link to="/dashboard/user/history" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">Ver todo</Link>
                    </div>
                    
                    <div className="space-y-4">
                        {recentActivity.length === 0 ? (
                            <p className="text-gray-400 text-center py-4">No hay actividad reciente.</p>
                        ) : (
                            recentActivity.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-50 last:border-0">
                                    <div className="flex items-center space-x-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${item.status === 'finalized' ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                                            <i className="fas fa-futbol"></i>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800">{item.quinielaName}</p>
                                            <p className="text-xs text-gray-500">
                                                {/* Usamos displayDate que calculamos arriba para asegurar compatibilidad */}
                                                {new Date(item.displayDate).toLocaleDateString()} • {item.status === 'finalized' ? 'Finalizado' : 'Pendiente'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${item.status === 'finalized' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {item.status === 'finalized' ? `${item.puntos} Pts` : 'En Juego'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
                    <h3 className="text-indigo-900 font-bold mb-3">¿Sabías que?</h3>
                    <p className="text-indigo-700 text-sm mb-4">
                        Puedes consultar la tabla de posiciones (Leaderboard) de cada quiniela desde tu historial para ver cómo vas contra otros jugadores.
                    </p>
                    <Link to="/dashboard/user/history" className="text-sm font-bold text-indigo-600 hover:underline">Ir al Ranking &rarr;</Link>
                </div>
            </div>
        </>
      )}
    </>
  );
};

export default UserDashboardPage;