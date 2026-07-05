function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineDistance(coord1, coord2) {
  const R = 6371000;
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findNearestStation(userLocation, stations) {
  let nearest = null;
  let minDist = Infinity;

  for (const station of stations) {
    const dist = haversineDistance(userLocation, station.location || station);
    if (dist < minDist) {
      minDist = dist;
      nearest = { station, distance: dist };
    }
  }

  return nearest;
}

function calculateDistance(point1, point2) {
  return haversineDistance(point1, point2);
}

function calculateETAByDistance(distanceMeters, avgSpeedKmh = 30) {
  const distanceKm = distanceMeters / 1000;
  const hours = distanceKm / avgSpeedKmh;
  const minutes = hours * 60;
  return Math.round(minutes);
}

function estimateArrivalTime(busLocation, stationLocation, avgSpeedKmh = 30) {
  const distance = haversineDistance(busLocation, stationLocation);
  const minutes = calculateETAByDistance(distance, avgSpeedKmh);
  return {
    distance: Math.round(distance),
    etaMinutes: minutes,
    etaText: minutes < 1 ? 'أقل من دقيقة' :
             minutes < 60 ? `${minutes} دقيقة` :
             `${Math.floor(minutes / 60)} ساعة و${minutes % 60} دقيقة`,
  };
}

function findClosestPointOnPath(userLocation, pathPoints) {
  let closest = null;
  let minDist = Infinity;
  let closestIndex = -1;

  for (let i = 0; i < pathPoints.length; i++) {
    const dist = haversineDistance(userLocation, pathPoints[i]);
    if (dist < minDist) {
      minDist = dist;
      closest = pathPoints[i];
      closestIndex = i;
    }
  }

  return { point: closest, distance: minDist, index: closestIndex };
}

function findBestBusForPassenger(userLocation, destination, buses, route) {
  if (!buses.length || !route) return null;

  const userClosest = findClosestPointOnPath(userLocation, route.path);
  const destClosest = findClosestPointOnPath(destination, route.path);

  if (!userClosest.point || !destClosest.point) return null;

  const candidates = buses
    .filter(b => b.isActive && b.status === 'online')
    .map(bus => {
      const busLoc = bus.currentLocation || bus;
      const busClosest = findClosestPointOnPath(busLoc, route.path);
      if (!busClosest.point) return null;

      const distToUser = calculateDistance(busLoc, userLocation);
      const distOnPath = Math.abs(busClosest.index - userClosest.index) * 100;
      const totalDist = distToUser + distOnPath;
      const eta = calculateETAByDistance(totalDist);

      return {
        bus,
        distance: Math.round(totalDist),
        etaMinutes: eta,
        etaText: eta < 1 ? 'أقل من دقيقة' :
                 eta < 60 ? `${eta} دقيقة` :
                 `${Math.floor(eta / 60)} ساعة و${eta % 60} دقيقة`,
        nearestStation: null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance);

  return candidates.length > 0 ? candidates[0] : null;
}

module.exports = {
  haversineDistance,
  calculateDistance,
  calculateETAByDistance,
  findNearestStation,
  estimateArrivalTime,
  findClosestPointOnPath,
  findBestBusForPassenger,
};
