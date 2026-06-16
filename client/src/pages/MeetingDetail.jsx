import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import LiveTranscript from '../components/LiveTranscript';
import SummaryView from '../components/SummaryView';
import '../styles/meeting-detail.css';

function MeetingDetail() {
  const { id } = useParams();
  const [recording, setRecording] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:5000/api/recordings/${id}`)
      .then((res) => setRecording(res.data))
      .catch(() => {});
  }, [id]);

  const hasVideo = recording?.videoUrl;

  return (
    <div className="meeting-detail">
      <h1>Meeting details</h1>

      {/* ── Video Player ───────────────────────────────────────────────── */}
      {hasVideo && (
        <div className="video-player-card">
          <div className="video-player-header">
            <span>🎬</span>
            <div>
              <p className="video-player-title">{recording.title || 'Recording'}</p>
              <p className="video-player-sub">Recorded screen — watch to review the lecture</p>
            </div>
          </div>
          <video
            controls
            className="video-player"
            src={`http://localhost:5000/api/recordings/${id}/stream`}
            preload="metadata"
          >
            Your browser does not support the video element.
          </video>
        </div>
      )}

      <LiveTranscript recordingId={id} />
      <SummaryView recordingId={id} />
    </div>
  );
}

export default MeetingDetail;
