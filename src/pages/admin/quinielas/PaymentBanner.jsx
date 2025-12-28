import React from 'react';

const PaymentBanner = ({ totalCost, onNavigate }) => {
    return (
        <div className="mb-8 animate-in fade-in zoom-in duration-500">
            <div className="bg-emerald-600 text-white p-8 rounded-3xl shadow-2xl border-4 border-emerald-400">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="bg-white text-emerald-600 w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-lg flex-shrink-0">
                        <i className="fas fa-hand-holding-usd"></i>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-3xl font-black mb-2 uppercase tracking-tight">¡Casi listo! Realiza tu pago</h2>
                        <p className="text-emerald-100 font-medium mb-4 leading-tight">
                            Para validar tu jugada de <span className="font-black text-white text-xl">${totalCost.toLocaleString()}</span>, realiza la transferencia con estos datos:
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-700/50 p-6 rounded-2xl border border-emerald-400/30">
                            <div>
                                <p className="text-[10px] uppercase font-black text-emerald-300 mb-1 tracking-widest">Número de Tarjeta (Débito/Crédito)</p>
                                <p className="text-2xl font-mono font-bold tracking-widest text-white">4152 3134 5678 9012</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black text-emerald-300 mb-1 tracking-widest">Número Celular (Transferencia/SPEI)</p>
                                <p className="text-2xl font-mono font-bold tracking-widest text-white">961 123 4567</p>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col md:flex-row gap-6 items-center">
                            <p className="text-sm italic text-emerald-50 font-medium flex-1 leading-snug">
                                * Una vez realizado el pago, envía tu comprobante por WhatsApp al número mencionado arriba indicando tu nombre de usuario para activar tu jugada.
                            </p>
                            <button 
                                onClick={onNavigate}
                                className="bg-white text-emerald-700 px-8 py-4 rounded-xl font-black hover:bg-emerald-50 transition-all shadow-xl whitespace-nowrap uppercase tracking-widest active:scale-95"
                            >
                                Entendido, ir a mis jugadas
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentBanner;