import React, { useState, useEffect } from 'react';
import { db, auth } from '../../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const PaymentBanner = ({ totalCost, onNavigate }) => {
    const [config, setConfig] = useState({
        accountNumber: '',
        phoneNumber: '',
        beneficiaryName: '',
        bankName: ''
    });

    // Estado para almacenar el concepto generado
    const [paymentConcept, setPaymentConcept] = useState('');

    useEffect(() => {
        const fetchPaymentData = async () => {
            try {
                const configSnap = await getDoc(doc(db, 'settings', 'payment'));
                if (configSnap.exists()) {
                    setConfig(configSnap.data());
                }

                // Generar concepto dinámico con datos del usuario actual
                const currentUser = auth.currentUser;
                if (currentUser) {
                    const fullName = currentUser.displayName || "Usuario Anonimo";
                    const uidShort = currentUser.uid.substring(0, 6).toUpperCase();
                    
                    // Extraer primer nombre y primer apellido
                    const nameParts = fullName.split(' ');
                    const firstName = nameParts[0] || "";
                    const firstLastName = nameParts[1] || "";
                    
                    // Formato: NOMBRE APELLIDO UID6
                    const generatedConcept = `${firstName} ${firstLastName} ${uidShort}`.trim().toUpperCase();
                    setPaymentConcept(generatedConcept);
                }
            } catch (error) {
                console.error("Error obteniendo datos de pago:", error);
            }
        };
        fetchPaymentData();
    }, []);

    const getBankStyles = (bank) => {
        const name = bank?.toLowerCase() || '';
        if (name.includes('bbva')) return 'bg-gradient-to-br from-blue-900 to-blue-700 text-white';
        if (name.includes('santander')) return 'bg-gradient-to-br from-red-700 to-red-500 text-white';
        if (name.includes('banamex') || name.includes('citibanamex')) return 'bg-gradient-to-br from-blue-800 to-blue-600 text-white';
        if (name.includes('azteca')) return 'bg-gradient-to-br from-green-800 to-green-600 text-white';
        if (name.includes('banorte')) return 'bg-gradient-to-br from-red-900 to-gray-800 text-white';
        if (name.includes('hsbc')) return 'bg-gradient-to-br from-gray-100 to-gray-300 text-red-600 border-2 border-red-600';
        if (name.includes('coppel')) return 'bg-gradient-to-br from-yellow-400 to-blue-600 text-white';
        if (name.includes('nu')) return 'bg-gradient-to-br from-purple-800 to-purple-600 text-white';
        return 'bg-gradient-to-br from-slate-800 to-slate-600 text-white';
    };

    const formatCardNumber = (num) => {
        return num ? num.replace(/(\d{4})/g, '$1 ').trim() : '0000 0000 0000 0000';
    };

    return (
        <div className="mb-8 animate-in fade-in zoom-in duration-500">
            <div className="bg-white p-6 lg:p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                
                <div className="flex flex-col xl:flex-row gap-10 relative z-10">
                    
                    {/* --- COLUMNA IZQUIERDA: TARJETA Y CONCEPTO --- */}
                    <div className="flex flex-col gap-6 items-center">
                        <div className={`w-full max-w-[380px] h-[220px] rounded-2xl shadow-2xl p-6 flex flex-col justify-between transition-all duration-700 transform hover:rotate-1 ${getBankStyles(config.bankName)}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">Tarjeta de Débito</span>
                                    <span className="text-xl font-black italic tracking-tighter uppercase">{config.bankName || 'Mi Banco'}</span>
                                </div>
                                <div className="w-10 h-7 bg-yellow-400/80 rounded flex flex-col gap-1 p-1 opacity-90 shadow-inner">
                                    <div className="w-full h-full border border-yellow-600/30 rounded-sm"></div>
                                </div>
                            </div>

                            <div>
                                <p className="text-[9px] uppercase tracking-[0.2em] mb-1 opacity-70">Número de Cuenta</p>
                                <p className="text-xl font-mono font-bold tracking-[0.15em]">
                                    {formatCardNumber(config.accountNumber)}
                                </p>
                            </div>

                            <div className="flex justify-between items-end">
                                <div className="flex flex-col">
                                    <p className="text-[9px] uppercase tracking-widest mb-1 opacity-70">Beneficiario</p>
                                    <p className="text-sm font-bold truncate max-w-[200px] uppercase">{config.beneficiaryName || 'No asignado'}</p>
                                </div>
                                <div className="flex -space-x-3">
                                    <div className="w-7 h-7 rounded-full bg-red-500/80"></div>
                                    <div className="w-7 h-7 rounded-full bg-yellow-500/80"></div>
                                </div>
                            </div>
                        </div>

                        {/* RECUADRO DE CONCEPTO OBLIGATORIO */}
                        <div className="w-full max-w-[380px] bg-red-50 border-2 border-dashed border-red-200 p-5 rounded-2xl">
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <i className="fas fa-exclamation-triangle"></i> Concepto de Transferencia Obligatorio
                            </p>
                            <p className="text-2xl font-mono font-black text-red-600 text-center select-all bg-white py-2 rounded-lg border border-red-100 shadow-sm">
                                {paymentConcept || "CARGANDO..."}
                            </p>
                            <p className="text-[9px] text-red-400 mt-2 leading-tight italic text-center">
                                * Copia y pega este texto exacto en el campo "Concepto" o "Motivo de pago".
                            </p>
                        </div>
                    </div>

                    {/* --- COLUMNA DERECHA: PASOS E INSTRUCCIONES --- */}
                    <div className="flex-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4">
                            Paso Final Obligatorio
                        </div>
                        
                        <h2 className="text-2xl font-black text-gray-800 leading-tight uppercase mb-4">
                            Instrucciones para validar tu jugada
                        </h2>

                        <div className="grid gap-4 mb-6">
                            <div className="flex gap-4 items-start">
                                <div className="bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1">1</div>
                                <p className="text-sm text-gray-600 font-medium">Realiza la transferencia desde tu banca móvil a la cuenta mostrada en la tarjeta.</p>
                            </div>
                            <div className="flex gap-4 items-start">
                                <div className="bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1">2</div>
                                <p className="text-sm text-gray-600 font-medium">
                                    Coloca <span className="text-red-600 font-bold underline">{paymentConcept}</span> como concepto. <span className="font-bold text-gray-800">Si el concepto es incorrecto o falta, tu jugada quedará ANULADA automáticamente aunque resultes ganador.</span>
                                </p>
                            </div>
                            <div className="flex gap-4 items-start">
                                <div className="bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1">3</div>
                                <p className="text-sm text-gray-600 font-medium">Envía captura del comprobante por WhatsApp al <span className="text-emerald-600 font-bold">{config.phoneNumber}</span> para activar tu participación.</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <a 
                                href={`https://wa.me/${config.phoneNumber?.replace(/\s/g, '')}?text=Hola, envío mi comprobante de pago. Concepto: ${paymentConcept}`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full sm:w-auto bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black hover:bg-emerald-600 transition-all shadow-lg flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
                            >
                                <i className="fab fa-whatsapp text-lg"></i>
                                Enviar WhatsApp
                            </a>
                            <button 
                                onClick={onNavigate}
                                className="w-full sm:w-auto bg-gray-100 text-gray-600 px-8 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all uppercase text-xs tracking-widest active:scale-95"
                            >
                                Ver mis jugadas
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentBanner;