import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const useAuthStatusAndRole = () => {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [role, setRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true); 

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      // MODIFICACIÓN: Limpiamos el rol inmediatamente para evitar 
      // que el rol del usuario anterior interfiera con el nuevo.
      setRole(null);
      setLoadingRole(true);
      
      setUser(currentUser);
      setAuthReady(true);
      
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userRef);

          if (snap.exists()) {
            setRole(snap.data().role || 'user');
          } else {
            setRole('guest');
          }
        } catch (error) {
          console.error("Error al obtener el rol:", error);
          setRole('guest');
        } finally {
          setLoadingRole(false);
        }
      } else {
        setRole('guest');
        setLoadingRole(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return { user, authReady, role, loadingRole };
};

export default useAuthStatusAndRole;