import React, { useState, useEffect } from 'react';
import API from '../services/api.js';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [trips, setTrips] = useState([]);
  const navigate = useNavigate();

  // Fetch user's trips on component mount
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await API.get('/trips');
        setTrips(res.data);
      } catch (err) {
        console.error('Failed to fetch trips:', err);
      }
    };
    fetchTrips();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header>
        <h1>Your Trips</h1>
        <button onClick={handleLogout}>Logout</button>
      </header>

      <div className="trip-list">
        {trips.length > 0 ? (
          trips.map((trip) => (
            <div key={trip.id} className="trip-card" onClick={() => navigate(`/trip/${trip.id}`)}>
              <h3>{trip.name}</h3>
              <p>Members: {trip.member_count}</p>
              <p>Total Expenses: ${trip.total_expenses || 0}</p>
            </div>
          ))
        ) : (
          <p>No trips yet. <button onClick={() => navigate('/create-trip')}>Create one!</button></p>
        )}
      </div>
    </div>
  );
}