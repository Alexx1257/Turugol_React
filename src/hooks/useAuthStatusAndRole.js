// src/hooks/useAuthStatusAndRole.js

import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config'; // Ajusta la ruta si es necesario
import { doc, getDoc } from 'firebase/firestore';

const useAuthStatusAndRole = () => {
    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const [role, setRole] = useState(null);
    const [loadingRole, setLoadingRole] = useState(false);

    useEffect(() => {
        // 1. Verificar estado de autenticación (Auth)
        const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
            setUser(currentUser);
            setAuthReady(true);
            setRole(null); // Resetear rol mientras cargamos

            if (currentUser) {
                // 2. Si hay usuario, cargar el rol desde Firestore
                setLoadingRole(true);
                try {
                    const userRef = doc(db, 'users', currentUser.uid);
                    const snap = await getDoc(userRef);

                    if (snap.exists()) {
                        setRole(snap.data().role || 'user'); // 'user' por defecto si no hay rol
                    } else {
                        console.warn("Perfil de usuario no encontrado en Firestore.");
                        setRole('guest'); // O algún rol seguro si el perfil no existe
                    }
                } catch (error) {
                    console.error("Error al cargar el rol de Firestore:", error);
                    setRole('guest');
                } finally {
                    setLoadingRole(false);
                }
            } else {
                setRole('guest'); // No autenticado
            }
        });

        return () => unsubscribeAuth();
    }, []);

    // authReady: Sabes si el estado de Auth (Firebase) ha terminado de cargar.
    // loadingRole: Sabes si aún estás consultando Firestore para obtener el rol.
    return { user, authReady, role, loadingRole };
};

export default useAuthStatusAndRole;