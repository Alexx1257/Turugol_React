import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../../../firebase/config';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { fetchFromApi } from '../../../services/footballApi';

const ResultsManager = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // Estados principales
    const [quiniela, setQuiniela] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editingScores, setEditingScores] = useState({});
    
    // Estados de proceso
    const [isSyncing, setIsSyncing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    // 1. Cargar la Quiniela específica al montar
    useEffect(() => {
        const fetchQuiniela = async () => {
            try {
                const docRef = doc(db, 'quinielas', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = { id: docSnap.id, ...docSnap.data() };
                    setQuiniela(data);
                    
                    // Inicializar los scores locales con lo que ya existe en DB
                    const initialScores = {};
                    if (data.fixtures) {
                        data.fixtures.forEach(fixture => {
                            if (fixture.result) {
                                initialScores[fixture.id] = { 
                                    home: fixture.result.home, 
                                    away: fixture.result.away 
                                };
                            }
                        });
                    }
                    setEditingScores(initialScores);
                } else {
                    alert("Quiniela no encontrada");
                    navigate('/dashboard/admin/quinielas');
                }
            } catch (error) {
                console.error("Error cargando quiniela:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchQuiniela();
    }, [id, navigate]);

    // --- LÓGICA DE NEGOCIO (Migrada de ManageQuinielas) ---

    const toggleLock = (fixtureId) => {
        if (!quiniela) return;

        const updatedFixtures = quiniela.fixtures.map(f => {
            if (f.id === fixtureId) {
                return { 
                    ...f, 
                    isLocked: !f.isLocked,
                    lockedAt: !f.isLocked ? new Date().toISOString() : null
                };
            }
            return f;
        });

        setQuiniela({ ...quiniela, fixtures: updatedFixtures });
    };

    const handleScoreChange = (fixtureId, team, value) => {
        setEditingScores(prev => ({
            ...prev,
            [fixtureId]: { ...prev[fixtureId], [team]: value }
        }));
    };

    const determineOutcome = (homeScore, awayScore, fixtureStatus = 'FT') => {
        const INVALID_STATUSES = ['CANC', 'PST', 'SUSP', 'ABD', 'WO', 'INT']; 
        if (INVALID_STATUSES.includes(fixtureStatus)) return null;

        const h = parseInt(homeScore);
        const a = parseInt(awayScore);
        if (isNaN(h) || isNaN(a)) return null;

        const FINISHED_STATUSES = ['FT', 'AET', 'PEN'];
        if (!FINISHED_STATUSES.includes(fixtureStatus)) return null;

        if (h > a) return 'HOME';
        if (a > h) return 'AWAY';
        return 'DRAW';
    };

    const syncWithApi = async () => {
        if (!quiniela) return;
        setIsSyncing(true);
        try {
            const promises = quiniela.fixtures.map(async (fixture) => {
                // Respetar candados manuales
                if (fixture.isLocked) {
                    return { skipped: true, fixture: { id: fixture.id } };
                }

                // Llamada a tu servicio existente
                const data = await fetchFromApi('fixtures', `?id=${fixture.id}&timezone=America/Mexico_City`);
                return data.response[0]; 
            });
            
            const results = await Promise.all(promises);
            const newScores = { ...editingScores };
            let updatesCount = 0;
            let skippedCount = 0;

            const updatedFixturesLocal = [...quiniela.fixtures];

            results.forEach(match => {
                if (!match) return;

                if (match.skipped) {
                    skippedCount++;
                    return;
                }

                // Actualizar status (ej: 'FT', '1H')
                const fixtureIndex = updatedFixturesLocal.findIndex(f => f.id === match.fixture.id);
                if (fixtureIndex !== -1) {
                     updatedFixturesLocal[fixtureIndex].status = match.fixture.status.short; 
                }

                // Si terminó, actualizar goles
                if (['FT', 'AET', 'PEN'].includes(match.fixture.status.short)) {
                    newScores[match.fixture.id] = { home: match.goals.home, away: match.goals.away };
                    updatesCount++;
                }
            });
            
            setEditingScores(newScores);
            setQuiniela({ ...quiniela, fixtures: updatedFixturesLocal });

            let msg = `Sincronización completada. ${updatesCount} partidos actualizados.`;
            if (skippedCount > 0) msg += `\n🔒 ${skippedCount} partidos estaban bloqueados.`;
            alert(msg);

        } catch (error) {
            console.error("Error API:", error);
            alert("Error al conectar con la API de fútbol.");
        } finally {
            setIsSyncing(false);
        }
    };

    const saveResultsAndCalculate = async () => {
        if (!quiniela) return;
        if (!window.confirm("¿Estás seguro? Esto calculará los puntos de TODOS los participantes de esta quiniela.")) return;

        setIsProcessing(true);
        setStatusMessage("Guardando resultados del partido...");

        try {
            const quinielaRef = doc(db, 'quinielas', quiniela.id);
            const officialOutcomes = {}; 

            // 1. Preparar fixtures con resultados oficiales
            const updatedFixtures = quiniela.fixtures.map(fixture => {
                const newScore = editingScores[fixture.id];
                let updatedFixture = { ...fixture };

                if (newScore && newScore.home !== undefined && newScore.away !== undefined) {
                    const statusToCheck = fixture.status?.short || fixture.status || 'FT'; 
                    const outcome = determineOutcome(newScore.home, newScore.away, statusToCheck);

                    if (outcome) officialOutcomes[fixture.id] = outcome;
                    
                    updatedFixture = { 
                        ...updatedFixture,
                        result: { home: parseInt(newScore.home), away: parseInt(newScore.away) },
                        outcome: outcome,
                        calculatedAt: new Date().toISOString(),
                        isValid: outcome !== null
                    };
                }
                return updatedFixture;
            });

            // Actualizar la quiniela madre
            await updateDoc(quinielaRef, { 
                fixtures: updatedFixtures,
                // Opcional: Solo cerrar si todos los partidos tienen resultado, por ahora lo dejamos manual
                // status: 'closed' 
            });

            // 2. Calcular puntos de usuarios (Batch Processing)
            setStatusMessage("Obteniendo participaciones...");
            const q = query(collection(db, 'userEntries'), where('quinielaId', '==', quiniela.id));
            const participationsSnapshot = await getDocs(q);

            if (participationsSnapshot.empty) {
                alert("Resultados guardados. No hubo participantes para calcular.");
                setIsProcessing(false);
                return;
            }

            setStatusMessage(`Calculando puntos de ${participationsSnapshot.size} usuarios...`);

            const BATCH_SIZE = 400;
            let batch = writeBatch(db);
            let operationCounter = 0;
            let totalProcessed = 0;

            for (const participationDoc of participationsSnapshot.docs) {
                const data = participationDoc.data();
                let userPoints = 0;

                if (data.predictions) {
                    Object.keys(data.predictions).forEach(fixtureId => {
                        const userPick = data.predictions[fixtureId]; 
                        const actualOutcome = officialOutcomes[fixtureId];
                        // Lógica simple: Acierto directo = 1 punto
                        if (userPick && actualOutcome && userPick === actualOutcome) {
                            userPoints += 1; 
                        }
                    });
                }

                const participationRef = doc(db, 'userEntries', participationDoc.id);
                batch.update(participationRef, { 
                    puntos: userPoints,
                    status: 'finalized', 
                    calculatedAt: new Date().toISOString()
                });

                operationCounter++;
                totalProcessed++;

                if (operationCounter >= BATCH_SIZE) {
                    await batch.commit();
                    batch = writeBatch(db);
                    operationCounter = 0;
                    setStatusMessage(`Procesados ${totalProcessed} usuarios...`);
                }
            }

            if (operationCounter > 0) await batch.commit();

            alert(`¡Éxito! Resultados guardados y puntos calculados.`);
            navigate(`/dashboard/admin/quinielas/${id}`); // Volver al detalle

        } catch (error) {
            console.error("Error crítico:", error);
            alert("Hubo un error al guardar los resultados.");
        } finally {
            setIsProcessing(false);
            setStatusMessage('');
        }
    };

    if (loading) return <div className="p-10 text-center">Cargando datos del evento...</div>;

    return (
        <div className="max-w-5xl mx-auto p-4 lg:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-200 pb-4">
                <div>
                    <Link to={`/dashboard/admin/quinielas/${id}`} className="text-gray-500 hover:text-gray-800 text-sm mb-1 inline-flex items-center">
                        <i className="fas fa-arrow-left mr-2"></i> Volver al Detalle
                    </Link>
                    <h2 className="text-2xl font-bold text-gray-800">Resultados & Cálculo</h2>
                    <p className="text-sm text-gray-500">{quiniela?.metadata?.title}</p>
                </div>

                <div className="flex gap-2">
                    <button 
                        onClick={syncWithApi} 
                        disabled={isSyncing || isProcessing} 
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm flex items-center gap-2"
                    >
                        {isSyncing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>} 
                        Sincronizar API
                    </button>
                    
                    <button 
                        onClick={saveResultsAndCalculate} 
                        disabled={isProcessing} 
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition-all disabled:opacity-50"
                    >
                        {isProcessing ? 'Procesando...' : 'Guardar y Calcular'}
                    </button>
                </div>
            </div>

            {/* Mensaje de Estado */}
            {isProcessing && (
                <div className="mb-6 bg-blue-50 text-blue-700 px-4 py-3 rounded-xl flex items-center animate-pulse border border-blue-200">
                    <i className="fas fa-cog fa-spin mr-3 text-xl"></i>
                    <span className="font-bold">{statusMessage}</span>
                </div>
            )}

            {/* Lista de Partidos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Marcadores Oficiales</h3>
                    <span className="text-xs text-gray-500">Usa el candado <i className="fas fa-lock"></i> para proteger ediciones manuales de la API.</span>
                </div>
                
                <div className="divide-y divide-gray-100">
                    {quiniela?.fixtures?.map((fixture) => (
                        <div key={fixture.id} className={`flex flex-col md:flex-row items-center justify-between p-4 hover:bg-gray-50 transition-colors ${fixture.isLocked ? 'bg-red-50/30' : ''}`}>
                            
                            {/* Equipo Local */}
                            <div className="flex items-center gap-3 w-full md:w-1/3 mb-2 md:mb-0">
                                <span className="text-sm font-semibold text-right w-full truncate text-gray-700">
                                    {fixture.homeTeam}
                                    {fixture.status && <span className="block text-[10px] text-gray-400 font-normal">{fixture.status}</span>}
                                </span>
                                <img src={fixture.homeLogo} alt="" className="w-10 h-10 object-contain" />
                            </div>

                            {/* Marcador Central */}
                            <div className="flex items-center gap-4 mx-4">
                                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                                    <input 
                                        type="number" 
                                        className="w-12 h-10 text-center font-bold text-xl outline-none appearance-none"
                                        value={editingScores[fixture.id]?.home ?? ''}
                                        onChange={(e) => !fixture.isLocked && handleScoreChange(fixture.id, 'home', e.target.value)}
                                        placeholder="-"
                                        disabled={isProcessing || fixture.isLocked}
                                    />
                                    <span className="text-gray-300 font-bold">:</span>
                                    <input 
                                        type="number" 
                                        className="w-12 h-10 text-center font-bold text-xl outline-none appearance-none"
                                        value={editingScores[fixture.id]?.away ?? ''}
                                        onChange={(e) => !fixture.isLocked && handleScoreChange(fixture.id, 'away', e.target.value)}
                                        placeholder="-"
                                        disabled={isProcessing || fixture.isLocked}
                                    />
                                </div>

                                <button 
                                    onClick={() => toggleLock(fixture.id)}
                                    className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${fixture.isLocked ? 'bg-red-100 text-red-500 hover:bg-red-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                    title={fixture.isLocked ? "Desbloquear para editar" : "Bloquear resultado contra cambios de API"}
                                >
                                    <i className={`fas fa-${fixture.isLocked ? 'lock' : 'unlock'}`}></i>
                                </button>
                            </div>

                            {/* Equipo Visitante */}
                            <div className="flex items-center gap-3 w-full md:w-1/3 justify-end mt-2 md:mt-0">
                                <img src={fixture.awayLogo} alt="" className="w-10 h-10 object-contain" />
                                <span className="text-sm font-semibold text-left w-full truncate text-gray-700">{fixture.awayTeam}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ResultsManager;