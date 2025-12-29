import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PaymentSettingsForm = () => {
    const [paymentConfig, setPaymentConfig] = useState({
        accountNumber: '',
        phoneNumber: '',
        beneficiaryName: '',
        bankName: '' // Nuevo campo añadido
    });
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    useEffect(() => {
        const fetchPaymentConfig = async () => {
            try {
                const configSnap = await getDoc(doc(db, 'settings', 'payment'));
                if (configSnap.exists()) {
                    setPaymentConfig(configSnap.data());
                } else {
                    setPaymentConfig({
                        accountNumber: '4152313456789012',
                        phoneNumber: '9611234567',
                        beneficiaryName: 'Administrador TuruGol',
                        bankName: 'Banco Azteca'
                    });
                }
            } catch (error) {
                console.error("Error cargando configuración de pago:", error);
            }
        };
        fetchPaymentConfig();
    }, []);

    const handleSavePaymentConfig = async (e) => {
        e.preventDefault();

        // VALIDACIONES DE LONGITUD EXACTA
        if (paymentConfig.accountNumber.length !== 16) {
            alert('El número de tarjeta debe tener exactamente 16 dígitos.');
            return;
        }
        if (paymentConfig.phoneNumber.length !== 10) {
            alert('El número de celular debe tener exactamente 10 dígitos.');
            return;
        }
        if (!paymentConfig.bankName || paymentConfig.bankName.length < 3) {
            alert('Por favor ingresa un nombre de banco válido.');
            return;
        }

        setIsSavingConfig(true);
        try {
            await setDoc(doc(db, 'settings', 'payment'), paymentConfig);
            alert('Datos del banner de pago actualizados correctamente.');
        } catch (error) {
            console.error("Error al guardar config:", error);
            alert('No se pudo actualizar la información.');
        } finally {
            setIsSavingConfig(false);
        }
    };

    // Validación: Solo números
    const handleNumberChange = (e, field, maxLength) => {
        const value = e.target.value.replace(/\D/g, ''); 
        if (value.length <= maxLength) {
            setPaymentConfig({ ...paymentConfig, [field]: value });
        }
    };

    // Validación genérica para texto: Solo letras y espacios (sin números ni símbolos)
    const handleTextChange = (e, field, maxLength) => {
        const value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ''); 
        if (value.length <= maxLength) {
            setPaymentConfig({ ...paymentConfig, [field]: value });
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                <i className="fas fa-university mr-2 text-emerald-600"></i>
                Datos de Pago (Banner)
            </h3>
            <form onSubmit={handleSavePaymentConfig} className="space-y-4">
                {/* Nombre del Beneficiario */}
                <div>
                    <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Nombre del Beneficiario</label>
                    <input 
                        type="text" 
                        className="w-full mt-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={paymentConfig.beneficiaryName || ''}
                        onChange={(e) => handleTextChange(e, 'beneficiaryName', 45)}
                        placeholder="Nombre completo"
                        required
                    />
                </div>

                {/* Banco */}
                <div>
                    <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Banco</label>
                    <input 
                        type="text" 
                        className="w-full mt-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={paymentConfig.bankName || ''}
                        onChange={(e) => handleTextChange(e, 'bankName', 30)}
                        placeholder="Nombre del banco (Solo letras)"
                        required
                    />
                </div>

                {/* Número de Tarjeta */}
                <div>
                    <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest">N° Tarjeta (16 dígitos)</label>
                    <input 
                        type="text" 
                        className="w-full mt-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={paymentConfig.accountNumber}
                        onChange={(e) => handleNumberChange(e, 'accountNumber', 16)}
                        placeholder="0000 0000 0000 0000"
                        required
                    />
                    <p className="text-[9px] text-gray-400 mt-1">Dígitos: {paymentConfig.accountNumber.length}/16</p>
                </div>

                {/* Celular */}
                <div>
                    <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Celular (10 dígitos)</label>
                    <input 
                        type="text" 
                        className="w-full mt-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={paymentConfig.phoneNumber}
                        onChange={(e) => handleNumberChange(e, 'phoneNumber', 10)}
                        placeholder="9611234567"
                        required
                    />
                    <p className="text-[9px] text-gray-400 mt-1">Dígitos: {paymentConfig.phoneNumber.length}/10</p>
                </div>

                <button 
                    type="submit"
                    disabled={isSavingConfig}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 shadow-md"
                >
                    {isSavingConfig ? 'Guardando...' : 'Actualizar Información'}
                </button>
            </form>
        </div>
    );
};

export default PaymentSettingsForm;