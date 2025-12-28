import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore'; 

const UserProfile = () => {
    const user = auth.currentUser;
    const [isEditing, setIsEditing] = useState(false);
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [paymentStatus, setPaymentStatus] = useState('loading');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) return;
            try {
                const docRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    setPaymentStatus(docSnap.data().paymentStatus || 'pending');
                    if (docSnap.data().displayName) setDisplayName(docSnap.data().displayName);
                } else {
                    setPaymentStatus('pending');
                }
            } catch (error) {
                console.error("Error cargando perfil:", error);
                setPaymentStatus('error');
            }
        };
        fetchUserData();
    }, [user]);

    const handleSave = async () => {
        if (!displayName.trim()) return alert("El nombre no puede estar vacío");
        setSaving(true);
        try {
            await updateProfile(user, { displayName });
            
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { 
                displayName: displayName,
                updatedAt: new Date().toISOString()
            });

            setIsEditing(false);
            alert("¡Perfil actualizado con éxito!");
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Hubo un error al actualizar tu perfil.");
        } finally {
            setSaving(false);
        }
    };

    const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : 'US';

    return (
        <div className="max-w-2xl mx-auto mt-10 p-4">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">
                
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-32 relative">
                    <div className="absolute top-4 right-4">
                            {paymentStatus === 'paid' ? (
                            <span className="bg-green-400 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1 animate-pulse">
                                <i className="fas fa-check-circle"></i> CUENTA PAGADA
                            </span>
                            ) : paymentStatus === 'loading' ? (
                            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs">Cargando...</span>
                            ) : (
                            <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1">
                                <i className="fas fa-clock"></i> PAGO PENDIENTE
                            </span>
                            )}
                    </div>
                </div>

                <div className="px-8 pb-8">
                    <div className="relative -top-12 flex justify-center">
                        <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
                            <div className="w-full h-full rounded-full bg-slate-200 flex items-center justify-center text-3xl font-bold text-slate-500 select-none">
                                {getInitials(displayName)}
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-center mt-[-30px]">
                        {isEditing ? (
                            <div className="flex flex-col items-center gap-3 mt-4 animate-fade-in">
                                <input 
                                    type="text" 
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="text-center text-xl font-bold text-gray-800 border-b-2 border-blue-500 focus:outline-none px-2 py-1 w-full max-w-xs bg-gray-50 rounded"
                                    placeholder="Tu nombre visible"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => {
                                            setIsEditing(false);
                                            setDisplayName(user?.displayName || ''); 
                                        }}
                                        className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                                        disabled={saving}
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-4 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {saving && <i className="fas fa-circle-notch fa-spin"></i>}
                                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="group relative inline-flex items-center gap-2 justify-center w-full">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {displayName || 'Usuario Turugol'}
                                </h2>
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                    title="Editar nombre"
                                >
                                    <i className="fas fa-pencil-alt text-sm"></i>
                                </button>
                            </div>
                        )}
                        <p className="text-gray-500 mt-1">{user?.email}</p>
                    </div>

                    <div className="mt-8 border-t border-gray-100 pt-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 px-2">Detalles de la Cuenta</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-xl text-center border border-gray-100">
                                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">UID (Referencia)</p>
                                <p className="text-xs font-mono text-gray-600 mt-1 truncate px-2 select-all" title="Copiar ID para soporte">
                                    {user?.uid}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl text-center border border-gray-100">
                                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Miembro Desde</p>
                                <p className="text-sm font-bold text-gray-700 mt-1">
                                    {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Reciente'}
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default UserProfile;