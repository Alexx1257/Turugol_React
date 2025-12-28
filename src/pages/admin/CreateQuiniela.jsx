import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '../../firebase/config'; 
import { doc, setDoc, getDoc, deleteDoc, collection } from 'firebase/firestore'; 
import { fetchFromApi } from '../../services/footballApi';

const QUINIELA_BORRADORES_COLLECTION = "quinielaBorradores";
const QUINIELAS_FINAL_COLLECTION = "quinielas";

const SEASON_YEAR = 2025; 
const MAX_FIXTURES = 9;
const MAX_DESCRIPTION_CHARS = 200;

const DUMMY_LEAGUES = [
    { id: 2, name: 'UEFA Champions League', nameShort: 'CHAMPIONS', logo: 'https://media.api-sports.io/football/leagues/2.png' },
    { id: 13, name: 'Copa Libertadores', nameShort: 'LIBERTADORES', logo: 'https://media.api-sports.io/football/leagues/13.png' },
    { id: 39, name: 'Premier League', nameShort: 'PREMIER', logo: 'https://media.api-sports.io/football/leagues/39.png' },
    { id: 140, name: 'LaLiga', nameShort: 'LALIGA', logo: 'https://media.api-sports.io/football/leagues/140.png' },
    { id: 135, name: 'Serie A', nameShort: 'SERIE A', logo: 'https://media.api-sports.io/football/leagues/135.png' },
    { id: 78, name: 'Bundesliga', nameShort: 'BUNDESLIGA', logo: 'https://media.api-sports.io/football/leagues/78.png' },
    { id: 61, name: 'Ligue 1', nameShort: 'LIGUE 1', logo: 'https://media.api-sports.io/football/leagues/61.png' },
    { id: 262, name: 'Liga MX', nameShort: 'LIGA MX', logo: 'https://media.api-sports.io/football/leagues/262.png' },
    { id: 253, name: 'Major League Soccer', nameShort: 'MLS', logo: 'https://media.api-sports.io/football/leagues/253.png' },
    { id: 128, name: 'Liga Profesional Argentina', nameShort: 'ARGENTINA', logo: 'https://media.api-sports.io/football/leagues/128.png' },
    { id: 71, name: 'Brasileirão Série A', nameShort: 'BRASIL', logo: 'https://media.api-sports.io/football/leagues/71.png' },
];


const CreateQuiniela = () => {
    const user = auth.currentUser; 
    const currentAdminId = user ? user.uid : null; 

    // --- ESTADOS ---
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [deadline, setDeadline] = useState(''); 
    const [selectedLeagueId, setSelectedLeagueId] = useState(DUMMY_LEAGUES[0].id);
    const [selectedRound, setSelectedRound] = useState(''); 
    
    const [availableRounds, setAvailableRounds] = useState([]); 
    const [isLoadingRounds, setIsLoadingRounds] = useState(false);
    
    const [apiFixtures, setApiFixtures] = useState([]); 
    const [searchTerm, setSearchTerm] = useState(''); 
    const [selectedFixtures, setSelectedFixtures] = useState([]); 
    
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [isSaving, setIsSaving] = useState(false); 
    const [saveError, setSaveError] = useState(null); 
    const [deadlineError, setDeadlineError] = useState('');

    const initialLoadRef = useRef(true); 
    const isSubmittingRef = useRef(false);

    // --- FUNCIONES FIREBASE ---
    const getBorradorRef = (uid) => doc(db, QUINIELA_BORRADORES_COLLECTION, uid);

    const saveDraftToFirebase = async (data, uid) => {
        if (!uid) throw new Error("UID requerido");
        await setDoc(getBorradorRef(uid), data);
    };

    const loadDraftFromFirebase = async (uid) => {
        if (!uid) return null;
        const docSnap = await getDoc(getBorradorRef(uid));
        return docSnap.exists() ? docSnap.data() : null; 
    };

    const deleteDraftFromFirebase = async (uid) => {
        if (uid) await deleteDoc(getBorradorRef(uid));
    };

    const saveFinalQuiniela = async (payload) => {
        const quinielaRef = doc(collection(db, QUINIELAS_FINAL_COLLECTION));
        await setDoc(quinielaRef, payload);
        return quinielaRef.id;
    };

    // --- EFECTOS (Lógica de negocio) ---
    
    // 1. Calcular Fecha Límite Automática
    useEffect(() => {
        if (selectedFixtures.length > 0) {
            const earliestMatchTimestamp = Math.min(
                ...selectedFixtures.map(f => new Date(f.fixture.date).getTime())
            );
            const oneHourBefore = new Date(earliestMatchTimestamp - 300000);
            const tzOffset = oneHourBefore.getTimezoneOffset() * 60000;
            const localISOTime = new Date(oneHourBefore.getTime() - tzOffset).toISOString().slice(0, 16);
            setDeadline(localISOTime);
            setDeadlineError(''); 
        }
    }, [selectedFixtures]);

    // 2. Cargar Borrador Inicial
    useEffect(() => {
        if (!currentAdminId) return; 
        const loadInitialDraft = async () => {
            try {
                const draft = await loadDraftFromFirebase(currentAdminId);
                if (draft) {
                    setTitle(draft.title || '');
                    setDescription(draft.description || '');
                    if (!draft.selectedFixtures?.length) setDeadline(draft.deadline || '');
                    setSelectedFixtures(draft.selectedFixtures || []);
                    setSelectedLeagueId(draft.selectedLeagueId || DUMMY_LEAGUES[0].id);
                    if (draft.selectedRound) setSelectedRound(draft.selectedRound);
                }
            } catch (error) {
                console.error(error);
            }
            initialLoadRef.current = false;
        };
        loadInitialDraft();
    }, [currentAdminId]); 

    // 3. Auto-guardado
    useEffect(() => {
        if (initialLoadRef.current || !currentAdminId || isSubmittingRef.current) return; 
        setIsSaving(true);
        const timer = setTimeout(async () => {
            if (isSubmittingRef.current) return;
            if (title || selectedFixtures.length > 0) {
                try {
                    await saveDraftToFirebase({
                        title, description, deadline, selectedFixtures, selectedLeagueId, selectedRound
                    }, currentAdminId); 
                } catch (error) {
                    setSaveError("Error al autoguardar");
                }
            }
            setIsSaving(false);
        }, 1500); 
        return () => clearTimeout(timer); 
    }, [title, description, deadline, selectedFixtures, selectedLeagueId, selectedRound, currentAdminId]);

    // 4. Cargar Jornadas (Rounds)
    useEffect(() => {
        const fetchRoundsForLeague = async () => {
            if (!selectedLeagueId) return;
            setIsLoadingRounds(true);
            setAvailableRounds([]); 
            
            try {
                const allRoundsData = await fetchFromApi('fixtures/rounds', `?league=${selectedLeagueId}&season=${SEASON_YEAR}`);
                if (allRoundsData.response) {
                    setAvailableRounds(allRoundsData.response);
                }

                const currentRoundData = await fetchFromApi('fixtures/rounds', `?league=${selectedLeagueId}&season=${SEASON_YEAR}&current=true`);
                if (currentRoundData.response && currentRoundData.response.length > 0) {
                    setSelectedRound(currentRoundData.response[0]);
                } else if (allRoundsData.response && allRoundsData.response.length > 0) {
                    setSelectedRound(allRoundsData.response[allRoundsData.response.length - 1]);
                }
            } catch (error) {
                console.error("Error al cargar rondas:", error);
                setApiError("Error al cargar las jornadas.");
            } finally {
                setIsLoadingRounds(false);
            }
        };

        if (!initialLoadRef.current) {
            fetchRoundsForLeague();
        }
    }, [selectedLeagueId]);

    // 5. Cargar Partidos (Fixtures)
    const fetchFixtures = useCallback(async (leagueId, roundName) => {
        if (!leagueId || !roundName) return;
        setIsLoading(true);
        setApiError(null);
        try {
            const data = await fetchFromApi('fixtures', `?league=${leagueId}&season=${SEASON_YEAR}&round=${encodeURIComponent(roundName)}&timezone=America/Mexico_City`);
            setApiFixtures(data.response || []);
        } catch (err) {
            setApiError(`Fallo al cargar partidos`);
        } finally {
            setIsLoading(false);
        }
    }, []); 

    useEffect(() => {
        if (selectedRound && selectedLeagueId) {
            fetchFixtures(selectedLeagueId, selectedRound);
        }
    }, [selectedLeagueId, selectedRound, fetchFixtures]);


    // --- HANDLERS ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'title') setTitle(value);
        if (name === 'description') {
            if (value.length <= MAX_DESCRIPTION_CHARS) setDescription(value);
        }
        if (name === 'deadline') setDeadline(value);
    };

    const handleLeagueClick = (leagueId) => {
        if (leagueId !== selectedLeagueId) {
            setSelectedLeagueId(leagueId);
            setSelectedRound('');
            setApiFixtures([]); 
        }
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
                    }
                }];
            }
            return prev; 
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentAdminId || deadlineError) return;

        isSubmittingRef.current = true;
        const quinielaPayload = {
            metadata: { 
                title, 
                description, 
                deadline, 
                createdBy: currentAdminId, 
                createdAt: new Date().toISOString(),
                status: 'open' 
            },
            fixtures: selectedFixtures.map(f => ({
                id: f.fixture.id, 
                leagueId: f.league.id, 
                leagueName: f.league.name,
                round: f.league.round, 
                homeTeam: f.teams.home.name, 
                awayTeam: f.teams.away.name, 
                homeLogo: f.teams.home.logo, 
                awayLogo: f.teams.away.logo,
                matchDate: f.fixture.date,
                result: null 
            })),
        };

        try {
            await saveFinalQuiniela(quinielaPayload);
            await deleteDraftFromFirebase(currentAdminId);
            alert(`¡Quiniela creada con éxito!`);
            initialLoadRef.current = true;
            setTitle(''); setDescription(''); setDeadline(''); setSelectedRound(''); setSelectedFixtures([]);
        } catch (error) {
            console.error(error);
            alert("Error al guardar la quiniela.");
        } finally {
            setTimeout(() => { isSubmittingRef.current = false; initialLoadRef.current = false; }, 1000);
        }
    };

    const filteredFixtures = apiFixtures.filter(f => 
        f.teams.home.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        f.teams.away.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isReadyToSubmit = title && deadline && selectedFixtures.length === MAX_FIXTURES && !deadlineError && !isLoading;

    return (
        <div className="p-4 lg:p-8 max-w-screen-2xl mx-auto w-full"> 
            
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Crear Nueva Quiniela</h2>
                    <p className="text-gray-500 mt-1">Configura el evento y selecciona los {MAX_FIXTURES} partidos.</p>
                </div>
                {isSaving && !isSubmittingRef.current && (
                    <div className="flex items-center text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                        <i className="fas fa-cloud-upload-alt mr-2"></i> Guardando borrador...
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col xl:flex-row gap-8">
                
                <div className="xl:w-2/3 space-y-8"> 
                    
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
                            Selecciona la Liga
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {DUMMY_LEAGUES.map(league => (
                                <button
                                    type="button"
                                    key={league.id}
                                    onClick={() => handleLeagueClick(league.id)}
                                    className={`relative group flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${
                                        selectedLeagueId === league.id 
                                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 ring-offset-2' 
                                        : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <img src={league.logo} alt={league.nameShort} className="h-12 object-contain mb-3 group-hover:scale-110 transition-transform" />
                                    <span className={`font-bold text-sm ${selectedLeagueId === league.id ? 'text-blue-700' : 'text-gray-600'}`}>
                                        {league.nameShort}
                                    </span>
                                    {selectedLeagueId === league.id && (
                                        <div className="absolute top-2 right-2 text-blue-500">
                                            <i className="fas fa-check-circle"></i>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
                            Configuración General
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Título del Evento</label> 
                                    <input 
                                        name="title" 
                                        type="text" 
                                        required 
                                        value={title} 
                                        onChange={handleInputChange} 
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" 
                                        placeholder="Ej: Gran Quiniela Jornada 10" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Cierre de Apuestas <span className="text-blue-500 text-xs font-normal ml-1">(Automático -1h)</span>
                                    </label> 
                                    <input 
                                        name="deadline" 
                                        type="datetime-local" 
                                        required 
                                        value={deadline} 
                                        onChange={handleInputChange} 
                                        className={`w-full px-4 py-2 border rounded-lg bg-gray-50 focus:bg-white transition-colors ${deadlineError ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`} 
                                    />
                                    {deadlineError && <p className="text-red-500 text-xs mt-1 font-bold">{deadlineError}</p>}
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-semibold text-gray-700">Descripción / Premios</label>
                                    <span className={`text-xs ${description.length >= MAX_DESCRIPTION_CHARS ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                        {description.length}/{MAX_DESCRIPTION_CHARS}
                                    </span>
                                </div>
                                <textarea 
                                    name="description" 
                                    rows="4" 
                                    value={description} 
                                    onChange={handleInputChange} 
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
                                    placeholder="Describe los premios o reglas especiales..." 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">3</span>
                                Seleccionar Partidos
                            </h3>
                            
                            <div className="flex gap-3 w-full md:w-auto">
                                <div className="relative w-full md:w-48">
                                    <select 
                                        value={selectedRound} 
                                        onChange={handleRoundChange} 
                                        disabled={isLoadingRounds || availableRounds.length === 0} 
                                        className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white text-sm"
                                    >
                                        <option value="">{isLoadingRounds ? "Cargando..." : "-- Jornada --"}</option>
                                        {availableRounds.map(round => (
                                            <option key={round} value={round}>{round}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                                        <i className="fas fa-chevron-down text-xs"></i>
                                    </div>
                                </div>
                                
                                <div className="relative w-full md:w-48">
                                    <input
                                        type="text"
                                        placeholder="Buscar equipo..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                    <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                </div>
                            </div>
                        </div>

                        <div className="min-h-[300px]">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-48 text-blue-500">
                                    <i className="fas fa-circle-notch fa-spin text-3xl mb-3"></i>
                                    <p>Cargando partidos...</p>
                                </div>
                            ) : apiError ? (
                                <div className="p-4 bg-red-50 text-red-600 rounded-lg text-center border border-red-100">
                                    <i className="fas fa-exclamation-triangle mr-2"></i> {apiError}
                                </div>
                            ) : filteredFixtures.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                    <i className="fas fa-futbol text-3xl mb-2 opacity-50"></i>
                                    <p>No hay partidos disponibles.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    {filteredFixtures.map((fixtureData) => {
                                        const fixture = fixtureData.fixture;
                                        const teams = fixtureData.teams;
                                        const date = new Date(fixture.date);
                                        const isSelected = selectedFixtures.some(f => f.fixture.id === fixture.id);
                                        
                                        return (
                                            <div 
                                                key={fixture.id} 
                                                onClick={() => toggleFixtureSelection(fixtureData)}
                                                className={`
                                                    relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group
                                                    ${isSelected 
                                                        ? 'border-green-500 bg-green-50 shadow-sm' 
                                                        : 'border-gray-100 bg-white hover:border-blue-300 hover:shadow-md'}
                                                `}
                                            >
                                                <div className="flex justify-between text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                                                    <span>{date.toLocaleDateString()}</span>
                                                    <span>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col items-center w-5/12">
                                                        <img src={teams.home.logo} alt={teams.home.name} className="w-10 h-10 object-contain mb-2 group-hover:scale-110 transition-transform" />
                                                        <span className="text-xs font-bold text-center leading-tight">{teams.home.nameShort || teams.home.name}</span>
                                                    </div>
                                                    
                                                    <span className="text-gray-300 font-black text-sm">VS</span>
                                                    
                                                    <div className="flex flex-col items-center w-5/12">
                                                        <img src={teams.away.logo} alt={teams.away.name} className="w-10 h-10 object-contain mb-2 group-hover:scale-110 transition-transform" />
                                                        <span className="text-xs font-bold text-center leading-tight">{teams.away.nameShort || teams.away.name}</span>
                                                    </div>
                                                </div>

                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm animate-bounce-in">
                                                        <i className="fas fa-check text-xs"></i>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="xl:w-1/3">
                    <div className="sticky top-6 bg-slate-900 text-white p-6 rounded-2xl shadow-2xl ring-1 ring-white/10">
                        
                        <div className="flex justify-between items-center border-b border-slate-700 pb-4 mb-4">
                            <h3 className="text-lg font-bold text-blue-400">Resumen</h3>
                            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold border ${selectedFixtures.length === MAX_FIXTURES ? 'bg-green-500 border-green-500 text-white' : 'bg-slate-800 border-slate-600 text-gray-300'}`}>
                                <span>{selectedFixtures.length} / {MAX_FIXTURES}</span>
                            </div>
                        </div>
                        
                        <div className="space-y-3 max-h-[calc(100vh-350px)] overflow-y-auto pr-2 custom-scrollbar-dark mb-6">
                            {selectedFixtures.length === 0 ? (
                                <div className="text-center py-10 text-slate-600">
                                    <i className="fas fa-clipboard-list text-4xl mb-3 opacity-50"></i>
                                    <p className="text-sm">Selecciona partidos para armar tu quiniela.</p>
                                </div>
                            ) : (
                                selectedFixtures.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date)).map((f) => (
                                    <div key={f.fixture.id} className="group relative bg-slate-800/50 hover:bg-slate-800 p-3 rounded-lg border border-slate-700 transition-colors">
                                        
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleFixtureSelection(f); }}
                                            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 z-10"
                                        >
                                            <i className="fas fa-times text-xs"></i>
                                        </button>

                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2 w-5/12 overflow-hidden">
                                                <img src={f.teams.home.logo} className="w-5 h-5 object-contain" alt="" />
                                                <span className="truncate font-medium text-slate-200">{f.teams.home.nameShort || f.teams.home.name.substring(0, 10)}</span>
                                            </div>
                                            <span className="text-slate-600 text-xs font-bold">VS</span>
                                            <div className="flex items-center justify-end gap-2 w-5/12 overflow-hidden">
                                                <span className="truncate font-medium text-slate-200 text-right">{f.teams.away.nameShort || f.teams.away.name.substring(0, 10)}</span>
                                                <img src={f.teams.away.logo} className="w-5 h-5 object-contain" alt="" />
                                            </div>
                                        </div>
                                        <div className="mt-2 text-[10px] text-center text-slate-500 font-mono">
                                            {new Date(f.fixture.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <button 
                            type="submit" 
                            disabled={!isReadyToSubmit || isSubmittingRef.current} 
                            className="w-full py-4 px-6 rounded-xl font-bold text-sm tracking-wide text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 focus:ring-4 focus:ring-blue-500/30 shadow-lg disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed transition-all transform active:scale-95"
                        >
                            {isSubmittingRef.current ? (
                                <span className="flex items-center justify-center gap-2">
                                    <i className="fas fa-spinner fa-spin"></i> CREANDO...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    CONFIRMAR QUINIELA <i className="fas fa-arrow-right"></i>
                                </span>
                            )}
                        </button>
                        
                        {!isReadyToSubmit && selectedFixtures.length > 0 && (
                            <p className="text-center text-xs text-slate-500 mt-3">
                                Completa todos los campos y selecciona {MAX_FIXTURES} partidos.
                            </p>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreateQuiniela;