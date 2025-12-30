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
                    <div className="flex flex-col items-center justify-center h-48 text-blue-500">
                        <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
                        <p className="text-xs font-bold">Obteniendo partidos...</p>
                    </div>
                ) : filteredFixtures.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                        <p className="text-xs">No hay partidos futuros disponibles.</p>
                    </div>
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
    );
};

export default FixturePicker;