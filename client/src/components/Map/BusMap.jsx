import { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';

export const stationIcon = L.divIcon({
  html: '<div style="background:#2563eb;color:white;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🚍</div>',
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const busIcon = L.divIcon({
  html: '<div style="font-size:32px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">🚍</div>',
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const selectedBusIcon = L.divIcon({
  html: '<div style="font-size:36px;filter:drop-shadow(0 0 8px #2563eb)">🚍</div>',
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const userIcon = L.divIcon({
  html: '<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">📍</div>',
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const destinationIcon = L.divIcon({
  html: '<div style="width:36px;height:36px;background:linear-gradient(135deg,#10b981,#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 4px 12px rgba(16,185,129,0.4)">🎯</div>',
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const trackingIcon = L.divIcon({
  html: '<div style="width:36px;height:36px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 4px 12px rgba(245,158,11,0.4);animation:pulse 2s infinite">🎯</div>',
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function FitBounds({ bounds, zoomKey = 0 }) {
  const map = useMap();
  const prevKey = useRef(0);

  useEffect(() => {
    if (bounds && bounds.length > 0 && zoomKey !== prevKey.current) {
      prevKey.current = zoomKey;
      const latlngBounds = L.latLngBounds(bounds);
      map.fitBounds(latlngBounds.pad(0.15), { maxZoom: 15, animate: true, duration: 0.8 });
    }
  }, [bounds, map, zoomKey]);

  return null;
}

export default function BusMap({
  buses = [],
  stations = [],
  routePath = [],
  userLocation = null,
  destination = null,
  selectedBusId = null,
  height = '100%',
  showUserMarker = true,
  showStations = true,
  center = [33.8935, -5.5473],
  zoom = 12,
  mapStyle = 'street',
  zoomKey = 0,
  animatedRoute = false,
  isTracking = false,
}) {
  const allMarkers = useMemo(() => {
    const markers = [];

    if (showUserMarker && userLocation) {
      markers.push(
        <Marker key="user" position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>موقعي الحالي</Popup>
        </Marker>
      );
    }

    if (destination) {
      markers.push(
        <Marker key="dest" position={[destination.lat, destination.lng]} icon={isTracking ? trackingIcon : destinationIcon}>
          <Popup>{isTracking ? '🟢 تتبع مباشر' : 'الوجهة'}</Popup>
        </Marker>
      );
    }

    if (showStations && stations.length > 0) {
      stations.forEach((station, idx) => {
        const loc = station.location || station;
        markers.push(
          <Marker key={`station-${idx}`} position={[loc.lat, loc.lng]} icon={stationIcon}>
            <Popup autoPan={false}>
              <div style={{ textAlign: 'right', minWidth: 150 }}>
                <strong style={{ fontSize: '1.1rem' }}>{station.name || `محطة ${idx + 1}`}</strong>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
                  🚏 محطة {idx + 1} من {stations.length}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      });
    }

    if (buses.length > 0) {
      buses.forEach((bus) => {
        const loc = bus.currentLocation || bus;
        if (!loc || !loc.lat || !loc.lng) return;
        const isSelected = selectedBusId && (bus._id === selectedBusId || bus.busId === selectedBusId);

        markers.push(
          <Marker
            key={`bus-${bus._id || bus.busId}`}
            position={[loc.lat, loc.lng]}
            icon={isSelected ? selectedBusIcon : busIcon}
          >
            <Popup>
              <div style={{ textAlign: 'right', minWidth: 150 }}>
                <strong>🚍 باص {bus.busNumber || 'غير معروف'}</strong>
                <br />
                <span>عدد الركاب: {bus.currentPassengers || 0}</span>
                <br />
                {bus.distance && <span>المسافة: {bus.distance < 1000 ? `${bus.distance} م` : `${(bus.distance / 1000).toFixed(1)} كم`}</span>}
                {isSelected && <div style={{ color: 'var(--primary)', fontWeight: 600, marginTop: 4 }}>✓ الباص المختار</div>}
              </div>
            </Popup>
          </Marker>
        );
      });
    }

    if (userLocation) {
      markers.push(
        <Circle
          key="user-radius"
          center={[userLocation.lat, userLocation.lng]}
          radius={500}
          pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.1, weight: 2 }}
        />
      );
    }

    return markers;
  }, [buses, stations, userLocation, destination, selectedBusId, showUserMarker, showStations]);

  const bounds = useMemo(() => {
    const points = [];
    if (userLocation) points.push([userLocation.lat, userLocation.lng]);
    if (destination) points.push([destination.lat, destination.lng]);
    if (routePath.length > 0) routePath.forEach(p => points.push([p.lat, p.lng]));
    if (buses.length > 0) buses.forEach(b => {
      const loc = b.currentLocation || b;
      if (loc?.lat && loc?.lng) points.push([loc.lat, loc.lng]);
    });
    if (stations.length > 0) stations.forEach(s => {
      const loc = s.location || s;
      if (loc?.lat && loc?.lng) points.push([loc.lat, loc.lng]);
    });
    return points.map(p => L.latLng(p[0], p[1]));
  }, [userLocation, destination, routePath, buses, stations]);

  const routePolyline = useMemo(() => {
    if (!routePath || routePath.length < 2) return null;
    return (
      <>
        <Polyline
          positions={routePath.map(p => [p.lat, p.lng])}
          pathOptions={{
            color: animatedRoute ? '#06b6d4' : '#2563eb',
            weight: animatedRoute ? 8 : 6,
            opacity: 0.15,
          }}
        />
        <Polyline
          positions={routePath.map(p => [p.lat, p.lng])}
          pathOptions={{
            color: animatedRoute ? '#22d3ee' : '#3b82f6',
            weight: 3,
            opacity: 0.9,
            dashArray: animatedRoute ? '12, 8' : '8, 12',
            className: animatedRoute ? 'animated-route' : '',
          }}
        />
        {animatedRoute && (
          <Polyline
            positions={routePath.map(p => [p.lat, p.lng])}
            pathOptions={{
              color: '#22d3ee',
              weight: 2,
              opacity: 0.4,
              dashArray: '4, 16',
              className: 'animated-route-glow',
            }}
          />
        )}
      </>
    );
  }, [routePath, animatedRoute]);

  return (
    <div style={{ width: '100%', height, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <MapContainer
        center={[center[0], center[1]]}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        {mapStyle === 'satellite' ? (
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        {routePolyline}
        {allMarkers}
        <FitBounds bounds={bounds} zoomKey={zoomKey} />
      </MapContainer>
    </div>
  );
}
