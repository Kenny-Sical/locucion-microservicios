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
  masculina: "qWRwExpgG2uefHDT8keg", // ID de la voz masculina
  femenina: "7kdtooVPaSjBW68VJd5q",  // ID de la voz femenina
};

// Ruta principal para servir el index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Endpoint para procesar texto a voz
app.post("/generar-audio", async (req, res) => {
  const { texto, titulo, tipoVoz, velocidad, formato, volumen } = req.body;
  const voiceId = VOICES[tipoVoz];

  // Validación mejorada del volumen
  const volumenFFmpeg = volumen === '0' ? '0' : `${(volumen / 50).toFixed(2)}`;
  console.log(`Procesando volumen: ${volumen} -> ${volumenFFmpeg}`); // Debug

  if (!texto || !voiceId) {
    return res.status(400).json({ error: "Faltan datos en la solicitud" });
  }

  const formatosValidos = ["mp3", "m4a", "wav"];
  const formatoElegido = formatosValidos.includes(formato) ? formato : "mp3";
  const tempInputPath = path.join(__dirname, `temp-input.${formatoElegido}`);
  const tempOutputPath = path.join(__dirname, `temp-output.${formatoElegido}`);

  try {
    // 1. Generar audio con ElevenLabs
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": API_KEY },
      body: JSON.stringify({ text: texto, voice_settings: { speed: velocidad } }),
    });

    if (!response.ok) throw new Error("Error en ElevenLabs");

    const audioBuffer = await response.arrayBuffer();
    fs.writeFileSync(tempInputPath, Buffer.from(audioBuffer));

    // 2. Procesar con FFmpeg
    await new Promise((resolve, reject) => {
      const command = ffmpeg(tempInputPath)
        .audioFilter(`volume=${volumenFFmpeg}`)
        .on('start', (cmd) => console.log('Comando FFmpeg:', cmd))
        .on('progress', (progress) => console.log('Progreso:', progress))
        .on('end', () => {
          console.log('FFmpeg finalizado exitosamente');
          resolve();
        })
        .on('error', (err) => {
          console.error('Error FFmpeg:', err);
          reject(err);
        });

      command.save(tempOutputPath);
    });

    const stats = fs.statSync(tempOutputPath);
    console.log(`Tamaño archivo procesado: ${stats.size} bytes`);

    // 3. Enviar el audio procesado
    const processedAudio = fs.readFileSync(tempOutputPath);
    console.log("Tamaño del audio procesado:", processedAudio.length); // Debug
  
    res.setHeader('Content-Type', `audio/${formatoElegido}`);
    res.setHeader('Content-Length', processedAudio.length);
    res.send(processedAudio);

    // Envía el audio con el nombre personalizado
    res.setHeader("Content-Disposition", `attachment; filename=${titulo || "audio"}.${formatoElegido}`);
    res.setHeader("Content-Type", `audio/${formatoElegido}`);
    res.send(processedAudio);

  } catch (error) {
    console.error('Error completo:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Error al procesar el audio',
        details: error.message
      });
    }
  } finally {
    // Limpiar archivos temporales
    [tempInputPath, tempOutputPath].forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
