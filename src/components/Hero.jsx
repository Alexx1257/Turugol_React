import React from 'react';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <section className="relative bg-zinc-950 text-white overflow-hidden min-h-[80vh] flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,_#064e3b_0%,_#09090b_80%)]"></div>
      
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none"></div>
      
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-600/10 rounded-full blur-[100px] -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-900/20 rounded-full blur-[100px] -z-10"></div>

      <div className="container mx-auto px-4 relative z-10 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block px-4 py-1.5 mb-8 border border-emerald-500/20 rounded-full bg-emerald-500/5 backdrop-blur-sm">
            <span className="text-emerald-500 text-xs font-bold tracking-[0.2em] uppercase">
              La nueva era del pronóstico
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-8 tracking-tight">
            Demuestra que <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400">
              sabes de fútbol
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
            Compite en quinielas con tus amigos, crea tus propias ligas y demuestra quién es el verdadero experto en deportes.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link 
              to="/register" 
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white text-lg font-bold py-4 px-12 rounded-full transition-all duration-300 shadow-[0_10px_20px_rgba(5,150,105,0.2)] hover:shadow-[0_15px_30px_rgba(5,150,105,0.4)] hover:-translate-y-1 text-center"
            >
              Comenzar ahora
            </Link>
            <Link 
              to="/login" 
              className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-lg font-semibold py-4 px-12 rounded-full transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm"
            >
              <span>Ya tengo cuenta</span>
              <i className="fas fa-arrow-right text-sm group-hover:translate-x-1 transition-transform"></i>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;