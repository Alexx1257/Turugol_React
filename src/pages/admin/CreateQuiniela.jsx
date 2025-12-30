import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '../../firebase/config'; 
import { doc, setDoc, getDoc, deleteDoc, collection } from 'firebase/firestore'; 
import { fetchFromApi } from '../../services/footballApi';

// Componentes divididos
import LeagueSelector from './create-quiniela/LeagueSelector';
import QuinielaConfig from './create-quiniela/QuinielaConfig';
import FixturePicker from './create-quiniela/FixturePicker';
import QuinielaSummary from './create-quiniela/QuinielaSummary';

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

    // --- FUNCIONES LIGAS ---
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
            const earliestMatchTimestamp = Math.min(...selectedFixtures.map(f => new Date(f.fixture.date).getTime()));
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
                } catch (error) { setSaveError("Error al autoguardar"); }
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
                if (allRoundsData.response) setAvailableRounds(allRoundsData.response);
                const currentRoundData = await fetchFromApi('fixtures/rounds', `?league=${selectedLeagueId}&season=${SEASON_YEAR}&current=true`);
                if (currentRoundData.response && currentRoundData.response.length > 0) {
                    setSelectedRound(currentRoundData.response[0]);
                } else if (allRoundsData.response && allRoundsData.response.length > 0) {
                    setSelectedRound(allRoundsData.response[allRoundsData.response.length - 1]);
                }
            } catch (error) { toast.error("Error cargando jornadas"); }
            finally { setIsLoadingRounds(false); }
        };
        if (!initialLoadRef.current) fetchRoundsForLeague();
    }, [selectedLeagueId]);

    const fetchFixtures = useCallback(async (leagueId, roundName) => {
        if (!leagueId || !roundName) return;
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
    };

    const handleLeagueClick = (leagueId) => {
        if (leagueId !== selectedLeagueId) {
            setSelectedLeagueId(leagueId); setSelectedRound(''); setApiFixtures([]); 
        }
    };
    
    const handleRoundChange = (e) => {
        setSelectedRound(e.target.value); setApiFixtures([]); 
    };

    const toggleFixtureSelection = (fixtureData) => {
        setSelectedFixtures(prev => {
            const isSelected = prev.some(f => f.fixture.id === fixtureData.fixture.id);
            if (isSelected) return prev.filter(f => f.fixture.id !== fixtureData.fixture.id);
            if (prev.length < MAX_FIXTURES) {
                const league = leagues.find(l => l.id === selectedLeagueId);
                return [...prev, { 
                    ...fixtureData, 
                    league: { id: selectedLeagueId, name: league.name, nameShort: league.nameShort, round: fixtureData.league.round }
                }];
            }
            toast.warning('Límite alcanzado', { description: `Máximo ${MAX_FIXTURES} partidos.` });
            return prev;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentAdminId || deadlineError) return;
        isSubmittingRef.current = true;
        const quinielaPayload = {
            metadata: { title, description, deadline, createdBy: currentAdminId, createdAt: new Date().toISOString(), status: 'open' },
            fixtures: selectedFixtures.map(f => ({
                id: f.fixture.id, leagueId: f.league.id, leagueName: f.league.name, round: f.league.round, homeTeam: f.teams.home.name, 
                awayTeam: f.teams.away.name, homeLogo: f.teams.home.logo, awayLogo: f.teams.away.logo, matchDate: f.fixture.date, result: null 
            })),
        };
        const createPromise = async () => {
            await saveFinalQuiniela(quinielaPayload);
            await deleteDraftFromFirebase(currentAdminId);
            setTitle(''); setDescription(''); setDeadline(''); setSelectedRound(''); setSelectedFixtures([]);
            initialLoadRef.current = true;
        };
        toast.promise(createPromise(), {
            loading: 'Publicando quiniela...', success: '¡Quiniela creada con éxito!', error: 'Error al guardar.',
            finally: () => { isSubmittingRef.current = false; initialLoadRef.current = false; }
        });
    };

    const filteredFixtures = apiFixtures.filter(f => {
        const matchesSearch = f.teams.home.name.toLowerCase().includes(searchTerm.toLowerCase()) || f.teams.away.name.toLowerCase().includes(searchTerm.toLowerCase());
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
                    <LeagueSelector 
                        leagues={leagues} isManagingLeagues={isManagingLeagues} setIsManagingLeagues={setIsManagingLeagues}
                        isSearchingLeagues={isSearchingLeagues} apiLeaguesResults={apiLeaguesResults}
                        searchApiLeague={searchApiLeague} setSearchApiLeague={setSearchApiLeague}
                        addLeague={addLeague} removeLeague={removeLeague} handleLeagueClick={handleLeagueClick}
                        selectedLeagueId={selectedLeagueId}
                    />
                    <QuinielaConfig 
                        title={title} deadline={deadline} description={description} 
                        handleInputChange={handleInputChange} deadlineError={deadlineError}
                        MAX_DESCRIPTION_CHARS={MAX_DESCRIPTION_CHARS}
                    />
                    <FixturePicker 
                        isLoading={isLoading} filteredFixtures={filteredFixtures} selectedFixtures={selectedFixtures}
                        toggleFixtureSelection={toggleFixtureSelection} selectedRound={selectedRound}
                        handleRoundChange={handleRoundChange} isLoadingRounds={isLoadingRounds}
                        availableRounds={availableRounds} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                    />
                </div>

                <div className="xl:w-1/3">
                    <QuinielaSummary 
                        selectedFixtures={selectedFixtures} toggleFixtureSelection={toggleFixtureSelection}
                        isReadyToSubmit={isReadyToSubmit} isSubmitting={isSubmittingRef.current}
                        MAX_FIXTURES={MAX_FIXTURES}
                    />
                </div>
            </form>
        </div>
    );
};

export default CreateQuiniela;