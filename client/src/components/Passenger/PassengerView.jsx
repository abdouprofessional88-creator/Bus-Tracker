import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { passenger as passengerApi } from '../../services/api';
import BusMap from '../Map/BusMap';

const MEKNES_CENTER = { lat: 33.8935, lng: -5.5473 };

export default function PassengerView() {
  const { user, logout } = useAuth();
  const { connected, busLocations, trackBus, untrackBus } = useSocket();
  const navigate = useNavigate();

  const [userLocation, setUserLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [allRoutes, setAllRoutes] = useState([]);
  const [allStations, setAllStations] = useState([]);
  const [buses, setBuses] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [trackingBus, setTrackingBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('loading');
  const [showMap, setShowMap] = useState(true);
  const [destInput, setDestInput] = useState('');
  const [mapStyle, setMapStyle] = useState('street');
  const [zoomKey, setZoomKey] = useState(0);

  const watchIdRef = useRef(null);
  const locationIntervalRef = useRef(null);
  const previewKey = useRef(0);

  useEffect(() => {
    loadInitialData();
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    setBuses(prev => {
      const updated = [...prev];
      Object.entries(busLocations).forEach(([busId, data]) => {
        const idx = updated.findIndex(b => b._id === busId || b.busId === busId);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], currentLocation: { lat: data.lat, lng: data.lng } };
        } else {
          updated.push({
            _id: busId,
            busId,
            busNumber: data.busNumber || '',
            currentLocation: { lat: data.lat, lng: data.lng },
            currentPassengers: 0,
          });
        }
      });
      return updated;
    });
  }, [busLocations]);

  const loadInitialData = async () => {
    try {
      const [routesData] = await Promise.all([
        passengerApi.getAllRoutes(),
      ]);
      const routes = routesData.routes || [];
      setAllRoutes(routes);

      const stations = [];
      routes.forEach(r => {
        if (r.stationDetails) stations.push(...r.stationDetails);
      });
      setAllStations(stations);

      if (navigator.geolocation) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(loc);
            setZoomKey(k => k + 1);
            setStep('select-destination');
            setLoading(false);
          },
          () => {
            setUserLocation(MEKNES_CENTER);
            setStep('select-destination');
            setLoading(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );

        setTimeout(() => {
          if (loading) {
            setUserLocation(MEKNES_CENTER);
            setStep('select-destination');
            setLoading(false);
          }
        }, 8000);
      } else {
        setUserLocation(MEKNES_CENTER);
        setStep('select-destination');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    logout();
    navigate('/login');
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setDestination({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => alert('تعذر الحصول على موقعك الحالي')
      );
    }
  };

  const handleSearchDestination = async () => {
    if (!destInput.trim()) return;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destInput + ', مكناس')}&limit=5`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.length > 0) {
        const loc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        setDestination(loc);
        setZoomKey(k => k + 1);
      } else {
        setError('لم يتم العثور على الموقع');
      }
    } catch {
      setError('خطأ في البحث عن الموقع');
    }
  };

  const handleFindRoutes = useCallback(async () => {
    if (!userLocation || !destination) return;
    setSearching(true);
    setError('');

    try {
      previewKey.current += 1;
      const [nearbyData, suggestionsData] = await Promise.all([
        passengerApi.getNearbyBuses(userLocation.lat, userLocation.lng, 10000),
        passengerApi.getRouteSuggestions(userLocation.lat, userLocation.lng, destination.lat, destination.lng),
      ]);

      setBuses(nearbyData.buses || []);
      setSuggestions(suggestionsData.suggestions || []);
      setStep('results');
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }, [userLocation, destination]);

  const handleSelectBus = (suggestion) => {
    const busId = suggestion.bus?._id || suggestion.bus?.busId;
    setSelectedBusId(busId);
    setTrackingBus(suggestion);
    trackBus(busId);
    setStep('tracking');
  };

  const handleStopTracking = () => {
    if (selectedBusId) untrackBus(selectedBusId);
    setSelectedBusId(null);
    setTrackingBus(null);
    setStep('results');
  };

  const getRoutePathForBus = () => {
    if (trackingBus?.route?.path) return trackingBus.route.path;
    if (trackingBus?.bus?.routeId) {
      const route = allRoutes.find(r => r._id === trackingBus.bus.routeId);
      return route?.path || [];
    }
    return [];
  };

  const getStationsForBus = () => {
    if (trackingBus?.route?.stations) {
      return allStations.filter(s => trackingBus.route.stations.includes(s._id));
    }
    return allStations;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--gray-500)' }}>جاري تحميل النظام...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <header style={{
        background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
        color: 'white',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.3rem' }}>🚍</span>
          <div>
            <h2 style={{ fontSize: '1rem' }}>تتبع الباصات</h2>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{user?.name}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setShowMap(!showMap)}
            className="btn btn-sm"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
          >
            {showMap ? '🗺️' : '🗺️'}
          </button>
          <button
            onClick={() => setMapStyle(s => s === 'street' ? 'satellite' : 'street')}
            className="btn btn-sm"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
          >
            {mapStyle === 'street' ? '🛰️' : '🗺️'}
          </button>
          {user?.role === 'admin' && (
            <button onClick={() => navigate('/admin')} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
              ⚙️ إدارة
            </button>
          )}
          <button onClick={handleLogout} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
            تسجيل خروج
          </button>
        </div>
      </header>

      {error && (
        <div style={{
          background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1.5rem',
          fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#991b1b', fontWeight: 600, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ padding: '1rem 1.5rem', maxWidth: 1200, margin: '0 auto' }}>
        {(step === 'select-destination' || step === 'results' || step === 'tracking') && (
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                <label>موقعي الحالي</label>
                <div style={{
                  padding: '0.75rem 1rem',
                  background: 'var(--gray-50)',
                  borderRadius: 8,
                  border: '2px solid var(--gray-200)',
                  fontSize: '0.9rem',
                  color: 'var(--gray-600)',
                }}>
                  {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'جاري التحديد...'}
                </div>
              </div>
              <div className="form-group" style={{ flex: 2, minWidth: 250, marginBottom: 0 }}>
                <label>الوجهة</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="ابحث عن وجهتك..."
                    value={destInput}
                    onChange={(e) => setDestInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchDestination()}
                  />
                  <button onClick={handleSearchDestination} className="btn btn-primary btn-sm">بحث</button>
                  <button onClick={handleUseCurrentLocation} className="btn btn-outline btn-sm" title="استخدم موقعي الحالي كوجهة">📍</button>
                </div>
              </div>
              <button
                onClick={handleFindRoutes}
                className="btn btn-secondary"
                disabled={searching || !destination}
                style={{ minWidth: 140 }}
              >
                {searching ? 'جاري البحث...' : '🔍 ابحث عن باص'}
              </button>
            </div>
            {destination && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                ✅ الوجهة: {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
              </div>
            )}
          </div>
        )}

        {showMap && (
          <div className="card" style={{ marginBottom: '1rem', height: window.innerWidth < 768 ? (step === 'tracking' ? 350 : 300) : (step === 'tracking' ? 500 : 400) }}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem', color: 'var(--gray-700)' }}>
              {step === 'tracking' ? '📍 تتبع الباص المباشر' : '🗺️ الخريطة التفاعلية'}
            </h3>
            <BusMap
              buses={buses}
              stations={getStationsForBus()}
              routePath={getRoutePathForBus()}
              userLocation={userLocation}
              destination={destination}
              selectedBusId={selectedBusId}
              height="calc(100% - 40px)"
              mapStyle={mapStyle}
              zoomKey={zoomKey}
              animatedRoute={step === 'tracking'}
              isTracking={step === 'tracking'}
            />
          </div>
        )}

        {step === 'results' && (
          <div>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
              {suggestions.length > 0
                ? `✅ تم العثور على ${suggestions.length} اقتراح`
                : '😕 لم يتم العثور على باصات متاحة حالياً'}
            </h3>

            {suggestions.length > 0 && (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {suggestions.map((s, idx) => (
                  <div key={idx} className="card" style={{
                    border: selectedBusId === (s.bus?._id || s.bus?.busId) ? '2px solid var(--primary)' : '2px solid transparent',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1.1rem', color: 'var(--gray-800)' }}>
                          🚍 باص {s.bus?.busNumber || s.busNumber}
                        </h4>
                        <p style={{ fontSize: '0.9rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
                          {s.route?.name || 'خط غير محدد'}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                          <span className="badge badge-info">⏱ {s.eta?.text || s.etaText}</span>
                          <span className="badge badge-warning">📏 {s.distance ? (s.distance < 1000 ? `${s.distance} م` : `${(s.distance / 1000).toFixed(1)} كم`) : ''}</span>
                          {s.bus?.currentPassengers !== undefined && (
                            <span className="badge badge-success">👥 {s.bus.currentPassengers} راكب</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelectBus(s)}
                        className="btn btn-primary"
                      >
                        تتبع الباص
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'tracking' && trackingBus && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--gray-800)' }}>
                  🚍 تتبع باص {trackingBus.bus?.busNumber || trackingBus.busNumber}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                  {trackingBus.route?.name || ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="badge badge-success">🟢 تتبع مباشر</span>
                <button onClick={handleStopTracking} className="btn btn-sm btn-danger">
                  إيقاف التتبع
                </button>
              </div>
            </div>

            <div style={{
              background: 'var(--primary-light)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>وقت الوصول المتوقع</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {trackingBus.eta?.text || trackingBus.etaText}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>المسافة</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--gray-800)' }}>
                    {trackingBus.distance ? (
                      trackingBus.distance < 1000
                        ? `${trackingBus.distance} م`
                        : `${(trackingBus.distance / 1000).toFixed(1)} كم`
                    ) : '--'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>عدد الركاب</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--gray-800)' }}>
                    {trackingBus.bus?.currentPassengers || 0}
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              padding: '0.75rem',
              background: isNaN(Date.now() % 2000) ? '#f0fdf4' : '#f0fdf4',
              borderRadius: 8,
              alignItems: 'center',
              fontSize: '0.9rem',
              color: 'var(--gray-600)',
            }}>
              <span style={{ fontSize: '1.2rem' }}>🔄</span>
              <span>يتم تحديث موقع الباص بشكل مباشر كل 3 ثوان</span>
            </div>
          </div>
        )}

        {step === 'results' && buses.length > 0 && suggestions.length === 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem', color: 'var(--gray-700)' }}>
              🚍 باصات قريبة منك
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {buses.slice(0, 10).map((bus, idx) => (
                <div key={idx} className="card" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    🚍 {bus.busNumber || 'باص'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                    {bus.distance < 1000 ? `${bus.distance} م` : `${(bus.distance / 1000).toFixed(1)} كم`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'select-destination' && !destination && (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: 'var(--gray-500)',
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🗺️</div>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
              أين تريد الذهاب؟
            </h3>
            <p>اختر وجهتك في الخريطة أو ابحث عنها أعلاه</p>
          </div>
        )}
      </div>
    </div>
  );
}
