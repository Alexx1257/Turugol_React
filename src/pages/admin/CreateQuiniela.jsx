import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
// 🛑 Importar tu configuración de Firebase
import { db, auth } from '../../firebase/config'; 
import { doc, setDoc, getDoc, deleteDoc, collection } from 'firebase/firestore'; 


// --- CONSTANTES DE FIREBASE Y SESIÓN ---
const QUINIELA_BORRADORES_COLLECTION = "quinielaBorradores";
const QUINIELAS_FINAL_COLLECTION = "quinielas";
// ------------------------------------------

// --- CONFIGURACIÓN API-FOOTBALL ---
const API_BASE_URL = '/api-football/fixtures';
const SEASON_YEAR = 2025;
const MAX_FIXTURES = 9;

// Opciones de Pronóstico (Base de la Quiniela)
const PREDICTION_OPTIONS_BASIC = ['1', 'X', '2'];

// --- DATOS SIMULADOS ---
const DUMMY_LEAGUES = [
    { id: 140, name: 'LaLiga (España)', nameShort: 'LALIGA' },
    { id: 39, name: 'Premier League (Inglaterra)', nameShort: 'PREMIER' },
];

const DUMMY_ROUNDS = [
    'Regular Season - 1', 'Regular Season - 2', 'Regular Season - 3', 'Regular Season - 4', 
    'Regular Season - 5', 'Regular Season - 6',
];
// -----------------------------------------------------------


const CreateQuiniela = () => {
    // 🛑 OBTENEMOS EL UID REAL DEL USUARIO AUTENTICADO 🛑
    const user = auth.currentUser; 
    const currentAdminId = user ? user.uid : null; 

    // ESTADO DEL FORMULARIO
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [deadline, setDeadline] = useState(''); 
    const [selectedLeagueId, setSelectedLeagueId] = useState(DUMMY_LEAGUES[0].id);
    const [selectedRound, setSelectedRound] = useState(''); 
    const [apiFixtures, setApiFixtures] = useState([]); 
    const [selectedFixtures, setSelectedFixtures] = useState([]); 
    
    // ESTADO DE LA INTERFAZ
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [isSaving, setIsSaving] = useState(false); 
    const [saveError, setSaveError] = useState(null); 

    const initialLoadRef = useRef(true); 
    // 🛑 BLOQUEO DE SEGURIDAD PARA EVITAR RE-GUARDADO AL FINALIZAR
    const isSubmittingRef = useRef(false);

    // ----------------------------------------------------------------------------------
    // 🛑 FUNCIONES REALES DE FIREBASE (Aisladas) 🛑
    // ----------------------------------------------------------------------------------

    const getBorradorRef = (uid) => doc(db, QUINIELA_BORRADORES_COLLECTION, uid);

    const saveDraftToFirebase = async (data, uid) => {
        if (!uid) throw new Error("UID es requerido para guardar borrador.");
        const borradorRef = getBorradorRef(uid);
        await setDoc(borradorRef, data);
    };

    const loadDraftFromFirebase = async (uid) => {
        if (!uid) return null;
        const borradorRef = getBorradorRef(uid);
        const docSnap = await getDoc(borradorRef);
        return docSnap.exists() ? docSnap.data() : null; 
    };

    const deleteDraftFromFirebase = async (uid) => {
        if (!uid) throw new Error("UID es requerido para eliminar borrador.");
        const borradorRef = getBorradorRef(uid);
        await deleteDoc(borradorRef);
        console.log(`Borrador ${uid} eliminado correctamente.`);
    };

    const saveFinalQuiniela = async (payload) => {
        const quinielaRef = doc(collection(db, QUINIELAS_FINAL_COLLECTION));
        await setDoc(quinielaRef, payload);
        return quinielaRef.id;
    };
    // ----------------------------------------------------------------------------------


    // =========================================================
    // 🛑 EFECTO 1: CARGAR BORRADOR AL INICIO 
    // =========================================================
    useEffect(() => {
        if (!currentAdminId) return; 

        const loadInitialDraft = async () => {
            try {
                const draft = await loadDraftFromFirebase(currentAdminId);
                if (draft) {
                    setTitle(draft.title || '');
                    setDescription(draft.description || '');
                    setDeadline(draft.deadline || '');
                    setSelectedFixtures(draft.selectedFixtures || []);
                    setSelectedLeagueId(draft.selectedLeagueId || DUMMY_LEAGUES[0].id);
                    setSelectedRound(draft.selectedRound || ''); 
                }
            } catch (error) {
                console.error("Error al cargar el borrador:", error);
                setSaveError("Fallo al cargar borrador: " + error.message);
            }
            initialLoadRef.current = false;
        };

        loadInitialDraft();
    }, [currentAdminId]); 

    // =========================================================
    // 🛑 EFECTO 2: AUTOSAVE DEL BORRADOR (CON BLOQUEO SUBMIT)
    // =========================================================
    useEffect(() => {
        // Bloquear si: carga inicial, no hay ID o si estamos enviando la quiniela final
        if (initialLoadRef.current || !currentAdminId || isSubmittingRef.current) return; 
        
        setSaveError(null);
        setIsSaving(true);
        
        const draftData = {
            title, description, deadline, selectedFixtures, selectedLeagueId, selectedRound
        };

        const timer = setTimeout(async () => {
            // Verificación extra dentro del timer por si cambió isSubmitting durante la espera
            if (isSubmittingRef.current) {
                setIsSaving(false);
                return;
            }

            if (title || selectedFixtures.length > 0) {
                try {
                    await saveDraftToFirebase(draftData, currentAdminId); 
                    console.log(`Autosave exitoso para UID: ${currentAdminId}`);
                } catch (error) {
                    console.error("Fallo al guardar borrador:", error);
                    setSaveError(`Fallo de Autosave: ${error.message}.`);
                }
            }
            setIsSaving(false);
        }, 1500); 

        return () => clearTimeout(timer); 
    }, [title, description, deadline, selectedFixtures, selectedLeagueId, selectedRound, currentAdminId]);
    
    
    // --- MANEJADORES DE ESTADO ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'title') setTitle(value);
        if (name === 'description') setDescription(value);
        if (name === 'deadline') setDeadline(value);
    };

    const handleLeagueChange = (e) => {
        setSelectedLeagueId(parseInt(e.target.value));
        setSelectedRound(''); 
        setApiFixtures([]); 
    };
    
    const handleRoundChange = (e) => {
        setSelectedRound(e.target.value);
        setApiFixtures([]);
    };

    const toggleFixtureSelection = (fixtureData) => {
        setSelectedFixtures(prev => {
            const isSelected = prev.some(f => f.fixture.id === fixtureData.fixture.id);
            if (isSelected) {
                return prev.filter(f => f.fixture.id !== fixtureData.fixture.id);
            } else if (prev.length < MAX_FIXTURES) {
                const league = DUMMY_LEAGUES.find(l => l.id === selectedLeagueId);
                
                return [...prev, { 
                    ...fixtureData, 
                    league: { 
                        id: selectedLeagueId, 
                        name: league.name, 
                        nameShort: league.nameShort, 
                        round: fixtureData.league.round 
                    }, 
                    prediction: '' 
                }];
            }
            return prev; 
        });
    };
    
    const handlePredictionChange = (fixtureId, predictionValue) => {
        setSelectedFixtures(prev => 
            prev.map(f => 
                f.fixture.id === fixtureId 
                    ? { ...f, prediction: predictionValue } 
                    : f
            )
        );
    };

    // --- FETCH DE DATOS DE LA API ---
    const fetchFixtures = useCallback(async (leagueId, roundName) => {
        if (!leagueId || !roundName) return;
        setIsLoading(true);
        setApiError(null);
        
        const API_URL = `${API_BASE_URL}?league=${leagueId}&season=${SEASON_YEAR}&round=${encodeURIComponent(roundName)}`;

        try {
            const response = await fetch(API_URL);
            if (!response.ok) { throw new Error(`Error HTTP: ${response.status}.`); }
            const data = await response.json();
            if (data.errors && Object.keys(data.errors).length > 0) { throw new Error(`API Error: ${JSON.stringify(data.errors)}`); }
            setApiFixtures(data.response || []);
            setApiError(null);
        } catch (err) {
            console.error("Error al obtener datos de API-Football:", err);
            setApiError(`Fallo al cargar partidos: ${err.message}.`);
            setApiFixtures([]);
        } finally {
            setIsLoading(false);
        }
    }, []); 

    useEffect(() => {
        if (selectedRound) {
            fetchFixtures(selectedLeagueId, selectedRound);
        } else {
            setApiFixtures([]);
        }
    }, [selectedLeagueId, selectedRound, fetchFixtures]);


    // =========================================================
    // 🛑 SUBMIT FINAL (Lógica Corregida para Evitar Conflictos)
    // =========================================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!currentAdminId) {
            alert('Error interno: El UID del administrador no está disponible.');
            return;
        }

        const allPredictedSimple = selectedFixtures.every(f => f.prediction && f.prediction !== ''); 
        if (!title || !deadline || selectedFixtures.length !== MAX_FIXTURES || !allPredictedSimple) {
             alert('Por favor, completa todos los campos.');
            return;
        }

        // 🛑 ACTIVAR BLOQUEO DE AUTOSAVE
        isSubmittingRef.current = true;

        const quinielaPayload = {
            metadata: { 
                title, description, deadline, createdBy: currentAdminId, createdAt: new Date().toISOString() 
            },
            fixtures: selectedFixtures.map(f => ({
                id: f.fixture.id, leagueId: f.league.id, leagueName: f.league.name,
                round: f.league.round, homeTeam: f.teams.home.name, awayTeam: f.teams.away.name,
                matchDate: f.fixture.date, adminPrediction: f.prediction, 
            })),
        };

        try {
            // Guardar final y borrar borrador
            await saveFinalQuiniela(quinielaPayload);
            await deleteDraftFromFirebase(currentAdminId);

            alert(`¡Quiniela "${title}" creada con éxito!`);

            // 🛑 RESETEAR ESTADOS Y VOLVER A CARGA INICIAL PARA ENGAÑAR AL EFECTO
            initialLoadRef.current = true;
            setTitle('');
            setDescription('');
            setDeadline('');
            setSelectedRound('');
            setSelectedFixtures([]);
            setApiFixtures([]);

        } catch (error) {
            console.error(error);
            alert("Error al guardar la quiniela.");
        } finally {
            // Retrasar la liberación del bloqueo para que los efectos pendientes se cancelen
            setTimeout(() => {
                isSubmittingRef.current = false;
                initialLoadRef.current = false;
            }, 1000);
        }
    };

    const isReadyToSubmit = title && deadline && selectedFixtures.length === MAX_FIXTURES && 
                           selectedFixtures.every(f => f.prediction && f.prediction !== '') && !isLoading;


    // --- RENDERIZADO (Diseño Intacto) ---
    return (
        <DashboardLayout isAdmin={true}>
            <div className="p-6 max-w-screen-xl mx-auto w-full"> 
                <h2 className="text-3xl font-bold text-red-700 mb-8 border-b pb-3">
                    ✍️ Crear Nueva Quiniela (Máx. {MAX_FIXTURES} Partidos)
                </h2>
                
                {isSaving && !isSubmittingRef.current && (
                    <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 p-2 rounded-lg text-sm z-50">
                        Guardando borrador automáticamente...
                    </div>
                )}
                
                {saveError && (
                    <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg mb-4">
                        {saveError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6">
                    
                    <div className="lg:w-2/3 space-y-8 bg-white p-6 rounded-xl shadow-lg h-fit"> 
                        <section className="space-y-6 border-b pb-6 border-gray-200">
                            <h3 className="text-xl font-semibold text-gray-800">1. Datos Generales</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label htmlFor="title" className="block text-sm">Título</label> <input id="title" name="title" type="text" required value={title} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg" placeholder="Ej: Quiniela General" /></div>
                                <div><label htmlFor="deadline" className="block text-sm">Cierre</label> <input id="deadline" name="deadline" type="datetime-local" required value={deadline} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg" /></div>
                                <div className="md:col-span-2"><label htmlFor="description" className="block text-sm">Descripción</label> <textarea id="description" name="description" rows="2" value={description} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg" placeholder="Reglas o notas..." /></div>
                            </div>
                        </section>

                        <section className="space-y-4 border-b pb-6 border-gray-200">
                            <h3 className="text-xl font-semibold text-gray-800">2. Buscar Partidos</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="league-select" className="block text-sm">Liga</label>
                                    <select id="league-select" value={selectedLeagueId} onChange={handleLeagueChange} className="w-full px-2 py-2 border rounded-lg">
                                        {DUMMY_LEAGUES.map(league => (<option key={league.id} value={league.id}>{league.nameShort}</option>))}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label htmlFor="round-select" className="block text-sm">Jornada</label>
                                    <select id="round-select" value={selectedRound} onChange={handleRoundChange} disabled={isLoading} className="w-full px-2 py-2 border rounded-lg disabled:bg-gray-100">
                                        <option value="">-- Selecciona una Jornada --</option>
                                        {DUMMY_ROUNDS.map(round => (<option key={round} value={round}>{round}</option>))}
                                    </select>
                                </div>
                            </div>
                            {isLoading && <p className="text-center text-red-500 font-semibold mt-4">Cargando partidos de la API...</p>}
                            {apiError && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg mt-4">Error: {apiError}</div>}
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-xl font-semibold text-gray-800">3. Partidos Encontrados</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                                {apiFixtures.map((fixtureData) => {
                                    const fixture = fixtureData.fixture;
                                    const teams = fixtureData.teams;
                                    const date = new Date(fixture.date);
                                    const isSelected = selectedFixtures.some(f => f.fixture.id === fixture.id);
                                    return (
                                        <div 
                                            key={fixture.id} onClick={() => toggleFixtureSelection(fixtureData)}
                                            className={`p-4 rounded-xl shadow-sm cursor-pointer transition duration-150 border-2 
                                                        ${isSelected ? 'border-green-600 bg-green-50 ring-2 ring-green-400' : 'border-gray-100 bg-white hover:border-red-300 hover:shadow'}`}
                                        >
                                            <div className="text-sm font-semibold text-gray-700 mb-2 border-b pb-2">JORNADA: **{fixtureData.league.round || 'N/A'}**</div>
                                            <div className="flex justify-between items-center space-x-2">
                                                <div className="flex items-center justify-end w-5/12 text-right">
                                                    <span className="font-bold text-sm text-gray-900 truncate mr-1">{teams.home.nameShort || teams.home.name.split(' ')[0]}</span>
                                                    <img src={teams.home.logo} alt={teams.home.name} className="w-5 h-5" />
                                                </div>
                                                <span className="text-xs font-bold text-red-500 flex-shrink-0">VS</span>
                                                <div className="flex items-center justify-start w-5/12 text-left">
                                                    <img src={teams.away.logo} alt={teams.away.name} className="w-5 h-5" />
                                                    <span className="font-bold text-sm text-gray-900 truncate ml-1">{teams.away.nameShort || teams.away.name.split(' ')[0]}</span>
                                                </div>
                                            </div>
                                            <div className="text-center text-xs text-gray-500 mt-2 border-t pt-2 border-gray-100">
                                                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({date.toLocaleDateString()})
                                            </div>
                                            {isSelected && <div className="text-xs text-center text-green-700 font-bold mt-2 pt-2 border-t border-green-200">AÑADIDO</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>

                    <div className="lg:w-1/3 space-y-6">
                        <div className="sticky top-6 bg-white p-6 rounded-xl shadow-lg">
                            <h3 className="text-xl font-bold text-red-700">4. Quiniela Final ({selectedFixtures.length}/{MAX_FIXTURES})</h3>
                            <p className={`text-sm mt-1 mb-4 ${selectedFixtures.length === MAX_FIXTURES ? 'text-green-600' : 'text-red-500'}`}>
                                {selectedFixtures.length === MAX_FIXTURES ? '¡Completo! Asigna el pronóstico.' : `Faltan ${MAX_FIXTURES - selectedFixtures.length} partidos.`}
                            </p>
                            <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
                                {selectedFixtures.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date)).map((f, index) => (
                                    <div key={f.fixture.id} className="p-3 border border-gray-200 rounded-lg flex flex-col justify-between bg-gray-50">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="w-1/2 flex-shrink-0">
                                                <div className="font-semibold text-sm">P{index + 1}. ({f.league.nameShort})</div>
                                                <div className="text-xs text-gray-600 truncate">{f.teams.home.nameShort || f.teams.home.name.split(' ')[0]} vs {f.teams.away.nameShort || f.teams.away.name.split(' ')[0]}</div>
                                            </div>
                                        </div>
                                        <div className="flex justify-around space-x-1 pt-2 border-t border-gray-200">
                                            {PREDICTION_OPTIONS_BASIC.map(value => (
                                                <button key={value} type="button" onClick={() => handlePredictionChange(f.fixture.id, value)}
                                                    className={`w-1/3 py-1 font-bold rounded-full text-xs transition-colors duration-150 ${f.prediction === value ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                                    {value}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 pt-4 border-t border-red-200">
                                <button type="submit" disabled={!isReadyToSubmit || isSubmittingRef.current} className="w-full py-3 px-4 text-sm font-bold rounded-lg text-white bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500 transition-colors duration-300 disabled:opacity-50">
                                    {isSubmittingRef.current ? 'CREANDO...' : 'Crear Quiniela'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
};

export default CreateQuiniela;