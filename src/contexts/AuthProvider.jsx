import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile as updateFirebaseProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { AuthContext } from './AuthContext';

function createUserProfile(firebaseUser, profile = {}) {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: profile.name || firebaseUser.displayName || '',
    username: profile.username || '',
    avatar: profile.avatar || firebaseUser.photoURL || '',
    bio: profile.bio || '',
    vibe: profile.vibe || '',
    role: profile.role || 'user',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isOnboarding, setIsOnboarding] = useState(false);

  useEffect(() => {
    let isInitialAuthState = true;
    let authStateRevision = 0;
    return onAuthStateChanged(auth, async (firebaseUser) => {
      const revision = ++authStateRevision;
      if (!firebaseUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      try {
        const profileSnapshot = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (revision !== authStateRevision) return;
        setUser(createUserProfile(firebaseUser, profileSnapshot.exists() ? profileSnapshot.data() : {}));
        setAuthError('');
      } catch (error) {
        if (revision !== authStateRevision) return;
        setUser(createUserProfile(firebaseUser));
        setAuthError(`Signed in, but the user profile could not be loaded: ${error.message}`);
      } finally {
        if (revision === authStateRevision && isInitialAuthState) {
          isInitialAuthState = false;
          setIsLoading(false);
        }
      }
    }, (error) => {
      setAuthError(error.message);
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async ({ email, username, password }) => {
    setAuthError('');
    const credential = await signInWithEmailAndPassword(auth, email || username, password);
    return createUserProfile(credential.user);
  }, []);

  const register = useCallback(async (formData) => {
    setAuthError('');
    const credential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
    const name = formData.name || '';
    const avatar = formData.avatar || '';
    await updateFirebaseProfile(credential.user, {
      displayName: name,
      photoURL: avatar || null,
    });
    const profile = createUserProfile(credential.user, { ...formData, name, avatar });
    await setDoc(doc(db, 'users', credential.user.uid), profile);
    setUser(profile);
    setIsOnboarding(true);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setAuthError('');
    setIsOnboarding(false);
  }, []);

  const value = useMemo(() => ({
    user,
    setUser,
    isLoading,
    authError,
    setAuthError,
    login,
    logout,
    register,
    isOnboarding,
    setIsOnboarding,
  }), [user, isLoading, authError, login, logout, register, isOnboarding]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
