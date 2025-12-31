import React from 'react';

const QuinielaConfig = ({ 
    title, 
    deadline, 
    description, 
    maxFixtures, 
    handleInputChange, 
    deadlineError, 
    MAX_DESCRIPTION_CHARS,
    onAutoSetDeadline // [MODIFICADO] Prop recibida correctamente
}) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
                Configuración General
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    {/* Fila del Título */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Título del Evento</label> 
                        <input 
                            name="title" 
                            type="text" 
                            required 
                            value={title} 
                            onChange={handleInputChange} 
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-sm" 
                            placeholder="Ej: Gran Quiniela Jornada 10" 
                        />
                    </div>

                    {/* Fila Mixta: Cierre (Grande) y Partidos (Pequeño) */}
                    <div className="flex gap-4">
                        {/* Cierre de Apuestas */}
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Cierre de Apuestas</label>
                                {/* [NUEVO] Botón para ajuste automático basado en el primer partido seleccionado */}
                                <button
                                    type="button"
                                    onClick={onAutoSetDeadline}
                                    title="Ajustar automáticamente 1 hora antes del primer partido"
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors uppercase"
                                >
                                    <i className="fas fa-magic"></i> Auto
                                </button>
                            </div>
                            <input 
                                name="deadline" 
                                type="datetime-local" 
                                required 
                                value={deadline} 
                                onChange={handleInputChange} 
                                className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:bg-white transition-colors text-sm ${deadlineError ? 'border-red-500' : 'border-gray-300'}`} 
                            />
                            {deadline && (
                                <p className="text-[9px] text-gray-400 mt-1 italic">
                                    * Sugerido: 1 hora antes del primer encuentro.
                                </p>
                            )}
                        </div>

                        {/* Selector de Partidos */}
                        <div className="w-24">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest text-center">Partidos</label> 
                            <div className="relative">
                                <input 
                                    name="maxFixtures" 
                                    type="number" 
                                    min="1"
                                    max="20"
                                    required 
                                    value={maxFixtures} 
                                    onChange={handleInputChange} 
                                    className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center font-bold text-blue-600 text-sm" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Premios */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Premios / Reglas</label>
                        <span className="text-[9px] text-gray-400 font-bold uppercase">{description.length} / {MAX_DESCRIPTION_CHARS}</span>
                    </div>
                    <textarea 
                        name="description" 
                        rows="4" 
                        value={description} 
                        onChange={handleInputChange} 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm h-[108px]" 
                        placeholder="Describe los premios o reglas adicionales..." 
                    />
                </div>
            </div>
        </div>
    );
};

export default QuinielaConfig;