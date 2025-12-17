// src/components/Register.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// 🛑 IMPORTACIONES DE FIREBASE 🛑
import { 
    createUserWithEmailAndPassword, 
    updateProfile,
    sendEmailVerification 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from "../firebase/config"; // Asegúrate de que la ruta '../firebase/config' sea correcta


// Asume que la página de registro es /register y al registrarse redirige al login /login
const Register = () => {
    const navigate = useNavigate();

    // 🛑 ESTADO DE FIREBASE Y DATA
    const [serverError, setServerError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [verificationSent, setVerificationSent] = useState(false);
    
    // ESTADO DEL FORMULARIO (fusionando campos)
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        username: '', // Aunque Firebase Auth no lo usa directamente, lo guardaremos en Firestore
        password: '',
        confirmPassword: '',
    });
    
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 🛑 ESTADOS DE VALIDACIÓN VISUAL (DEL DISEÑO DETALLADO)
    const [passwordStrength, setPasswordStrength] = useState({
        score: 0,
        text: 'Débil',
        color: 'bg-red-500',
        width: '25%'
    });
    const [passwordChecks, setPasswordChecks] = useState({
        length: false,
        number: false,
        capital: false, // Añadimos chequeo de Mayúscula explícitamente
    });
    const [passwordMatch, setPasswordMatch] = useState({
        isMatch: false,
        message: '',
        color: ''
    });

    // =========================
    // LÓGICA DE VALIDACIÓN Y UI
    // =========================

    const isValidEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const checkPasswordStrength = (password) => {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            number: /\d/.test(password),
            capital: /[A-Z]/.test(password), // Chequeo de mayúscula
            special: /[^a-zA-Z0-9]/.test(password),
        };
        
        if (checks.length) score += 1;
        if (checks.number) score += 1;
        if (checks.capital) score += 1;
        if (checks.special) score += 1;

        // Actualizar estado de checks para la UI (usamos solo las 3 principales)
        setPasswordChecks({
            length: checks.length,
            number: checks.number,
            capital: checks.capital,
        });

        // Determinar fuerza visual
        let strength = { score, text: 'Débil', color: 'bg-red-500', width: '25%' };

        if (score === 2) {
            strength = { ...strength, text: 'Regular', color: 'bg-yellow-500', width: '50%' };
        } else if (score === 3) {
            strength = { ...strength, text: 'Buena', color: 'bg-blue-500', width: '75%' };
        } else if (score >= 4) {
            strength = { ...strength, text: 'Fuerte', color: 'bg-emerald-500', width: '100%' }; // Usamos emerald/verde para fuerte
        }

        setPasswordStrength(strength);
    };

    const checkPasswordMatch = (password, confirmPassword) => {
        if (!password || !confirmPassword) {
            setPasswordMatch({ isMatch: false, message: '', color: '' });
            return;
        }

        if (password === confirmPassword && password.length > 0) {
            setPasswordMatch({ 
                isMatch: true, 
                message: '✓ Las contraseñas coinciden', 
                color: 'text-green-600' 
            });
        } else if (confirmPassword.length > 0) {
            setPasswordMatch({ 
                isMatch: false, 
                message: '✗ Las contraseñas no coinciden', 
                color: 'text-red-600' 
            });
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setServerError('');
        setSuccessMessage('');
        
        if (name === 'password') {
            checkPasswordStrength(value);
            checkPasswordMatch(value, formData.confirmPassword);
        }

        if (name === 'confirmPassword') {
            checkPasswordMatch(formData.password, value);
        }
    };
    
    const handleFirebaseError = (error) => {
        const errorMessages = {
            'auth/email-already-in-use': 'Este correo ya está registrado.',
            'auth/invalid-email': 'Correo electrónico inválido.',
            'auth/weak-password': 'La contraseña es demasiado débil (mínimo 8 caracteres, mayúscula, número).',
            'auth/operation-not-allowed': 'Registro no habilitado.',
            'auth/network-request-failed': 'Error de conexión.',
        };
        
        setServerError(errorMessages[error.code] || 'Error desconocido al crear la cuenta. Intenta nuevamente.');
    };

    // =========================
    // SUBMIT (LÓGICA DE FIREBASE)
    // =========================
    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');
        setSuccessMessage('');
        setVerificationSent(false);

        const { firstName, lastName, email, username, password, confirmPassword } = formData;
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        
        // Validaciones mínimas (Las validaciones visuales refuerzan esto)
        if (!firstName || !lastName || !email || !username || !password || !confirmPassword) {
            return setServerError('Por favor, completa todos los campos obligatorios');
        }
        if (!passwordMatch.isMatch) {
            return setServerError('Las contraseñas no coinciden');
        }
        if (passwordStrength.score < 3) {
             return setServerError('La contraseña no cumple con los requisitos mínimos (8 caracteres, mayúscula, número).');
        }

        setIsLoading(true);

        try {
            // 1. Crear usuario con Email y Contraseña en Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );
            
            const user = userCredential.user;

            // 2. Actualizar DisplayName en Firebase Auth
            await updateProfile(user, {
                displayName: fullName
            });

            // 3. Crear Documento de Usuario/Perfil en Firestore (Rol por defecto: "user")
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                name: fullName,
                username: username.trim(),
                email: user.email,
                role: "user", // Rol por defecto
                createdAt: new Date().toISOString()
            });

            // 4. Enviar correo de verificación
            await sendEmailVerification(user, {
                // Redirigir al login después de la verificación exitosa
                url: window.location.origin + '/login' 
            });

            setVerificationSent(true);
            setSuccessMessage(`¡Cuenta creada exitosamente para ${fullName}! Se envió un correo de verificación a ${email}.`);

            // Limpiar formulario
            setFormData({ firstName: '', lastName: '', email: '', username: '', password: '', confirmPassword: '' });

            // Redirigir al login después de 5 segundos
            setTimeout(() => {
                navigate('/login');
            }, 5000);

        } catch (error) {
            handleFirebaseError(error);
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        } finally {
            setIsLoading(false);
        }
    };

    // =========================
    // UI (DISEÑO BASE ORIGINAL MANTENIDO)
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
                    Crea tu cuenta
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    O 
                    <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-500 ml-1">
                        inicia sesión si ya tienes cuenta
                    </Link>
                </p>
            </div>
            
            <div className="bg-white py-8 px-4 shadow-lg rounded-2xl sm:px-10 border border-gray-100">
                <form className="space-y-6" onSubmit={handleSubmit}>
                    
                    {/* 🛑 MENSAJES DE ESTADO DE FIREBASE 🛑 */}
                    {verificationSent && (
                        <div className="p-3 text-sm bg-blue-100 border border-blue-400 text-blue-700 rounded-lg">
                            <p className="font-bold">¡Verificación enviada!</p>
                            {successMessage}
                        </div>
                    )}
                    {serverError && (
                        <div className="p-3 text-sm bg-red-100 border border-red-400 text-red-700 rounded-lg">
                            <p className="font-bold">Error de Registro:</p>
                            {serverError}
                        </div>
                    )}

                    {/* Campos del formulario */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nombre */}
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i className="fas fa-user text-gray-400"></i></div>
                                <input id="firstName" name="firstName" type="text" autoComplete="given-name" required value={formData.firstName} onChange={handleInputChange} disabled={isLoading}
                                    className="pl-10 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg input-focus focus:outline-none focus:z-10 sm:text-sm" placeholder="Juan" />
                            </div>
                        </div>

                        {/* Apellido */}
                        <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i className="fas fa-user text-gray-400"></i></div>
                                <input id="lastName" name="lastName" type="text" autoComplete="family-name" required value={formData.lastName} onChange={handleInputChange} disabled={isLoading}
                                    className="pl-10 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg input-focus focus:outline-none focus:z-10 sm:text-sm" placeholder="Pérez" />
                            </div>
                        </div>
                    </div>

                    {/* Correo electrónico */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i className="fas fa-envelope text-gray-400"></i></div>
                            <input id="email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleInputChange} disabled={isLoading}
                                className="pl-10 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg input-focus focus:outline-none focus:z-10 sm:text-sm" placeholder="ejemplo@correo.com" />
                        </div>
                    </div>

                    {/* Nombre de usuario */}
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Nombre de usuario</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i className="fas fa-at text-gray-400"></i></div>
                            <input id="username" name="username" type="text" autoComplete="username" required value={formData.username} onChange={handleInputChange} disabled={isLoading}
                                className="pl-10 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg input-focus focus:outline-none focus:z-10 sm:text-sm" placeholder="juanperez" />
                        </div>
                    </div>

                    {/* Contraseña */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i className="fas fa-lock text-gray-400"></i></div>
                            <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required value={formData.password} onChange={handleInputChange} disabled={isLoading}
                                className="pl-10 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg input-focus focus:outline-none focus:z-10 sm:text-sm" placeholder="••••••••" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"} text-gray-400 hover:text-gray-600`}></i>
                            </button>
                        </div>
                        
                        {/* Indicador de fortaleza de contraseña */}
                        <div className="mt-2">
                            <div className="flex justify-between mb-1">
                                <span className="text-xs text-gray-500">Fortaleza de la contraseña</span>
                                <span className={`text-xs font-medium ${passwordStrength.color.replace('bg-', 'text-')}`}>
                                    {passwordStrength.text}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                    className={`${passwordStrength.color} h-1.5 rounded-full transition-all duration-300`}
                                    style={{ width: passwordStrength.width }}
                                ></div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                                <p>La contraseña debe contener al menos:</p>
                                <ul className="list-disc list-inside ml-2">
                                    <li className={passwordChecks.length ? "text-emerald-600" : "text-red-500"}>
                                        8 caracteres
                                    </li>
                                    <li className={passwordChecks.capital ? "text-emerald-600" : "text-red-500"}>
                                        1 mayúscula
                                    </li>
                                    <li className={passwordChecks.number ? "text-emerald-600" : "text-red-500"}>
                                        1 número
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Confirmar contraseña */}
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i className="fas fa-lock text-gray-400"></i></div>
                            <input id="confirmPassword" name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" required value={formData.confirmPassword} onChange={handleInputChange} disabled={isLoading}
                                className="pl-10 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg input-focus focus:outline-none focus:z-10 sm:text-sm" placeholder="••••••••" />
                        </div>
                        {passwordMatch.message && (
                            <div className={`mt-1 text-xs ${passwordMatch.color}`}>
                                {passwordMatch.message}
                            </div>
                        )}
                    </div>

                    {/* Botón de registro */}
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
                                    <i className="fas fa-user-plus"></i>
                                )}
                            </span>
                            {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
                        </button>
                    </div>

                    {/* Enlace a login */}
                    <div className="pt-6 border-t border-gray-100">
                        <p className="text-center text-sm text-gray-600">
                            ¿Ya tienes una cuenta? 
                            <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-500 ml-1">
                                Iniciar sesión
                            </Link>
                        </p>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default Register;