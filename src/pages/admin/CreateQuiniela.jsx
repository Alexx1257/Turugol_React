import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '../../firebase/config'; 
import { doc, setDoc, getDoc, deleteDoc, collection } from 'firebase/firestore'; 
import { fetchFromApi } from '../../services/footballApi';

// [NUEVO] Importación exclusiva de Sonner
import { toast } from 'sonner';

const QUINIELA_BORRADORES_COLLECTION = "quinielaBorradores";
const QUINIELAS_FINAL_COLLECTION = "quinielas";

const SEASON_YEAR = 2025; 
const MAX_FIXTURES = 9;
const MAX_DESCRIPTION_CHARS = 200;

const INITIAL_LEAGUES = [
    { id: 2, name: 'UEFA Champions League', nameShort: 'CHAMPIONS', logo: 'https://media.api-sports.io/football/leagues/2.png' },
    { id: 13, name: 'Copa Libertadores', nameShort: 'LIBERTADORES', logo: 'https://media.api-sports.io/football/leagues/13.png' },
    { id: 39, name: 'Premier League', nameShort: 'PREMIER', logo: 'https://media.api-sports.io/football/leagues/39.png' },
    { id: 140, name: 'LaLiga', nameShort: 'LALIGA', logo: 'https://media.api-sports.io/football/leagues/140.png' },
    { id: 135, name: 'Serie A', nameShort: 'SERIE A', logo: 'https://media.api-sports.io/football/leagues/135.png' },
    { id: 262, name: 'Liga MX', nameShort: 'LIGA MX', logo: 'https://media.api-sports.io/football/leagues/262.png' },
];

const CreateQuiniela = () => {
    const user = auth.currentUser; 
    const currentAdminId = user ? user.uid : null; 

    // --- ESTADOS ---
    const [leagues, setLeagues] = useState(INITIAL_LEAGUES);
    const [isManagingLeagues, setIsManagingLeagues] = useState(false);
    const [apiLeaguesResults, setApiLeaguesResults] = useState([]);
    const [isSearchingLeagues, setIsSearchingLeagues] = useState(false);
    const [searchApiLeague, setSearchApiLeague] = useState('');

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [deadline, setDeadline] = useState(''); 
    const [selectedLeagueId, setSelectedLeagueId] = useState(INITIAL_LEAGUES[0].id);
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

    // --- LÓGICA DE LIGAS DESDE API ---
    const loadLeaguesFromApi = async () => {
        setIsSearchingLeagues(true);
        try {
            const data = await fetchFromApi('leagues', `?current=true&season=${SEASON_YEAR}`);
            setApiLeaguesResults(data.response || []);
        } catch (error) {
            toast.error('Error al cargar ligas');
        } finally {
            setIsSearchingLeagues(false);
        }
    };

    const addLeague = (item) => {
        if (leagues.some(l => l.id === item.league.id)) return toast.warning('Ya está en la lista');
        const newLeague = {
            id: item.league.id,
            name: item.league.name,
            nameShort: item.league.name.substring(0, 12).toUpperCase(),
            logo: item.league.logo
        };
        setLeagues(prev => [...prev, newLeague]);
        toast.success('Liga añadida');
    };

    const removeLeague = (id) => {
        if (leagues.length <= 1) return toast.error('Mínimo una liga');
        setLeagues(prev => prev.filter(l => l.id !== id));
        if (selectedLeagueId === id) setSelectedLeagueId(leagues.find(l => l.id !== id).id);
        toast.info('Liga eliminada');
    };

    useEffect(() => {
        if (isManagingLeagues && apiLeaguesResults.length === 0) loadLeaguesFromApi();
    }, [isManagingLeagues]);

    // [NUEVO] Función para agrupar ligas por país
    const groupedLeagues = apiLeaguesResults.reduce((acc, item) => {
        const country = item.country.name;
        if (!acc[country]) acc[country] = [];
        acc[country].push(item);
        return acc;
    }, {});

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

    // --- EFECTOS ---
    
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
                    if (draft.leagues) setLeagues(draft.leagues);
                    setSelectedLeagueId(draft.selectedLeagueId || INITIAL_LEAGUES[0].id);
                    if (draft.selectedRound) setSelectedRound(draft.selectedRound);
                }
            } catch (error) {
                console.error(error);
                toast.error("Error al cargar borrador");
            }
            initialLoadRef.current = false;
        };
        loadInitialDraft();
    }, [currentAdminId]); 

    useEffect(() => {
        if (initialLoadRef.current || !currentAdminId || isSubmittingRef.current) return; 
        setIsSaving(true);
        const timer = setTimeout(async () => {
            if (isSubmittingRef.current) return;
            if (title || selectedFixtures.length > 0) {
                try {
                    await saveDraftToFirebase({
                        title, description, deadline, selectedFixtures, selectedLeagueId, selectedRound, leagues
                    }, currentAdminId); 
                } catch (error) {
                    setSaveError("Error al autoguardar");
                }
            }
            setIsSaving(false);
        }, 1500); 
        return () => clearTimeout(timer); 
    }, [title, description, deadline, selectedFixtures, selectedLeagueId, selectedRound, currentAdminId, leagues]);

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
                toast.error("Error al cargar jornadas");
            } finally {
                setIsLoadingRounds(false);
            }
        };

        if (!initialLoadRef.current) {
            fetchRoundsForLeague();
        }
    }, [selectedLeagueId]);

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
                const league = leagues.find(l => l.id === selectedLeagueId);
                return [...prev, { 
                    ...fixtureData, 
                    league: { 
                        id: selectedLeagueId, 
                        name: league.name, 
                        nameShort: league.nameShort, 
                        round: fixtureData.league.round 
                    }
                }];
            } else {
                toast.warning('Límite alcanzado', { description: `Solo puedes seleccionar hasta ${MAX_FIXTURES} partidos.` });
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

        const createPromise = async () => {
            await saveFinalQuiniela(quinielaPayload);
            await deleteDraftFromFirebase(currentAdminId);
            setTitle(''); setDescription(''); setDeadline(''); setSelectedRound(''); setSelectedFixtures([]);
            initialLoadRef.current = true;
        };

        toast.promise(createPromise(), {
            loading: 'Publicando quiniela...',
            success: '¡Quiniela creada con éxito!',
            error: 'No se pudo guardar la quiniela.',
            finally: () => {
                isSubmittingRef.current = false;
                initialLoadRef.current = false;
            }
        });
    };

    const filteredFixtures = apiFixtures.filter(f => {
        const matchesSearch = f.teams.home.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             f.teams.away.name.toLowerCase().includes(searchTerm.toLowerCase());
        const isFuture = f.fixture.status.short === "NS" && new Date(f.fixture.date) > new Date();
        return matchesSearch && isFuture;
    });

    const isReadyToSubmit = title && deadline && selectedFixtures.length === MAX_FIXTURES && !deadlineError && !isLoading;

    return (
        <div className="p-4 lg:p-8 max-w-screen-2xl mx-auto w-full"> 
            
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Crear Nueva Quiniela</h2>
                    <p className="text-gray-500 mt-1">Configura el evento y selecciona los {MAX_FIXTURES} partidos.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col xl:flex-row gap-8">
                
                <div className="xl:w-2/3 space-y-8"> 
                    
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
                                Selecciona la Liga
                            </h3>
                            <button 
                                type="button" 
                                onClick={() => setIsManagingLeagues(!isManagingLeagues)}
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded transition-colors"
                            >
                                {isManagingLeagues ? 'Cerrar Gestión' : 'Gestionar Ligas'}
                            </button>
                        </div>

                        {/* PANEL DE GESTIÓN AGRUPADO POR PAÍS */}
                        {isManagingLeagues && (
                            <div className="mb-6 p-4 bg-gray-50 rounded-xl border-2 border-dashed">
                                <div className="flex gap-2 mb-6">
                                    <input 
                                        type="text" 
                                        placeholder="Filtrar por país o nombre..." 
                                        className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                        onChange={(e) => setSearchApiLeague(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {isSearchingLeagues ? <p className="text-xs text-center">Cargando ligas...</p> :
                                        Object.keys(groupedLeagues).filter(country => 
                                            country.toLowerCase().includes(searchApiLeague.toLowerCase()) || 
                                            groupedLeagues[country].some(l => l.league.name.toLowerCase().includes(searchApiLeague.toLowerCase()))
                                        ).map(country => (
                                            <div key={country}>
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b pb-1">{country}</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                    {groupedLeagues[country].filter(item => 
                                                        item.league.name.toLowerCase().includes(searchApiLeague.toLowerCase()) || country.toLowerCase().includes(searchApiLeague.toLowerCase())
                                                    ).map(item => (
                                                        <div key={item.league.id} className="flex items-center justify-between p-2 bg-white border rounded-lg shadow-sm">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <img src={item.league.logo} className="h-6 w-6 object-contain" alt="" />
                                                                <span className="text-[10px] font-bold truncate">{item.league.name}</span>
                                                            </div>
                                                            <button type="button" onClick={() => addLeague(item)} className="text-blue-500 hover:text-blue-700 transition-transform active:scale-90"><i className="fas fa-plus-circle"></i></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {leagues.map(league => (
                                <div key={league.id} className="relative group">
                                    <button
                                        type="button"
                                        onClick={() => handleLeagueClick(league.id)}
                                        className={`w-full flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${
                                            selectedLeagueId === league.id 
                                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100 shadow-sm' 
                                            : 'border-gray-100 bg-white hover:border-blue-200'
                                        }`}
                                    >
                                        <img src={league.logo} alt="" className="h-10 object-contain mb-2" />
                                        <span className={`font-black text-[10px] tracking-tighter text-center uppercase ${selectedLeagueId === league.id ? 'text-blue-700' : 'text-gray-400'}`}>
                                            {league.nameShort}
                                        </span>
                                    </button>
                                    {isManagingLeagues && (
                                        <button 
                                            type="button"
                                            onClick={() => removeLeague(league.id)}
                                            className="absolute -top-1 -right-1 bg-white text-red-500 w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-red-100"
                                        >
                                            <i className="fas fa-times text-[10px]"></i>
                                        </button>
                                    )}
                                </div>
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
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">Título del Evento</label> 
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
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">Cierre de Apuestas</label> 
                                    <input 
                                        name="deadline" 
                                        type="datetime-local" 
                                        required 
                                        value={deadline} 
                                        onChange={handleInputChange} 
                                        className={`w-full px-4 py-2 border rounded-lg bg-gray-50 focus:bg-white transition-colors ${deadlineError ? 'border-red-500' : 'border-gray-300'}`} 
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Premios / Reglas</label>
                                    <span className="text-[10px] text-gray-400 font-bold">{description.length}/{MAX_DESCRIPTION_CHARS}</span>
                                </div>
                                <textarea 
                                    name="description" 
                                    rows="4" 
                                    value={description} 
                                    onChange={handleInputChange} 
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm" 
                                    placeholder="Describe los premios..." 
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
                                <select 
                                    value={selectedRound} 
                                    onChange={handleRoundChange} 
                                    disabled={isLoadingRounds || availableRounds.length === 0} 
                                    className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-xs font-bold uppercase"
                                >
                                    <option value="">-- Jornada --</option>
                                    {availableRounds.map(round => <option key={round} value={round}>{round}</option>)}
                                </select>
                                <input
                                    type="text"
                                    placeholder="Buscar equipo..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                                />
                            </div>
                        </div>

                        <div className="min-h-[300px]">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-48 text-blue-500"><i className="fas fa-spinner fa-spin text-2xl mb-2"></i><p className="text-xs font-bold">Obteniendo partidos...</p></div>
                            ) : filteredFixtures.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl"><p className="text-xs">No hay partidos futuros disponibles.</p></div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {filteredFixtures.map((fixtureData) => {
                                        const fixture = fixtureData.fixture;
                                        const teams = fixtureData.teams;
                                        const date = new Date(fixture.date);
                                        const isSelected = selectedFixtures.some(f => f.fixture.id === fixture.id);
                                        return (
                                            <div 
                                                key={fixture.id} 
                                                onClick={() => toggleFixtureSelection(fixtureData)}
                                                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${isSelected ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-100 bg-white hover:border-blue-300 hover:shadow-md'}`}
                                            >
                                                <div className="flex justify-between text-[10px] font-black text-gray-400 mb-3 uppercase tracking-tighter">
                                                    <span>{date.toLocaleDateString()}</span>
                                                    <span>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col items-center w-5/12 overflow-hidden">
                                                        <img src={teams.home.logo} alt="" className="w-8 h-8 object-contain mb-2" />
                                                        <span className="text-[10px] font-black text-center truncate w-full">{teams.home.name}</span>
                                                    </div>
                                                    <span className="text-gray-300 font-black text-[10px]">VS</span>
                                                    <div className="flex flex-col items-center w-5/12 overflow-hidden">
                                                        <img src={teams.away.logo} alt="" className="w-8 h-8 object-contain mb-2" />
                                                        <span className="text-[10px] font-black text-center truncate w-full">{teams.away.name}</span>
                                                    </div>
                                                </div>
                                                {isSelected && <div className="absolute top-2 right-2 bg-green-500 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-sm"><i className="fas fa-check text-[10px]"></i></div>}
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
                            <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest">Resumen</h3>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-black border ${selectedFixtures.length === MAX_FIXTURES ? 'bg-green-500 border-green-500' : 'bg-slate-800 border-slate-600 text-gray-300'}`}>
                                {selectedFixtures.length} / {MAX_FIXTURES}
                            </div>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar-dark mb-6">
                            {selectedFixtures.length === 0 ? (
                                <div className="text-center py-10 text-slate-600"><p className="text-xs italic">Selecciona {MAX_FIXTURES} partidos...</p></div>
                            ) : (
                                [...selectedFixtures].sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date)).map((f) => (
                                    <div key={f.fixture.id} className="group flex items-center justify-between p-2 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                                            <img src={f.teams.home.logo} className="w-4 h-4 object-contain" alt="" />
                                            <span className="text-[10px] truncate font-bold text-slate-300">{f.teams.home.name} vs {f.teams.away.name}</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); toggleFixtureSelection(f); }} className="text-red-400 hover:text-red-300 ml-2"><i className="fas fa-times-circle text-xs"></i></button>
                                    </div>
                                ))
                            )}
                        </div>
                        <button 
                            type="submit" 
                            disabled={!isReadyToSubmit || isSubmittingRef.current} 
                            className="w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] text-white bg-blue-600 hover:bg-blue-500 shadow-lg disabled:opacity-50 transition-all active:scale-95"
                        >
                            {isSubmittingRef.current ? 'Publicando...' : 'Confirmar Quiniela'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreateQuiniela;