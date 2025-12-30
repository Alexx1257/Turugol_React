import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // 1. Importamos useLocation
import { signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config"; 

// [NUEVO] Importación exclusiva de Sonner
import { toast } from 'sonner';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation(); // 2. Inicializamos el hook de ubicación

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

    // 3. Detectamos si hay una página pendiente (ej: una quiniela compartida)
    const from = location.state?.from?.pathname || null;

    const handleFirebaseError = (error) => {
        const map = {
            "auth/user-not-found": "El correo electrónico no está registrado. Verifica si lo escribiste bien o crea una cuenta nueva.",
            "auth/wrong-password": "La contraseña es incorrecta. Asegúrate de que las mayúsculas y minúsculas sean correctas.",
            "auth/invalid-email": "El formato del correo electrónico no es válido (ejemplo: usuario@correo.com).",
            "auth/too-many-requests": "Demasiados intentos fallidos. Por seguridad, la cuenta se ha bloqueado temporalmente. Intenta de nuevo en unos minutos.",
            "auth/network-request-failed": "No hay conexión a internet. Revisa tu señal e intenta de nuevo.",
            "auth/user-disabled": "Esta cuenta ha sido suspendida. Contacta con el administrador.",
            "auth/invalid-credential": "Los datos de acceso son incorrectos. Por favor, verifica tu correo y contraseña."
        };
        
        const message = map[error.code] || "Ocurrió un error inesperado. Por favor, intenta de nuevo.";
        setServerError(message);
        
        // [NUEVO] Manejo de error de servidor con Toast descriptivo
        toast.error('Error de acceso', {
            description: message,
            duration: 5000
        });
    };

    const isValidEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError(""); 
        setVerificationSent(false);

        // [MODIFICADO] Validaciones con Toast descriptivo
        if (!email) return toast.warning('Falta el correo', { description: 'Introduce tu dirección de email para continuar.' });
        if (!password) return toast.warning('Falta la contraseña', { description: 'Debes ingresar tu clave de acceso.' });
        if (!isValidEmail(email)) return toast.warning('Correo no válido', { description: 'El formato de email ingresado es incorrecto.' });
        if (password.length < 6) return toast.warning('Contraseña muy corta', { description: 'Tu contraseña debe tener al menos 6 caracteres.' });
        
        setIsLoading(true);
        const toastId = toast.loading('Verificando tus datos...', {
            description: 'Conectando con el servidor de TURUGOL'
        });

        try {
            const res = await signInWithEmailAndPassword(auth, email, password);
            const user = res.user;

            if (!user.emailVerified) {
                await sendEmailVerification(user);
                setVerificationSent(true);
                setIsLoading(false);
                const verifyMsg = "Tu correo no está verificado.";
                setServerError(verifyMsg);
                
                // [MODIFICADO] De SweetAlert2 a Sonner descriptivo
                toast.dismiss(toastId);
                return toast.info('¡Casi listo!', {
                    description: 'Tu cuenta no está activa. Enviamos un enlace de verificación. Revisa tu bandeja de entrada o spam.',
                    duration: 8000
                });
            }

            const userRef = doc(db, "users", user.uid);
            const snap = await getDoc(userRef);

            if (!snap.exists()) {
                const noProfileMsg = "No se encontró el perfil de usuario.";
                setServerError(noProfileMsg);
                toast.error('Perfil no encontrado', { id: toastId, description: noProfileMsg });
                setIsLoading(false);
                return;
            }

            const role = snap.data().role; 
            
            toast.success('¡Acceso concedido!', { 
                id: toastId,
                description: 'Bienvenido de nuevo a TURUGOL.'
            });
            
            setTimeout(() => {
                if (from) {
                    navigate(from, { replace: true });
                } else {
                    const redirectPath = role === 'admin' ? '/dashboard/admin' : '/dashboard/user';
                    navigate(redirectPath, { replace: true }); 
                }
            }, 600);
            
        } catch (error) {
            handleFirebaseError(error);
            setIsLoading(false);
            toast.dismiss(toastId);
        }
    };

    const handleForgotPassword = () => {
        navigate('/forgot-password');
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
                        Inicia sesión en tu cuenta
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        O 
                        <Link 
                            to="/register" 
                            state={{ from: location.state?.from }}
                            className="font-medium text-emerald-600 hover:text-emerald-500 ml-1"
                        >
                            crea una cuenta nueva
                        </Link>
                    </p>
                </div>
                
                <div className="bg-white py-8 px-4 shadow-lg rounded-2xl sm:px-10 border border-gray-100">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        
                        {/* [LIMPIEZA] Se eliminaron los bloques de mensajes fijos (divs) */}

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
                                    className="pl-10 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
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
                                    className="pl-10 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
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
                                <Link 
                                    to="/register" 
                                    state={{ from: location.state?.from }}
                                    className="font-medium text-emerald-600 hover:text-emerald-500 ml-1"
                                >
                                    crea una cuenta nueva
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;