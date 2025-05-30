const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Diccionario de voces válidas
const VOICES = {
  masculina: "0oYniZPgN0nivV3jas1u",
  femenina: "j3YKABbGYM9c0CVSOioR",
};

// Endpoint para obtener voces disponibles
app.get("/config/voices", (req, res) => {
  res.json({ availableVoices: Object.keys(VOICES) });
});

// Endpoint para validar los datos enviados por el cliente
app.post("/config/validate", (req, res) => {
  const { tipoVoz, velocidad, volumen } = req.body;

  if (!VOICES[tipoVoz]) {
    return res.status(400).json({ valid: false, error: "Tipo de voz no válido." });
  }

  if (typeof velocidad !== "number" || velocidad < 0.5 || velocidad > 1.5) {
    return res.status(400).json({ valid: false, error: "Velocidad fuera de rango (0.5 - 1.5)." });
  }

  const volumenNum = Number(volumen);
  if (isNaN(volumenNum) || volumenNum < 0 || volumenNum > 100) {
    return res.status(400).json({ valid: false, error: "Volumen fuera de rango (0 - 100)." });
  }

  return res.json({ valid: true });
});

// Iniciar el servicio
app.listen(PORT, () => {
  console.log(`config-service corriendo en http://localhost:${PORT}`);
});