/** USA bounds helpers + haversine for service-area matching */

export const USA_DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 } // geographic center contiguous US
export const USA_DEFAULT_CITY = { lat: 32.7767, lng: -96.797 } // Dallas

/** Rough USA bounding boxes (contiguous + AK + HI) */
export function isInUSA(lat: number, lng: number): boolean {
  // Contiguous US
  if (lat >= 24.5 && lat <= 49.5 && lng >= -125 && lng <= -66.5) return true
  // Alaska
  if (lat >= 51 && lat <= 71.5 && lng >= -180 && lng <= -129) return true
  // Hawaii
  if (lat >= 18.5 && lat <= 22.5 && lng >= -161 && lng <= -154) return true
  return false
}

export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 3958.8
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Curated USA truck-stop / city search fallback when Geocoder unavailable */
export const USA_SEARCH_PLACES: {
  label: string
  city: string
  state: string
  lat: number
  lng: number
}[] = [
  { label: 'Dallas, TX', city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.797 },
  { label: 'Fort Worth, TX', city: 'Fort Worth', state: 'TX', lat: 32.7555, lng: -97.3308 },
  { label: 'Houston, TX', city: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
  { label: 'Austin, TX', city: 'Austin', state: 'TX', lat: 30.2672, lng: -97.7431 },
  { label: 'San Antonio, TX', city: 'San Antonio', state: 'TX', lat: 29.4241, lng: -98.4936 },
  { label: 'El Paso, TX', city: 'El Paso', state: 'TX', lat: 31.7619, lng: -106.485 },
  { label: 'I-35 Corridor, Dallas TX', city: 'Dallas', state: 'TX', lat: 32.82, lng: -96.85 },
  { label: 'I-10 San Antonio, TX', city: 'San Antonio', state: 'TX', lat: 29.4241, lng: -98.4936 },
  { label: 'Los Angeles, CA', city: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
  { label: 'Sacramento, CA', city: 'Sacramento', state: 'CA', lat: 38.5816, lng: -121.4944 },
  { label: 'San Francisco, CA', city: 'San Francisco', state: 'CA', lat: 37.7749, lng: -122.4194 },
  { label: 'San Jose, CA', city: 'San Jose', state: 'CA', lat: 37.3382, lng: -121.8863 },
  { label: 'Oakland, CA', city: 'Oakland', state: 'CA', lat: 37.8044, lng: -122.2712 },
  { label: 'Fresno, CA', city: 'Fresno', state: 'CA', lat: 36.7378, lng: -119.7871 },
  { label: 'Bakersfield, CA', city: 'Bakersfield', state: 'CA', lat: 35.3733, lng: -119.0187 },
  { label: 'San Diego, CA', city: 'San Diego', state: 'CA', lat: 32.7157, lng: -117.1611 },
  { label: 'Stockton, CA', city: 'Stockton', state: 'CA', lat: 37.9577, lng: -121.2908 },
  { label: 'Reno, NV', city: 'Reno', state: 'NV', lat: 39.5296, lng: -119.8138 },
  { label: 'Las Vegas, NV', city: 'Las Vegas', state: 'NV', lat: 36.1699, lng: -115.1398 },
  { label: 'Phoenix, AZ', city: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.074 },
  { label: 'Tucson, AZ', city: 'Tucson', state: 'AZ', lat: 32.2226, lng: -110.9747 },
  { label: 'Denver, CO', city: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
  { label: 'Colorado Springs, CO', city: 'Colorado Springs', state: 'CO', lat: 38.8339, lng: -104.8214 },
  { label: 'Albuquerque, NM', city: 'Albuquerque', state: 'NM', lat: 35.0844, lng: -106.6504 },
  { label: 'Salt Lake City, UT', city: 'Salt Lake City', state: 'UT', lat: 40.7608, lng: -111.891 },
  { label: 'Boise, ID', city: 'Boise', state: 'ID', lat: 43.615, lng: -116.2023 },
  { label: 'Seattle, WA', city: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
  { label: 'Spokane, WA', city: 'Spokane', state: 'WA', lat: 47.6588, lng: -117.426 },
  { label: 'Portland, OR', city: 'Portland', state: 'OR', lat: 45.5152, lng: -122.6784 },
  { label: 'Chicago, IL', city: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
  { label: 'St. Louis, MO', city: 'St. Louis', state: 'MO', lat: 38.627, lng: -90.1994 },
  { label: 'Kansas City, MO', city: 'Kansas City', state: 'MO', lat: 39.0997, lng: -94.5786 },
  { label: 'Omaha, NE', city: 'Omaha', state: 'NE', lat: 41.2565, lng: -95.9345 },
  { label: 'Des Moines, IA', city: 'Des Moines', state: 'IA', lat: 41.5868, lng: -93.625 },
  { label: 'I-80 Des Moines, IA', city: 'Des Moines', state: 'IA', lat: 41.5868, lng: -93.625 },
  { label: 'Minneapolis, MN', city: 'Minneapolis', state: 'MN', lat: 44.9778, lng: -93.265 },
  { label: 'Milwaukee, WI', city: 'Milwaukee', state: 'WI', lat: 43.0389, lng: -87.9065 },
  { label: 'Indianapolis, IN', city: 'Indianapolis', state: 'IN', lat: 39.7684, lng: -86.1581 },
  { label: 'Columbus, OH', city: 'Columbus', state: 'OH', lat: 39.9612, lng: -82.9988 },
  { label: 'Cleveland, OH', city: 'Cleveland', state: 'OH', lat: 41.4993, lng: -81.6944 },
  { label: 'Detroit, MI', city: 'Detroit', state: 'MI', lat: 42.3314, lng: -83.0458 },
  { label: 'Pittsburgh, PA', city: 'Pittsburgh', state: 'PA', lat: 40.4406, lng: -79.9959 },
  { label: 'Philadelphia, PA', city: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652 },
  { label: 'Newark, NJ', city: 'Newark', state: 'NJ', lat: 40.7357, lng: -74.1724 },
  { label: 'New York, NY', city: 'New York', state: 'NY', lat: 40.7128, lng: -74.006 },
  { label: 'Buffalo, NY', city: 'Buffalo', state: 'NY', lat: 42.8864, lng: -78.8784 },
  { label: 'Boston, MA', city: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589 },
  { label: 'Baltimore, MD', city: 'Baltimore', state: 'MD', lat: 39.2904, lng: -76.6122 },
  { label: 'Washington, DC', city: 'Washington', state: 'DC', lat: 38.9072, lng: -77.0369 },
  { label: 'Richmond, VA', city: 'Richmond', state: 'VA', lat: 37.5407, lng: -77.436 },
  { label: 'Charlotte, NC', city: 'Charlotte', state: 'NC', lat: 35.2271, lng: -80.8431 },
  { label: 'Raleigh, NC', city: 'Raleigh', state: 'NC', lat: 35.7796, lng: -78.6382 },
  { label: 'Atlanta, GA', city: 'Atlanta', state: 'GA', lat: 33.749, lng: -84.388 },
  { label: 'Nashville, TN', city: 'Nashville', state: 'TN', lat: 36.1627, lng: -86.7816 },
  { label: 'Memphis, TN', city: 'Memphis', state: 'TN', lat: 35.1495, lng: -90.049 },
  { label: 'Louisville, KY', city: 'Louisville', state: 'KY', lat: 38.2527, lng: -85.7585 },
  { label: 'New Orleans, LA', city: 'New Orleans', state: 'LA', lat: 29.9511, lng: -90.0715 },
  { label: 'Baton Rouge, LA', city: 'Baton Rouge', state: 'LA', lat: 30.4515, lng: -91.1871 },
  { label: 'Oklahoma City, OK', city: 'Oklahoma City', state: 'OK', lat: 35.4676, lng: -97.5164 },
  { label: 'Tulsa, OK', city: 'Tulsa', state: 'OK', lat: 36.154, lng: -95.9928 },
  { label: 'Little Rock, AR', city: 'Little Rock', state: 'AR', lat: 34.7465, lng: -92.2896 },
  { label: 'Jacksonville, FL', city: 'Jacksonville', state: 'FL', lat: 30.3322, lng: -81.6557 },
  { label: 'Tampa, FL', city: 'Tampa', state: 'FL', lat: 27.9506, lng: -82.4572 },
  { label: 'Orlando, FL', city: 'Orlando', state: 'FL', lat: 28.5383, lng: -81.3792 },
  { label: 'Miami, FL', city: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 },
  { label: 'Birmingham, AL', city: 'Birmingham', state: 'AL', lat: 33.5186, lng: -86.8104 },
  { label: 'Mobile, AL', city: 'Mobile', state: 'AL', lat: 30.6954, lng: -88.0399 },
  { label: 'Jackson, MS', city: 'Jackson', state: 'MS', lat: 32.2988, lng: -90.1848 },
]

export function searchUsaPlacesLocal(query: string, limit = 8) {
  const q = query.trim().toLowerCase()
  if (!q || q.length < 2) return []

  const scored = USA_SEARCH_PLACES.map((p) => {
    const label = p.label.toLowerCase()
    const city = p.city.toLowerCase()
    const state = p.state.toLowerCase()
    let score = 0
    if (city === q || label === q) score = 100
    else if (city.startsWith(q)) score = 90
    else if (label.startsWith(q)) score = 80
    else if (city.includes(q)) score = 70
    else if (label.includes(q)) score = 60
    else if (state === q) score = 40
    else if (`${city}, ${state}`.includes(q)) score = 55
    return { place: p, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.place.label.localeCompare(b.place.label))

  return scored.slice(0, limit).map((x) => x.place)
}
