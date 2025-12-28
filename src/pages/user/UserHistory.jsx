import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase/config';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';

const UserHistory = () => {
    const navigate = useNavigate();
    const [participaciones, setParticipaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Estados para el Modal de Detalles
    const [selectedParticipation, setSelectedParticipation] = useState(null);
    const [selectedQuinielaDetails, setSelectedQuinielaDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;

                // CORRECCIÓN: Consulta limpia usando 'createdAt' y ordenando directamente en Firestore
                const q = query(
                    collection(db, 'userEntries'), 
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc')
                );
                
                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                setParticipaciones(data);
            } catch (error) {
                console.error("Error cargando historial:", error);
                // Fallback: Si falla el índice, intentamos sin ordenamiento (solo por seguridad)
                if (error.code === 'failed-precondition') {
                    console.warn("Falta índice compuesto. Cargando sin orden y ordenando en cliente.");
                    try {
                         const qFallback = query(collection(db, 'userEntries'), where('userId', '==', auth.currentUser.uid));
                         const snapFallback = await getDocs(qFallback);
                         const dataFallback = snapFallback.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                         dataFallback.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                         setParticipaciones(dataFallback);
                    } catch(e) { console.error(e) }
                }
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const handleViewDetails = async (participation) => {
        setSelectedParticipation(participation);
        setLoadingDetails(true);
        setSelectedQuinielaDetails(null);

        try {
            const quinielaRef = doc(db, 'quinielas', participation.quinielaId);
            const quinielaSnap = await getDoc(quinielaRef);
            
            if (quinielaSnap.exists()) {
                setSelectedQuinielaDetails(quinielaSnap.data());
            } else {
                alert("No se pudieron cargar los detalles de la quiniela.");
            }
        } catch (error) {
            console.error("Error al cargar detalles:", error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const closeDetails = () => {
        setSelectedParticipation(null);
        setSelectedQuinielaDetails(null);
    };

    const translatePick = (pick) => {
        if (pick === 'HOME') return 'Local';
        if (pick === 'AWAY') return 'Visita';
        if (pick === 'DRAW') return 'Empate';
        return '-';
    };

    const getResultColor = (userPick, officialOutcome) => {
        if (!officialOutcome) return 'bg-gray-100 text-gray-500 border-gray-200';
        if (userPick === officialOutcome) return 'bg-green-100 text-green-700 border-green-200';
        return 'bg-red-50 text-red-600 border-red-100 opacity-75';
    };

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Mis Pronósticos</h2>
            <p className="text-gray-500 mb-8">Revisa tu desempeño en las jornadas pasadas.</p>

            {loading ? <div className="p-12 text-center text-gray-400">Cargando historial...</div> : participaciones.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                    <i className="fas fa-ticket-alt text-4xl text-gray-200 mb-4"></i>
                    <p className="text-gray-500 font-medium">Aún no has participado en ninguna quiniela.</p>
                    <a href="/dashboard/user/available-quinielas" className="mt-4 inline-block text-blue-600 font-bold hover:underline">Ir a jugar ahora</a>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {participaciones.map((part) => (
                        <div key={part.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-blue-50 text-blue-600 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm">
                                    Q
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    {/* Insignia Estado Juego */}
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${part.status === 'finalized' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                        {part.status === 'finalized' ? 'FINALIZADA' : 'EN JUEGO'}
                                    </span>
                                    
                                    {/* Insignia Estado PAGO */}
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${part.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                        {part.paymentStatus === 'paid' ? 'PAGADO $$' : 'PAGO PENDIENTE'}
                                    </span>
                                </div>
                            </div>
                            
                            <h3 className="font-bold text-lg text-gray-800 mb-1 truncate">{part.quinielaName}</h3>
                            <p className="text-xs text-gray-400 mb-6">Enviado: {new Date(part.createdAt).toLocaleDateString()}</p>
                            
                            <div className="flex justify-between items-end">
                                <div className="text-center">
                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Aciertos</p>
                                    <p className="text-2xl font-black text-gray-800">{part.puntos !== undefined ? part.puntos : '-'}</p>
                                </div>
                                
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => navigate(`/dashboard/user/leaderboard/${part.quinielaId}`)}
                                        className="px-3 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-1"
                                        title="Ver Ranking"
                                    >
                                        <i className="fas fa-trophy"></i>
                                    </button>
                                    <button 
                                        onClick={() => handleViewDetails(part)}
                                        className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl shadow-lg shadow-gray-200 hover:bg-black transition-transform active:scale-95"
                                    >
                                        Detalles
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedParticipation && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl animate-fade-in my-8">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Detalle de Pronósticos</h3>
                                <p className="text-sm text-gray-500">{selectedParticipation.quinielaName}</p>
                            </div>
                            <button onClick={closeDetails} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        {loadingDetails ? (
                            <div className="py-12 text-center text-gray-400">
                                <i className="fas fa-circle-notch fa-spin text-2xl mb-2"></i>
                                <p>Cargando resultados oficiales...</p>
                            </div>
                        ) : !selectedQuinielaDetails ? (
                            <div className="py-10 text-center text-red-400">Error al cargar información.</div>
                        ) : (
                            <div className="space-y-3">
                                <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
                                    <div className="col-span-5">Partido</div>
                                    <div className="col-span-3 text-center">Tu Pick</div>
                                    <div className="col-span-3 text-center">Resultado</div>
                                    <div className="col-span-1 text-center">Pts</div>
                                </div>

                                <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                                    {selectedQuinielaDetails.fixtures.map((fixture) => {
                                        const userPick = selectedParticipation.predictions[fixture.id];
                                        const officialOutcome = fixture.outcome;
                                        const isHit = userPick === officialOutcome;
                                        const statusClass = getResultColor(userPick, officialOutcome);

                                        return (
                                            <div key={fixture.id} className={`grid grid-cols-12 gap-2 items-center p-3 rounded-xl border ${statusClass}`}>
                                                <div className="col-span-5 flex flex-col justify-center">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <img src={fixture.homeLogo} className="w-4 h-4 object-contain" alt="" />
                                                        <span className={`text-xs font-bold truncate ${officialOutcome === 'HOME' ? 'text-gray-900' : 'text-gray-500'}`}>{fixture.homeTeam}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <img src={fixture.awayLogo} className="w-4 h-4 object-contain" alt="" />
                                                        <span className={`text-xs font-bold truncate ${officialOutcome === 'AWAY' ? 'text-gray-900' : 'text-gray-500'}`}>{fixture.awayTeam}</span>
                                                    </div>
                                                </div>
                                                <div className="col-span-3 flex flex-col items-center justify-center">
                                                    <span className="text-xs font-black uppercase text-gray-700">{translatePick(userPick)}</span>
                                                </div>
                                                <div className="col-span-3 flex flex-col items-center justify-center text-center">
                                                    {officialOutcome ? (
                                                        <>
                                                            <span className="text-xs font-bold text-gray-800">{translatePick(officialOutcome)}</span>
                                                            <span className="text-[10px] text-gray-500 font-mono">({fixture.result?.home ?? '-'} - {fixture.result?.away ?? '-'})</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Pendiente</span>
                                                    )}
                                                </div>
                                                <div className="col-span-1 flex items-center justify-center">
                                                    {officialOutcome ? (
                                                        isHit ? (
                                                            <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center shadow-sm"><i className="fas fa-check text-xs"></i></div>
                                                        ) : (
                                                            <div className="w-6 h-6 bg-red-400 text-white rounded-full flex items-center justify-center shadow-sm opacity-50"><i className="fas fa-times text-xs"></i></div>
                                                        )
                                                    ) : (
                                                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                            <button onClick={closeDetails} className="px-6 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 transition-colors">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserHistory;