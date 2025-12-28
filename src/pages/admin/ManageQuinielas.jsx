import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // [NUEVO] Para navegar al detalle
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

const ManageQuinielas = () => {
    const [quinielas, setQuinielas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active');

    // Carga inicial de datos (Se mantiene igual)
    useEffect(() => {
        const fetchQuinielas = async () => {
            setLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, 'quinielas'));
                const quinielasData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                // Ordenar por fecha de creación descendente
                setQuinielas(quinielasData.sort((a, b) => new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt)));
            } catch (error) {
                console.error("Error al cargar quinielas:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchQuinielas();
    }, []);

    // Lógica de filtrado (Activas vs Historial)
    const now = new Date();
    const activeQuinielas = quinielas.filter(q => new Date(q.metadata.deadline) > now);
    const historyQuinielas = quinielas.filter(q => new Date(q.metadata.deadline) <= now);
    const displayedQuinielas = activeTab === 'active' ? activeQuinielas : historyQuinielas;

    return (
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
            {/* Encabezado y Pestañas */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800">Gestionar Quinielas</h2>
                
                <div className="bg-gray-200 p-1 rounded-lg flex space-x-1 mt-4 md:mt-0">
                    <button 
                        onClick={() => setActiveTab('active')} 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        En Juego ({activeQuinielas.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')} 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Historial ({historyQuinielas.length})
                    </button>
                </div>
            </div>

            {/* Grid de Tarjetas */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <p className="text-gray-500 animate-pulse">Cargando quinielas...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedQuinielas.map((q) => {
                        const isOpen = new Date() < new Date(q.metadata.deadline);
                        
                        return (
                            <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group relative">
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${isOpen ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                            {isOpen ? 'ABIERTA' : 'CERRADA'}
                                        </span>
                                        <small className="text-gray-400 text-xs font-mono">ID: {q.id.substring(0,6)}</small>
                                    </div>
                                    
                                    <h3 className="font-bold text-lg text-gray-900 mb-1 truncate" title={q.metadata.title}>
                                        {q.metadata.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 mb-4">
                                        Cierre: {new Date(q.metadata.deadline).toLocaleDateString()}
                                    </p>

                                    {/* [CAMBIO CRÍTICO] Botón ahora es un Link a la nueva ruta */}
                                    <Link 
                                        to={`/dashboard/admin/quinielas/${q.id}`} 
                                        className="block w-full text-center py-2.5 rounded-lg font-bold text-sm transition-colors border border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white mt-4"
                                    >
                                        <i className="fas fa-cog mr-2"></i> Administrar
                                    </Link>
                                </div>
                            </div>
                        );
                    })}

                    {/* Estado vacío */}
                    {displayedQuinielas.length === 0 && (
                        <div className="col-span-full py-10 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <i className="fas fa-folder-open text-gray-300 text-4xl mb-3"></i>
                            <p className="text-gray-500">No hay quinielas en esta sección.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ManageQuinielas;