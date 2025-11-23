# Student Attendance System

A modern Next.js 15 student attendance tracking system with geolocation validation and IP-based duplicate prevention.

## 🚀 Features

- ✅ **Direct Attendance Marking** - No registration required
- ✅ **Geolocation-Based Validation** with Haversine formula
- ✅ **IP Address Tracking** - One device = one email per day
- ✅ **Popup Notifications** - Elegant success/error messages
- ✅ **Admin Dashboard** with filtering and statistics
- ✅ **Location Management** with GPS coordinates
- ✅ **CSV Export** functionality
- ✅ **Secure Authentication** with NextAuth.js
- ✅ **Modern Responsive UI**

## 📋 Quick Start

```bash
cd "greve attendance"
npm install
node scripts/init-db.js
npm run dev
```

Open: **http://localhost:3000**

## 🔑 Default Admin Login

```
Email: admin@test.com
Password: admin123
```

## 🎯 How It Works

### For Students:
1. Go to "Mark Attendance"
2. Enter: Name, Email, Specialty, Major
3. Click "Get My Location" → Allow
4. Submit
5. ✅ Success popup!

### IP Protection:
- One device can mark attendance once per day with one email
- Prevents duplicate submissions
- Resets daily

## 📚 Documentation

- **SETUP_COMPLETE.md** - Full setup guide
- **TESTING_GUIDE.md** - Testing scenarios
- **QUICK_REFERENCE.md** - Quick reference

---

**Status:** ✅ Ready for Production
