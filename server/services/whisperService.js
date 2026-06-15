const axios = require('axios');
const FormData = require('form-data');

async function transcribeAudio(audioBuffer, filename) {
  const form = new FormData();
  form.append('file', audioBuffer, filename);

  const response = await axios.post('http://localhost:8000/transcribe', form, {
    headers: form.getHeaders()
  });
  return response.data; // { text, language }
}

module.exports = { transcribeAudio };