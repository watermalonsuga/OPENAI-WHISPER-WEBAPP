import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

function LiveTranscript({ recordingId }) {
  const [segments, setSegments] = useState([]);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    // Fetch existing transcript on load
    axios.get(`http://localhost:5000/api/transcripts/${recordingId}`)
      .then((res) => {
        if (res.data.segments) setSegments(res.data.segments);
      })
      .catch(() => {}); // no transcript yet is fine

    socketRef.current = io('http://localhost:5000');
    socketRef.current.emit('join-recording', recordingId);

    socketRef.current.on('transcript-update', (data) => {
      setSegments((prev) => [...prev, data]);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [recordingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments]);

  return (
    <div className="live-transcript">
      <h3>Live Transcript</h3>
      <div className="transcript-box">
        {segments.length === 0 && <p className="placeholder">Waiting for speech...</p>}
        {segments.map((seg, idx) => (
          <p key={idx} className="transcript-line">
            {seg.text}
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default LiveTranscript;