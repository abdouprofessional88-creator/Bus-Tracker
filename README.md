# 🚍 Bus Tracking System - نظام تتبع الباصات

نظام ويب متكامل (Full Stack) لتتبع الباصات في الوقت الحقيقي، يشبه فكرة Uber ولكن خاص بالباصات.

## ✨ المميزات

- **نوعان من المستخدمين**: سائق (Driver) وراكب (Passenger)
- **تسجيل دخول وتسجيل** لكل نوع
- **لوحة تحكم للسائق**: تشغيل/إيقاف التشغيل، مشاركة الموقع، تحديث عدد الركاب
- **خريطة تفاعلية للراكب**: تحديد الموقع والوجهة، اقتراح الباص المناسب، تتبع مباشر
- **Real-time tracking** باستخدام Socket.io
- **نظام ETA** لحساب وقت الوصول المتوقع
- **تصميم responsive** يعمل على الهاتف والحاسوب

## 📁 هيكلة المشروع

```
bus-tracking/
├── server/                      # الخادم (Backend)
│   ├── config/                  # الإعدادات
│   │   ├── db.js               # اتصال MongoDB
│   │   └── seed.js             # بيانات تجريبية
│   ├── controllers/            # المتحكمات
│   │   ├── auth.controller.js  # تسجيل الدخول
│   │   ├── driver.controller.js# وظائف السائق
│   │   └── passenger.controller.js # وظائف الراكب
│   ├── data/                   # ملفات JSON (قاعدة بيانات)
│   ├── middleware/             # وسيطة المصادقة
│   │   └── auth.js
│   ├── models/                 # نماذج البيانات
│   │   ├── user.model.js
│   │   ├── bus.model.js
│   │   ├── route.model.js
│   │   ├── station.model.js
│   │   └── index.js           # واجهة موحدة
│   ├── routes/                 # المسارات
│   │   ├── auth.routes.js
│   │   ├── driver.routes.js
│   │   └── passenger.routes.js
│   ├── services/               # الخدمات
│   │   ├── distance.js        # حسابات المسافات و ETA
│   │   └── jsonDb.js          # قاعدة بيانات JSON
│   ├── .env                    # متغيرات البيئة
│   └── server.js               # نقطة البداية
├── client/                     # الواجهة (Frontend)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/          # تسجيل الدخول
│   │   │   ├── Driver/        # لوحة السائق
│   │   │   ├── Passenger/     # واجهة الراكب
│   │   │   └── Map/           # الخريطة
│   │   ├── context/           # السياقات (Auth, Socket)
│   │   ├── services/          # API calls
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── package.json                # السكريبتات الرئيسية
```

## 🛠️ التقنيات المستخدمة

| التقنية | الاستخدام |
|---------|-----------|
| React + Vite | واجهة المستخدم |
| Node.js + Express | الخادم |
| Socket.io | اتصال مباشر (Real-time) |
| Leaflet + OpenStreetMap | الخرائط |
| MongoDB / JSON File | قاعدة البيانات |

## 🚀 طريقة التشغيل

### المتطلبات
- Node.js v18+
- npm

### 1. تثبيت الحزم

```bash
cd bus-tracking

# تثبيت حزم الخادم
cd server && npm install && cd ..

# تثبيت حزم العميل
cd client && npm install && cd ..
```

### 2. تشغيل البذور (بيانات تجريبية)

```bash
cd server && node config/seed.js && cd ..
```

### 3. تشغيل الخادم

```bash
cd server && npm run dev
```

### 4. تشغيل الواجهة (نافذة جديدة)

```bash
cd client && npm run dev
```

### 5. فتح المتصفح

افتح الرابط: **http://localhost:5173**

---

## 🧪 حسابات تجريبية

| النوع | البريد الإلكتروني | كلمة المرور |
|-------|-------------------|-------------|
| 🚍 سائق 1 | driver1@test.com | password123 |
| 🚍 سائق 2 | driver2@test.com | password123 |
| 🚶 راكب | pass1@test.com | password123 |

## 📡 API Endpoints

### المصادقة
- `POST /api/auth/register` - تسجيل جديد
- `POST /api/auth/login` - تسجيل دخول
- `GET /api/auth/me` - بيانات المستخدم

### السائق
- `GET /api/driver/dashboard` - لوحة التحكم
- `POST /api/driver/toggle-status` - تشغيل/إيقاف
- `POST /api/driver/location` - تحديث الموقع
- `POST /api/driver/passenger-count` - تحديث عدد الركاب

### الراكب
- `GET /api/passenger/nearby-buses` - الباصات القريبة
- `GET /api/passenger/nearest-station` - أقرب محطة
- `GET /api/passenger/route-suggestions` - اقتراحات المسار
- `GET /api/passenger/routes` - جميع المسارات
- `GET /api/passenger/track-bus/:busId` - تتبع باص

## 📱 صور من النظام

لتجربة النظام، اتبع خطوات التشغيل أعلاه ثم:
1. سجل دخول كسائق (driver1@test.com)
2. اضغط "بدء التشغيل" لمشاركة موقعك
3. سجل دخول كراكب في نافذة متصفح أخرى (pass1@test.com)
4. اختر وجهة واضغط "ابحث عن باص"
5. تتبع الباص مباشرة على الخريطة
