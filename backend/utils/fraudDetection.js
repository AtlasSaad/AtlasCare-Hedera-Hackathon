/**
 * Fraud Detection Utility
 * Detects suspicious prescription verifications based on geotag distance
 * Updated to support both precise coordinates and city-level codes (CNDP compliant)
 */

const { cityDistance, cityToName, MOROCCAN_CITIES } = require('./geotagMapper');

/**
 * Convert degrees to radians
 * @param {Number} degrees
 * @returns {Number}
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - { lat, lng }
 * @param {Object} coord2 - { lat, lng }
 * @returns {Number} - Distance in kilometers
 */
function calculateDistance(coord1, coord2) {
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) *
      Math.cos(toRadians(coord2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in km

  return distance;
}

/**
 * Parse geotag string (e.g., "MA-CAS", "MA-33.57,-7.59" or "33.57,-7.59")
 * @param {String} geotag - Geotag string
 * @returns {Object|null} - { lat, lng, cityCode } or null if invalid
 */
function parseGeotag(geotag) {
  if (!geotag || typeof geotag !== 'string') {
    return null;
  }

  try {
    // Check if it's a city code (e.g., "MA-CAS")
    if (/^MA-[A-Z]{3}$/.test(geotag)) {
      const city = MOROCCAN_CITIES.find(c => c.code === geotag);
      if (city) {
        return { lat: city.lat, lng: city.lng, cityCode: city.code };
      }
      return null;
    }

    // Remove "MA-" prefix if present
    const cleaned = geotag.replace(/^MA-/i, '').trim();

    // Split by comma
    const parts = cleaned.split(',');
    if (parts.length !== 2) {
      return null;
    }

    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
      return null;
    }

    // Basic sanity check for Morocco coordinates
    // Morocco latitude: ~21°N to ~36°N
    // Morocco longitude: ~1°W to ~17°W (negative values)
    if (lat < 20 || lat > 37 || lng < -18 || lng > 0) {
      console.warn(`Geotag coordinates outside Morocco bounds: ${lat}, ${lng}`);
      // Still return them, just warn
    }

    return { lat, lng };
  } catch (error) {
    console.error('Failed to parse geotag:', error);
    return null;
  }
}

/**
 * Check if prescription verification is suspicious based on geotag distance
 * Supports both city-level codes (CNDP compliant) and precise coordinates
 * @param {String} issueGeotag - Geotag from prescription issuance
 * @param {String} verifyGeotag - Geotag from verification/dispensing
 * @param {Number} thresholdKm - Distance threshold in km (default: 100 for city-level)
 * @returns {Object} - { suspicious, distance, reason, issueCoords, verifyCoords }
 */
function checkFraud(issueGeotag, verifyGeotag, thresholdKm = 100) {
  const result = {
    suspicious: false,
    distance: null,
    reason: null,
    issueCoords: null,
    verifyCoords: null,
    issueCityCode: null,
    verifyCityCode: null
  };

  // Parse both geotags
  const issueCoords = parseGeotag(issueGeotag);
  const verifyCoords = parseGeotag(verifyGeotag);

  result.issueCoords = issueCoords;
  result.verifyCoords = verifyCoords;

  // If either geotag is missing or invalid, cannot check fraud
  if (!issueCoords || !verifyCoords) {
    result.reason = 'Missing or invalid geotag data - cannot verify location';
    return result;
  }

  // Check if both are city codes (privacy-preserving mode)
  if (issueCoords.cityCode && verifyCoords.cityCode) {
    result.issueCityCode = issueCoords.cityCode;
    result.verifyCityCode = verifyCoords.cityCode;
    
    // Use city-to-city distance calculation
    const cityDist = cityDistance(issueCoords.cityCode, verifyCoords.cityCode);
    result.distance = cityDist;
    
    if (cityDist === 0) {
      result.reason = `Same city (${cityToName(issueCoords.cityCode)}) - normal`;
      return result;
    }
    
    if (cityDist > thresholdKm) {
      result.suspicious = true;
      result.reason = `Different cities: ${cityToName(issueCoords.cityCode)} → ${cityToName(verifyCoords.cityCode)} (${cityDist.toFixed(0)}km). Possible fraud or patient travel.`;
    } else {
      result.reason = `Nearby cities: ${cityToName(issueCoords.cityCode)} → ${cityToName(verifyCoords.cityCode)} (${cityDist.toFixed(0)}km, within ${thresholdKm}km threshold)`;
    }
    
    return result;
  }

  // Calculate distance using precise coordinates
  const distance = calculateDistance(issueCoords, verifyCoords);
  result.distance = parseFloat(distance.toFixed(2));

  // For precise coordinates, use stricter threshold (50km)
  const preciseThreshold = 50;
  
  // Check if distance exceeds threshold
  if (distance > preciseThreshold) {
    result.suspicious = true;
    result.reason = `Verification location ${distance.toFixed(0)}km from issuance (threshold: ${preciseThreshold}km). Possible fraud or patient travel.`;
  } else {
    result.reason = `Normal distance: ${distance.toFixed(0)}km (within ${preciseThreshold}km threshold)`;
  }

  return result;
}

/**
 * Get approximate city name from coordinates (simplified for Morocco)
 * @param {Object} coords - { lat, lng }
 * @returns {String} - Approximate city name
 */
function getApproximateCity(coords) {
  if (!coords) return 'Unknown';

  // Major Moroccan cities (approximate coordinates)
  const cities = [
    { name: 'Casablanca', lat: 33.57, lng: -7.59 },
    { name: 'Rabat', lat: 34.02, lng: -6.84 },
    { name: 'Marrakech', lat: 31.63, lng: -8.01 },
    { name: 'Fes', lat: 34.03, lng: -5.00 },
    { name: 'Tangier', lat: 35.77, lng: -5.80 },
    { name: 'Agadir', lat: 30.43, lng: -9.60 },
    { name: 'Meknes', lat: 33.89, lng: -5.56 },
    { name: 'Oujda', lat: 34.68, lng: -1.91 },
    { name: 'Tetouan', lat: 35.57, lng: -5.37 },
    { name: 'Safi', lat: 32.30, lng: -9.24 }
  ];

  // Find nearest city
  let nearestCity = 'Unknown';
  let minDistance = Infinity;

  for (const city of cities) {
    const distance = calculateDistance(coords, city);
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = city.name;
    }
  }

  // If nearest city is > 50km away, return "Rural Area"
  if (minDistance > 50) {
    return 'Rural Area';
  }

  return `Near ${nearestCity}`;
}

/**
 * Generate fraud detection report
 * @param {String} issueGeotag
 * @param {String} verifyGeotag
 * @returns {Object} - Detailed fraud report
 */
function generateFraudReport(issueGeotag, verifyGeotag) {
  const fraudCheck = checkFraud(issueGeotag, verifyGeotag);

  const report = {
    ...fraudCheck,
    issueLocation: getApproximateCity(fraudCheck.issueCoords),
    verifyLocation: getApproximateCity(fraudCheck.verifyCoords),
    timestamp: new Date().toISOString(),
    riskLevel: fraudCheck.suspicious ? 'HIGH' : 'LOW'
  };

  return report;
}

module.exports = {
  calculateDistance,
  parseGeotag,
  checkFraud,
  getApproximateCity,
  generateFraudReport
};

