import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/config";

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [serverError, setServerError] = useState("");

    const handleFirebaseError = (error) => {
        const map = {
            "auth/user-not-found": "No existe una cuenta con este email",
            "auth/invalid-email": "Correo inválido",
            "auth/network-request-failed": "Error de conexión",
        };
        setServerError(map[error.code] || "Error al procesar la solicitud. (" + error.code + ")");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError("");
        setMessage("");

        if (!email) return alert('Por favor, introduce tu correo electrónico');
        
        setIsLoading(true);

        try {
            await sendPasswordResetEmail(auth, email);
            setMessage("Se ha enviado un enlace de recuperación a tu correo. Revisa tu bandeja de entrada o spam.");
        } catch (error) {
            handleFirebaseError(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 w-full">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <Link to="/" className="inline-block">
                        <div className="p-2 rounded-lg font-bold text-4xl">
                            <span className="text-black">TURU</span>
                            <span className="text-emerald-500">GOL</span>
                        </div>
                    </Link>
                    <h2 className="mt-6 text-3xl font-bold text-gray-900">
                        Recuperar contraseña
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Introduce tu correo y te enviaremos instrucciones
                    </p>
                </div>
                
                <div className="bg-white py-8 px-4 shadow-lg rounded-2xl sm:px-10 border border-gray-100">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        
                        {message && (
                            <div className="p-3 text-sm bg-emerald-100 border border-emerald-400 text-emerald-700 rounded-lg text-center">
                                {message}
                            </div>
                        )}
                        
                        {serverError && (
                            <div className="p-3 text-sm bg-red-100 border border-red-400 text-red-700 rounded-lg">
                                <p className="font-bold">Error:</p>
                                {serverError}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Correo electrónico
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <i className="fas fa-envelope text-gray-400"></i>
                                </div>
                                <input 
                                    id="email" 
                                    type="email" 
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 appearance-none block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                                    placeholder="ejemplo@correo.com"
                                />
                            </div>
                        </div>

                        <div>
                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-300 disabled:opacity-50"
                            >
                                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                                    {isLoading ? (
                                        <i className="fas fa-spinner fa-spin"></i>
                                    ) : (
                                        <i className="fas fa-paper-plane"></i>
                                    )}
                                </span>
                                {isLoading ? 'Enviando...' : 'Enviar enlace'}
                            </button>
                        </div>
                        
                        <div className="pt-6 border-t border-gray-100 text-center">
                            <Link 
                                to="/login" 
                                className="font-medium text-emerald-600 hover:text-emerald-500 text-sm"
                            >
                                Volver al inicio de sesión
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;