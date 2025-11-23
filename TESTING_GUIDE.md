# 🧪 Testing Guide - Student Attendance System

## Quick Access URLs

With the server running (`npm run dev`):

- **Home:** http://localhost:3000
- **Register:** http://localhost:3000/student/register
- **Attendance:** http://localhost:3000/student/attendance
- **Admin Login:** http://localhost:3000/login
- **Dashboard:** http://localhost:3000/admin/dashboard
- **Locations:** http://localhost:3000/admin/locations

---

## 🧑‍🎓 Test Scenario 1: Student Registration

### Steps:
1. Open http://localhost:3000
2. Click the **"Register"** card (blue gradient)
3. Fill in the form:
   ```
   Name: Test Student
   Email: test.student@university.edu
   Specialty: Click "MI" button
   Major: Select "CS" from dropdown
   ```
4. Click **"Register"** button
5. ✅ **Expected:** Success message → Auto redirect to attendance page

### What to Test:
- [ ] Form validation (try submitting empty)
- [ ] Specialty button switches (MI/ST)
- [ ] Major dropdown changes with specialty
- [ ] Email uniqueness (try registering same email twice)
- [ ] Success animation appears
- [ ] Redirect works after 2 seconds

---

## 📍 Test Scenario 2: Mark Attendance

### Steps:
1. Open http://localhost:3000/student/attendance
2. Enter email: `test.student@university.edu`
3. Click **"Get My Location"**
4. Allow location access in browser
5. Wait for location to be captured (see coordinates)
6. Click **"Mark Attendance"**

### What to Test:
- [ ] Location permission prompt appears
- [ ] Coordinates display after capture
- [ ] Button states change (loading spinners)
- [ ] Success message if within radius
- [ ] Error message if too far away
- [ ] Can't mark twice in same day

### Troubleshooting Location:
If you're not near the default location (Tizi Ouzou, Algeria):

**Option A:** Add your current location
1. Get your coordinates: https://www.latlong.net/
2. Login as admin
3. Go to Locations → Add Location
4. Input your coordinates
5. Set radius to 1000m for testing
6. Try attendance again

**Option B:** Mock location (Chrome DevTools)
1. Press F12 → Open DevTools
2. Press Ctrl+Shift+P → Type "sensors"
3. Select "Show Sensors"
4. Set custom location:
   - Latitude: 36.7489
   - Longitude: 3.0588
5. Try attendance again

---

## 🔐 Test Scenario 3: Admin Login

### Steps:
1. Open http://localhost:3000
2. Click **"Admin Login"** card (orange gradient)
3. Enter credentials:
   ```
   Email: admin@test.com
   Password: admin123
   ```
4. Click **"Sign In"**
5. ✅ **Expected:** Redirect to dashboard

### What to Test:
- [ ] Wrong password shows error
- [ ] Wrong email shows error
- [ ] Empty fields validated
- [ ] Success redirects to dashboard
- [ ] Session persists (refresh page)
- [ ] Logout button works

---

## 📊 Test Scenario 4: Admin Dashboard

### Steps:
1. Login as admin (see above)
2. You should see the dashboard automatically

### What to Test:

#### Statistics Cards:
- [ ] Total Students count updates
- [ ] Total Attendance shows records
- [ ] Today's Attendance updates
- [ ] Verified Records count correct

#### Student Table:
- [ ] Students list displays
- [ ] Shows name, email, specialty, major
- [ ] Attendance count per student
- [ ] Last attendance date shown

#### Filters:
1. **Specialty Filter:**
   - Select "MI" → Table filters
   - Select "ST" → Table filters
   - Select "All" → Shows all

2. **Major Filter:**
   - Select specialty first
   - Choose major → Table filters
   - Only shows students of that major

3. **Search:**
   - Type student name → Filters instantly
   - Type email → Filters instantly
   - Clear search → Shows all

4. **Date Range:**
   - Set "Date From" → Filters attendance
   - Set "Date To" → Filters attendance
   - Both dates → Shows range only

5. **Clear Filters:**
   - Click "Clear All Filters"
   - All filters reset

---

## 🗺️ Test Scenario 5: Location Management

### Steps:
1. From dashboard, click **"Manage Locations"**
2. Click **"Add Location"** button

### Add Location Test:
```
Location Name: Test Campus Building
Latitude: 40.7128
Longitude: -74.0060
Radius: 150
Active: ✓ checked
```
Click "Save Location"

### What to Test:
- [ ] Location appears in grid
- [ ] Shows coordinates correctly
- [ ] Displays radius
- [ ] Active badge shows green
- [ ] Edit button works
- [ ] Can update all fields
- [ ] Delete with confirmation
- [ ] Active/inactive toggle works

---

## 📥 Test Scenario 6: CSV Export

### Steps:
1. Login as admin
2. On dashboard, click **"Export CSV"**
3. File downloads automatically

### What to Test:
- [ ] File downloads
- [ ] Named with current date
- [ ] Opens in Excel/Sheets
- [ ] Contains all columns:
  - Name, Email, Specialty, Major
  - Date, Latitude, Longitude
  - Distance, Verified
- [ ] Data is accurate
- [ ] All records included

---

## 🔄 Test Scenario 7: Complete User Flow

### Full Integration Test:

1. **Register 3 Students:**
   - Student 1: MI - CPMI1
   - Student 2: MI - CS
   - Student 3: ST - IT1

2. **Mark Attendance:**
   - Student 1 marks attendance
   - Student 2 marks attendance
   - Student 3 tries but too far (should fail)

3. **Admin Checks:**
   - Login as admin
   - See 3 students in dashboard
   - See 2 attendance records for today
   - Filter by MI specialty → 2 students
   - Filter by CS major → 1 student
   - Search for student 1 name → 1 result
   - Export CSV → 2 attendance rows

4. **Location Update:**
   - Go to locations
   - Edit Main Campus
   - Increase radius to 500m
   - Student 3 tries again → Success!

5. **Verify Dashboard:**
   - 3 total students
   - 3 total attendance
   - 3 today's attendance
   - All verified

---

## 🚨 Error Cases to Test

### Student Errors:
1. **Duplicate Registration:**
   - Register same email twice
   - ✅ Should show: "Student with this email already exists"

2. **Invalid Email:**
   - Try: "notanemail"
   - ✅ Should validate as email required

3. **Missing Fields:**
   - Leave name empty → Error
   - Don't select specialty → Can't proceed
   - Don't select major → Can't submit

4. **Attendance Errors:**
   - Mark without location → Error
   - Mark twice same day → "Already marked"
   - Too far from location → Distance error

### Admin Errors:
1. **Wrong Login:**
   - Wrong password → "Invalid credentials"
   - Wrong email → "Invalid credentials"

2. **Location Errors:**
   - Invalid coordinates → Validation error
   - Radius too small/large → Range error

---

## 📱 Browser Testing

### Test in Multiple Browsers:
- [ ] Chrome (recommended)
- [ ] Firefox
- [ ] Edge
- [ ] Safari (Mac)

### Mobile Testing:
- [ ] Open on phone/tablet
- [ ] Responsive layout works
- [ ] Geolocation on mobile
- [ ] Touch interactions work

---

## 🔍 Console Checks

### Open DevTools (F12) and check:

1. **Console Tab:**
   - No red errors
   - MongoDB connection success
   - API responses logged

2. **Network Tab:**
   - API calls return 200/201
   - POST requests send data
   - Responses contain data

3. **Application Tab:**
   - Session cookie set
   - LocalStorage (if used)

---

## 📊 Database Verification

### Check MongoDB Atlas:

1. Login to MongoDB Atlas
2. Browse Collections:
   - `students` → See registered students
   - `admins` → See admin account
   - `attendancelocations` → See locations

3. Verify Data:
   - Student records have attendance arrays
   - Coordinates are correct
   - Timestamps are recent

---

## ✅ Final Checklist

Before deploying to production:

### Functionality:
- [ ] All pages load correctly
- [ ] Registration works
- [ ] Attendance marking works
- [ ] Admin login works
- [ ] Dashboard shows data
- [ ] Filters work
- [ ] Location management works
- [ ] CSV export works

### Security:
- [ ] Change admin password
- [ ] Update NEXTAUTH_SECRET
- [ ] API routes protected
- [ ] Passwords hashed
- [ ] SQL injection prevented (MongoDB)

### Performance:
- [ ] Pages load quickly
- [ ] No console errors
- [ ] Images optimized
- [ ] API responses fast

### UX:
- [ ] Animations smooth
- [ ] Error messages clear
- [ ] Success feedback shown
- [ ] Loading states visible
- [ ] Mobile responsive

---

## 🐛 Known Issues & Solutions

### Issue: "Module not found" errors
**Solution:** Stop server, run `npm install`, restart

### Issue: Location always denied
**Solution:** 
- Check browser settings → Allow location
- Use HTTPS in production
- Try different browser

### Issue: Dashboard shows 0 students
**Solution:**
- Register some students first
- Check MongoDB connection
- Verify data in database

### Issue: Can't login as admin
**Solution:**
- Run `node scripts/init-db.js` again
- Check credentials match
- Clear browser cookies

---

## 📝 Test Results Template

```markdown
## Test Run - [Date]

### Environment:
- Browser: Chrome 120
- OS: Windows 11
- Node: v18.17.0
- Server: localhost:3000

### Test Results:

| Test Case | Status | Notes |
|-----------|--------|-------|
| Student Registration | ✅ Pass | |
| Mark Attendance | ✅ Pass | |
| Admin Login | ✅ Pass | |
| Dashboard View | ✅ Pass | |
| Filters | ✅ Pass | |
| Location Management | ✅ Pass | |
| CSV Export | ✅ Pass | |

### Issues Found:
- None

### Recommendations:
- All features working as expected
- Ready for deployment
```

---

## 🎯 Performance Targets

### Page Load Times (Target):
- Home: < 1s
- Registration: < 1s
- Attendance: < 1s
- Dashboard: < 2s
- Locations: < 1.5s

### API Response Times (Target):
- Registration: < 500ms
- Mark Attendance: < 800ms
- Get Students: < 600ms
- Export CSV: < 1s

---

**Happy Testing! 🚀**

*Remember: Testing is crucial for a production-ready application!*
