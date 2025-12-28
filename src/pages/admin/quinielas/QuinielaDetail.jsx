import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const QuinielaDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [quiniela, setQuiniela] = useState(null);
    const [loading, setLoading] = useState(true);

    // Cargar datos de la quiniela
    useEffect(() => {
        const fetchQuiniela = async () => {
            try {
                const docRef = doc(db, 'quinielas', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setQuiniela({ id: docSnap.id, ...docSnap.data() });
                } else {
                    console.log("No se encontró el documento");
                    navigate('/dashboard/admin/quinielas');
                }
            } catch (error) {
                console.error("Error obteniendo quiniela:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchQuiniela();
    }, [id, navigate]);

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando detalles...</div>;
    if (!quiniela) return null;

    // Cálculos de estado para la UI
    const deadlineDate = new Date(quiniela.metadata.deadline);
    const now = new Date();
    const isOpen = now < deadlineDate;
    const isClosed = !isOpen;
    const totalMatches = quiniela.fixtures ? quiniela.fixtures.length : 0;
    
    // Calcular cuántos partidos ya tienen resultado final
    const matchesFinished = quiniela.fixtures ? quiniela.fixtures.filter(f => f.status === 'FT' || f.result).length : 0;

    return (
        <div className="max-w-6xl mx-auto p-4 lg:p-8">
            {/* Navegación Breadcrumb */}
            <nav className="flex items-center text-sm text-gray-500 mb-6">
                <Link to="/dashboard/admin/quinielas" className="hover:text-blue-600 transition-colors">
                    <i className="fas fa-arrow-left mr-2"></i> Volver a la Lista
                </Link>
                <span className="mx-2">/</span>
                <span className="font-semibold text-gray-800">Detalle</span>
            </nav>

            {/* Encabezado Principal */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-gray-900">{quiniela.metadata.title}</h1>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isOpen ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {isOpen ? 'ABIERTA' : 'CERRADA'}
                        </span>
                    </div>
                    <p className="text-gray-500 flex items-center gap-2 text-sm">
                        <i className="far fa-calendar-alt"></i> 
                        Cierre: {deadlineDate.toLocaleDateString()} a las {deadlineDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                </div>
                
                {/* ID para referencia técnica */}
                <div className="text-right hidden md:block">
                    <p className="text-xs text-gray-400 font-mono mb-1">ID DEL EVENTO</p>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600 select-all">{id}</code>
                </div>
            </div>

            {/* Grid de Acciones (El Menú Principal) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                
                {/* 1. Tarjeta: PARTICIPANTES */}
                <Link 
                    to={`/dashboard/admin/quinielas/${id}/participants`}
                    className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all flex flex-col items-center text-center cursor-pointer relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                        <i className="fas fa-users"></i>
                    </div>
                    <h3 className="font-bold text-lg text-gray-800 mb-1">Participantes</h3>
                    <p className="text-sm text-gray-500 mb-4">Gestionar pagos y ver usuarios inscritos.</p>
                    <span className="text-blue-600 text-sm font-semibold group-hover:underline">Gestionar Pagos &rarr;</span>
                </Link>

                {/* 2. Tarjeta: RESULTADOS */}
                <Link 
                    to={`/dashboard/admin/quinielas/${id}/results`}
                    className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-200 transition-all flex flex-col items-center text-center cursor-pointer relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                    <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                        <i className="fas fa-trophy"></i>
                    </div>
                    <h3 className="font-bold text-lg text-gray-800 mb-1">Resultados</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        {matchesFinished} de {totalMatches} partidos finalizados.
                    </p>
                    <span className="text-purple-600 text-sm font-semibold group-hover:underline">Cargar Marcadores &rarr;</span>
                </Link>

                {/* 3. Tarjeta: CONFIGURACIÓN (Futura) */}
                <div className="group bg-gray-50 p-6 rounded-2xl border border-gray-200 flex flex-col items-center text-center relative overflow-hidden opacity-75">
                    <div className="w-14 h-14 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-2xl mb-4">
                        <i className="fas fa-cog"></i>
                    </div>
                    <h3 className="font-bold text-lg text-gray-700 mb-1">Configuración</h3>
                    <p className="text-sm text-gray-500 mb-4">Editar título o fechas (Próximamente).</p>
                    <span className="text-gray-400 text-xs font-semibold border border-gray-300 px-2 py-1 rounded">No disponible</span>
                </div>
            </div>

            {/* Resumen Rápido de Partidos */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Resumen de Partidos</h3>
                    <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">{totalMatches} Encuentros</span>
                </div>
                <div className="p-6">
                    {quiniela.fixtures && quiniela.fixtures.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {quiniela.fixtures.map((f, index) => (
                                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 text-sm">
                                    <div className="flex items-center gap-2 w-5/12 overflow-hidden">
                                        <img src={f.homeLogo} className="w-5 h-5 object-contain" alt="" />
                                        <span className="truncate font-medium text-gray-600">{f.homeTeam}</span>
                                    </div>
                                    <span className="font-bold text-gray-300 text-xs">VS</span>
                                    <div className="flex items-center justify-end gap-2 w-5/12 overflow-hidden">
                                        <span className="truncate font-medium text-gray-600 text-right">{f.awayTeam}</span>
                                        <img src={f.awayLogo} className="w-5 h-5 object-contain" alt="" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm italic">No hay partidos configurados.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuinielaDetail;