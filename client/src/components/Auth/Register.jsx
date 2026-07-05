import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'passenger',
    phone: '',
    busNumber: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = { ...form };
      if (data.role === 'passenger') delete data.busNumber;
      await register(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
      padding: '1rem',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🚍</div>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--gray-800)' }}>إنشاء حساب جديد</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>أنشئ حسابك لبدء استخدام النظام</p>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.9rem',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>الاسم الكامل</label>
            <input
              type="text"
              name="name"
              className="form-input"
              placeholder="أدخل اسمك الكامل"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>البريد الإلكتروني</label>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="أدخل بريدك الإلكتروني"
              value={form.email}
              onChange={handleChange}
              required
              dir="ltr"
            />
          </div>

          <div className="form-group">
            <label>كلمة المرور</label>
            <input
              type="password"
              name="password"
              className="form-input"
              placeholder="أدخل كلمة المرور"
              value={form.password}
              onChange={handleChange}
              required
              dir="ltr"
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label>رقم الجوال</label>
            <input
              type="tel"
              name="phone"
              className="form-input"
              placeholder="أدخل رقم الجوال (اختياري)"
              value={form.phone}
              onChange={handleChange}
              dir="ltr"
            />
          </div>

          <div className="form-group">
            <label>نوع الحساب</label>
            <select name="role" className="form-select" value={form.role} onChange={handleChange}>
              <option value="passenger">🚶 راكب</option>
              <option value="driver">🚍 سائق</option>
            </select>
          </div>

          {form.role === 'driver' && (
            <div className="form-group">
              <label>رقم الباص</label>
              <input
                type="text"
                name="busNumber"
                className="form-input"
                placeholder="مثال: BUS-101"
                value={form.busNumber}
                onChange={handleChange}
                required
                dir="ltr"
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--gray-500)', fontSize: '0.9rem' }}>
          لديك حساب بالفعل؟{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
