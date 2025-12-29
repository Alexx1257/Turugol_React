import React from 'react';

const FixtureList = ({ fixtures, predictions, onSelect, disabled }) => {
    return (
        <div className="space-y-3">
            {fixtures?.map((fixture) => {
                const picks = predictions[fixture.id] || [];
                return (
                    <div key={fixture.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-4 transition-all hover:border-blue-100">
                        <div className="flex-1 flex items-center justify-end gap-3 w-full text-right">
                            <span className="text-sm font-black text-gray-700 leading-tight">{fixture.homeTeam}</span>
                            <img src={fixture.homeLogo} className="w-10 h-10 object-contain" alt="" />
                        </div>
                        <div className="flex gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200 shadow-inner">
                            {[
                                { l: 'L', v: 'HOME', c: 'bg-blue-600' },
                                { l: 'E', v: 'DRAW', c: 'bg-orange-500' },
                                { l: 'V', v: 'AWAY', c: 'bg-green-600' }
                            ].map(b => (
                                <button
                                    key={b.v}
                                    onClick={() => !disabled && onSelect(fixture.id, b.v)}
                                    className={`w-12 h-12 rounded-lg font-black text-sm transition-all duration-200 ${
                                        picks.includes(b.v) 
                                        ? `${b.c} text-white shadow-lg scale-110` 
                                        : 'bg-white text-gray-300 hover:text-gray-500'
                                    }`}
                                >
                                    {b.l}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 flex items-center justify-start gap-3 w-full text-left">
                            <img src={fixture.awayLogo} className="w-10 h-10 object-contain" alt="" />
                            <span className="text-sm font-black text-gray-700 leading-tight">{fixture.awayTeam}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default FixtureList;