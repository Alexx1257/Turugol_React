// src/services/footballApi.js
export const API_ROOT_URL = 'https://v3.football.api-sports.io';

export const API_HEADERS = {
    'x-rapidapi-key': import.meta.env.VITE_API_FOOTBALL_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io'
};

export const fetchFromApi = async (endpoint, queryParams = '') => {
    const url = `${API_ROOT_URL}/${endpoint}${queryParams}`;

    // --- NUEVO: Lógica de Caché para evitar request innecesarias ---
    const cachedData = sessionStorage.getItem(url);
    if (cachedData) {
        return JSON.parse(cachedData);
    }
    // -------------------------------------------------------------

    const response = await fetch(url, { headers: API_HEADERS });
    if (!response.ok) {
        throw new Error(`Error en API Football: ${response.statusText}`);
    }
    
    const data = await response.json();

    // --- NUEVO: Guardado en Caché si la respuesta es exitosa ---
    if (data && data.response && data.response.length > 0) {
        sessionStorage.setItem(url, JSON.stringify(data));
    }
    // ----------------------------------------------------------

    return data;
};