import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase/config';
import { doc, getDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import PaymentBanner from '../admin/quinielas/PaymentBanner';
import FixtureList from './FixtureList'; // Importar nuevo
import QuinielaSummary from './QuinielaSummary'; // Importar nuevo

const PlayQuiniela = () => {
    const { quinielaId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(auth.currentUser);

    const [quiniela, setQuiniela] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [predictions, setPredictions] = useState({});
    const [alreadyPlayed, setAlreadyPlayed] = useState(false);
    const [showPaymentBanner, setShowPaymentBanner] = useState(false);

    const BASE_PRICE = 100;
    const MAX_TRIPLES = 3;
    const MAX_DOUBLES = 4;

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!user || !quinielaId) return;
            try {
                const docSnap = await getDoc(doc(db, 'quinielas', quinielaId));
                if (docSnap.exists()) setQuiniela({ id: docSnap.id, ...docSnap.data() });
                
                const q = query(collection(db, 'userEntries'), where('userId', '==', user.uid), where('quinielaId', '==', quinielaId));
                const entrySnap = await getDocs(q);
                if (!entrySnap.empty) setAlreadyPlayed(true);
            } catch (error) { console.error(error); }
            finally { setLoading(false); }
        };
        fetchData();
    }, [quinielaId, user]);

    const handleSelect = (fixtureId, selection) => {
        if (alreadyPlayed || showPaymentBanner) return;
        setPredictions(prev => {
            const currentPicks = prev[fixtureId] || [];
            const newPicks = currentPicks.includes(selection)
                ? currentPicks.filter(item => item !== selection)
                : [...currentPicks, selection];

            return { ...prev, [fixtureId]: newPicks };
        });
    };

    const calculateStats = () => {
        let doubles = 0, triples = 0, combinations = 1;
        Object.values(predictions).forEach(p => {
            if (p.length === 2) { doubles++; combinations *= 2; }
            if (p.length === 3) { triples++; combinations *= 3; }
        });
        return { doubles, triples, totalCost: BASE_PRICE * combinations, combinations };
    };

    const { doubles, triples, totalCost, combinations } = calculateStats();

    const handleSubmit = async () => {
        if (!user) return alert("Inicia sesión para participar");
        const totalFixtures = quiniela?.fixtures?.length || 0;
        const completeMatches = Object.values(predictions).filter(p => p.length > 0).length;

        if (completeMatches < totalFixtures) {
            return alert("Debes completar todos los partidos.");
        }

        // VALIDACIÓN DE LÍMITES AL CONFIRMAR
        if (triples > MAX_TRIPLES) {
            return alert(`No es posible guardar la quiniela porque se excede el límite permitido de triples. Tienes ${triples} y el máximo es ${MAX_TRIPLES}.`);
        }
        if (doubles > MAX_DOUBLES) {
            return alert(`No es posible guardar la quiniela porque se excede el límite permitido de dobles. Tienes ${doubles} y el máximo es ${MAX_DOUBLES}.`);
        }

        setSubmitting(true);
        try {
            await addDoc(collection(db, 'userEntries'), {
                userId: user.uid,
                userName: user.displayName || 'Usuario',
                email: user.email,
                quinielaId,
                quinielaName: quiniela.metadata.title,
                predictions,
                totalCost,
                combinations,
                createdAt: serverTimestamp(),
                status: 'active',
                points: 0, // [MODIFICADO] de 'puntos' a 'points' para coincidir con las reglas de Firebase
                paymentStatus: 'pending' 
            });
            setShowPaymentBanner(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            alert("Error al enviar: " + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-bold text-emerald-600 animate-pulse text-xl tracking-widest uppercase">Cargando Quiniela...</div>;

    return (
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
            {showPaymentBanner && (
                <PaymentBanner 
                    totalCost={totalCost} 
                    onNavigate={() => navigate('/dashboard/user/history')} 
                />
            )}

            <div className={`flex flex-col lg:flex-row gap-8 items-start transition-opacity duration-500 ${showPaymentBanner ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                
                {/* --- COLUMNA IZQUIERDA --- */}
                <div className="lg:w-2/3 w-full">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                        <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">{quiniela?.metadata?.title}</h1>
                        <p className="text-gray-500 text-xs mt-1 font-medium italic text-blue-600 tracking-tight">Haz clic en los botones centrales para elegir tu pronóstico</p>
                    </div>

                    <FixtureList 
                        fixtures={quiniela?.fixtures} 
                        predictions={predictions} 
                        onSelect={handleSelect}
                        disabled={alreadyPlayed}
                    />
                </div>

                {/* --- COLUMNA DERECHA --- */}
                <div className="lg:w-1/3 w-full space-y-6">
                    <QuinielaSummary 
                        totalCost={totalCost}
                        doubles={doubles}
                        triples={triples}
                        maxDoubles={MAX_DOUBLES}
                        maxTriples={MAX_TRIPLES}
                        onSubmit={handleSubmit}
                        submitting={submitting}
                        disabled={alreadyPlayed}
                    />
                </div>

            </div>
        </div>
    );
};

export default PlayQuiniela;