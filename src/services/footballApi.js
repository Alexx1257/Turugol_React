export const API_ROOT_URL = 'https://v3.football.api-sports.io';

export const API_HEADERS = {
    'x-rapidapi-key': import.meta.env.VITE_API_FOOTBALL_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io'
};

export const fetchFromApi = async (endpoint, queryParams = '') => {
    const url = `${API_ROOT_URL}/${endpoint}${queryParams}`;
    const response = await fetch(url, { headers: API_HEADERS });
    if (!response.ok) {
        throw new Error(`Error en API Football: ${response.statusText}`);
    }
    return await response.json();
};