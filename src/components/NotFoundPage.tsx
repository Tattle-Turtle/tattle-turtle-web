/**
 * 404 — friendly "page wandered off" when path doesn't match any route.
 */

import { Link } from 'react-router-dom';
import { Turtle, Home } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 font-sans text-center">
      <div className="bg-white p-10 rounded-[40px] shadow-2xl border-b-8 border-emerald-200 max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="bg-amber-100 p-6 rounded-full">
            <Turtle size={64} className="text-amber-600" />
          </div>
        </div>
        <h1 className="text-2xl font-black text-emerald-900">
          This page wandered off
        </h1>
        <p className="text-emerald-700">
          The page you’re looking for isn’t here. Head back home or to play and you’ll be all set.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-6 rounded-2xl shadow-[0_4px_0_rgb(5,150,105)] transition-all"
          >
            <Home size={20} />
            Home
          </Link>
          <Link
            to="/home"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-emerald-50 text-emerald-700 font-bold py-4 px-6 rounded-2xl border-2 border-emerald-200 transition-all"
          >
            Play
          </Link>
        </div>
      </div>
    </div>
  );
}
