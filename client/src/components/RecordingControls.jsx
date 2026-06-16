import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import '../styles/recording-controls.css';

const SERVER_URL = 'http://localhost:5000';

const SOURCE_OPTIONS = [
  { value: 'meeting', emoji: '🎯', label: 'Meeting' },
  { value: 'youtube', emoji: '▶️', label: 'YouTube' },
  { value: 'voice',   emoji: '🎙️', label: 'Voice Note' },
];

function RecordingControls({ onRecordingChange }) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [duration, setDuration] = useState(0);
  const [source, setSource] = useState('meeting');

  const mediaRecorderRef = useRef(null);
  const recordingIdRef = useRef(null);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const chunkBufferRef = useRef([]);
  const mimeTypeRef = useRef('video/webm');

  useEffect(() => {
    if (isRecording) {
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const sendChunk = async () => {
    if (chunkBufferRef.current.length === 0) return;
    if (!recordingIdRef.current) return;
    const blobs = chunkBufferRef.current.splice(0);
    const chunkBlob = new Blob(blobs, { type: mimeTypeRef.current });
    if (chunkBlob.size < 500) return;

    // Send to /chunk for transcription (audio extracted server-side by whisper)
    const formData = new FormData();
    formData.append('chunk', chunkBlob, `chunk_${Date.now()}.webm`);
    try {
      await axios.post(
        `${SERVER_URL}/api/recordings/${recordingIdRef.current}/chunk`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
    } catch (err) {
      console.warn('Chunk upload failed:', err.message);
    }
  };

  const startRecording = async () => {
    setErrorMsg('');
    setStatus('requesting');
    try {
      // 1. Microphone
      let micStream;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch {
        throw new Error('Microphone access denied. Please allow microphone access and try again.');
      }

      // 2. Screen/tab capture — keep VIDEO track this time!
      let displayStream = null;
      try {
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30 },   // keep video for recording
          audio: { echoCancellation: false, noiseSuppression: false }
        });
        // DO NOT stop video tracks — we need them for the recording
      } catch {
        console.log('No screen capture — mic only, no video.');
      }

      // 3. Mix audio streams
      const audioCtx = new AudioContext();
      const audioDestination = audioCtx.createMediaStreamDestination();
      audioCtx.createMediaStreamSource(micStream).connect(audioDestination);
      if (displayStream?.getAudioTracks().length > 0) {
        audioCtx.createMediaStreamSource(displayStream).connect(audioDestination);
      }

      // 4. Combine: video from displayStream + mixed audio
      const videoTracks = displayStream?.getVideoTracks() || [];
      const combinedStream = new MediaStream([
        ...videoTracks,
        ...audioDestination.stream.getAudioTracks()
      ]);

      streamRef.current = { micStream, displayStream, audioCtx };

      // 5. Create recording on backend
      const res = await axios.post(`${SERVER_URL}/api/recordings`, {
        title: `Meeting – ${new Date().toLocaleString()}`,
        userId: '123',
        source
      });
      recordingIdRef.current = res.data._id;
      console.log('Recording created:', recordingIdRef.current);

      // 6. Pick best supported mimeType (video/webm with codecs)
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';
      mimeTypeRef.current = mimeType;

      const mediaRecorder = new MediaRecorder(
        videoTracks.length > 0 ? combinedStream : audioDestination.stream,
        { mimeType: videoTracks.length > 0 ? mimeType : 'audio/webm' }
      );
      mediaRecorderRef.current = mediaRecorder;
      chunkBufferRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunkBufferRef.current.push(e.data);
        }
      };

      // If screen share stops early (user clicks "Stop sharing"), auto-stop recording
      if (displayStream) {
        displayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
          if (isRecording || mediaRecorderRef.current?.state !== 'inactive') {
            stopRecording();
          }
        });
      }

      mediaRecorder.start();
      console.log('Recording started with mimeType:', mimeType);

      setIsRecording(true);
      setStatus('recording');
      if (onRecordingChange) onRecordingChange(true, recordingIdRef.current);

    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Failed to start recording.');
      stopAllTracks();
    }
  };

  const stopAllTracks = () => {
    if (streamRef.current) {
      streamRef.current.micStream?.getTracks().forEach((t) => t.stop());
      streamRef.current.displayStream?.getTracks().forEach((t) => t.stop());
      streamRef.current.audioCtx?.close().catch(() => {});
      streamRef.current = null;
    }
  };

  const stopRecording = async () => {
    if (status === 'stopping') return; // prevent double-call
    setStatus('stopping');

    const recorder = mediaRecorderRef.current;
    const id = recordingIdRef.current;

    if (recorder && recorder.state !== 'inactive') {
      recorder.requestData();
      await new Promise((resolve) => { recorder.onstop = resolve; recorder.stop(); });
    }

    stopAllTracks();

    // Upload full video blob
    if (chunkBufferRef.current.length > 0 && id) {
      const fullBlob = new Blob(chunkBufferRef.current, { type: mimeTypeRef.current });
      console.log(`Uploading full recording: ${(fullBlob.size / 1024 / 1024).toFixed(2)} MB`);

      const formData = new FormData();
      formData.append('recording', fullBlob, `${id}.webm`);
      try {
        await axios.post(`${SERVER_URL}/api/recordings/${id}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('Video uploaded successfully');
      } catch (err) {
        console.warn('Video upload failed:', err.message);
      }

      // Also send for transcription
      const audioFormData = new FormData();
      audioFormData.append('chunk', fullBlob, `chunk_${Date.now()}.webm`);
      try {
        await axios.post(`${SERVER_URL}/api/recordings/${id}/chunk`, audioFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } catch (err) {
        console.warn('Transcription failed:', err.message);
      }
    }

    if (id) {
      try {
        await axios.put(`${SERVER_URL}/api/recordings/${id}/status`, { status: 'completed' });
        await axios.post(`${SERVER_URL}/api/summaries/${id}/generate`);
      } catch (err) {
        console.warn('Finalize failed:', err.message);
      }
    }

    mediaRecorderRef.current = null;
    recordingIdRef.current = null;
    chunkBufferRef.current = [];
    setIsRecording(false);
    setStatus('idle');
    if (onRecordingChange) onRecordingChange(false, null);
  };

  return (
    <div className="recording-controls">
      {status === 'error' && <p className="recording-error">{errorMsg}</p>}

      {!isRecording && (
        <div className="source-selector">
          <p className="source-label-text">What are you recording?</p>
          <div className="source-options">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`source-option ${source === opt.value ? 'active' : ''}`}
                onClick={() => setSource(opt.value)}
                disabled={status === 'stopping'}
              >
                <span className="source-opt-emoji">{opt.emoji}</span>
                <span className="source-opt-label">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isRecording && (
        <div className="recording-status-bar">
          <span className="rec-dot" />
          <span className="rec-label">Recording</span>
          <span className="rec-source-tag">
            {SOURCE_OPTIONS.find(o => o.value === source)?.emoji}{' '}
            {SOURCE_OPTIONS.find(o => o.value === source)?.label}
          </span>
          <span className="rec-timer">{formatDuration(duration)}</span>
        </div>
      )}

      <div className="recording-buttons">
        <button
          className="btn-start"
          onClick={startRecording}
          disabled={isRecording || status === 'requesting' || status === 'stopping'}
        >
          {status === 'requesting' ? 'Starting…' : '● Start Recording'}
        </button>
        <button
          className="btn-stop"
          onClick={stopRecording}
          disabled={!isRecording || status === 'stopping'}
        >
          {status === 'stopping' ? 'Uploading video…' : '■ Stop Recording'}
        </button>
      </div>

      {status === 'requesting' && (
        <p className="recording-hint">Allow microphone access, then select the tab you want to record.</p>
      )}
      {!isRecording && status === 'idle' && (
        <p className="recording-hint">
          Click <strong>Start Recording</strong> — select a browser tab to capture its video and audio.
        </p>
      )}
      {status === 'stopping' && (
        <p className="recording-hint">Uploading your recording, please wait…</p>
      )}
    </div>
  );
}

export default RecordingControls;
