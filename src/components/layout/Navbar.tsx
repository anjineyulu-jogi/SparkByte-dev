import { Link } from 'react-router-dom';
import { Camera, Search, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, login, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-[rgb(var(--m3-surface))] border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" aria-label="SparkByte Home">
          <div className="w-8 h-8 rounded-full bg-[rgb(var(--m3-primary))] flex items-center justify-center text-white font-bold">
            S
          </div>
          <span className="font-bold text-xl tracking-tight text-[rgb(var(--m3-on-surface))]">
            SparkByte
          </span>
        </Link>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <Link to="/" className="p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Search Products">
            <Search className="w-5 h-5" />
          </Link>
          <Link to="/scan" className="p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Live Scanner">
            <Camera className="w-5 h-5" />
          </Link>
          
          {user ? (
            <div className="flex items-center gap-3 ml-2">
              <button 
                onClick={logout}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
                aria-label="Sign out"
              >
                Sign out
              </button>
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || "User profile"} className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-gray-500" />
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={login}
              className="m3-button-tonal ml-2 text-sm px-4 py-2"
              aria-label="Sign in with Google"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
