import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Don't show navbar on login/signup pages
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return null;
  }

  // Only show navbar if user is authenticated
  if (!token) {
    return null;
  }

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link to="/dashboard" className="text-xl font-bold hover:text-blue-200 transition-colors">
              MyApp
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            <Link 
              to="/dashboard" 
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === '/dashboard' 
                  ? 'bg-blue-700 text-white' 
                  : 'text-blue-100 hover:bg-blue-500'
              }`}
            >
              Dashboard
            </Link>

            {/* User Menu */}
            <div className="flex items-center space-x-2">
              <span className="text-blue-100 text-sm">Welcome back!</span>
              <button
                onClick={handleLogout}
                className="bg-blue-500 hover:bg-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;