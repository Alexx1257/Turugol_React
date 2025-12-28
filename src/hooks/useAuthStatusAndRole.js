import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const useAuthStatusAndRole = () => {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [role, setRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      setRole(null);

      if (currentUser) {
        setLoadingRole(true);
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
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return { user, authReady, role, loadingRole };
};

export default useAuthStatusAndRole;
