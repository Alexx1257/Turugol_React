import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../../../firebase/config';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { fetchFromApi } from '../../../services/footballApi';
import { toast } from 'sonner'; 
import Swal from 'sweetalert2'; // [NUEVO] Importación de SweetAlert2

const ResultsManager = () => {
    // Se utiliza quinielaId para mantener la compatibilidad con las rutas de App.jsx
    const { quinielaId } = useParams(); 
    const navigate = useNavigate();
    
    const [quiniela, setQuiniela] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editingScores, setEditingScores] = useState({});
    const [isSyncing, setIsSyncing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        const fetchQuiniela = async () => {
            if (!quinielaId) return;

            try {
                const docRef = doc(db, 'quinielas', quinielaId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = { id: docSnap.id, ...docSnap.data() };
                    setQuiniela(data);
                    
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
                    toast.error("Quiniela no encontrada");
                    navigate('/dashboard/admin/quinielas');
                }
            } catch (error) {
                console.error("Error cargando quiniela:", error);
                toast.error("Error al cargar los datos del evento");
            } finally {
                setLoading(false);
            }
        };

        fetchQuiniela();
    }, [quinielaId, navigate]);

    const toggleLock = (fixtureId) => {
        if (!quiniela) return;

        const updatedFixtures = quiniela.fixtures.map(f => {
            if (f.id === fixtureId) {
                const newLockStatus = !f.isLocked;
                toast.info(newLockStatus ? "Partido bloqueado" : "Partido desbloqueado");
                return { 
                    ...f, 
                    isLocked: newLockStatus,
                    lockedAt: newLockStatus ? new Date().toISOString() : null
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
        const loadingToast = toast.loading("Sincronizando con la API...");

        try {
            const promises = quiniela.fixtures.map(async (fixture) => {
                if (fixture.isLocked) return { skipped: true, fixture: { id: fixture.id } };
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
                if (match.skipped) { skippedCount++; return; }

                const fixtureIndex = updatedFixturesLocal.findIndex(f => f.id === match.fixture.id);
                if (fixtureIndex !== -1) {
                     updatedFixturesLocal[fixtureIndex].status = match.fixture.status.short; 
                }

                if (['FT', 'AET', 'PEN'].includes(match.fixture.status.short)) {
                    newScores[match.fixture.id] = { home: match.goals.home, away: match.goals.away };
                    updatesCount++;
                }
            });
            
            setEditingScores(newScores);
            setQuiniela({ ...quiniela, fixtures: updatedFixturesLocal });
            
            toast.success(`Sincronización lista: ${updatesCount} partidos actualizados`, {
                id: loadingToast,
                description: skippedCount > 0 ? `${skippedCount} omitidos por candado.` : null
            });

        } catch (error) {
            toast.error("Error al conectar con la API", { id: loadingToast });
        } finally {
            setIsSyncing(false);
        }
    };

    const saveResultsAndCalculate = async () => {
        if (!quiniela) return;
        
        // [NUEVO] Integración de SweetAlert2 para la confirmación
        const result = await Swal.fire({
            title: '¿Confirmas el cálculo de puntos?',
            text: "Esta acción es irreversible y actualizará el ranking de todos los participantes.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, guardar y calcular',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        setIsProcessing(true);
        setStatusMessage("Guardando resultados...");
        const processingToast = toast.loading("Procesando puntos de usuarios...");

        try {
            const quinielaRef = doc(db, 'quinielas', quiniela.id);
            const officialOutcomes = {}; 

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

            await updateDoc(quinielaRef, { fixtures: updatedFixtures });

            const q = query(collection(db, 'userEntries'), where('quinielaId', '==', quiniela.id));
            const participationsSnapshot = await getDocs(q);

            if (participationsSnapshot.empty) {
                toast.info("Guardado, pero no se encontraron participaciones.", { id: processingToast });
                setIsProcessing(false);
                return;
            }

            const BATCH_SIZE = 400;
            let batch = writeBatch(db);
            let counter = 0;

            for (const participationDoc of participationsSnapshot.docs) {
                const data = participationDoc.data();
                let userPoints = 0;

                if (data.predictions) {
                    Object.keys(data.predictions).forEach(fixtureId => {
                        const userPick = data.predictions[fixtureId]; 
                        const actualOutcome = officialOutcomes[fixtureId];
                        if (userPick && actualOutcome) {
                            const isHit = Array.isArray(userPick) ? userPick.includes(actualOutcome) : userPick === actualOutcome;
                            if (isHit) userPoints += 1; 
                        }
                    });
                }

                batch.update(doc(db, 'userEntries', participationDoc.id), { 
                    puntos: userPoints,
                    status: 'finalized', 
                    calculatedAt: new Date().toISOString()
                });

                counter++;
                if (counter >= BATCH_SIZE) {
                    await batch.commit();
                    batch = writeBatch(db);
                    counter = 0;
                }
            }

            if (counter > 0) await batch.commit();
            
            toast.success("Resultados y puntos procesados con éxito", { id: processingToast });
            navigate(`/dashboard/admin/quinielas/${quinielaId}`);

        } catch (error) {
            console.error(error);
            toast.error("Error crítico al procesar resultados", { id: processingToast });
        } finally {
            setIsProcessing(false);
            setStatusMessage('');
        }
    };

    if (loading) return (
        <div className="p-20 text-center flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium">Cargando datos del evento...</p>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto p-4 lg:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-200 pb-4">
                <div>
                    <Link to={`/dashboard/admin/quinielas/${quinielaId}`} className="text-gray-500 hover:text-gray-800 text-sm mb-1 inline-flex items-center">
                        <i className="fas fa-arrow-left mr-2"></i> Volver al Detalle
                    </Link>
                    <h2 className="text-2xl font-bold text-gray-800">Resultados & Cálculo</h2>
                    <p className="text-sm text-gray-500">{quiniela?.metadata?.title}</p>
                </div>

                <div className="flex gap-2">
                    <button onClick={syncWithApi} disabled={isSyncing || isProcessing} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2">
                        {isSyncing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>} 
                        Sincronizar API
                    </button>
                    <button onClick={saveResultsAndCalculate} disabled={isProcessing} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 shadow-lg shadow-green-200 disabled:opacity-50 transition-all">
                        {isProcessing ? 'Procesando...' : 'Guardar y Calcular'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Marcadores Oficiales</h3>
                </div>
                
                <div className="divide-y divide-gray-100">
                    {quiniela?.fixtures?.map((fixture) => (
                        <div key={fixture.id} className={`flex flex-col md:flex-row items-center justify-between p-4 hover:bg-gray-50 transition-colors ${fixture.isLocked ? 'bg-red-50/30' : ''}`}>
                            <div className="flex items-center gap-3 w-full md:w-1/3 mb-2 md:mb-0">
                                <span className="text-sm font-semibold text-right w-full truncate text-gray-700">
                                    {fixture.homeTeam}
                                    {fixture.status && <span className="block text-[10px] text-gray-400 font-normal">{fixture.status}</span>}
                                </span>
                                <img src={fixture.homeLogo} alt="" className="w-10 h-10 object-contain" />
                            </div>

                            <div className="flex items-center gap-4 mx-4">
                                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                                    <input type="number" className="w-12 h-10 text-center font-bold text-xl outline-none" value={editingScores[fixture.id]?.home ?? ''} onChange={(e) => !fixture.isLocked && handleScoreChange(fixture.id, 'home', e.target.value)} placeholder="-" disabled={isProcessing || fixture.isLocked} />
                                    <span className="text-gray-300 font-bold">:</span>
                                    <input type="number" className="w-12 h-10 text-center font-bold text-xl outline-none" value={editingScores[fixture.id]?.away ?? ''} onChange={(e) => !fixture.isLocked && handleScoreChange(fixture.id, 'away', e.target.value)} placeholder="-" disabled={isProcessing || fixture.isLocked} />
                                </div>
                                <button onClick={() => toggleLock(fixture.id)} className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${fixture.isLocked ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-400'}`}>
                                    <i className={`fas fa-${fixture.isLocked ? 'lock' : 'unlock'}`}></i>
                                </button>
                            </div>

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