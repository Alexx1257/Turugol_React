import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase/config';
import { doc, getDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import PaymentBanner from '../admin/quinielas/PaymentBanner'; // 🆕 Importación del componente separado

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

            const tempPredictions = { ...prev, [fixtureId]: newPicks };
            let d = 0, t = 0;
            Object.values(tempPredictions).forEach(p => {
                if (p.length === 2) d++;
                if (p.length === 3) t++;
            });

            if (t > MAX_TRIPLES) { alert(`¡Límite! Máximo ${MAX_TRIPLES} Triples.`); return prev; }
            if (d > MAX_DOUBLES) { alert(`¡Límite! Máximo ${MAX_DOUBLES} Dobles.`); return prev; }
            return tempPredictions;
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
            return alert("Debes completar los 9 partidos.");
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
                puntos: 0,
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
            
            {/* 🆕 LLAMADA AL BANNER MODULAR */}
            {showPaymentBanner && (
                <PaymentBanner 
                    totalCost={totalCost} 
                    onNavigate={() => navigate('/dashboard/user/history')} 
                />
            )}

            <div className={`flex flex-col lg:flex-row gap-8 items-start transition-opacity duration-500 ${showPaymentBanner ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                
                {/* --- COLUMNA IZQUIERDA: SELECCIÓN --- */}
                <div className="lg:w-2/3 w-full">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                        <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">{quiniela?.metadata?.title}</h1>
                        <p className="text-gray-500 text-xs mt-1 font-medium italic text-blue-600 tracking-tight">Haz clic en los botones centrales para elegir tu pronóstico</p>
                    </div>

                    <div className="space-y-3">
                        {quiniela?.fixtures?.map((fixture) => {
                            const picks = predictions[fixture.id] || [];
                            return (
                                <div key={fixture.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-4 transition-all hover:border-blue-100">
                                    <div className="flex-1 flex items-center justify-end gap-3 w-full text-right">
                                        <span className="text-sm font-black text-gray-700 leading-tight">{fixture.homeTeam}</span>
                                        <img src={fixture.homeLogo} className="w-10 h-10 object-contain" alt="" />
                                    </div>
                                    <div className="flex gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200 shadow-inner">
                                        {[{l:'L', v:'HOME', c:'bg-blue-600'}, {l:'E', v:'DRAW', c:'bg-orange-500'}, {l:'V', v:'AWAY', c:'bg-green-600'}].map(b => (
                                            <button key={b.v} onClick={() => handleSelect(fixture.id, b.v)} className={`w-12 h-12 rounded-lg font-black text-sm transition-all duration-200 ${picks.includes(b.v) ? `${b.c} text-white shadow-lg scale-110` : 'bg-white text-gray-300 hover:text-gray-500'}`}>{b.l}</button>
                                        ))}
                                    </div>
                                    <div className="flex-1 flex items-center justify-start gap-3 w-full text-left">
                                        <img src={fixture.awayLogo} className="w-10 h-10 object-contain" alt="" />
                                        <span className="text-sm font-black text-gray-700 leading-tight">{fixture.awayTeam}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* --- COLUMNA DERECHA: RESUMEN Y GUÍA --- */}
                <div className="lg:w-1/3 w-full space-y-6">
                    <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl sticky top-6 border border-slate-700">
                        <div className="mb-8 text-center border-b border-slate-800 pb-6">
                            <p className="text-emerald-400 text-[10px] font-black tracking-[0.2em] mb-2 uppercase">Total a Pagar</p>
                            <h2 className="text-6xl font-black text-white">${totalCost.toLocaleString()}</h2>
                        </div>
                        
                        <div className="space-y-4 bg-slate-800/40 p-5 rounded-2xl border border-white/5 mb-6">
                            <div className="flex justify-between items-center border-b border-white/5 pb-2 text-xs">
                                <div className="font-bold text-slate-300 uppercase tracking-widest">Triples <span className="text-slate-500 font-normal ml-1 lowercase">(aseguras)</span></div>
                                <span className={`text-lg font-black ${triples > 0 ? 'text-orange-500' : 'text-slate-600'}`}>{triples}/3</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <div className="font-bold text-slate-300 uppercase tracking-widest">Dobles <span className="text-slate-500 font-normal ml-1 lowercase">(2 opciones)</span></div>
                                <span className={`text-lg font-black ${doubles > 0 ? 'text-blue-500' : 'text-slate-600'}`}>{doubles}/4</span>
                            </div>
                        </div>

                        <button onClick={handleSubmit} disabled={submitting || showPaymentBanner} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black py-5 rounded-2xl transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-95 disabled:opacity-30 mb-10 text-xl uppercase tracking-widest">
                            {submitting ? 'PROCESANDO...' : 'Confirmar y Pagar'}
                        </button>

                        <div className="space-y-8">
                            <h4 className="text-[11px] font-black text-slate-500 border-b border-slate-800 pb-2 tracking-[0.2em] uppercase text-center font-bold">Glosario de Juego</h4>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="text-center p-2 rounded-lg bg-blue-600/10 border border-blue-600/20"><p className="text-blue-500 font-black text-sm">L</p><p className="text-[9px] uppercase text-slate-400 font-bold">Local</p></div>
                                <div className="text-center p-2 rounded-lg bg-orange-600/10 border border-orange-600/20"><p className="text-orange-500 font-black text-sm">E</p><p className="text-[9px] uppercase text-slate-400 font-bold">Empate</p></div>
                                <div className="text-center p-2 rounded-lg bg-green-600/10 border border-green-600/20"><p className="text-green-500 font-black text-sm">V</p><p className="text-[9px] uppercase text-slate-400 font-bold">Visita</p></div>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center font-black text-blue-400 flex-shrink-0 text-xs">2X</div>
                                    <div className="flex-1">
                                        <p className="text-[11px] font-bold text-white mb-1 uppercase tracking-tight italic">Jugada Doble</p>
                                        <p className="text-[10px] text-slate-400 leading-tight mb-2">Seleccionas <span className="text-blue-400 font-bold italic underline">2 opciones</span>. Aumentas tu probabilidad al <span className="text-white font-bold">66%</span> de acertar. <span className="text-blue-400 font-bold italic underline">Duplica el costo.</span></p>
                                        <div className="flex gap-1 bg-slate-800 p-1.5 rounded-lg w-fit opacity-70">
                                            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-[9px] font-black text-white shadow-sm">L</div>
                                            <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center text-[9px] font-black text-white shadow-sm">E</div>
                                            <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-[9px] font-black text-slate-500 shadow-sm">V</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center font-black text-orange-400 flex-shrink-0 text-xs">3X</div>
                                    <div className="flex-1">
                                        <p className="text-[11px] font-bold text-white mb-1 uppercase tracking-tight italic">Jugada Triple</p>
                                        <p className="text-[10px] text-slate-400 leading-tight mb-2">Seleccionas <span className="text-orange-400 font-bold italic underline">los 3 botones</span>. Tienes <span className="text-white font-bold italic underline tracking-tight">100% de probabilidad</span> (Punto Seguro). <span className="text-orange-400 font-bold italic underline">Triplica el costo.</span></p>
                                        <div className="flex gap-1 bg-slate-800 p-1.5 rounded-lg w-fit opacity-70">
                                            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-[9px] font-black text-white shadow-sm">L</div>
                                            <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center text-[9px] font-black text-white shadow-sm">E</div>
                                            <div className="w-6 h-6 rounded bg-green-600 flex items-center justify-center text-[9px] font-black text-white shadow-sm">V</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PlayQuiniela;