import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lexicon.studentportal',
  appName: 'Lexicon Student Portal',
  webDir: 'dist/student-portal/browser',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
