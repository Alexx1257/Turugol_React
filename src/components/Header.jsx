import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-black border-b border-white/5 transition-all duration-300">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Link to="/" className="flex items-center group">
            <div className="p-2 rounded-lg font-bold text-2xl group-hover:scale-105 transition-transform duration-300">
              <span className="text-white">TURU</span>
              <span className="text-emerald-500">GOL</span>
            </div>
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link 
            to="/login" 
            className="text-zinc-400 font-medium hover:text-emerald-400 transition-colors px-4 py-2"
          >
            Iniciar sesión
          </Link>
          <Link 
            to="/register" 
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-full transition-all duration-300 shadow-md hover:-translate-y-0.5"
          >
            Registrarse
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;