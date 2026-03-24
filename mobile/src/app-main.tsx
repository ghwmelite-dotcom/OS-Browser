import React from 'react';
import { createRoot } from 'react-dom/client';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from './App';
import './app-styles.css';

createRoot(document.getElementById('root')!).render(<App />);

// Hide splash screen and configure status bar once the app renders
SplashScreen.hide().catch(() => {});
StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
StatusBar.setBackgroundColor({ color: '#0f1117' }).catch(() => {});
