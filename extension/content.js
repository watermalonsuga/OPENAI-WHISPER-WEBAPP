console.log('Meeting Recorder content script loaded');
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data.type === 'WEBAPP_START_RECORDING') {
    chrome.runtime.sendMessage({ type: 'START_RECORDING' }, (response) => {
      window.postMessage({ type: 'EXTENSION_RESPONSE', action: 'START_RECORDING', response }, '*');
    });
  }

  if (event.data.type === 'WEBAPP_STOP_RECORDING') {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, (response) => {
      window.postMessage({ type: 'EXTENSION_RESPONSE', action: 'STOP_RECORDING', response }, '*');
    });
  }

  if (event.data.type === 'WEBAPP_GET_STATUS') {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      window.postMessage({ type: 'EXTENSION_RESPONSE', action: 'GET_STATUS', response }, '*');
    });
  }
});

// Let the webpage know the extension is installed
window.postMessage({ type: 'EXTENSION_INSTALLED' }, '*');