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
      // Limpiamos todo al detectar cualquier cambio de auth
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