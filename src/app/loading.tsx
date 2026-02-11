import React from 'react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        {/* Logo Animation Pulse */}
        <div className="relative h-16 w-16 animate-pulse">
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="h-full w-full text-yellow-500"
            >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
        </div>
        
        {/* Loading Text */}
        <div className="flex flex-col items-center">
            <h3 className="text-xl font-bold text-white tracking-wider">TRADEHUB</h3>
            <p className="text-sm text-gray-400 animate-pulse">Memuat Data Pasar...</p>
        </div>

        {/* Spinner */}
        <div className="mt-4 flex gap-1">
            <div className="h-2 w-2 rounded-full bg-yellow-500 animate-bounce [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 rounded-full bg-yellow-500 animate-bounce [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 rounded-full bg-yellow-500 animate-bounce"></div>
        </div>
      </div>
    </div>
  );
}