import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';

function MeetingDetail() {
  const { id } = useParams();
  const [recording, setRecording] = useState(null);
  const [activeTab, setActiveTab] = useState('transcript');
  const [segments, setSegments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  // Fetch recording info
  useEffect(() => {
    axios.get(`${SERVER_URL}/api/recordings/${id}`).then(r => setRecording(r.data)).catch(() => {});
  }, [id]);

  // Fetch transcript + live updates
  useEffect(() => {
    axios.get(`${SERVER_URL}/api/transcripts/${id}`)
      .then(r => { if (r.data.segments) setSegments(r.data.segments); })
      .catch(() => {});

    const socket = io(SERVER_URL);
    socket.emit('join-recording', id);
    socket.on('transcript-update', (data) => setSegments(prev => [...prev, data]));
    return () => socket.disconnect();
  }, [id]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await axios.get(`${SERVER_URL}/api/summaries/${id}`);
      setSummary(res.data);
    } catch { setSummary(null); }
    finally { setSummaryLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchSummary();
    const poll = setInterval(fetchSummary, 8000);
    return () => clearInterval(poll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleGenerate = async () => {
    setGenerating(true);
    setSummaryError('');
    try {
      const res = await axios.post(`${SERVER_URL}/api/summaries/${id}/generate`);
      setSummary(res.data);
    } catch (err) {
      setSummaryError(err.response?.data?.error || 'Failed to generate summary.');
    } finally { setGenerating(false); }
  };

  const tabs = [
    { key: 'transcript', label: 'Live Transcript', emoji: '📝' },
    { key: 'summary',    label: 'Summary',         emoji: '🧠' },
    { key: 'keypoints',  label: 'Key Points',      emoji: '🎯' },
    { key: 'actions',    label: 'Action Items',    emoji: '✅' },
  ];

  const hasVideo = recording?.videoUrl;

  return (
    <div className="md-page">

      {/* ── TOP: Video Player ─────────────────────────────────────── */}
      {hasVideo && (
        <div className="md-video-wrap">
          <video
            controls
            className="md-video"
            src={`${SERVER_URL}/api/recordings/${id}/stream`}
            preload="metadata"
          />
        </div>
      )}

      {/* ── BOTTOM: Sidebar + Content ─────────────────────────────── */}
      <div className="md-body">

        {/* Sidebar */}
        <aside className="md-sidebar">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`md-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="md-tab-emoji">{tab.emoji}</span>
              <span className="md-tab-label">{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* Content panel */}
        <div className="md-content">

          {activeTab === 'transcript' && (
            <div className="md-panel">
              <h2 className="md-panel-title">Live Transcript</h2>
              <div className="md-transcript-box">
                {segments.length === 0
                  ? <p className="md-placeholder">Waiting for speech…</p>
                  : segments.map((seg, i) => (
                      <p key={i} className="md-transcript-line">{seg.text}</p>
                    ))
                }
              </div>
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="md-panel">
              <h2 className="md-panel-title">Summary</h2>
              {summaryLoading
                ? <p className="md-placeholder">Loading…</p>
                : summaryError
                  ? <p className="md-error">{summaryError}</p>
                  : !summary
                    ? <div>
                        <p className="md-placeholder">No summary yet.</p>
                        <button className="md-btn-generate" onClick={handleGenerate} disabled={generating}>
                          {generating ? 'Generating…' : '✦ Generate Summary'}
                        </button>
                      </div>
                    : <div>
                        <p className="md-summary-text">{summary.summary}</p>
                        <button className="md-btn-generate" onClick={handleGenerate} disabled={generating} style={{marginTop:16}}>
                          {generating ? 'Regenerating…' : '↺ Regenerate'}
                        </button>
                      </div>
              }
            </div>
          )}

          {activeTab === 'keypoints' && (
            <div className="md-panel">
              <h2 className="md-panel-title">Key Points</h2>
              {!summary
                ? <p className="md-placeholder">Generate a summary first to see key points.</p>
                : summary.keyPoints?.length > 0
                  ? <ul className="md-list">
                      {summary.keyPoints.map((pt, i) => <li key={i}>{pt}</li>)}
                    </ul>
                  : <p className="md-placeholder">No key points available.</p>
              }
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="md-panel">
              <h2 className="md-panel-title">Action Items</h2>
              {!summary
                ? <p className="md-placeholder">Generate a summary first to see action items.</p>
                : summary.actionItems?.length > 0
                  ? <ul className="md-list md-list--actions">
                      {summary.actionItems.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  : <p className="md-placeholder">No action items found.</p>
              }
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default MeetingDetail;
