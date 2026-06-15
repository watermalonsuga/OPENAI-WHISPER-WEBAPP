document.getElementById('grantBtn').onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    document.getElementById('status').textContent = 'Microphone access granted! You can close this tab.';
  } catch (err) {
    document.getElementById('status').textContent = 'Permission denied: ' + err.message;
  }
};