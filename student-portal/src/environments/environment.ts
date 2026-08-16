// src/environments/environment.ts
// Production environment configuration
export const environment = {
  production: true,
  // Base URL for the NestJS backend API in production.
  // Dev APK: the host machine's LAN IP so both the Android emulator and a
  // physical phone on the same Wi-Fi can reach the backend.
  apiUrl: 'http://192.168.247.239:3000/api/v1'
};
