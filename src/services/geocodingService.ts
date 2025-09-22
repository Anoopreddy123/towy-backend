export interface ReverseGeocodeResult {
    fullAddress: string;
    city?: string;
    state?: string;
    country?: string;
    display: string;
}

// Uses OpenStreetMap Nominatim for reverse geocoding (no API key required)
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=14&addressdetails=1`;
        const response = await fetch(url, {
            headers: {
                // Nominatim requires a valid User-Agent identifying your app
                'User-Agent': 'towy-backend/1.0 (reverse-geocoder)'
            }
        } as any);

        if (!response.ok) return null;
        const data = await response.json();

        const address = data.address || {};
        const city = address.city || address.town || address.village || address.hamlet;
        const state = address.state;
        const country = address.country;

        // Prefer a concise display like "City, State" or fallback to display_name
        const display = [city, state].filter(Boolean).join(', ') || data.display_name;

        return {
            fullAddress: data.display_name,
            city,
            state,
            country,
            display
        };
    } catch (error) {
        console.error('reverseGeocode error:', error);
        return null;
    }
}


