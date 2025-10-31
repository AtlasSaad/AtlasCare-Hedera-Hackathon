/**
 * Geotag Mapper for CNDP Compliance
 * Converts precise GPS coordinates to city-level codes to prevent quasi-identification
 */

// Major Moroccan cities with coordinates (lat, lng, radius in km)
const MOROCCAN_CITIES = [
  { code: 'MA-CAS', name: 'Casablanca', lat: 33.5731, lng: -7.5898, radius: 30 },
  { code: 'MA-RAB', name: 'Rabat', lat: 34.0209, lng: -6.8416, radius: 25 },
  { code: 'MA-FES', name: 'Fes', lat: 34.0181, lng: -5.0078, radius: 20 },
  { code: 'MA-MAR', name: 'Marrakech', lat: 31.6295, lng: -7.9811, radius: 25 },
  { code: 'MA-TAN', name: 'Tangier', lat: 35.7595, lng: -5.8340, radius: 20 },
  { code: 'MA-SAL', name: 'Sale', lat: 34.0531, lng: -6.7985, radius: 15 },
  { code: 'MA-MKN', name: 'Meknes', lat: 33.8935, lng: -5.5473, radius: 15 },
  { code: 'MA-OUJ', name: 'Oujda', lat: 34.6867, lng: -1.9114, radius: 15 },
  { code: 'MA-KEN', name: 'Kenitra', lat: 34.2610, lng: -6.5802, radius: 15 },
  { code: 'MA-TET', name: 'Tetouan', lat: 35.5889, lng: -5.3626, radius: 15 },
  { code: 'MA-SAF', name: 'Safi', lat: 32.3008, lng: -9.2272, radius: 15 },
  { code: 'MA-AGD', name: 'Agadir', lat: 30.4278, lng: -9.5981, radius: 20 },
  { code: 'MA-BEN', name: 'Beni Mellal', lat: 32.3394, lng: -6.3498, radius: 15 },
  { code: 'MA-NAD', name: 'Nador', lat: 35.1681, lng: -2.9333, radius: 15 },
  { code: 'MA-TAZ', name: 'Taza', lat: 34.2133, lng: -4.0103, radius: 15 },
  { code: 'MA-KHO', name: 'Khouribga', lat: 32.8811, lng: -6.9063, radius: 15 },
  { code: 'MA-LAA', name: 'Laayoune', lat: 27.1536, lng: -13.1994, radius: 20 },
];

// Fallback for unknown locations
const FALLBACK_CODE = 'MA-UNK';

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Convert GPS coordinates to city-level code (CNDP compliant)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} City code (e.g., "MA-CAS")
 */
function coordsToCity(lat, lng) {
  if (!lat || !lng) return FALLBACK_CODE;
  
  // Find nearest city
  let nearestCity = null;
  let minDistance = Infinity;
  
  for (const city of MOROCCAN_CITIES) {
    const distance = haversineDistance(lat, lng, city.lat, city.lng);
    
    // If within city radius, return immediately
    if (distance <= city.radius) {
      return city.code;
    }
    
    // Track nearest city
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = city;
    }
  }
  
  // Return nearest city if within reasonable range (100km)
  if (nearestCity && minDistance <= 100) {
    return nearestCity.code;
  }
  
  return FALLBACK_CODE;
}

/**
 * Convert geotag string to city code
 * Handles formats: "33.5731,-7.5898" or "MA-CAS"
 * @param {string|Object} geotag - Geotag string or {lat, lng} object
 * @returns {string} City code
 */
function compressGeotag(geotag) {
  if (!geotag) return FALLBACK_CODE;
  
  // Already a city code
  if (typeof geotag === 'string' && geotag.startsWith('MA-')) {
    return geotag;
  }
  
  // Object format {lat, lng}
  if (typeof geotag === 'object' && geotag.lat && geotag.lng) {
    return coordsToCity(geotag.lat, geotag.lng);
  }
  
  // String format "lat,lng"
  if (typeof geotag === 'string' && geotag.includes(',')) {
    const [lat, lng] = geotag.split(',').map(parseFloat);
    return coordsToCity(lat, lng);
  }
  
  return FALLBACK_CODE;
}

/**
 * Get city name from code
 * @param {string} cityCode - City code (e.g., "MA-CAS")
 * @returns {string} City name
 */
function cityToName(cityCode) {
  const city = MOROCCAN_CITIES.find(c => c.code === cityCode);
  return city ? city.name : 'Unknown';
}

/**
 * Get region/distance between two city codes
 * @param {string} cityCode1 - First city code
 * @param {string} cityCode2 - Second city code
 * @returns {number} Distance in km (0 if same city, -1 if unknown)
 */
function cityDistance(cityCode1, cityCode2) {
  if (cityCode1 === cityCode2) return 0;
  
  const city1 = MOROCCAN_CITIES.find(c => c.code === cityCode1);
  const city2 = MOROCCAN_CITIES.find(c => c.code === cityCode2);
  
  if (!city1 || !city2) return -1;
  
  return haversineDistance(city1.lat, city1.lng, city2.lat, city2.lng);
}

/**
 * Group cities into regions for fraud detection
 * @param {string} cityCode - City code
 * @returns {string} Region code
 */
function cityToRegion(cityCode) {
  const regions = {
    'NORTH': ['MA-TAN', 'MA-TET', 'MA-NAD'],
    'NORTHWEST': ['MA-RAB', 'MA-SAL', 'MA-KEN'],
    'CENTER': ['MA-CAS', 'MA-MKN', 'MA-FES', 'MA-TAZ', 'MA-KHO', 'MA-BEN'],
    'SOUTH': ['MA-MAR', 'MA-SAF', 'MA-AGD'],
    'EAST': ['MA-OUJ'],
    'SAHARA': ['MA-LAA'],
  };
  
  for (const [region, cities] of Object.entries(regions)) {
    if (cities.includes(cityCode)) return region;
  }
  
  return 'UNKNOWN';
}

module.exports = {
  coordsToCity,
  compressGeotag,
  cityToName,
  cityDistance,
  cityToRegion,
  haversineDistance,
  MOROCCAN_CITIES
};

