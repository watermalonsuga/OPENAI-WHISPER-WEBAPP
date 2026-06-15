const SERVER_URL = 'http://localhost:5000';
let currentRecordingId = null;
let isRecording = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_RECORDING') {
    startRecording().then(
      () => sendResponse({ success: true }),
      (err) => sendResponse({ success: false, error: err.message })
    );
    return true;
  }

  if (message.type === 'STOP_RECORDING') {
    stopRecording().then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === 'GET_STATUS') {
    sendResponse({ recording: isRecording });
  }
});

async function startRecording() {
  // 1. Create recording entry on backend
  const res = await fetch(`${SERVER_URL}/api/recordings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: `Meeting - ${new Date().toLocaleString()}`, userId: '123' })
  });
  const data = await res.json();
  currentRecordingId = data._id;

  // 2. Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  // 3. Get a MediaStream ID for the tab (works in service worker since Chrome 116)
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });

  // 4. Create offscreen document if it doesn't exist
  const existingContexts = await chrome.runtime.getContexts({});
  const offscreenExists = existingContexts.some((c) => c.contextType === 'OFFSCREEN_DOCUMENT');

  if (!offscreenExists) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Recording tab and microphone audio for transcription'
    });
  }

  // 5. Tell offscreen document to start recording
  const response = await chrome.runtime.sendMessage({
    type: 'START_OFFSCREEN_RECORDING',
    streamId,
    recordingId: currentRecordingId
  });

  if (!response.success) {
    throw new Error(response.error);
  }

  isRecording = true;
  chrome.action.setBadgeText({ text: 'REC' });
  chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
}

async function stopRecording() {
  await chrome.runtime.sendMessage({ type: 'STOP_OFFSCREEN_RECORDING' });

  if (currentRecordingId) {
    await fetch(`${SERVER_URL}/api/recordings/${currentRecordingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' })
    });

    await fetch(`${SERVER_URL}/api/summaries/${currentRecordingId}/generate`, {
      method: 'POST'
    });
  }

  // Close offscreen document
  await chrome.offscreen.closeDocument().catch(() => { });

  isRecording = false;
  currentRecordingId = null;
  chrome.action.setBadgeText({ text: '' });
}