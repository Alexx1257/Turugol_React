// src/components/Login.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// 🛑 RUTA CORREGIDA: Asumiendo que firebase/config está en src/firebase/config.js
import { signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config"; // <--- CORRECCIÓN AQUÍ


const Login = () => {
    const navigate = useNavigate();

    // Estado del Formulario
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Estado de UI y Lógica
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Estado de Errores y Mensajes de Firebase 
    const [serverError, setServerError] = useState("");
    const [verificationSent, setVerificationSent] = useState(false);

    // =========================
    // Manejo de Errores y Mapeo
    // =========================
    const handleFirebaseError = (error) => {
        const map = {
            "auth/user-not-found": "No existe una cuenta con este email",
            "auth/wrong-password": "Contraseña incorrecta",
            "auth/invalid-email": "Correo inválido",
            "auth/too-many-requests": "Demasiados intentos fallidos. Intenta más tarde",
            "auth/network-request-failed": "Error de conexión",
            "auth/user-disabled": "Esta cuenta ha sido deshabilitada",
        };

        setServerError(map[error.code] || "Error desconocido al iniciar sesión. (" + error.code + ")");
    };

    // =========================
    // Validaciones Locales
    // =========================
    const isValidEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    // =========================
    // Submit (LÓGICA DE FIREBASE INTEGRADA)
    // =========================
    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError(""); 
        setVerificationSent(false);

        // Validaciones Locales
        if (!email || !password) {
            return alert('Por favor, completa todos los campos');
        }
        if (!isValidEmail(email)) {
            return alert('Por favor, introduce un correo electrónico válido');
        }
        if (password.length < 6) {
            return alert('La contraseña debe tener al menos 6 caracteres');
        }
        
        setIsLoading(true);

        try {
            // 1. Login con Firebase Auth
            const res = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            const user = res.user;

            // 2. Verificar correo
            if (!user.emailVerified) {
                await sendEmailVerification(user);
                setVerificationSent(true);
                setIsLoading(false);
                return setServerError(
                    "Tu correo no está verificado. Se ha enviado un nuevo correo de verificación. Por favor, revisa tu bandeja de entrada o spam."
                );
            }

            // 3. Leer perfil (rol) desde Firestore
            const userRef = doc(db, "users", user.uid);
            const snap = await getDoc(userRef);

            if (!snap.exists()) {
                setServerError("Error: Tu perfil de usuario no existe en la base de datos.");
                setIsLoading(false);
                return;
            }

            const userData = snap.data();
            const role = userData.role; 

            // 4. Redirección (Basada en el Rol Real)
            const redirectPath = role === 'admin' ? '/dashboard/admin' : '/dashboard/user';
            
            navigate(redirectPath); 
            
        } catch (error) {
            handleFirebaseError(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = () => {
        alert('Redirigiendo al formulario de recuperación de contraseña');
        // navigate('/forgot-password'); // Si tienes esta ruta
    };

    // =========================
    // UI (DISEÑO ORIGINAL MANTENIDO)
    // =========================
    return (
        <div className="max-w-md w-full space-y-8">
            <div className="text-center">
                <Link to="/" className="inline-block">
                    <div className="p-2 rounded-lg font-bold text-4xl">
                        <span className="text-black">TURI</span>
                        <span className="text-emerald-500">GOL</span>
                    </div>
                </Link>
                <h2 className="mt-6 text-3xl font-bold text-gray-900">
                    Inicia sesión en tu cuenta
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    O 
                    <Link to="/register" className="font-medium text-emerald-600 hover:text-emerald-500 ml-1">
                        crea una cuenta nueva
                    </Link>
                </p>
            </div>
            
            <div className="bg-white py-8 px-4 shadow-lg rounded-2xl sm:px-10 border border-gray-100">
                <form className="space-y-6" onSubmit={handleSubmit}>
                    
                    {/* MENSAJES DE ERROR DE FIREBASE */}
                    {verificationSent && (
                        <div className="p-3 text-sm bg-blue-100 border border-blue-400 text-blue-700 rounded-lg">
                            ¡Correo enviado! Revisa tu bandeja de entrada o spam para verificar tu email.
                        </div>
                    )}
                    {serverError && (
                        <div className="p-3 text-sm bg-red-100 border border-red-400 text-red-700 rounded-lg">
                            <p className="font-bold">Error de Acceso:</p>
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
                                name="email" 
                                type="email" 
                                autoComplete="email" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg input-focus focus:outline-none focus:z-10 sm:text-sm"
                                placeholder="ejemplo@correo.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Contraseña
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <i className="fas fa-lock text-gray-400"></i>
                            </div>
                            <input 
                                id="password" 
                                name="password" 
                                type={showPassword ? "text" : "password"} 
                                autoComplete="current-password" 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg input-focus focus:outline-none focus:z-10 sm:text-sm"
                                placeholder="••••••••"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                                <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"} text-gray-400 hover:text-gray-600`}></i>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input 
                                id="remember-me" 
                                name="remember-me" 
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                                Recordarme
                            </label>
                        </div>

                        <div className="text-sm">
                            <button 
                                type="button"
                                onClick={handleForgotPassword}
                                className="font-medium text-emerald-600 hover:text-emerald-500"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>
                    </div>

                    <div>
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                                {isLoading ? (
                                    <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                    <i className="fas fa-sign-in-alt"></i>
                                )}
                            </span>
                            {isLoading ? 'Procesando...' : 'Iniciar sesión'}
                        </button>
                    </div>
                    
                    <div className="pt-6 border-t border-gray-100">
                        <p className="text-center text-sm text-gray-600">
                            ¿Nuevo Fichaje? 
                            <Link to="/register" className="font-medium text-emerald-600 hover:text-emerald-500 ml-1">
                                crea una cuenta nueva
                            </Link>
                        </p>
                    </div>

                </form>
            </div>

        </div>
    );
};

export default Login;