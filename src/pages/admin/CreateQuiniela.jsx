// src/pages/admin/CreateQuiniela.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '../../firebase/config'; 
import { doc, setDoc, getDoc, deleteDoc, collection } from 'firebase/firestore'; 
import { fetchFromApi } from '../../services/footballApi';

// Componentes divididos
import LeagueSelector from './create-quiniela/LeagueSelector';
import FixturePicker from './create-quiniela/FixturePicker';
import QuinielaConfig from './create-quiniela/QuinielaConfig';
import QuinielaSummary from './create-quiniela/QuinielaSummary';

// [RESTAURADO] Importación de Sonner
import { toast } from 'sonner';

const QUINIELA_BORRADORES_COLLECTION = "quinielaBorradores";
const QUINIELAS_FINAL_COLLECTION = "quinielas";

const SEASON_YEAR = new Date().getFullYear(); 
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
    const [maxFixtures, setMaxFixtures] = useState(10);
    
    const [selectedLeagueId, setSelectedLeagueId] = useState(null); 
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

    const initialLoadRef = useRef(true); 
    const isSubmittingRef = useRef(false);

    // --- PERSISTENCIA CENTRALIZADA CON NOTIFICACIONES ---
    const getBorradorRef = (uid) => doc(db, QUINIELA_BORRADORES_COLLECTION, uid);

    const persistDraft = async (overrides = {}, silent = false) => {
        if (!currentAdminId || initialLoadRef.current || isSubmittingRef.current) return;

        const dataToSave = {
            title, 
            description, 
            deadline, 
            selectedFixtures, 
            selectedLeagueId, 
            selectedRound,
            leagues,
            maxFixtures,
            ...overrides
        };

        const saveAction = setDoc(getBorradorRef(currentAdminId), dataToSave);

        if (silent) {
            try { await saveAction; } catch (e) { setSaveError("Error al autoguardar"); }
        } else {
            toast.promise(saveAction, {
                loading: 'Sincronizando borrador...',
                success: 'Borrador actualizado',
                error: 'Error al guardar',
            });
        }
    };

    // --- LÓGICA DE AUTO-SET DEADLINE ---
    const autoSetDeadline = () => {
        if (selectedFixtures.length === 0) {
            toast.error("Selecciona al menos un partido primero");
            return;
        }
        const dates = selectedFixtures.map(f => new Date(f.fixture.date).getTime());
        const minDate = new Date(Math.min(...dates));
        const suggestedDate = new Date(minDate.getTime() - (60 * 60 * 1000));

        const year = suggestedDate.getFullYear();
        const month = String(suggestedDate.getMonth() + 1).padStart(2, '0');
        const day = String(suggestedDate.getDate()).padStart(2, '0');
        const hours = String(suggestedDate.getHours()).padStart(2, '0');
        const minutes = String(suggestedDate.getMinutes()).padStart(2, '0');

        const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
        setDeadline(formattedDate);
        toast.success("Hora sugerida establecida (1h antes del inicio)");
    };

    // --- LÓGICA DE LIGAS ---
    const loadLeaguesFromApi = async () => {
        const CACHE_KEY = 'api_leagues_cache';
        const CACHE_TIME_KEY = 'api_leagues_cache_time';
        const ONE_DAY = 24 * 60 * 60 * 1000;
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
        const now = new Date().getTime();

        if (cachedData && cachedTime && (now - cachedTime < ONE_DAY)) {
            setApiLeaguesResults(JSON.parse(cachedData));
            return; 
        }

        setIsSearchingLeagues(true);
        try {
            const data = await fetchFromApi('leagues', `?current=true&season=${SEASON_YEAR}`);
            const results = data.response || [];
            setApiLeaguesResults(results);
            localStorage.setItem(CACHE_KEY, JSON.stringify(results));
            localStorage.setItem(CACHE_TIME_KEY, now.toString());
        } catch (error) { toast.error('Error al cargar ligas'); }
        finally { setIsSearchingLeagues(false); }
    };

    const addLeague = (item) => {
        if (leagues.some(l => l.id === item.league.id)) return toast.warning('Ya está en la lista');
        const newLeague = {
            id: item.league.id, name: item.league.name, logo: item.league.logo,
            nameShort: item.league.name.substring(0, 12).toUpperCase(),
        };
        const updatedLeagues = [...leagues, newLeague];
        setLeagues(updatedLeagues);
        persistDraft({ leagues: updatedLeagues });
        toast.success('Liga añadida');
    };

    const removeLeague = (id) => {
        if (leagues.length <= 1) return toast.error('Mínimo una liga');
        const updatedLeagues = leagues.filter(l => l.id !== id);
        setLeagues(updatedLeagues);
        if (selectedLeagueId === id) setSelectedLeagueId(null);
        persistDraft({ leagues: updatedLeagues });
        toast.info('Liga eliminada');
    };

    useEffect(() => { if (isManagingLeagues && apiLeaguesResults.length === 0) loadLeaguesFromApi(); }, [isManagingLeagues]);

    // --- CARGA INICIAL ---
    useEffect(() => {
        if (!currentAdminId) return; 
        const loadInitialDraft = async () => {
            try {
                const docSnap = await getDoc(getBorradorRef(currentAdminId));
                if (docSnap.exists()) {
                    const d = docSnap.data();
                    setTitle(d.title || '');
                    setDescription(d.description || '');
                    setSelectedFixtures(d.selectedFixtures || []);
                    if (d.maxFixtures) setMaxFixtures(d.maxFixtures);
                    if (d.leagues) setLeagues(d.leagues);
                    setSelectedLeagueId(d.selectedLeagueId || null);
                    if (d.selectedRound) setSelectedRound(d.selectedRound);
                    if (d.deadline) setDeadline(d.deadline);
                }
            } catch (error) { console.error(error); }
            finally { initialLoadRef.current = false; }
        };
        loadInitialDraft();
    }, [currentAdminId]); 

    // Auto-guardado silencioso para campos de texto y config
    useEffect(() => {
        if (initialLoadRef.current || !currentAdminId || isSubmittingRef.current) return; 
        setIsSaving(true);
        const timer = setTimeout(async () => {
            await persistDraft({}, true); 
            setIsSaving(false);
        }, 1500); 
        return () => clearTimeout(timer); 
    }, [title, description, deadline, maxFixtures]);

    // --- LÓGICA DE RONDAS Y FIXTURES ---
    useEffect(() => {
        const fetchRoundsForLeague = async () => {
            if (!selectedLeagueId || initialLoadRef.current) return;
            setIsLoadingRounds(true);
            try {
                const allRoundsData = await fetchFromApi('fixtures/rounds', `?league=${selectedLeagueId}&season=${SEASON_YEAR}`);
                if (allRoundsData.response) setAvailableRounds(allRoundsData.response);
                const currentRoundData = await fetchFromApi('fixtures/rounds', `?league=${selectedLeagueId}&season=${SEASON_YEAR}&current=true`);
                if (currentRoundData.response?.length > 0) setSelectedRound(currentRoundData.response[0]);
            } catch (error) { toast.error("Error cargando jornadas"); }
            finally { setIsLoadingRounds(false); }
        };
        fetchRoundsForLeague();
    }, [selectedLeagueId]);

    const fetchFixtures = useCallback(async (leagueId, roundName) => {
        if (!leagueId || !roundName || initialLoadRef.current) {
            setApiFixtures([]);
            return;
        }
        setIsLoading(true); setApiError(null);
        try {
            const data = await fetchFromApi('fixtures', `?league=${leagueId}&season=${SEASON_YEAR}&round=${encodeURIComponent(roundName)}&timezone=America/Mexico_City`);
            setApiFixtures(data.response || []);
        } catch (err) { setApiError(`Fallo al cargar partidos`); }
        finally { setIsLoading(false); }
    }, []); 

    useEffect(() => {
        if (selectedRound && selectedLeagueId) fetchFixtures(selectedLeagueId, selectedRound);
    }, [selectedLeagueId, selectedRound, fetchFixtures]);

    // --- HANDLERS ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'title') setTitle(value);
        if (name === 'description' && value.length <= MAX_DESCRIPTION_CHARS) setDescription(value);
        if (name === 'deadline') setDeadline(value);
        if (name === 'maxFixtures') setMaxFixtures(Number(value));
    };

    const handleLeagueClick = (leagueId) => {
        if (leagueId !== selectedLeagueId) {
            setSelectedLeagueId(leagueId); setSelectedRound(''); setApiFixtures([]); 
            persistDraft({ selectedLeagueId: leagueId, selectedRound: '' });
        }
    };

    const toggleFixtureSelection = (fixtureData) => {
        setSelectedFixtures(prev => {
            const isSelected = prev.some(f => f.fixture.id === fixtureData.fixture.id);
            let updatedList = [];
            if (isSelected) {
                updatedList = prev.filter(f => f.fixture.id !== fixtureData.fixture.id);
            } else {
                if (prev.length < maxFixtures) {
                    const league = leagues.find(l => l.id === selectedLeagueId);
                    updatedList = [...prev, { 
                        ...fixtureData, 
                        league: { id: selectedLeagueId, name: league.name, nameShort: league.nameShort, round: fixtureData.league.round }
                    }];
                } else {
                    toast.warning('Límite alcanzado');
                    return prev;
                }
            }
            persistDraft({ selectedFixtures: updatedList }); 
            return updatedList;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentAdminId) return;
        isSubmittingRef.current = true;
        const quinielaPayload = {
            metadata: { title, description, deadline, createdBy: currentAdminId, createdAt: new Date().toISOString(), status: 'open', maxFixtures },
            fixtures: selectedFixtures.map(f => ({
                id: f.fixture.id, leagueId: f.league.id, leagueName: f.league.name, round: f.league.round, homeTeam: f.teams.home.name, 
                awayTeam: f.teams.away.name, homeLogo: f.teams.home.logo, awayLogo: f.teams.away.logo, matchDate: f.fixture.date, result: null 
            })),
        };
        const createPromise = async () => {
            await setDoc(doc(collection(db, QUINIELAS_FINAL_COLLECTION)), quinielaPayload);
            await deleteDoc(getBorradorRef(currentAdminId));
            setTitle(''); setDescription(''); setSelectedFixtures([]); setSelectedLeagueId(null); setDeadline('');
        };
        toast.promise(createPromise(), {
            loading: 'Publicando quiniela...', success: '¡Quiniela creada!', error: 'Error al guardar.',
            finally: () => { isSubmittingRef.current = false; }
        });
    };

    const filteredFixtures = apiFixtures.filter(f => {
        const matchesSearch = f.teams.home.name.toLowerCase().includes(searchTerm.toLowerCase()) || f.teams.away.name.toLowerCase().includes(searchTerm.toLowerCase());
        const isFuture = f.fixture.status.short === "NS" && new Date(f.fixture.date) > new Date();
        return matchesSearch && isFuture;
    });

    const isReadyToSubmit = title && deadline && selectedFixtures.length === maxFixtures && !isLoading;

    return (
        <div className="p-4 lg:p-8 max-w-screen-2xl mx-auto w-full"> 
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        Crear Nueva Quiniela
                        {isSaving && <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full animate-pulse">Sincronizando...</span>}
                    </h2>
                    <p className="text-gray-500 mt-1">Configura el evento y selecciona los {maxFixtures} partidos.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col xl:flex-row gap-8">
                <div className="xl:w-2/3 space-y-8"> 
                    <LeagueSelector 
                        leagues={leagues} isManagingLeagues={isManagingLeagues} setIsManagingLeagues={setIsManagingLeagues}
                        isSearchingLeagues={isSearchingLeagues} apiLeaguesResults={apiLeaguesResults}
                        searchApiLeague={searchApiLeague} setSearchApiLeague={setSearchApiLeague}
                        addLeague={addLeague} removeLeague={removeLeague} handleLeagueClick={handleLeagueClick}
                        selectedLeagueId={selectedLeagueId}
                    />
                    <QuinielaConfig 
                        title={title} deadline={deadline} description={description} maxFixtures={maxFixtures}
                        handleInputChange={handleInputChange} MAX_DESCRIPTION_CHARS={MAX_DESCRIPTION_CHARS}
                        onAutoSetDeadline={autoSetDeadline}
                    />
                    <FixturePicker 
                        isLoading={isLoading} filteredFixtures={filteredFixtures} selectedFixtures={selectedFixtures}
                        toggleFixtureSelection={toggleFixtureSelection} selectedRound={selectedRound}
                        handleRoundChange={(e) => { setSelectedRound(e.target.value); setApiFixtures([]); }} isLoadingRounds={isLoadingRounds}
                        availableRounds={availableRounds} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                    />
                </div>
                <div className="xl:w-1/3">
                    <QuinielaSummary 
                        selectedFixtures={selectedFixtures} toggleFixtureSelection={toggleFixtureSelection}
                        isReadyToSubmit={isReadyToSubmit} isSubmitting={isSubmittingRef.current}
                        MAX_FIXTURES={maxFixtures}
                    />
                </div>
            </form>
        </div>
    );
};

export default CreateQuiniela;