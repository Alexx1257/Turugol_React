import React from 'react';

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
    // Agrupación de ligas por país para el gestor
    const groupedLeagues = apiLeaguesResults.reduce((acc, item) => {
        const country = item.country.name;
        if (!acc[country]) acc[country] = [];
        acc[country].push(item);
        return acc;
    }, {});

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
                    className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 transition-all"
                >
                    <i className={`fas ${isManagingLeagues ? 'fa-check mr-2' : 'fa-cog mr-2'}`}></i>
                    {isManagingLeagues ? 'Listo' : 'Gestionar Ligas'}
                </button>
            </div>

            {isManagingLeagues && (
                <div className="mb-6 p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Añadir ligas desde la API</h4>
                        <input 
                            type="text" 
                            placeholder="Filtrar por país..." 
                            className="text-[10px] px-2 py-1 border rounded outline-none focus:ring-1 focus:ring-blue-400"
                            onChange={(e) => setSearchApiLeague(e.target.value)}
                        />
                    </div>
                    <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {isSearchingLeagues ? (
                            <p className="text-xs text-center py-4">Cargando ligas...</p>
                        ) : (
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
                                                <button type="button" onClick={() => addLeague(item)} className="text-blue-500 hover:text-blue-700"><i className="fas fa-plus-circle"></i></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {leagues.map(league => (
                    <div key={league.id} className="relative group">
                        <button
                            type="button"
                            onClick={() => handleLeagueClick(league.id)}
                            className={`w-full flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${
                                selectedLeagueId === league.id 
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100 shadow-sm scale-[1.02]' 
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
                                className="absolute -top-2 -right-2 bg-white text-red-500 w-6 h-6 rounded-full flex items-center justify-center shadow-md border border-red-100"
                            >
                                <i className="fas fa-trash-alt text-[10px]"></i>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LeagueSelector;