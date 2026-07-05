import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../../context/AuthContext';
import { admin as adminApi } from '../../services/api';
import { stationIcon } from '../Map/BusMap';
import { playClick, playSuccess, playError } from '../../utils/sound';

const addIcon = L.divIcon({ html: '<div style="font-size:28px;color:#10b981">➕</div>', className: '', iconSize: [28, 28], iconAnchor: [14, 14] });

function ClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick && onMapClick(e.latlng) });
  return null;
}

const toastStyle = {
  position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
  zIndex: 9999, padding: '0.75rem 1.5rem', borderRadius: 12,
  fontSize: '0.9rem', fontWeight: 500, boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
  display: 'flex', alignItems: 'center', gap: '0.5rem',
  animation: 'slideDown 0.3s ease',
  maxWidth: '90%',
};

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('stations');
  const [stations, setStations] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [addingStation, setAddingStation] = useState(null);
  const [stationName, setStationName] = useState('');
  const [selectedRouteStations, setSelectedRouteStations] = useState([]);
  const [routeName, setRouteName] = useState('');
  const [routeDesc, setRouteDesc] = useState('');
  const [newBusNumber, setNewBusNumber] = useState('');
  const [newBusRoute, setNewBusRoute] = useState('');
  const [newBusDriver, setNewBusDriver] = useState('');
  const [newBusCapacity, setNewBusCapacity] = useState(50);
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState('street');
  const [toast, setToast] = useState(null);
  const [editingStation, setEditingStation] = useState(null);
  const [editStationName, setEditStationName] = useState('');

  useEffect(() => { loadData(); }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
    if (type === 'success') playSuccess();
    else playError();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, rData, bData] = await Promise.all([
        adminApi.getStations(), adminApi.getRoutes(), adminApi.getBuses(),
      ]);
      setStations(sData.stations || []);
      setRoutes(rData.routes || []);
      setBuses(bData.buses || []);
      fetchDrivers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = useCallback((latlng) => {
    playClick();
    setAddingStation({ lat: latlng.lat, lng: latlng.lng });
    setStationName('');
  }, []);

  const handleSaveStation = async () => {
    if (!stationName.trim() || !addingStation) return;
    playClick();
    try {
      await adminApi.addStation(stationName.trim(), addingStation.lat, addingStation.lng);
      showToast(`✅ تم إضافة محطة "${stationName}"`);
      setAddingStation(null);
      setStationName('');
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteStation = async (id, name) => {
    if (!confirm(`حذف المحطة "${name}"؟`)) return;
    playClick();
    try {
      await adminApi.deleteStation(id);
      showToast(`✅ تم حذف "${name}"`);
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateRoute = async () => {
    if (!routeName.trim() || selectedRouteStations.length < 2) {
      showToast('يجب اختيار محطتين على الأقل', 'error');
      return;
    }
    playClick();
    try {
      await adminApi.createRoute(routeName.trim(), routeDesc, selectedRouteStations);
      showToast(`✅ تم إنشاء المسار "${routeName}"`);
      setRouteName('');
      setRouteDesc('');
      setSelectedRouteStations([]);
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteRoute = async (id, name) => {
    if (!confirm(`حذف المسار "${name}"؟`)) return;
    playClick();
    try {
      await adminApi.deleteRoute(id);
      showToast(`✅ تم حذف "${name}"`);
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleQuickSetup = async () => {
    if (!confirm('إنشاء محطات (المحطة الطرقية → جامعة مكناس) + الباص 20. متأكد؟')) return;
    playClick();
    try {
      const res = await adminApi.quickSetup();
      showToast(`✅ ${res.message}`);
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleLogout = () => { playClick(); logout(); navigate('/login'); };

  const fetchDrivers = async () => {
    try {
      const dData = await adminApi.getDrivers();
      setDrivers(dData.drivers || []);
    } catch {}
  };

  const handleCreateBus = async () => {
    if (!newBusNumber.trim()) {
      showToast('يرجى إدخال رقم الباص', 'error');
      return;
    }
    playClick();
    try {
      await adminApi.createBus(newBusNumber.trim(), newBusRoute || undefined, newBusDriver || undefined, newBusCapacity);
      showToast(`✅ تم إنشاء الباص "${newBusNumber}"`);
      setNewBusNumber('');
      setNewBusRoute('');
      setNewBusDriver('');
      setNewBusCapacity(50);
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const toggleRouteStation = (stationId) => {
    playClick();
    setSelectedRouteStations(prev =>
      prev.includes(stationId) ? prev.filter(id => id !== stationId) : [...prev, stationId]
    );
  };

  const handleEditStation = (station) => {
    playClick();
    setEditingStation(station);
    setEditStationName(station.name);
  };

  const handleSaveEditStation = async () => {
    if (!editStationName.trim() || !editingStation) return;
    playClick();
    try {
      await adminApi.updateStation(editingStation._id, { name: editStationName.trim() });
      showToast(`✅ تم تعديل "${editStationName}"`);
      setEditingStation(null);
      setEditStationName('');
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDragStation = async (stationId, lat, lng) => {
    try {
      await adminApi.updateStation(stationId, { lat, lng });
      showToast('✅ تم نقل المحطة');
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const orderedStations = [...stations].sort((a, b) => (a.order || 0) - (b.order || 0));

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner" /></div>;
  }

  const tileUrl = mapStyle === 'street'
    ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1a1a2e 100%)' }}>
      {toast && (
        <div style={{
          ...toastStyle,
          background: toast.type === 'success' ? 'linear-gradient(135deg, #065f46, #047857)' : 'linear-gradient(135deg, #991b1b, #dc2626)',
          color: 'white',
        }}>
          <span style={{ fontSize: '1.2rem' }}>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      <header style={{
        background: 'linear-gradient(90deg, #1e293b, #0f172a)',
        color: 'white', padding: '0.75rem 1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.4rem', filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.5))' }}>⚙️</span>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>إدارة النظام</h2>
            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{user?.name}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => navigate(user?.role === 'driver' ? '/driver' : '/passenger')}
            className="btn btn-sm"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8 }}>
            ⬅ رجوع
          </button>
          <button onClick={handleLogout}
            className="btn btn-sm"
            style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
            خروج
          </button>
        </div>
      </header>

      <div style={{
        display: 'flex', gap: '0.5rem', padding: '0.75rem 1.5rem',
        background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexWrap: 'wrap', backdropFilter: 'blur(8px)',
      }}>
        {['buses', 'stations', 'routes'].map(t => (
          <button key={t} onClick={() => { playClick(); setTab(t); }}
            className="btn btn-sm"
            style={{
              background: tab === t ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'rgba(255,255,255,0.08)',
              color: tab === t ? 'white' : 'rgba(255,255,255,0.7)',
              border: tab === t ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, transition: 'all 0.2s',
            }}>
            {t === 'buses' ? '🚍' : t === 'stations' ? '🏢' : '🛣️'} <span className="hide-mobile">{t === 'buses' ? 'الباصات' : t === 'stations' ? 'المحطات' : 'المسارات'}</span>
          </button>
        ))}
        <button onClick={handleQuickSetup} className="btn btn-sm"
          style={{
            background: 'linear-gradient(135deg, #059669, #10b981)',
            color: 'white', marginRight: 'auto', borderRadius: 8,
            border: '1px solid rgba(16,185,129,0.3)',
          }}>
          ⚡ <span className="hide-mobile">إعداد سريع</span>
        </button>
        <button onClick={() => { playClick(); setMapStyle(mapStyle === 'street' ? 'satellite' : 'street'); }}
          className="btn btn-sm"
          style={{
            background: 'rgba(255,255,255,0.08)', color: 'white',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
          }}>
          {mapStyle === 'street' ? '🛰️' : '🗺️'} <span className="hide-mobile">{mapStyle === 'street' ? 'قمر' : 'شارع'}</span>
        </button>
      </div>

      <div style={{ padding: '1rem 1.5rem', maxWidth: 1400, margin: '0 auto' }}>
        {tab === 'stations' && (
          <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
            <div className="card" style={{ height: '65vh', minHeight: 500, background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.9)' }}>🗺️ اضغط على الخريطة لإضافة محطة</h3>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{stations.length} محطات</span>
              </div>
              <MapContainer center={[33.8935, -5.5473]} zoom={14} style={{ width: '100%', height: 'calc(100% - 40px)', borderRadius: 12 }}>
                <TileLayer url={tileUrl} />
                <ClickHandler onMapClick={handleMapClick} />
                {orderedStations.map((s, i) => {
                  const loc = s.location || s;
                  return (
                    <Marker
                      key={s._id}
                      position={[loc.lat, loc.lng]}
                      icon={stationIcon}
                      draggable={true}
                      eventHandlers={{
                        dragend: (e) => {
                          const pos = e.target.getLatLng();
                          handleDragStation(s._id, pos.lat, pos.lng);
                        },
                      }}
                    >
                      <Popup autoPan={false}>
                        <div style={{ textAlign: 'right', minWidth: 150 }}>
                          <strong style={{ fontSize: '1rem' }}>{s.name}</strong>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>🚏 محطة {i + 1} من {orderedStations.length}</div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                            <button onClick={() => handleEditStation(s)}
                              style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem' }}>✏️ تعديل</button>
                            <button onClick={() => handleDeleteStation(s._id, s.name)}
                              style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem' }}>🗑️ حذف</button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
                {addingStation && (
                  <Marker position={[addingStation.lat, addingStation.lng]} icon={addIcon}>
                    <Popup autoPan={false}>
                      <div style={{ direction: 'rtl', minWidth: 180 }}>
                        <input value={stationName} onChange={e => setStationName(e.target.value)}
                          placeholder="اسم المحطة"
                          autoFocus
                          style={{ width: '100%', marginBottom: 6, padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none' }} />
                        <button onClick={handleSaveStation}
                          className="btn btn-sm btn-primary"
                          style={{ width: '100%', justifyContent: 'center' }}>💾 حفظ</button>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
            {stations.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {orderedStations.map((s, i) => {
                  const loc = s.location || s;
                  return (
                    <div key={s._id}
                      style={{
                        background: 'rgba(255,255,255,0.06)', borderRadius: 10,
                        padding: '0.5rem 0.75rem', border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)',
                      }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: '#2563eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700, color: 'white', flexShrink: 0,
                      }}>{i + 1}</span>
                      <span>{s.name}</span>
                      <button onClick={() => handleDeleteStation(s._id, s.name)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem', padding: 2 }}>
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {editingStation && (
              <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.6)', zIndex: 9998,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }} onClick={() => setEditingStation(null)}>
                <div style={{
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  borderRadius: 16, padding: '1.5rem', minWidth: 300,
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1rem' }}>✏️ تعديل المحطة</h3>
                  <div className="form-group">
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>اسم المحطة</label>
                    <input
                      className="form-input"
                      value={editStationName}
                      onChange={e => setEditStationName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveEditStation()}
                      autoFocus
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 8 }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={handleSaveEditStation}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, justifyContent: 'center', borderRadius: 8 }}>
                      💾 حفظ
                    </button>
                    <button onClick={() => setEditingStation(null)}
                      className="btn btn-sm"
                      style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>
                      إلغاء
                    </button>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: '0.75rem', textAlign: 'center' }}>
                    💡 اسحب العلامة على الخريطة لتغيير مكان المحطة
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'routes' && (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))' }}>
            <div className="card" style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'rgba(255,255,255,0.9)' }}>🛣️ إنشاء مسار جديد</h3>
              <div className="form-group">
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>اسم المسار</label>
                <input className="form-input" value={routeName} onChange={e => setRouteName(e.target.value)} placeholder="مثال: المحطة الطرقية → جامعة مكناس"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 8 }} />
              </div>
              <div className="form-group">
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>وصف (اختياري)</label>
                <input className="form-input" value={routeDesc} onChange={e => setRouteDesc(e.target.value)} placeholder="وصف المسار"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 8 }} />
              </div>
              <div className="form-group">
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>اختر المحطات بالترتيب</label>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '0.5rem', background: 'rgba(0,0,0,0.2)' }}>
                  {orderedStations.map((s, i) => {
                    const isSelected = selectedRouteStations.includes(s._id);
                    const idx = selectedRouteStations.indexOf(s._id);
                    return (
                      <div key={s._id} onClick={() => toggleRouteStation(s._id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem',
                          cursor: 'pointer', background: isSelected ? 'rgba(37,99,235,0.2)' : 'transparent',
                          borderRadius: 6, marginBottom: 2, transition: 'all 0.15s',
                        }}>
                        <span style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: isSelected ? '#2563eb' : 'rgba(255,255,255,0.1)',
                          color: isSelected ? 'white' : 'rgba(255,255,255,0.5)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
                        }}>
                          {isSelected ? idx + 1 : i + 1}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.8)' }}>{s.name}</span>
                      </div>
                    );
                  })}
                </div>
                {selectedRouteStations.length > 0 && (
                  <p style={{ fontSize: '0.85rem', color: '#60a5fa', marginTop: '0.5rem' }}>
                    تم اختيار {selectedRouteStations.length} محطات
                  </p>
                )}
              </div>
              <button onClick={handleCreateRoute} className="btn btn-primary btn-block" disabled={selectedRouteStations.length < 2}
                style={{ borderRadius: 8, background: selectedRouteStations.length < 2 ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                إنشاء المسار
              </button>
            </div>
            <div>
              <div className="card" style={{ maxHeight: '70vh', overflowY: 'auto', background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'rgba(255,255,255,0.9)' }}>📋 المسارات ({routes.length})</h3>
                {routes.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)' }}>لا توجد مسارات بعد.</p>}
                {routes.map(r => (
                  <div key={r._id} style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{r.name}</strong>
                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{r.description}</div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                          📏 {(r.totalDistance / 1000).toFixed(1)} كم | ⏱ {r.estimatedDuration} دقيقة | 🏢 {(r.stations || []).length} محطة
                        </div>
                      </div>
                      <button onClick={() => handleDeleteRoute(r._id, r.name)} className="btn btn-sm"
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, alignSelf: 'flex-start' }}>
                        ✕
                      </button>
                    </div>
                    <div style={{ height: 80, marginTop: '0.5rem', borderRadius: 8, overflow: 'hidden' }}>
                      <MapContainer center={[33.8935, -5.5473]} zoom={13} style={{ width: '100%', height: '100%' }} zoomControl={false} dragging={false} scrollWheelZoom={false} touchZoom={false}>
                        <TileLayer url={tileUrl} />
                        <Polyline
                          positions={(r.path || []).map(p => [p.lat, p.lng])}
                          pathOptions={{ color: '#60a5fa', weight: 3, opacity: 0.7 }}
                        />
                      </MapContainer>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'buses' && (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))' }}>
            <div className="card" style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'rgba(255,255,255,0.9)' }}>🚍 إنشاء باص جديد</h3>
              <div className="form-group">
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>رقم الباص *</label>
                <input className="form-input" value={newBusNumber} onChange={e => setNewBusNumber(e.target.value)} placeholder="مثال: BUS-22"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 8 }} />
              </div>
              <div className="form-group">
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>المسار</label>
                <select className="form-input" value={newBusRoute} onChange={e => { setNewBusRoute(e.target.value); setNewBusDriver(''); }}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 8 }}>
                  <option value="" style={{ background: '#1e293b' }}>-- اختر المسار --</option>
                  {routes.map(r => <option key={r._id} value={r._id} style={{ background: '#1e293b' }}>{r.name}</option>)}
                </select>
              </div>
              {newBusRoute && (() => {
                const selRoute = routes.find(r => r._id === newBusRoute);
                return selRoute ? (
                  <div style={{ height: 200, borderRadius: 10, overflow: 'hidden', marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <MapContainer center={[33.8935, -5.5473]} zoom={14} style={{ width: '100%', height: '100%' }}>
                      <TileLayer url={tileUrl} />
                      <Polyline
                        positions={(selRoute.path || []).map(p => [p.lat, p.lng])}
                        pathOptions={{ color: '#60a5fa', weight: 4, opacity: 0.8, dashArray: '8, 10' }}
                      />
                      {(selRoute.stationDetails || []).map((s) => {
                        const loc = s.location || s;
                        return (
                          <Marker key={s._id} position={[loc.lat, loc.lng]} icon={stationIcon}>
                            <Popup autoPan={false}>{s.name}</Popup>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                  </div>
                ) : null;
              })()}
              <div className="form-group">
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>السائق</label>
                <select className="form-input" value={newBusDriver} onChange={e => setNewBusDriver(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 8 }}>
                  <option value="" style={{ background: '#1e293b' }}>-- اختر السائق --</option>
                  {drivers.map(d => <option key={d._id} value={d._id} style={{ background: '#1e293b' }}>{d.name} ({d.email})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>السعة</label>
                <input type="number" className="form-input" value={newBusCapacity} onChange={e => setNewBusCapacity(parseInt(e.target.value) || 50)} min={1}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 8 }} />
              </div>
              <button onClick={handleCreateBus} className="btn btn-primary btn-block"
                style={{ borderRadius: 8, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                إنشاء الباص
              </button>
            </div>
            <div>
              <div className="card" style={{ maxHeight: '70vh', overflowY: 'auto', background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'rgba(255,255,255,0.9)' }}>🚍 الباصات ({buses.length})</h3>
                {buses.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)' }}>لا توجد باصات.</p>}
                {buses.map(b => (
                  <div key={b._id} style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>🚍 {b.busNumber}</div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                      <div>🛣️ المسار: {b.routeName || 'غير محدد'}</div>
                      <div>👤 السائق: {b.driverName || 'غير محدد'}</div>
                      <div>📊 الحالة: {b.status === 'online' ? '🟢 متصل' : b.status === 'on_trip' ? '🔵 في رحلة' : '🔴 متوقف'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
