// src/SpeechRecognizer.jsx
import React, { useState, useEffect, useRef } from 'react';
import * as vosklet from 'vosklet'; // <--- ¡CAMBIO AQUÍ!

// Ruta al modelo. Asegúrate de que coincida con la carpeta dentro de public/models
const MODEL_PATH = '/models/vosk-model-small-en-us-0.15';

function SpeechRecognizer() {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [microphoneStatus, setMicrophoneStatus] = useState('inactive'); // 'inactive', 'loading', 'active', 'error'

  const recognizerRef = useRef(null); // Para almacenar la instancia del reconocedor
  const audioContextRef = useRef(null); // Para el contexto de audio
  const mediaStreamSourceRef = useRef(null); // Para la fuente del stream de audio
  const mediaStreamRef = useRef(null); // Para almacenar el MediaStream del micrófono

  const textDisplayRef = useRef(null); // Referencia para el div del texto y el auto-scroll

  // Efecto para inicializar el modelo y el reconocedor
  useEffect(() => {
    // Función asíncrona para manejar la inicialización del modelo de Vosklet
    const initializeVoskModel = async () => {
      setMicrophoneStatus('loading');
      try {
        // Carga el modelo de Vosklet
        // AHORA LLAMAS A vosklet.createModel
        const model = await vosklet.createModel(MODEL_PATH);
        // AHORA LLAMAS A vosklet.createRecognizer
        recognizerRef.current = await vosklet.createRecognizer(model, 16000); // 16000 es la tasa de muestreo, común para micrófonos

        // Configura los eventos del reconocedor
        recognizerRef.current.on('result', (message) => {
          // Cuando hay un resultado final (palabra/frase completa)
          if (message.result && message.result.text) {
            setRecognizedText((prev) => prev + message.result.text + ' ');
          }
        });

        recognizerRef.current.on('partialresult', (message) => {
          // Cuando hay un resultado parcial (mientras hablas)
          if (message.partial && message.partial.partial) {
            // Puedes usar esto para mostrar el texto en tiempo real antes de que sea final
            // Por simplicidad, aquí solo mostramos el final. Para un demo, podrías mostrarlo.
            // console.log("Partial:", message.partial.partial);
          }
        });

        recognizerRef.current.on('error', (error) => {
          console.error('Error del reconocedor Vosk:', error);
          setMicrophoneStatus('error');
          stopRecognition(); // Detener si hay un error
        });

        console.log('Modelo Vosklet cargado y reconocedor listo.');
        setMicrophoneStatus('inactive'); // Listo para empezar
      } catch (error) {
        console.error('Error al cargar el modelo Vosklet:', error);
        setMicrophoneStatus('error');
      }
    };

    initializeVoskModel();

    // Función de limpieza para liberar recursos cuando el componente se desmonte
    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.close();
      }
      if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Se ejecuta solo una vez al montar el componente

  // Efecto para auto-scroll del área de texto
  useEffect(() => {
    if (textDisplayRef.current) {
      textDisplayRef.current.scrollTop = textDisplayRef.current.scrollHeight;
    }
  }, [recognizedText]); // Se ejecuta cada vez que el texto reconocido cambia

  const startRecognition = async () => {
    if (recognizerRef.current && microphoneStatus === 'inactive') {
      try {
        setMicrophoneStatus('loading');
        // Solicitar acceso al micrófono
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream; // Guardar la referencia del stream

        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);

        // Conectar el stream de audio al reconocedor de Vosklet
        mediaStreamSourceRef.current.connect(recognizerRef.current);

        recognizerRef.current.start();
        setIsListening(true);
        setMicrophoneStatus('active');
        setRecognizedText(''); // Limpiar el texto al iniciar una nueva sesión
        console.log('Reconocimiento de voz iniciado...');
      } catch (error) {
        console.error('Error al iniciar el reconocimiento o acceder al micrófono:', error);
        setMicrophoneStatus('error');
        setIsListening(false);
        alert('No se pudo acceder al micrófono. Por favor, verifica los permisos.');
      }
    }
  };

  const stopRecognition = () => {
    if (recognizerRef.current && isListening) {
      recognizerRef.current.stop();
      setIsListening(false);
      setMicrophoneStatus('inactive');
      console.log('Reconocimiento de voz detenido.');

      // Detener el stream del micrófono
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      // Cerrar el contexto de audio
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      mediaStreamSourceRef.current = null;
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h1>Reconocimiento de Voz con Vosklet y React</h1>

      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={isListening ? stopRecognition : startRecognition}
          disabled={microphoneStatus === 'loading' || microphoneStatus === 'error'}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: isListening ? '#dc3545' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            opacity: microphoneStatus === 'loading' || microphoneStatus === 'error' ? 0.6 : 1
          }}
        >
          {isListening ? 'Detener Micrófono' : 'Activar Micrófono'}
        </button>
        <span style={{ marginLeft: '10px', fontSize: '14px', color: '#555' }}>
          Estado del Micrófono: {
            microphoneStatus === 'loading' ? 'Cargando modelo...' :
            microphoneStatus === 'active' ? 'Activo (escuchando)' :
            microphoneStatus === 'inactive' ? 'Inactivo' :
            'Error'
          }
        </span>
      </div>

      <div
        ref={textDisplayRef}
        style={{
          border: '1px solid #eee',
          minHeight: '200px',
          maxHeight: '400px', // Limitar altura para hacer scroll
          overflowY: 'auto', // Habilitar scroll vertical
          padding: '15px',
          backgroundColor: '#f9f9f9',
          borderRadius: '5px',
          fontSize: '18px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap', // Mantiene los saltos de línea y espacios
          wordWrap: 'break-word', // Rompe palabras largas
          color: '#333'
        }}
      >
        {recognizedText || "El texto reconocido aparecerá aquí..."}
      </div>

      {microphoneStatus === 'error' && (
        <p style={{ color: 'red', marginTop: '10px' }}>
          Hubo un error. Asegúrate de tener un micrófono y haber dado permisos.
        </p>
      )}
    </div>
  );
}

export default SpeechRecognizer;