// src/pages/LandingPage.js
import React from 'react';
import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            App in Development
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            This app is in development, please excuse any imperfections.
          </p>
          <p className="mt-2 text-sm text-gray-600">
            If the server is currently down, it is likely being temporarily paused to optimize costs. We appreciate your patience!
          </p>

        </div>
        <div className="mt-8">
          <Link
            to="/login"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;