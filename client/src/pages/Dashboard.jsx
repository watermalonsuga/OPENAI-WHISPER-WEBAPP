import React, { useEffect, useState } from 'react';
import axios from 'axios';
import RecordingControls from '../components/RecordingControls';
import RecordingsList from '../components/RecordingsList';

function Dashboard() {
  const [stats, setStats] = useState({ total: 0, completed: 0, recording: 0 });

  useEffect(() => {
    axios.get('http://localhost:5000/api/recordings')
      .then((res) => {
        const recs = res.data;
        setStats({
          total: recs.length,
          completed: recs.filter((r) => r.status === 'completed').length,
          recording: recs.filter((r) => r.status === 'recording').length
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="dashboard">
      <div className="hero">
        <span className="hero-badge">AI-powered meeting assistant</span>
        <h1>Capture every conversation, effortlessly</h1>
        <p className="dashboard-subtitle">
          Whisper Voice AI listens to your meetings, transcribes them in real time,
          and turns the conversation into clear, actionable summaries.
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Total meetings</p>
          <p className="stat-value">{stats.total}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Completed</p>
          <p className="stat-value">{stats.completed}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">In progress</p>
          <p className="stat-value">{stats.recording}</p>
        </div>
      </div>

      <RecordingControls />

      <h2 className="dashboard-section-title">Your meetings</h2>
      <RecordingsList />
    </div>
  );
}

export default Dashboard;