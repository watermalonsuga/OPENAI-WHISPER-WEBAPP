import whisper
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil, os, uuid

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = whisper.load_model("small")

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    temp_path = f"temp_{uuid.uuid4()}.wav"
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        audio = whisper.load_audio(temp_path)
        audio = whisper.pad_or_trim(audio)
        mel = whisper.log_mel_spectrogram(audio).to(model.device)

        _, probs = model.detect_language(mel)
        options = whisper.DecodingOptions(fp16=False)
        result = whisper.decode(model, mel, options)

        return JSONResponse({
            "text": result.text,
            "language": max(probs, key=probs.get)
        })
    except Exception as e:
        print(f"Error processing audio: {e}")
        return JSONResponse({"text": "", "language": "unknown"})
    finally:
        os.remove(temp_path)