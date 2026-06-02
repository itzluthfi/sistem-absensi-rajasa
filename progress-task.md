# Progress Task - Sistem Absensi Digital SMKS Rajasa

Status: In progress

## Tasks

- [x] Add migrations for core tables (`majors`, `teachers`, `classes`, `students`, `subjects`, `schedules`, `attendances`)
- [x] Add Eloquent models (`Major`, `Teacher`, `SchoolClass`, `Student`, `Subject`, `Schedule`, `Attendance`)
- [x] Add API controllers (CRUD) for Students, Teachers, Classes, Attendance
- [x] Add API routes in `routes/api.php`
- [x] Add seeders with dummy data (Majors, Teachers, Classes, Students, Subjects, Schedules, Attendances)
- [x] Run migrations and seeders locally
- [x] Add role/permission guard middleware for admin routes
- [x] Complete PDF report view and export
- [x] Build complete frontend mobile app with Expo Router

## Completed Work (2026-05-29)

### Backend
- **Role middleware**: Created `CheckRole` middleware and registered in `bootstrap/app.php`
- **Protected routes**: Updated `routes/api.php` with role-based access control
- **PDF report view**: Created complete Blade template at `resources/views/reports/attendance.blade.php`

### Frontend (Expo React Native)
- **App structure**: Created `(auth)` and `(tabs)` layout groups
- **Auth screens**: Login and Register screens with validation
- **Dashboard**: Home screen with statistics and quick actions
- **Attendance**: QR scan and manual input screens
- **Reports**: Report generation and export screens
- **Profile**: User profile with logout functionality
- **Leave Requests**: Full CRUD for izin/sakit with approval flow
- **Notifications**: Notification list screen
- **API integration**: Complete API service with auth token management
- **State management**: Updated authStore and attendanceStore with full functionality

## Backend remaining work
- [ ] 13. Verifikasi: Jalankan build ulang di EAS (eas build)
- [x] 14. Backend: Tambah parameter class_id & all di StudentsController index
- [x] 15. Frontend: Rancang modal detail analitik mapel responsif (tengah di web) & muat daftar lengkap siswa kelas
- [x] 16. Frontend: Tampilkan badge status kehadiran real-time tiap siswa (Hadir/Telat/Belum Absen) di modal
- [ ] Verify all API endpoints with Postman/tests
- [ ] Test realtime broadcasting end-to-end (Redis + Echo server + queue)
- [ ] Add more unit tests

## Frontend remaining work
- [ ] Add more screens (students list, teachers list, classes management)
- [ ] Improve UI/UX
- [ ] Add offline support
- [ ] Add push notifications integration

## Notes

### To run backend:
```bash
cd backend
php artisan migrate
php artisan db:seed
php artisan serve
```

### To run frontend:
```bash
cd frontend
npx expo start
```

### Default test user:
- Email: `test@example.com`
- Password: `password`

### API Endpoints:
- POST `/api/auth/login` - Login
- POST `/api/auth/register` - Register
- POST `/api/auth/logout` - Logout
- GET `/api/auth/me` - Get current user
- GET `/api/students` - List students
- GET `/api/teachers` - List teachers
- GET `/api/classes` - List classes
- GET `/api/attendance` - List attendance
- POST `/api/attendance` - Create attendance
- GET `/api/reports/attendance/pdf` - Download PDF report
- GET `/api/reports/attendance/csv` - Download CSV report
- GET `/api/leave-requests` - List leave requests
- POST `/api/leave-requests` - Create leave request
- POST `/api/leave-requests/{id}/approve` - Approve leave (requires role)
- POST `/api/leave-requests/{id}/reject` - Reject leave (requires role)