import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const VolunteerNav = ({ currentPage }) => {
  const { user, logout } = useAuth();

  return (
    <div className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          {/* Title - Hidden on mobile, shown on larger screens */}
          <div className="hidden lg:flex items-center space-x-4 flex-shrink-0">
            <h1 className="text-xl font-semibold text-gray-900">
              {user?.organizationName} - {currentPage}
            </h1>
          </div>

          {/* Scrollable Navigation Links - grows to fill space */}
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex items-center space-x-2 lg:space-x-4 lg:ml-8">
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                  currentPage === 'Dashboard'
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🏠 Dashboard
              </Link>
              <Link
                to="/volunteers"
                className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                  currentPage === 'Volunteers'
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                👥 Volunteers
              </Link>
              <Link
                to="/my-tasks"
                className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                  currentPage === 'My Tasks'
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ✅ My Tasks
              </Link>
              <Link
                to="/calendar"
                className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                  currentPage === 'Calendar'
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📅 Calendar
              </Link>
              <Link
                to="/documents"
                className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                  currentPage === 'Documents'
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📄 Documents
              </Link>
            </div>
          </div>

          {/* Fixed Right Section - Profile & Logout */}
          <div className="flex items-center space-x-2 lg:space-x-3 border-l border-gray-200 pl-2 lg:pl-4 ml-2 lg:ml-4 flex-shrink-0">
            <Link
              to="/profile"
              className={`text-xs lg:text-sm transition-colors whitespace-nowrap ${
                currentPage === 'Profile'
                  ? 'text-blue-800 font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {user?.firstName || user?.email}
            </Link>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm font-medium transition-colors whitespace-nowrap"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VolunteerNav;
