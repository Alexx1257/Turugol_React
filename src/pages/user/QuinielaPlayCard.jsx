import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const QuinielaPlayCard = ({ quiniela }) => {
    const [userSelections, setUserSelections] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [alreadyPlayed, setAlreadyPlayed] = useState(false);
    const [loading, setLoading] = useState(true);

    const user = auth.currentUser;
    const entryId = user ? `${user.uid}_${quiniela.id}` : null;

    useEffect(() => {
        const checkParticipation = async () => {
            if (!user || !entryId) {
                setLoading(false);
                return;
            }

            try {
                const docRef = doc(db, "userEntries", entryId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    setAlreadyPlayed(true);
                    setUserSelections(docSnap.data().selections || {});
                }
            } catch (error) {
                console.error("Error al verificar participación:", error);
            } finally {
                setLoading(false);
            }
        };

        checkParticipation();
    }, [quiniela.id, user, entryId]);

    const handleSelect = (fixtureId, choice) => {
        if (alreadyPlayed) return;
        setUserSelections(prev => ({ ...prev, [fixtureId]: choice }));
    };

    // 🛑 ESTA ES LA FUNCIÓN QUE DABA EL ERROR DE "NOT DEFINED"
    const handleSubmitEntry = async () => {
        const totalMatches = quiniela.fixtures?.length || 0;
        const selectedCount = Object.keys(userSelections).length;

        if (selectedCount < totalMatches) {
            alert(`Por favor completa todos los partidos (${selectedCount}/${totalMatches})`);
            return;
        }

        setIsSubmitting(true);
        try {
            await setDoc(doc(db, "userEntries", entryId), {
                userId: user.uid,
                userName: user.displayName || 'Usuario',
                quinielaId: quiniela.id,
                quinielaTitle: quiniela.metadata?.title || 'Sin título',
                selections: userSelections,
                submittedAt: serverTimestamp(),
                points: 0,
                status: "pending"
            });
            setAlreadyPlayed(true);
            alert("¡Quiniela enviada con éxito! Mucha suerte.");
        } catch (error) {
            console.error("Error al enviar:", error);
            alert("Hubo un problema al enviar tu jugada.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-6 bg-white shadow rounded-xl animate-pulse text-center">Verificando estado...</div>;

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 mb-8">
            <div className={`${alreadyPlayed ? 'bg-gray-500' : 'bg-emerald-600'} p-4 text-white flex justify-between items-center`}>
                <div>
                    <h3 className="text-lg font-bold">{quiniela.metadata?.title || 'Quiniela'}</h3>
                    <p className="text-xs opacity-90">Cierre: {quiniela.metadata?.deadline ? new Date(quiniela.metadata.deadline).toLocaleString() : 'N/A'}</p>
                </div>
                {alreadyPlayed && <span className="bg-white text-gray-700 text-[10px] font-bold px-2 py-1 rounded-full">YA ESTÁS PARTICIPANDO ✓</span>}
            </div>

            <div className="p-4 space-y-4">
                {quiniela.fixtures?.map((match) => (
                    <div key={match.id} className="flex flex-col md:flex-row items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center space-x-4 w-full md:w-3/5">
                            <div className="flex items-center space-x-2 flex-1 justify-end text-right">
                                <span className="text-sm font-semibold truncate">{match.homeTeam}</span>
                                <img src={match.homeLogo} className="w-6 h-6 object-contain" alt="" />
                            </div>
                            <span className="text-xs font-bold text-gray-400">VS</span>
                            <div className="flex items-center space-x-2 flex-1 text-left">
                                <img src={match.awayLogo} className="w-6 h-6 object-contain" alt="" />
                                <span className="text-sm font-semibold truncate">{match.awayTeam}</span>
                            </div>
                        </div>

                        <div className="flex space-x-2 mt-3 md:mt-0">
                            {['1', 'X', '2'].map((option) => (
                                <button
                                    key={option}
                                    disabled={alreadyPlayed}
                                    onClick={() => handleSelect(match.id, option)}
                                    className={`w-12 h-10 rounded-lg font-bold transition-all ${
                                        userSelections[match.id] === option
                                            ? 'bg-emerald-500 text-white border-b-4 border-emerald-700'
                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                    }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {!alreadyPlayed && (
                <div className="p-4 bg-gray-50 border-t">
                    <button
                        onClick={handleSubmitEntry}
                        disabled={isSubmitting}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? "Enviando..." : "Confirmar mi Jugada"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuinielaPlayCard;