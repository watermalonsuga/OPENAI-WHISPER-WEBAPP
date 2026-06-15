let mediaRecorder = null;
let recordingId = null;
let stream = null;

const SERVER_URL = 'http://localhost:5000';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_OFFSCREEN_RECORDING') {
        startRecording(message.streamId, message.recordingId)
            .then(() => sendResponse({ success: true }))
            .catch((err) => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (message.type === 'STOP_OFFSCREEN_RECORDING') {
        stopRecording().then(() => sendResponse({ success: true }));
        return true;
    }
});

async function startRecording(streamId, recId) {
    recordingId = recId;

    // Get tab audio using the streamId from chrome.tabCapture.getMediaStreamId
    const tabStream = await navigator.mediaDevices.getUserMedia({
        audio: {
            mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: streamId
            }
        }
    });

    // Get microphone audio
    let micStream = null;
    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        console.warn('Mic access denied, continuing with tab audio only:', err);
    }

    // Mix tab + mic audio
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    const tabSource = audioContext.createMediaStreamSource(tabStream);
    tabSource.connect(destination);
    tabSource.connect(audioContext.destination); // keep playback audible

    if (micStream) {
        const micSource = audioContext.createMediaStreamSource(micStream);
        micSource.connect(destination);
    }

    stream = destination.stream;

    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 1000 && recordingId) { // skip tiny/empty chunks
            await uploadChunk(event.data);
        }
    };

    // mediaRecorder.start(10000); // chunk every 10 seconds
    mediaRecorder.start(300000);
}

async function uploadChunk(blob) {
    const formData = new FormData();
    formData.append('chunk', blob, `chunk_${Date.now()}.webm`);

    try {
        await fetch(`${SERVER_URL}/api/recordings/${recordingId}/chunk`, {
            method: 'POST',
            body: formData
        });
    } catch (err) {
        console.error('Failed to upload chunk:', err);
    }
}

async function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    if (stream) {
        stream.getTracks().forEach((track) => track.stop());
    }
    mediaRecorder = null;
    stream = null;
}