import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../../../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

const ParticipantsManager = () => {
    const { quinielaId } = useParams();
    
    const [entries, setEntries] = useState([]);
    const [quinielaTitle, setQuinielaTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const qDoc = await getDoc(doc(db, 'quinielas', quinielaId));
                if (qDoc.exists()) setQuinielaTitle(qDoc.data().metadata.title);

                const q = query(
                    collection(db, 'userEntries'), 
                    where('quinielaId', '==', quinielaId)
                );
                const snapshot = await getDocs(q);
                
                const entriesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                setEntries(entriesData.sort((a, b) => {
                    if (a.paymentStatus === 'paid' && b.paymentStatus !== 'paid') return 1;
                    if (a.paymentStatus !== 'paid' && b.paymentStatus === 'paid') return -1;
                    return new Date(b.createdAt?.seconds * 1000 || 0) - new Date(a.createdAt?.seconds * 1000 || 0);
                }));

            } catch (error) {
                console.error("Error al cargar participantes:", error);
            } finally {
                setLoading(false);
            }
        };

        if (quinielaId) fetchData();
    }, [quinielaId]);

    const filteredEntries = entries.filter(entry => {
        const name = (entry.displayName || entry.userName || '').toLowerCase();
        const email = (entry.email || '').toLowerCase();
        const uid = (entry.userId || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        return name.includes(search) || email.includes(search) || uid.includes(search);
    });

    const togglePaymentStatus = async (entryId, currentStatus) => {
        setProcessingId(entryId);
        try {
            const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
            const entryRef = doc(db, 'userEntries', entryId);
            
            await updateDoc(entryRef, { 
                paymentStatus: newStatus,
                paymentUpdatedAt: new Date().toISOString()
            });

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

    const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : '??';
    const getAvatarColor = (name) => {
        const colors = ['bg-red-100 text-red-600', 'bg-green-100 text-green-600', 'bg-blue-100 text-blue-600', 'bg-yellow-100 text-yellow-600', 'bg-purple-100 text-purple-600'];
        let hash = 0;
        if (!name) return colors[0];
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    if (loading) return <div className="p-10 text-center text-gray-500 italic animate-pulse">Cargando participantes...</div>;

    return (
        <div className="max-w-6xl mx-auto p-4 lg:p-8">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <Link to={`/dashboard/admin/quinielas/${quinielaId}`} className="text-gray-500 hover:text-gray-800 text-sm mb-1 inline-flex items-center transition-colors">
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

            <div className="mb-6 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-search text-gray-400"></i>
                </div>
                <input
                    type="text"
                    placeholder="Buscar por nombre, correo o UID..."
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ref (UID 6)</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Teléfono</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Registro (Fecha/Hora)</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Puntos</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Estado de Pago</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredEntries.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-400">
                                        <i className="fas fa-user-slash text-3xl mb-3 block opacity-30"></i>
                                        {searchTerm ? 'No se encontraron participantes.' : 'No hay usuarios inscritos aún.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredEntries.map(entry => {
                                    const name = entry.displayName || entry.userName || 'Usuario sin nombre';
                                    const email = entry.email || 'Sin correo';
                                    const phone = entry.phone || entry.phoneNumber || 'N/A';
                                    const isPaid = entry.paymentStatus === 'paid';
                                    
                                    const date = entry.createdAt?.toDate 
                                        ? entry.createdAt.toDate().toLocaleString('es-MX', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true
                                        }) 
                                        : (entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '-');

                                    // MODIFICACIÓN: Ajuste a 6 caracteres del UID
                                    const shortUID = entry.userId ? entry.userId.substring(0, 6).toUpperCase() : 'N/A';

                                    return (
                                        <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors group">
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

                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 font-bold border border-gray-200">
                                                    {shortUID}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                                {phone}
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                                {date}
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {entry.status === 'finalized' ? (
                                                    <span className="font-bold text-gray-800">{entry.puntos} pts</span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Pendiente</span>
                                                )}
                                            </td>

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