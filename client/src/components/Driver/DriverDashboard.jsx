import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { driver as driverApi } from '../../services/api';
import BusMap from '../Map/BusMap';

export default function DriverDashboard() {
  const { user, logout, updateUser } = useAuth();
  const { connected, updateLocation } = useSocket();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [passengerCount, setPassengerCount] = useState(0);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPos, setCurrentPos] = useState(null);
  const [showStationsList, setShowStationsList] = useState(false);
  const [mapStyle, setMapStyle] = useState('street');
  const intervalRef = useRef(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    loadDashboard();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await driverApi.getDashboard();
      setDashboard(data);
      setIsOnline(data.driver.isOnline);
      setPassengerCount(data.driver.currentPassengers || 0);
      if (data.driver.currentLocation?.lat) {
        setCurrentPos(data.driver.currentLocation);
      }
      if (data.route) setRoutes([data.route]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    logout();
    navigate('/login');
  };

  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('متصفحك لا يدعم تحديد الموقع');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setCurrentPos({ lat, lng });
        updateUser({ currentLocation: { lat, lng } });

        try {
          await driverApi.updateLocation(lat, lng);
        } catch {}

        updateLocation({
          driverId: user._id,
          busId: dashboard?.bus?._id,
          busNumber: dashboard?.driver?.busNumber,
          lat,
          lng,
        });
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setError('خطأ في تحديد الموقع: ' + err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }, [user, dashboard, updateLocation, updateUser]);

  const handleToggleStatus = async () => {
    try {
      const newStatus = !isOnline;
      const data = await driverApi.toggleStatus(newStatus);
      setIsOnline(newStatus);
      updateUser({ isOnline: newStatus });

      if (newStatus) {
        startLocationTracking();
      } else {
        if (watchIdRef.current) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePassengerCount = async (delta) => {
    const newCount = Math.max(0, passengerCount + delta);
    try {
      await driverApi.updatePassengerCount(newCount);
      setPassengerCount(newCount);
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <header style={{
        background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
        color: 'white',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🚍</span>
          <div>
            <h2 style={{ fontSize: '1.1rem' }}>لوحة تحكم السائق</h2>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{user?.name}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            padding: '0.3rem 0.8rem',
            borderRadius: '9999px',
            background: connected ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
            color: connected ? '#6ee7b7' : '#fca5a5',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: connected ? '#10b981' : '#ef4444',
              display: 'inline-block',
            }} />
            {connected ? 'متصل' : 'غير متصل'}
          </span>
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
          background: '#fee2e2', color: '#991b1b', padding: '0.75rem 2rem',
          fontSize: '0.9rem', textAlign: 'center',
        }}>
          {error}
          <button onClick={() => setError('')} style={{ marginRight: '1rem', background: 'none', border: 'none', color: '#991b1b', fontWeight: 600, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ padding: '1.5rem 2rem', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>حالة التشغيل</div>
            <button
              onClick={handleToggleStatus}
              className={`btn ${isOnline ? 'btn-danger' : 'btn-secondary'} btn-lg`}
              style={{ width: '100%' }}
            >
              {isOnline ? '🔴 إيقاف التشغيل' : '🟢 بدء التشغيل'}
            </button>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>عدد الركاب</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary)' }}>{passengerCount}</div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
              <button onClick={() => handlePassengerCount(-1)} className="btn btn-sm btn-outline">−</button>
              <button onClick={() => handlePassengerCount(1)} className="btn btn-sm btn-primary">+</button>
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>رقم الباص</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gray-800)' }}>
              {dashboard?.driver?.busNumber || 'غير محدد'}
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>الموقع الحالي</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', direction: 'ltr' }}>
              {currentPos ? `${currentPos.lat.toFixed(4)}, ${currentPos.lng.toFixed(4)}` : 'لم يتم التحديد'}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem', height: window.innerWidth < 768 ? 300 : 400 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--gray-700)' }}>
              🗺️ {dashboard?.route?.name || 'الخريطة'}
            </h3>
            {dashboard?.stations?.length > 0 && (
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setShowStationsList(!showStationsList)}
                style={{ fontSize: '0.8rem' }}
              >
                🏢 {showStationsList ? 'إخفاء المحطات' : 'عرض المحطات'}
              </button>
            )}
          </div>
          <BusMap
            buses={isOnline && currentPos ? [{ _id: 'self', currentLocation: currentPos, busNumber: dashboard?.driver?.busNumber, currentPassengers: passengerCount }] : []}
            stations={dashboard?.stations || []}
            routePath={routes.length > 0 ? routes[0]?.path || [] : []}
            userLocation={currentPos}
            height="calc(100% - 40px)"
            mapStyle={mapStyle}
            animatedRoute={isOnline}
          />
          {showStationsList && dashboard?.stations?.length > 0 && (
            <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#f8fafc', borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>🚏 قائمة المحطات:</div>
              {dashboard.stations.map((s, i) => (
                <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', fontSize: '0.85rem' }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: i === 0 ? '#10b981' : i === dashboard.stations.length - 1 ? '#ef4444' : '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>{i + 1}</span>
                  <span>{s.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
