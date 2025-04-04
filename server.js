const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // Necesario para hacer requests HTTP
const path = require("path");
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked'); // Solución para Electron/Windows

ffmpeg.setFfmpegPath(ffmpegPath);


const app = express();
const PORT = 3000;

// Middleware para manejar JSON y CORS
app.use(express.json());
app.use(cors());

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static("public"));

// API Key y URL de ElevenLabs (⚠️ Nunca expongas esto en el frontend)
const API_KEY = "sk_e8077994bea0d145781c2269a535b2c4a0c39ce0beedbb94";
const VOICES = {
  masculina: "0oYniZPgN0nivV3jas1u", // ID de la voz masculina
  femenina: "j3YKABbGYM9c0CVSOioR",  // ID de la voz femenina
};

// Ruta principal para servir el index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Endpoint para procesar texto a voz
app.post("/generar-audio", async (req, res) => {
  const { texto, tipoVoz, velocidad, formato, volumen, titulo } = req.body; // Añade titulo
  const voiceId = VOICES[tipoVoz];
  
  console.log(`Solicitando voz: ${tipoVoz} (ID: ${voiceId})`); // Debug

  if (!voiceId) {
    return res.status(400).json({ error: "Tipo de voz no válido" });
  }

  // Validación mejorada del volumen (0-100 → 0.0-2.0)
  const volumenFFmpeg = volumen === '0' ? '0' : (volumen / 50).toFixed(2);
  console.log(`Aplicando volumen: ${volumen}% → ${volumenFFmpeg}`);

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "xi-api-key": API_KEY,
        "accept": "audio/mpeg" // Añade este header
      },
      body: JSON.stringify({
        text: texto,
        model_id: "eleven_multilingual_v2", // Añade modelo
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          speed: velocidad,
          style: 0.5, // Añade estilo (0-1)
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) throw new Error(await response.text());

    // 2. Procesar con FFmpeg (con volumen)
    const audioBuffer = await response.arrayBuffer();
    const tempInputPath = path.join(__dirname, `temp-input`);
    const tempOutputPath = path.join(__dirname, `temp-output.${formato}`);
    
    fs.writeFileSync(tempInputPath, Buffer.from(audioBuffer));

    await new Promise((resolve, reject) => {
      ffmpeg(tempInputPath)
        .audioFilter(`volume=${volumenFFmpeg}`) // Aplicar volumen
        .on('progress', (p) => console.log(`Progreso: ${p.timemark}`))
        .on('end', resolve)
        .on('error', reject)
        .save(tempOutputPath);
    });

    // 3. Enviar respuesta
    const processedAudio = fs.readFileSync(tempOutputPath);
    
    return res
      .setHeader('Content-Type', `audio/${formato}`)
      .setHeader('Content-Disposition', `attachment; filename="${titulo || 'audio'}.${formato}"`)
      .send(processedAudio);

  } catch (error) {
    console.error("Error detallado:", error);
    
    if (!res.headersSent) {
      return res.status(500).json({ 
        success: false,
        error: "Error al generar audio",
        details: error.message 
      });
    }
  } finally {
    // Limpiar archivos temporales
    ['temp-input', `temp-output.${formato}`].forEach(file => {
      try {
        if (fs.existsSync(path.join(__dirname, file))) {
          fs.unlinkSync(path.join(__dirname, file));
        }
      } catch (cleanError) {
        console.error("Error limpiando archivo temporal:", cleanError);
      }
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
