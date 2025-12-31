import React, { useState, useEffect } from 'react';
import { db, auth } from '../../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const PaymentBanner = ({ totalCost, onNavigate, hideButton = false }) => {
    const [config, setConfig] = useState({
        accountNumber: '',
        phoneNumber: '',
        beneficiaryName: '',
        bankName: ''
    });

    const [paymentConcept, setPaymentConcept] = useState('');

    useEffect(() => {
        const fetchPaymentData = async () => {
            try {
                const configSnap = await getDoc(doc(db, 'settings', 'payment'));
                if (configSnap.exists()) {
                    setConfig(configSnap.data());
                }

                const currentUser = auth.currentUser;
                if (currentUser) {
                    const fullName = currentUser.displayName || "Usuario";
                    // MODIFICACIÓN DEFINITIVA: 6 caracteres del UID
                    const uidShort = currentUser.uid.substring(0, 6).toUpperCase();
                    
                    // Solo el primer nombre y limpieza de caracteres extraños para compatibilidad bancaria
                    const firstName = fullName.split(' ')[0].replace(/[^a-zA-Z]/g, '') || "USER";
                    
                    // FORMATO FINAL: PRIMER NOMBRE + ESPACIO + 6 CARACTERES UID
                    const generatedConcept = `${firstName} ${uidShort}`.trim().toUpperCase();
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
        if (name.includes('bbva')) return ['bg-gradient-to-br from-[#004481] to-[#043263]', 'text-white'];
        if (name.includes('santander')) return ['bg-gradient-to-br from-[#ec0000] to-[#b30000]', 'text-white'];
        if (name.includes('banamex')) return ['bg-gradient-to-br from-[#004684] to-[#002855]', 'text-white'];
        if (name.includes('azteca')) return ['bg-gradient-to-br from-[#1a4a3a] to-[#0d261d]', 'text-white'];
        if (name.includes('banorte')) return ['bg-gradient-to-br from-[#eb0029] to-[#000000]', 'text-white'];
        if (name.includes('hsbc')) return ['bg-gradient-to-br from-[#db0011] to-[#ffffff] border-2 border-red-600', 'text-white'];
        if (name.includes('coppel')) return ['bg-gradient-to-br from-[#f2ce00] to-[#e5b800]', 'text-[#004b98]'];
        if (name.includes('nu')) return ['bg-gradient-to-br from-[#820ad1] to-[#4c0677]', 'text-white'];
        return ['bg-gradient-to-br from-[#1e293b] to-[#0f172a]', 'text-white'];
    };

    const formatCardNumber = (num) => {
        return num ? num.replace(/(\d{4})/g, '$1 ').trim() : '0000 0000 0000 0000';
    };

    const [bgStyle, textStyle] = getBankStyles(config.bankName);

    return (
        <div className="mb-8 animate-in fade-in zoom-in duration-500">
            <div className={`bg-white ${hideButton ? 'p-4 md:p-6' : 'p-6 lg:p-10'} rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden relative`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                
                <div className="flex flex-col xl:flex-row gap-10 relative z-10">
                    <div className="flex flex-col gap-6 items-center">
                        <div className={`w-full max-w-[380px] h-[220px] rounded-2xl shadow-2xl p-6 flex flex-col justify-between transition-all duration-700 transform hover:rotate-1 ${bgStyle} ${textStyle}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                    <span className={`text-[10px] uppercase font-bold tracking-widest opacity-80 italic`}>Débito</span>
                                    <span className="text-xl font-black italic tracking-tighter uppercase">{config.bankName || 'Mi Banco'}</span>
                                </div>
                                <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg border border-white/30 text-right">
                                    <p className="text-[8px] uppercase font-bold opacity-80">Total a Pagar</p>
                                    <p className="text-lg font-black tracking-tight">${totalCost}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-[9px] uppercase tracking-[0.2em] mb-1 opacity-70 font-bold">Número de Cuenta</p>
                                <p className="text-xl font-mono font-bold tracking-[0.15em] drop-shadow-sm">
                                    {formatCardNumber(config.accountNumber)}
                                </p>
                            </div>

                            <div className="flex justify-between items-end">
                                <div className="flex flex-col">
                                    <p className="text-[9px] uppercase tracking-widest mb-1 opacity-70 font-bold">Beneficiario</p>
                                    <p className="text-sm font-bold truncate max-w-[200px] uppercase tracking-wide">{config.beneficiaryName || 'No asignado'}</p>
                                </div>
                                <div className="flex -space-x-3">
                                    <div className="w-7 h-7 rounded-full bg-red-500/80 border border-white/20"></div>
                                    <div className="w-7 h-7 rounded-full bg-yellow-500/80 border border-white/20"></div>
                                </div>
                            </div>
                        </div>

                        <div className="w-full max-w-[380px] bg-red-50 border-2 border-dashed border-red-200 p-5 rounded-2xl">
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <i className="fas fa-exclamation-triangle"></i> Concepto de Pago Obligatorio
                            </p>
                            <p className="text-2xl font-mono font-black text-red-600 text-center select-all bg-white py-2 rounded-lg border border-red-100 shadow-sm">
                                {paymentConcept || "CARGANDO..."}
                            </p>
                            <p className="text-[9px] text-red-400 mt-2 leading-tight italic text-center">
                                * Escribe este texto exacto en tu transferencia.
                            </p>
                        </div>
                    </div>

                    <div className="flex-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4">
                            Instrucciones Finales
                        </div>
                        
                        <h2 className="text-2xl font-black text-gray-800 leading-tight uppercase mb-4">
                            Sigue estos pasos para validar:
                        </h2>

                        <div className="grid gap-4 mb-6">
                            <div className="flex gap-4 items-start">
                                <div className="bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1">1</div>
                                <p className="text-sm text-gray-600 font-medium">
                                    Realiza la transferencia por <span className="font-black text-gray-800">${totalCost} MXN</span> a la cuenta mostrada.
                                </p>
                            </div>
                            <div className="flex gap-4 items-start">
                                <div className="bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1">2</div>
                                <p className="text-sm text-gray-600 font-medium">
                                    Coloca <span className="text-red-600 font-bold underline">{paymentConcept}</span> como concepto. <span className="font-bold text-gray-800 italic text-xs block mt-1">Si el concepto es incorrecto o falta, tu jugada quedará ANULADA automáticamente.</span>
                                </p>
                            </div>
                            <div className="flex gap-4 items-start">
                                <div className="bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1">3</div>
                                <p className="text-sm text-gray-600 font-medium">Envía captura del comprobante por WhatsApp al <span className="text-emerald-600 font-bold">{config.phoneNumber}</span>.</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <a 
                                href={`https://wa.me/${config.phoneNumber?.replace(/\s/g, '')}?text=Hola, envío mi comprobante de pago por $${totalCost}. Concepto: ${paymentConcept}`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full sm:w-auto bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black hover:bg-emerald-600 transition-all shadow-lg flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
                            >
                                <i className="fab fa-whatsapp text-lg"></i>
                                Enviar WhatsApp
                            </a>
                            {!hideButton && (
                                <button 
                                    onClick={onNavigate}
                                    className="w-full sm:w-auto bg-gray-100 text-gray-600 px-8 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all uppercase text-xs tracking-widest active:scale-95"
                                >
                                    Ver mis jugadas
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentBanner;