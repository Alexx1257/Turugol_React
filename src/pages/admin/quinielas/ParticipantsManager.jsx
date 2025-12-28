import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../../../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

const ParticipantsManager = () => {
    const { id } = useParams();
    
    const [entries, setEntries] = useState([]);
    const [quinielaTitle, setQuinielaTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    // 1. Cargar participantes y título de la quiniela
    useEffect(() => {
        const fetchData = async () => {
            try {
                // A) Obtener nombre de la quiniela para el header
                const qDoc = await getDoc(doc(db, 'quinielas', id));
                if (qDoc.exists()) setQuinielaTitle(qDoc.data().metadata.title);

                // B) Obtener entradas de esta quiniela
                const q = query(
                    collection(db, 'userEntries'), 
                    where('quinielaId', '==', id)
                );
                const snapshot = await getDocs(q);
                
                // Mapeamos los datos
                const entriesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Ordenar: Pendientes de pago primero, luego por fecha
                setEntries(entriesData.sort((a, b) => {
                    if (a.paymentStatus === 'paid' && b.paymentStatus !== 'paid') return 1;
                    if (a.paymentStatus !== 'paid' && b.paymentStatus === 'paid') return -1;
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                }));

            } catch (error) {
                console.error("Error al cargar participantes:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    // 2. Función para cambiar estado de pago (La lógica nueva)
    const togglePaymentStatus = async (entryId, currentStatus) => {
        setProcessingId(entryId);
        try {
            const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
            const entryRef = doc(db, 'userEntries', entryId);
            
            await updateDoc(entryRef, { 
                paymentStatus: newStatus,
                paymentUpdatedAt: new Date().toISOString()
            });

            // Actualizar estado local para feedback inmediato
            setEntries(prev => prev.map(entry => 
                entry.id === entryId ? { ...entry, paymentStatus: newStatus } : entry
            ));

        } catch (error) {
            console.error("Error actualizando pago:", error);
            alert("No se pudo actualizar el estado de pago.");
        } finally {
            setProcessingId(null);
        }
    };

    // 3. Función para eliminar participación (Caso borde)
    const handleDeleteEntry = async (entryId, userName) => {
        if (!window.confirm(`¿Estás seguro de eliminar a ${userName} de esta quiniela? Esta acción no se puede deshacer.`)) return;

        setProcessingId(entryId);
        try {
            await deleteDoc(doc(db, 'userEntries', entryId));
            setEntries(prev => prev.filter(e => e.id !== entryId));
        } catch (error) {
            console.error("Error eliminando:", error);
            alert("Error al eliminar.");
        } finally {
            setProcessingId(null);
        }
    };

    // Helpers visuales (Avatar y colores)
    const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : '??';
    const getAvatarColor = (name) => {
        const colors = ['bg-red-100 text-red-600', 'bg-green-100 text-green-600', 'bg-blue-100 text-blue-600', 'bg-yellow-100 text-yellow-600', 'bg-purple-100 text-purple-600'];
        let hash = 0;
        if (!name) return colors[0];
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Cargando participantes...</div>;

    return (
        <div className="max-w-6xl mx-auto p-4 lg:p-8">
            
            {/* Header con navegación */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <Link to={`/dashboard/admin/quinielas/${id}`} className="text-gray-500 hover:text-gray-800 text-sm mb-1 inline-flex items-center">
                        <i className="fas fa-arrow-left mr-2"></i> Volver al Detalle
                    </Link>
                    <h2 className="text-2xl font-bold text-gray-800">Participantes</h2>
                    <p className="text-sm text-gray-500">Gestionando pagos para: <span className="font-semibold text-blue-600">{quinielaTitle}</span></p>
                </div>
                
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm">
                    <span className="text-gray-500 mr-2">Total Inscritos:</span>
                    <span className="font-bold text-gray-800 text-lg">{entries.length}</span>
                </div>
            </div>

            {/* Tabla de Participantes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha Registro</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Puntos</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Estado de Pago</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {entries.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-400">
                                        <i className="fas fa-user-slash text-3xl mb-3 block opacity-30"></i>
                                        No hay usuarios inscritos en esta quiniela aún.
                                    </td>
                                </tr>
                            ) : (
                                entries.map(entry => {
                                    const name = entry.displayName || entry.userName || 'Usuario sin nombre';
                                    const email = entry.email || 'Sin correo';
                                    const isPaid = entry.paymentStatus === 'paid';
                                    const date = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '-';

                                    return (
                                        <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors group">
                                            {/* Usuario */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarColor(name)}`}>
                                                        {getInitials(name)}
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-sm font-semibold text-gray-900">{name}</div>
                                                        <div className="text-xs text-gray-500">{email}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Fecha */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {date}
                                            </td>

                                            {/* Puntos (si ya se calcularon) */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {entry.status === 'finalized' ? (
                                                    <span className="font-bold text-gray-800">{entry.puntos} pts</span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Pendiente</span>
                                                )}
                                            </td>

                                            {/* Estado de Pago (Botón Toggle) */}
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <button 
                                                    onClick={() => togglePaymentStatus(entry.id, entry.paymentStatus)}
                                                    disabled={processingId === entry.id}
                                                    className={`
                                                        relative inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95
                                                        ${isPaid 
                                                            ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200' 
                                                            : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'}
                                                        ${processingId === entry.id ? 'opacity-50 cursor-wait' : ''}
                                                    `}
                                                    title={isPaid ? "Marcar como pendiente" : "Marcar como pagado"}
                                                >
                                                    {processingId === entry.id ? (
                                                        <i className="fas fa-circle-notch fa-spin mr-2"></i>
                                                    ) : (
                                                        <i className={`fas ${isPaid ? 'fa-check-circle' : 'fa-clock'} mr-2`}></i>
                                                    )}
                                                    {isPaid ? 'PAGADO' : 'PENDIENTE'}
                                                </button>
                                            </td>

                                            {/* Acciones */}
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button 
                                                    onClick={() => handleDeleteEntry(entry.id, name)}
                                                    className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
                                                    title="Eliminar participación"
                                                >
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ParticipantsManager;