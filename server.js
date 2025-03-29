const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // Necesario para hacer requests HTTP
const path = require("path");

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
  const { texto, tipoVoz, velocidad, formato } = req.body;
  const voiceId = VOICES[tipoVoz];

  if (!texto || !voiceId) {
      return res.status(400).json({ error: "Faltan datos en la solicitud" });
  }

  // Validar formato recibido
  const formatosValidos = ["mp3", "m4a", "wav"];
  const formatoElegido = formatosValidos.includes(formato) ? formato : "mp3"; // Predeterminado a mp3 si es inválido

  try {
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
      const response = await fetch(url, {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
              "xi-api-key": API_KEY,
          },
          body: JSON.stringify({
              text: texto,
              model_id: "eleven_multilingual_v2",
              voice_settings: { 
                  stability: 0.5, 
                  similarity_boost: 0.8,
                  speed: velocidad
              },
          }),
      });

      if (!response.ok) {
          throw new Error("Error en la API de ElevenLabs");
      }

      const audioBuffer = await response.arrayBuffer();

      // Ajustar el Content-Type dinámicamente según el formato elegido
      const mimeTypes = {
          mp3: "audio/mpeg",
          m4a: "audio/mp4",
          wav: "audio/wav",
      };

      res.setHeader("Content-Type", mimeTypes[formatoElegido]);
      res.send(Buffer.from(audioBuffer));
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error al procesar el audio" });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
