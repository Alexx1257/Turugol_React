import React, { useState } from 'react';
// [CORRECCIÓN] Se importa la función de traducción y los datos de países
import { countryData, translateLeagueName } from '../../../constants/countries'; 

const LeagueSelector = ({ 
    leagues, 
    isManagingLeagues, 
    setIsManagingLeagues, 
    isSearchingLeagues, 
    apiLeaguesResults, 
    searchApiLeague, 
    setSearchApiLeague, 
    addLeague, 
    removeLeague, 
    handleLeagueClick, 
    selectedLeagueId 
}) => {
    const [filterRegion, setFilterRegion] = useState('All');

    // Agrupación de ligas por país con traducción aplicada al nombre del país
    const groupedLeagues = apiLeaguesResults.reduce((acc, item) => {
        const countryEnglish = item.country.name;
        const translation = countryData[countryEnglish]?.name || countryEnglish;
        if (!acc[translation]) acc[translation] = [];
        acc[translation].push(item);
        return acc;
    }, {});

    const sortedCountries = Object.keys(groupedLeagues).sort((a, b) => a.localeCompare(b));

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
                    Selecciona la Liga
                </h3>
                <button 
                    type="button" 
                    onClick={() => setIsManagingLeagues(!isManagingLeagues)}
                    className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 transition-all flex items-center"
                >
                    <i className={`fas ${isManagingLeagues ? 'fa-check mr-2' : 'fa-plus-circle mr-2'}`}></i>
                    {isManagingLeagues ? 'Finalizar Selección' : 'Añadir Nuevas Ligas'}
                </button>
            </div>

            {isManagingLeagues && (
                <div className="mb-6 p-5 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            <i className="fas fa-search text-slate-400 text-sm"></i>
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Buscador Global</h4>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <select className="text-[11px] px-3 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-400 font-bold text-slate-700 shadow-sm" value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
                                <option value="All">Todos los Continentes</option>
                                <option value="América">América</option>
                                <option value="Europa">Europa</option>
                                <option value="África">África</option>
                                <option value="Asia">Asia</option>
                                <option value="Mundo">Internacional / Mundo</option>
                            </select>
                            <input 
                                type="text" 
                                placeholder="Escribe país o nombre de liga..." 
                                className="text-[11px] px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 flex-1 md:w-64 shadow-sm" 
                                value={searchApiLeague}
                                onChange={(e) => setSearchApiLeague(e.target.value)} 
                            />
                        </div>
                    </div>
                    <div className="space-y-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {isSearchingLeagues ? (
                            <div className="flex flex-col items-center py-12">
                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sincronizando con la API...</p>
                            </div>
                        ) : (
                            sortedCountries.filter(countryName => {
                                const entry = Object.entries(countryData).find(([eng, data]) => data.name === countryName);
                                const region = entry ? entry[1].region : 'Otros';
                                const matchesSearch = countryName.toLowerCase().includes(searchApiLeague.toLowerCase()) || 
                                                     groupedLeagues[countryName].some(l => l.league.name.toLowerCase().includes(searchApiLeague.toLowerCase()));
                                const matchesRegion = filterRegion === 'All' || region === filterRegion;
                                return matchesSearch && matchesRegion;
                            }).map(country => (
                                <div key={country} className="animate-in fade-in duration-500">
                                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-3 flex items-center bg-blue-50/50 py-1 px-3 rounded-full w-fit">{country}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {groupedLeagues[country].map(item => (
                                            <div key={item.league.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all group">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <img src={item.league.logo} className="h-10 w-10 object-contain group-hover:scale-110 transition-transform" alt="" />
                                                    <div className="flex flex-col">
                                                        {/* [TRADUCCIÓN APLICADA AQUÍ] */}
                                                        <span className="text-[11px] font-bold text-slate-800 leading-none mb-1">
                                                            {translateLeagueName(item.league.name)}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 font-medium">Temporada {item.seasons[0].year}</span>
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => addLeague(item)} className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-full transition-all active:scale-90"><i className="fas fa-plus-circle text-xl"></i></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            <div className="max-h-[440px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {leagues.map(league => (
                        <div key={league.id} className="relative group">
                            <button
                                type="button"
                                onClick={() => handleLeagueClick(league.id)}
                                className={`w-full h-full flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all duration-300 ${
                                    selectedLeagueId !== null && selectedLeagueId === league.id 
                                    ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100 shadow-xl scale-[1.02]' 
                                    : 'border-gray-100 bg-white hover:border-blue-200 hover:shadow-lg'
                                }`}
                            >
                                <div className="bg-white p-3 rounded-2xl shadow-sm mb-3">
                                    <img src={league.logo} alt="" className="h-20 w-20 object-contain drop-shadow-md" />
                                </div>
                                {/* [TRADUCCIÓN APLICADA TAMBIÉN EN LA LISTA PRINCIPAL] */}
                                <span className={`font-black text-xs tracking-tight text-center uppercase leading-tight px-1 ${selectedLeagueId === league.id ? 'text-blue-700' : 'text-gray-500'}`}>
                                    {translateLeagueName(league.name)}
                                </span>
                            </button>
                            {isManagingLeagues && (
                                <button type="button" onClick={() => removeLeague(league.id)} className="absolute -top-2 -right-2 bg-red-500 text-white w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:bg-red-600 hover:scale-110 transition-all z-10"><i className="fas fa-times text-sm"></i></button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LeagueSelector;