const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración local de voces
const VOICES = {
  masculina: "IKne3meq5aSn9XLyUdCD",
  femenina: "EXAVITQu4vr4xnSDxMaL",
};

// Endpoint principal
app.post("/convert", async (req, res) => {
  const { texto, tipoVoz, velocidad, volumen, formato, titulo } = req.body;

  const voiceId = VOICES[tipoVoz];
  const volumenFFmpeg = volumen === 0 ? "0" : (volumen / 50).toFixed(2);

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": "sk_c340d03d82e30b059a028871d17d3f9dd8019e04710d554a",
        "accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text: texto,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          speed: velocidad,
          style: 0.5,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) throw new Error(await response.text());

    const audioBuffer = await response.arrayBuffer();
    const tempInputPath = path.join(__dirname, "temp-input");
    const tempOutputPath = path.join(__dirname, `temp-output.${formato}`);

    fs.writeFileSync(tempInputPath, Buffer.from(audioBuffer));

    await new Promise((resolve, reject) => {
      ffmpeg(tempInputPath)
        .audioFilter(`volume=${volumenFFmpeg}`)
        .on("end", resolve)
        .on("error", reject)
        .save(tempOutputPath);
    });

    const processedAudio = fs.readFileSync(tempOutputPath);

    res
      .setHeader("Content-Type", `audio/${formato}`)
      .setHeader("Content-Disposition", `attachment; filename="${titulo || "audio"}.${formato}"`)
      .send(processedAudio);

  } catch (error) {
    console.error("Error en generación:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: "Error al generar audio", details: error.message });
    }
  } finally {
    ["temp-input", `temp-output.${formato}`].forEach(file => {
      try {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Error limpiando temporales:", err);
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`convert-service corriendo en http://localhost:${PORT}`);
});