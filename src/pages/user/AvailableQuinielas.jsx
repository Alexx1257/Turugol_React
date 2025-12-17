// src/pages/user/AvailableQuinielas.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import DashboardLayout from '../../components/DashboardLayout';
import QuinielaPlayCard from '../user/QuinielaPlayCard';

const AvailableQuinielas = () => {
    const [quinielas, setQuinielas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQuinielas = async () => {
            try {
                const q = query(collection(db, "quinielas"), orderBy("metadata.createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setQuinielas(docs);
            } catch (error) {
                console.error("Error al cargar quinielas:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchQuinielas();
    }, []);

    return (
        <DashboardLayout isAdmin={false}>
            <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">🏆 Quinielas Disponibles</h2>
                {loading ? (
                    <p>Cargando quinielas...</p>
                ) : quinielas.length > 0 ? (
                    <div className="grid gap-6">
                        {quinielas.map((q) => (
                            <QuinielaPlayCard key={q.id} quiniela={q} />
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No hay quinielas activas en este momento.</p>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AvailableQuinielas;