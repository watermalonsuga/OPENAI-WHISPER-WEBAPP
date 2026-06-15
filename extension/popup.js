const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const status = document.getElementById('status');

startBtn.onclick = async () => {
  status.textContent = 'Starting...';
  status.classList.remove('recording');
  chrome.runtime.sendMessage({ type: 'START_RECORDING' }, (response) => {
    if (response && response.success) {
      status.textContent = 'Recording...';
      status.classList.add('recording');
      startBtn.disabled = true;
      stopBtn.disabled = false;
    } else {
      status.textContent = 'Failed to start: ' + (response?.error || 'unknown error');
      status.classList.remove('recording');
    }
  });
};

stopBtn.onclick = () => {
  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, (response) => {
    status.textContent = 'Stopped';
    status.classList.remove('recording');
    startBtn.disabled = false;
    stopBtn.disabled = true;
  });
};

chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
  if (response && response.recording) {
    status.textContent = 'Recording...';
    status.classList.add('recording');
    startBtn.disabled = true;
    stopBtn.disabled = false;
  }
});