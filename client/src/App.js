import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MeetingDetail from './pages/MeetingDetail';
import './App.css';
import './styles/global.css';
import './styles/navbar.css';
import './styles/dashboard.css';
import './styles/recording-controls.css';
import './styles/recordings-list.css';
import './styles/meeting-detail.css';
import './styles/live-transcript.css';
import './styles/summary-view.css';

function App() {
  return (
    <Router>
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="navbar-logo">W</span>
          <span className="navbar-title">OPENAI Whisper Voice AI</span>
        </div>
        <Link to="/"></Link>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/meeting/:id" element={<MeetingDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
