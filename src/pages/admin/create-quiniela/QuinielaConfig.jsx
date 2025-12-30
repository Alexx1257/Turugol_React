import React from 'react';

const QuinielaConfig = ({ title, deadline, description, handleInputChange, deadlineError, MAX_DESCRIPTION_CHARS }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
                Configuración General
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">Título del Evento</label> 
                        <input 
                            name="title" 
                            type="text" 
                            required 
                            value={title} 
                            onChange={handleInputChange} 
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" 
                            placeholder="Ej: Gran Quiniela Jornada 10" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">Cierre de Apuestas</label> 
                        <input 
                            name="deadline" 
                            type="datetime-local" 
                            required 
                            value={deadline} 
                            onChange={handleInputChange} 
                            className={`w-full px-4 py-2 border rounded-lg bg-gray-50 focus:bg-white transition-colors ${deadlineError ? 'border-red-500' : 'border-gray-300'}`} 
                        />
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Premios / Reglas</label>
                        <span className="text-[10px] text-gray-400 font-bold">{description.length}/{MAX_DESCRIPTION_CHARS}</span>
                    </div>
                    <textarea 
                        name="description" 
                        rows="4" 
                        value={description} 
                        onChange={handleInputChange} 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm" 
                        placeholder="Describe los premios..." 
                    />
                </div>
            </div>
        </div>
    );
};

export default QuinielaConfig;