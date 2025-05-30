// Función principal para generar el audio
async function generarAudio() {
  try {
    const titulo = document.querySelector(".name-input textarea").value.trim() || "audio";
    const texto = document.querySelector(".text-input textarea").value.trim();
    const tipoVoz = document.getElementById("voiceType").value;
    const velocidad = parseFloat(document.getElementById("speed").value);
    const formato = document.getElementById("quality").value;
    const volumen = parseInt(document.getElementById("volumeSlider").value);

    if (!texto) {
      alert("Por favor ingrese un texto.");
      return;
    }

    // Paso 1: Validar parámetros con config-service
    const validacion = await fetch("http://localhost:3001/config/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipoVoz, velocidad, volumen })
    });

    const resultado = await validacion.json();
    if (!validacion.ok) {
      alert("Error de validación: " + resultado.error);
      return;
    }

    // Paso 2: Enviar solicitud al convert-service
    const response = await fetch("http://localhost:3002/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto, tipoVoz, velocidad, volumen, formato, titulo })
    });

    if (!response.ok) {
      const error = await response.json();
      alert("Error al generar el audio: " + error.details);
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    // Mostrar botón de descarga
    const downloadBtn = document.querySelector(".btn2");
    downloadBtn.href = url;
    downloadBtn.download = `${titulo}.${formato}`;
    downloadBtn.style.display = "inline-block";

    // Reproducir el audio generado
    const audioPlayer = document.getElementById("audioPlayer");
    audioPlayer.src = url;
    audioPlayer.load();

  } catch (error) {
    console.error("Error:", error);
    alert("Ocurrió un error inesperado.");
  }
}

// Asignar eventos al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  // Ocultar el botón de descarga al inicio
  document.querySelector(".btn2").style.display = "none";

  // Control de volumen visual
  const volumeSlider = document.getElementById("volumeSlider");
  const volumeDisplay = document.getElementById("volumeDisplay");

  function actualizarVolumen() {
    const valor = volumeSlider.value;
    if (valor < 40) volumeDisplay.textContent = "Bajo";
    else if (valor <= 60) volumeDisplay.textContent = "Medio";
    else volumeDisplay.textContent = "Alto";
  }

  volumeSlider.addEventListener("input", actualizarVolumen);
  actualizarVolumen();
});

// Eventos de botones
document.querySelector(".btn1").addEventListener("click", generarAudio);
document.getElementById("quality").addEventListener("change", generarAudio);
