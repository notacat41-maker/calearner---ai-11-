import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.calearner.ai',
  appName: 'CaLearner - AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;