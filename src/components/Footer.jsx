import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-black text-white pt-16 pb-12 border-t border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row justify-between items-center lg:items-start gap-12">
          
          {/* Columna 1: Logo y descripción */}
          <div className="lg:w-1/2 text-center lg:text-left">
            <Link to="/" className="inline-block mb-6 group">
              <div className="p-2 rounded-lg font-bold text-3xl">
                <span className="text-white">TURU</span>
                <span className="text-emerald-500 group-hover:text-emerald-400 transition-colors">GOL</span>
              </div>
            </Link>
            <p className="text-zinc-400 text-lg leading-relaxed max-w-md mx-auto lg:mx-0">
              La plataforma líder en quinielas de fútbol competitivas. Únete, crea tu liga y demuestra tu conocimiento deportivo ante el mundo.
            </p>
          </div>

          {/* Columna 2: Información de contacto */}
          <div className="lg:w-1/2 w-full text-center lg:text-right flex flex-col items-center lg:items-end">
            <h4 className="text-lg font-bold mb-6 text-white">Contacto</h4>
            <ul className="space-y-4 text-zinc-400">
              <li className="flex items-center lg:justify-end gap-3 group cursor-pointer">
                <span className="group-hover:text-emerald-500 transition-colors text-lg">soporte@turugol.com</span>
                <div className="w-10 h-10 rounded-full bg-emerald-900/10 flex items-center justify-center text-emerald-600">
                  <i className="fas fa-envelope text-sm"></i>
                </div>
              </li>
              <li className="flex items-center lg:justify-end gap-3 group">
                <span className="text-zinc-500 text-lg">Madrid, España</span>
                <div className="w-10 h-10 rounded-full bg-zinc-900/50 flex items-center justify-center text-zinc-600">
                  <i className="fas fa-map-marker-alt text-sm"></i>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;