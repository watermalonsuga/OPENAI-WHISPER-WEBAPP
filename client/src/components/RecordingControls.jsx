import React, { useState, useEffect } from 'react';

function RecordingControls() {
  const [isRecording, setIsRecording] = useState(false);
  const [extensionInstalled, setExtensionInstalled] = useState(false);

  useEffect(() => {
  const handler = (event) => {
    if (event.source !== window) return;

    if (event.data.type === 'EXTENSION_INSTALLED') {
      setExtensionInstalled(true);
    }

    if (event.data.type === 'EXTENSION_RESPONSE' && event.data.action === 'GET_STATUS') {
      setExtensionInstalled(true);
      setIsRecording(!!event.data.response?.recording);
    }
  };

  window.addEventListener('message', handler);

  const interval = setInterval(() => {
    window.postMessage({ type: 'WEBAPP_GET_STATUS' }, '*');
  }, 2000);

  return () => {
    window.removeEventListener('message', handler);
    clearInterval(interval);
  };
}, []);
  return (
    <div className="recording-controls">
      {isRecording ? (
        <span className="recording-indicator">Recording in progress</span>
      ) : (
        <span className="status-idle">
          Use the Meeting Recorder extension icon in your browser toolbar to start a new recording.
        </span>
      )}
      {!extensionInstalled && (
        <p className="error-message">Extension not detected — install the Meeting Recorder extension</p>
      )}
    </div>
  );
}

export default RecordingControls;