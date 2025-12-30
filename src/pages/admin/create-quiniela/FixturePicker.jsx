import React from 'react';

const FixturePicker = ({ 
    isLoading, 
    filteredFixtures, 
    selectedFixtures, 
    toggleFixtureSelection, 
    selectedRound, 
    handleRoundChange, 
    isLoadingRounds, 
    availableRounds, 
    searchTerm, 
    setSearchTerm 
}) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center shrink-0">
                    <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">3</span>
                    Partidos Disponibles
                </h3>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Buscador de equipos */}
                    <div className="relative flex-1 sm:w-64">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                        <input 
                            type="text" 
                            placeholder="Buscar equipo..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>

                    {/* Selector de Jornadas */}
                    <select 
                        value={selectedRound} 
                        onChange={handleRoundChange}
                        disabled={isLoadingRounds}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:opacity-50"
                    >
                        {isLoadingRounds ? (
                            <option>Cargando jornadas...</option>
                        ) : (
                            availableRounds.map(round => (
                                <option key={round} value={round}>{round.replace('Regular Season - ', 'Jornada ')}</option>
                            ))
                        )}
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="py-20 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-medium italic">Consultando calendario con la API...</p>
                </div>
            ) : (
                /* CONTENEDOR 2 COLUMNAS X 3 FILAS CON SCROLL */
                <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredFixtures.length > 0 ? (
                            filteredFixtures.map(item => {
                                const isSelected = selectedFixtures.some(f => f.fixture.id === item.fixture.id);
                                
                                // Formateo de fecha (incluyendo año) y hora
                                const matchDate = new Date(item.fixture.date);
                                const dateString = matchDate.toLocaleDateString([], { 
                                    day: '2-digit', 
                                    month: 'short',
                                    year: 'numeric' // [AÑADIDO] Año para mayor precisión
                                });
                                const timeString = matchDate.toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                });

                                return (
                                    <div 
                                        key={item.fixture.id} 
                                        onClick={() => toggleFixtureSelection(item)}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group relative ${
                                            isSelected 
                                            ? 'border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-200' 
                                            : 'border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            {/* Local */}
                                            <div className="flex flex-col items-center flex-1 text-center">
                                                <img src={item.teams.home.logo} alt="" className="h-10 w-10 object-contain mb-2 group-hover:scale-110 transition-transform" />
                                                <span className="text-[10px] font-bold text-gray-700 uppercase leading-tight line-clamp-2">{item.teams.home.name}</span>
                                            </div>

                                            {/* Info Central (Fecha con Año y Hora) */}
                                            <div className="flex flex-col items-center shrink-0 min-w-[85px]">
                                                <span className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-tighter">
                                                    {dateString}
                                                </span>
                                                <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full mb-1 italic">VS</span>
                                                <span className="text-[10px] text-slate-500 font-bold tracking-tight">
                                                    {timeString}
                                                </span>
                                            </div>

                                            {/* Visitante */}
                                            <div className="flex flex-col items-center flex-1 text-center">
                                                <img src={item.teams.away.logo} alt="" className="h-10 w-10 object-contain mb-2 group-hover:scale-110 transition-transform" />
                                                <span className="text-[10px] font-bold text-gray-700 uppercase leading-tight line-clamp-2">{item.teams.away.name}</span>
                                            </div>
                                        </div>

                                        {/* Indicador de Selección */}
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 text-blue-600 animate-in zoom-in">
                                                <i className="fas fa-check-circle text-sm"></i>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <i className="fas fa-calendar-times text-gray-300 text-3xl mb-3"></i>
                                <p className="text-gray-400 text-sm font-medium">No se encontraron partidos próximos para esta jornada.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FixturePicker;