// src/components/Register.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
    createUserWithEmailAndPassword, 
    updateProfile,
    sendEmailVerification 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from "../firebase/config";

const Register = () => {
    const navigate = useNavigate();

    const [serverError, setServerError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [verificationSent, setVerificationSent] = useState(false);
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
    });
    
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [passwordStrength, setPasswordStrength] = useState({
        score: 0,
        text: 'Débil',
        color: 'bg-red-500',
        width: '25%'
    });
    const [passwordChecks, setPasswordChecks] = useState({
        length: false,
        number: false,
        capital: false,
    });
    const [passwordMatch, setPasswordMatch] = useState({
        isMatch: false,
        message: '',
        color: ''
    });

    const checkPasswordStrength = (password) => {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            number: /\d/.test(password),
            capital: /[A-Z]/.test(password),
            special: /[^a-zA-Z0-9]/.test(password),
        };
        
        if (checks.length) score += 1;
        if (checks.number) score += 1;
        if (checks.capital) score += 1;
        if (checks.special) score += 1;

        setPasswordChecks({
            length: checks.length,
            number: checks.number,
            capital: checks.capital,
        });

        let strength = { score, text: 'Débil', color: 'bg-red-500', width: '25%' };
        if (score === 2) strength = { ...strength, text: 'Regular', color: 'bg-yellow-500', width: '50%' };
        else if (score === 3) strength = { ...strength, text: 'Buena', color: 'bg-blue-500', width: '75%' };
        else if (score >= 4) strength = { ...strength, text: 'Fuerte', color: 'bg-emerald-500', width: '100%' };

        setPasswordStrength(strength);
    };

    const checkPasswordMatch = (password, confirmPassword) => {
        if (!password || !confirmPassword) {
            setPasswordMatch({ isMatch: false, message: '', color: '' });
            return;
        }
        if (password === confirmPassword && password.length > 0) {
            setPasswordMatch({ isMatch: true, message: '✓ Las contraseñas coinciden', color: 'text-green-600' });
        } else if (confirmPassword.length > 0) {
            setPasswordMatch({ isMatch: false, message: '✗ Las contraseñas no coinciden', color: 'text-red-600' });
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'password') {
            checkPasswordStrength(value);
            checkPasswordMatch(value, formData.confirmPassword);
        }
        if (name === 'confirmPassword') {
            checkPasswordMatch(formData.password, value);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');
        if (passwordStrength.score < 3) return setServerError('Contraseña demasiado débil.');
        if (!passwordMatch.isMatch) return setServerError('Las contraseñas no coinciden.');
        
        setIsLoading(true);
        try {
            const res = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            await updateProfile(res.user, { displayName: `${formData.firstName} ${formData.lastName}` });
            await setDoc(doc(db, 'users', res.user.uid), {
                uid: res.user.uid,
                name: `${formData.firstName} ${formData.lastName}`,
                username: formData.username.trim(),
                email: res.user.email,
                role: "user",
                createdAt: new Date().toISOString()
            });
            await sendEmailVerification(res.user, { url: window.location.origin + '/login' });
            setVerificationSent(true);
            setSuccessMessage('Cuenta creada. Verifica tu email.');
            setTimeout(() => navigate('/login'), 5000);
        } catch (error) {
            setServerError('Error al registrar. Intenta de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // 🛑 CONTENEDOR DE CENTRADO (Mantiene el bg original si lo deseas)
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 w-full">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <Link to="/" className="inline-block">
                        <div className="p-2 rounded-lg font-bold text-4xl">
                            <span className="text-black">TURI</span>
                            <span className="text-emerald-500">GOL</span>
                        </div>
                    </Link>
                    <h2 className="mt-6 text-3xl font-bold text-gray-900">Crea tu cuenta</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        O <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-500 ml-1">inicia sesión</Link>
                    </p>
                </div>
                
                <div className="bg-white py-8 px-4 shadow-lg rounded-2xl sm:px-10 border border-gray-100">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {verificationSent && <div className="p-3 text-sm bg-blue-100 text-blue-700 rounded-lg">{successMessage}</div>}
                        {serverError && <div className="p-3 text-sm bg-red-100 text-red-700 rounded-lg">{serverError}</div>}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i className="fas fa-user text-gray-400"></i></div>
                                    <input name="firstName" type="text" required value={formData.firstName} onChange={handleInputChange} className="pl-10 block w-full px-3 py-3 border border-gray-300 rounded-lg sm:text-sm" placeholder="Juan" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i className="fas fa-user text-gray-400"></i></div>
                                    <input name="lastName" type="text" required value={formData.lastName} onChange={handleInputChange} className="pl-10 block w-full px-3 py-3 border border-gray-300 rounded-lg sm:text-sm" placeholder="Pérez" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i className="fas fa-envelope text-gray-400"></i></div>
                                <input name="email" type="email" required value={formData.email} onChange={handleInputChange} className="pl-10 block w-full px-3 py-3 border border-gray-300 rounded-lg sm:text-sm" placeholder="ejemplo@correo.com" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i className="fas fa-at text-gray-400"></i></div>
                                <input name="username" type="text" required value={formData.username} onChange={handleInputChange} className="pl-10 block w-full px-3 py-3 border border-gray-300 rounded-lg sm:text-sm" placeholder="juanperez" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i className="fas fa-lock text-gray-400"></i></div>
                                <input name="password" type={showPassword ? "text" : "password"} required value={formData.password} onChange={handleInputChange} className="pl-10 block w-full px-3 py-3 border border-gray-300 rounded-lg sm:text-sm" placeholder="••••••••" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center"><i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"} text-gray-400`}></i></button>
                            </div>
                            
                            <div className="mt-2">
                                <div className="flex justify-between mb-1">
                                    <span className="text-xs text-gray-500">Fortaleza</span>
                                    <span className={`text-xs font-medium ${passwordStrength.color.replace('bg-', 'text-')}`}>{passwordStrength.text}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div className={`${passwordStrength.color} h-1.5 rounded-full transition-all duration-300`} style={{ width: passwordStrength.width }}></div>
                                </div>
                                <div className="mt-2 text-xs text-gray-500">
                                    <ul className="list-disc list-inside ml-2">
                                        <li className={passwordChecks.length ? "text-emerald-600" : "text-red-500"}>8 caracteres</li>
                                        <li className={passwordChecks.capital ? "text-emerald-600" : "text-red-500"}>1 mayúscula</li>
                                        <li className={passwordChecks.number ? "text-emerald-600" : "text-red-500"}>1 número</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i className="fas fa-lock text-gray-400"></i></div>
                                <input name="confirmPassword" type={showPassword ? "text" : "password"} required value={formData.confirmPassword} onChange={handleInputChange} className="pl-10 block w-full px-3 py-3 border border-gray-300 rounded-lg sm:text-sm" placeholder="••••••••" />
                            </div>
                            {passwordMatch.message && <div className={`mt-1 text-xs ${passwordMatch.color}`}>{passwordMatch.message}</div>}
                        </div>

                        <button type="submit" disabled={isLoading} className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50">
                            {isLoading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-user-plus mr-2"></i>}
                            {isLoading ? 'Creando...' : 'Crear cuenta'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;