from faster_whisper import WhisperModel
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil, os, uuid

app = FastAPI()

# model = WhisperModel("small", device="cpu", compute_type="int8")// Works perfectly (USE THIS)
# model = WhisperModel("base", device="cpu", compute_type="int8") //Works but slighlt wrong words
model = WhisperModel(
    "large-v3",
    device="cpu",
    compute_type="int8"
)

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    temp_path = f"temp_{uuid.uuid4()}.wav"

    with open(temp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        # segments, info = model.transcribe(temp_path, beam_size=1, language="en") //For Enlish only (USE THIS)
        # segments, info = model.transcribe(temp_path, beam_size=1) //only worked for eng and hindi
        segments, info = model.transcribe(
    temp_path,
    beam_size=5,
    vad_filter=True
)
        

        text = " ".join(
            segment.text for segment in segments
        )

        return JSONResponse({
            "text": text,
            "language": info.language
        })

    except Exception as e:
        print(f"Error processing audio: {e}")
        return JSONResponse({
            "text": "",
            "language": "unknown"
        })

    finally:
        os.remove(temp_path)