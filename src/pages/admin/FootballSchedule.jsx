import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout'; 
// Importamos el DashboardLayout para la vista de administrador

// --- CONFIGURACIÓN API-FOOTBALL ---
const INCLUDED_LEAGUE_ID = 140; 
const SEASON_YEAR = 2023; 

const SchedulePageAdmin = () => {
    // --- ESTADO ---
    const [fixtures, setFixtures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Endpoint de API-Football
    const API_URL = `/api-football/fixtures?league=${INCLUDED_LEAGUE_ID}&season=${SEASON_YEAR}&timezone=America/Mexico_City`;

    // --- EFECTO PARA OBTENER DATOS (FETCH) ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true); 
            try {
                const response = await fetch(API_URL);

                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}. Revisa la configuración del proxy/clave API.`);
                }

                const data = await response.json();
                
                if (data.errors && Object.keys(data.errors).length > 0) {
                    throw new Error(`API Error: ${JSON.stringify(data.errors)}`);
                }

                setFixtures(data.response);
                setError(null);

            } catch (err) {
                console.error("Error al obtener datos de API-Football:", err);
                setError(`Fallo al cargar los partidos: ${err.message}.`);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        
    }, [API_URL]); 

    // Función para obtener el nombre de la liga y la ronda
    const getLeagueInfo = (fixtures) => {
        if (fixtures.length === 0) return { name: 'Calendario de Partidos', round: 'N/A' };
        const league = fixtures[0].league;
        return {
            name: league.name,
            round: league.round || 'Ronda no especificada'
        }; 
    };
    
    const leagueInfo = getLeagueInfo(fixtures);

    // --- RENDERIZADO (JSX) ---
    return (
        <DashboardLayout isAdmin={true}> 
            <div className="bg-white p-6 rounded-xl shadow-md max-w-7xl mx-auto">
                
                <h2 className="text-3xl font-bold text-red-700 mb-2">
                    ⚽ {leagueInfo.name}
                </h2>
                <p className="text-xl font-semibold text-gray-800 mb-6 border-b pb-3">
                    Jornada Actual: **{leagueInfo.round}** (Temporada: {SEASON_YEAR})
                </p>
                
                {/* Bloque de Carga y Errores */}
                {loading && (
                    <div className="text-center py-12 text-red-500 font-semibold text-xl bg-white rounded-xl shadow-lg">
                        Cargando datos de partidos...
                    </div>
                )}
                
                {error && (
                    <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mb-4 shadow-lg">
                        <p className="font-bold">Error de Carga:</p>
                        <p>{error}</p>
                    </div>
                )}
                
                {!loading && !error && fixtures.length === 0 && (
                    <div className="text-center py-8 text-gray-500 italic bg-gray-50 rounded-lg">
                        No se encontraron partidos programados para esta liga/temporada.
                    </div>
                )}

                {/* Bloque de Listado de Partidos */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    
                    {fixtures.map((fixtureData) => {
                        
                        const fixture = fixtureData.fixture;
                        const teams = fixtureData.teams;
                        const league = fixtureData.league;
                        const date = new Date(fixture.date); 
                        
                        // Obtenemos la jornada específica del partido (aunque debería ser la misma que leagueInfo.round)
                        const partidoRound = league.round || 'N/A'; 
                        
                        return (
                            <div 
                                key={fixture.id} 
                                className="bg-white p-5 rounded-xl shadow-md border-l-4 border-red-500 hover:shadow-lg transition duration-300"
                            >
                                {/* Muestra la jornada o ronda en la tarjeta */}
                                <div className="text-sm font-semibold text-gray-600 mb-2">
                                    <span className="text-red-700 font-extrabold mr-2">JORNADA:</span>
                                    {partidoRound} 
                                </div>
                                
                                {/* Equipos */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2 w-5/12 justify-end">
                                        <span className="font-bold text-lg text-gray-900 truncate">{teams.home.name}</span>
                                        <img src={teams.home.logo} alt={teams.home.name} className="w-8 h-8" />
                                    </div>

                                    <span className="font-extrabold text-red-700 text-2xl mx-2">vs</span>

                                    <div className="flex items-center space-x-2 w-5/12 justify-start">
                                        <img src={teams.away.logo} alt={teams.away.name} className="w-8 h-8" />
                                        <span className="font-bold text-lg text-gray-900 truncate">{teams.away.name}</span>
                                    </div>
                                </div>
                                
                                {/* Fecha y Estado */}
                                <div className="text-center pt-3 border-t border-gray-100">
                                    <p className="font-semibold text-gray-700">
                                        🗓️ {date.toLocaleDateString()} a las {date.toLocaleTimeString()} (Hora Local)
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Estado: **{fixture.status.long}**
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
            </div>
        </DashboardLayout>
    );
};

export default SchedulePageAdmin;