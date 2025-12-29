import React from 'react';

const QuinielaSummary = ({ 
    totalCost, 
    doubles, 
    triples, 
    maxDoubles, 
    maxTriples, 
    onSubmit, 
    submitting, 
    disabled 
}) => {
    return (
        <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl sticky top-6 border border-slate-700">
            <div className="mb-8 text-center border-b border-slate-800 pb-6">
                <p className="text-emerald-400 text-[10px] font-black tracking-[0.2em] mb-2 uppercase">Total a Pagar</p>
                <h2 className="text-6xl font-black text-white">${totalCost.toLocaleString()}</h2>
            </div>
            
            <div className="space-y-4 bg-slate-800/40 p-5 rounded-2xl border border-white/5 mb-6">
                <div className="flex justify-between items-center border-b border-white/5 pb-2 text-xs">
                    <div className="font-bold text-slate-300 uppercase tracking-widest">
                        Triples <span className="text-slate-500 font-normal ml-1 lowercase">(aseguras)</span>
                    </div>
                    <span className={`text-lg font-black ${
                        triples > maxTriples ? 'text-red-500' : triples > 0 ? 'text-emerald-500' : 'text-slate-600'
                    }`}>
                        {triples}/{maxTriples}
                    </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <div className="font-bold text-slate-300 uppercase tracking-widest">
                        Dobles <span className="text-slate-500 font-normal ml-1 lowercase">(2 opciones)</span>
                    </div>
                    <span className={`text-lg font-black ${
                        doubles > maxDoubles ? 'text-red-500' : doubles > 0 ? 'text-emerald-500' : 'text-slate-600'
                    }`}>
                        {doubles}/{maxDoubles}
                    </span>
                </div>
            </div>

            <button 
                onClick={onSubmit} 
                disabled={submitting || disabled} 
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black py-5 rounded-2xl transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-95 disabled:opacity-30 mb-10 text-xl uppercase tracking-widest"
            >
                {submitting ? 'PROCESANDO...' : 'Confirmar y Pagar'}
            </button>

            <div className="space-y-8">
                <h4 className="text-[11px] font-black text-slate-500 border-b border-slate-800 pb-2 tracking-[0.2em] uppercase text-center font-bold">Glosario de Juego</h4>
                <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-lg bg-blue-600/10 border border-blue-600/20"><p className="text-blue-500 font-black text-sm">L</p><p className="text-[9px] uppercase text-slate-400 font-bold">Local</p></div>
                    <div className="text-center p-2 rounded-lg bg-orange-600/10 border border-orange-600/20"><p className="text-orange-500 font-black text-sm">E</p><p className="text-[9px] uppercase text-slate-400 font-bold">Empate</p></div>
                    <div className="text-center p-2 rounded-lg bg-green-600/10 border border-green-600/20"><p className="text-green-500 font-black text-sm">V</p><p className="text-[9px] uppercase text-slate-400 font-bold">Visita</p></div>
                </div>
                <div className="space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center font-black text-blue-400 flex-shrink-0 text-xs">2X</div>
                        <div className="flex-1">
                            <p className="text-[11px] font-bold text-white mb-1 uppercase tracking-tight italic">Jugada Doble</p>
                            <p className="text-[10px] text-slate-400 leading-tight mb-2 italic">Seleccionas 2 opciones. Duplica el costo.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center font-black text-orange-400 flex-shrink-0 text-xs">3X</div>
                        <div className="flex-1">
                            <p className="text-[11px] font-bold text-white mb-1 uppercase tracking-tight italic">Jugada Triple</p>
                            <p className="text-[10px] text-slate-400 leading-tight mb-2 italic">Seleccionas los 3 botones. Triplica el costo.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuinielaSummary;