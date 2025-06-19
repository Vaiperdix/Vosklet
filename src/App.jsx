// src/App.jsx
import SpeechRecognizer from './SpeechRecognizer'; // Importa tu nuevo componente
import './App.css'; // Si tienes estilos globales

function App() {
  return (
    <div className="App">
      <SpeechRecognizer /> {/* Renderiza el componente de reconocimiento */}
    </div>
  );
}

export default App;
