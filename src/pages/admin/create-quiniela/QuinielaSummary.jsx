import React from 'react';

const QuinielaSummary = ({ selectedFixtures, toggleFixtureSelection, isReadyToSubmit, isSubmitting, MAX_FIXTURES }) => {
    return (
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
                    [...selectedFixtures].sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date)).map((f) => (
                        <div key={f.fixture.id} className="group relative bg-slate-800/50 hover:bg-slate-800 p-3 rounded-lg border border-slate-700 transition-colors">
                            
                            <button 
                                type="button"
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
                disabled={!isReadyToSubmit || isSubmitting} 
                className="w-full py-4 px-6 rounded-xl font-bold text-sm tracking-wide text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 focus:ring-4 focus:ring-blue-500/30 shadow-lg disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed transition-all transform active:scale-95"
            >
                {isSubmitting ? (
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
    );
};

export default QuinielaSummary;