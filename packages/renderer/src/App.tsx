import React from 'react';
import { TitleBar } from './components/Browser/TitleBar';

export function App() {
  return (
    <div className="h-screen w-screen flex flex-col bg-bg">
      <TitleBar />
      {/* TabBar will go here */}
      {/* NavigationBar will go here */}
      <div className="flex-1 flex items-center justify-center text-text-muted text-lg">
        OS Browser — Ready
      </div>
      {/* StatusBar will go here */}
    </div>
  );
}
