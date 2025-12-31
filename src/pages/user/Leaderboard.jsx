import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase/config';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';

const Leaderboard = () => {
    // 1. Detección ultra-flexible de ID (detecta quinielaId o id)
    const params = useParams();
    const quinielaId = params.quinielaId || params.id; 
    
    const navigate = useNavigate();
    const [leaderboard, setLeaderboard] = useState([]);
    const [quinielaInfo, setQuinielaInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const currentUser = auth.currentUser;

    useEffect(() => {
        const fetchLeaderboardData = async () => {
            // Si no hay ID en absoluto, mostrar error claro
            if (!quinielaId) {
                setError("No se detectó el identificador de la quiniela.");
                setLoading(false);
                return;
            }

            try {
                // 2. Intentar cargar info de la quiniela
                const quinielaRef = doc(db, 'quinielas', quinielaId);
                const quinielaSnap = await getDoc(quinielaRef);
                
                if (quinielaSnap.exists()) {
                    setQuinielaInfo(quinielaSnap.data());
                } else {
                    // Si no existe con ese ID, puede que sea un error de ruta
                    setError("La quiniela no existe o el ID es incorrecto.");
                    setLoading(false);
                    return;
                }

                // 3. Obtener Jugadores (CONSULTA CLAVE)
                // Verificamos que quinielaId sea un string limpio
                const entriesRef = collection(db, 'userEntries');
                const q = query(
                    entriesRef,
                    where('quinielaId', '==', String(quinielaId).trim()), 
                    orderBy('puntos', 'desc')
                );

                const snapshot = await getDocs(q);
                
                // Si el snapshot está vacío, el usuario "no aparece"
                const data = snapshot.docs.map((doc, index) => ({
                    id: doc.id,
                    rank: index + 1,
                    ...doc.data()
                }));

                setLeaderboard(data);
                setError(null);

            } catch (err) {
                console.error("Error Leaderboard:", err);
                setError("Error al conectar con la base de datos.");
            } finally {
                setLoading(false);
            }
        };

        if (quinielaId) fetchLeaderboardData();
    }, [quinielaId]);

    const getRankIcon = (rank) => {
        if (rank === 1) return <i className="fas fa-medal text-yellow-400 text-xl"></i>;
        if (rank === 2) return <i className="fas fa-medal text-gray-400 text-xl"></i>;
        if (rank === 3) return <i className="fas fa-medal text-amber-700 text-xl"></i>;
        return <span className="font-bold text-gray-500">#{rank}</span>;
    };

    if (error) {
        return (
            <div className="max-w-4xl mx-auto p-8 text-center">
                <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100">
                    <i className="fas fa-exclamation-circle text-3xl mb-3"></i>
                    <h3 className="font-bold text-lg">Error de carga</h3>
                    <p className="text-sm opacity-80">{error}</p>
                    <button onClick={() => navigate(-1)} className="mt-4 bg-red-600 text-white px-6 py-2 rounded-xl font-bold text-sm">
                        Regresar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-2 text-sm font-bold">
                        <i className="fas fa-arrow-left"></i> Volver
                    </button>
                    <h2 className="text-3xl font-bold text-gray-800">Tabla de Posiciones</h2>
                    {quinielaInfo && <p className="text-emerald-600 font-medium">{quinielaInfo.metadata.title}</p>}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">
                        <i className="fas fa-circle-notch fa-spin text-3xl mb-3"></i>
                        <p>Calculando posiciones...</p>
                    </div>
                ) : leaderboard.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <i className="fas fa-users-slash text-4xl mb-3 opacity-20"></i>
                        <p className="font-medium">No se encontraron participaciones para esta quiniela.</p>
                        <p className="text-xs mt-1 text-gray-400">Verifica si el pago fue aprobado o si ya enviaste tus pronósticos.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                                    <th className="p-4 font-bold text-center w-16">Pos</th>
                                    <th className="p-4 font-bold">Jugador</th>
                                    <th className="p-4 font-bold text-center">Puntos</th>
                                    <th className="p-4 font-bold text-center hidden md:table-cell">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {leaderboard.map((entry) => {
                                    const isMe = entry.userId === currentUser?.uid;
                                    return (
                                        <tr key={entry.id} className={`border-b border-gray-50 last:border-0 transition-colors ${isMe ? 'bg-emerald-50 font-semibold' : 'hover:bg-gray-50'}`}>
                                            <td className="p-4 text-center">{getRankIcon(entry.rank)}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${isMe ? 'bg-emerald-500' : 'bg-indigo-400'}`}>
                                                        {entry.userName?.charAt(0).toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <p className={`${isMe ? 'text-emerald-900' : 'text-gray-700'}`}>{entry.userName} {isMe && '(Tú)'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-lg font-black text-lg min-w-[3rem] ${isMe ? 'bg-emerald-200 text-emerald-900' : 'bg-gray-100 text-gray-800'}`}>
                                                    {entry.puntos || 0}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center hidden md:table-cell">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${entry.status === 'finalized' ? 'text-green-600 bg-green-50 border border-green-100' : 'text-blue-600 bg-blue-50 border border-blue-100'}`}>
                                                    {entry.status === 'finalized' ? 'Finalizado' : 'En Juego'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;