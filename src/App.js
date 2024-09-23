import logo from './logo.svg';
import './App.css';
import MapComponent from './MapComponent';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1 className="App-header-title">
          <img src={logo} className="App-logo" alt="logo" />
          Anti-Craving
        </h1>
        <p className="App-subtitle">What are you craving? What are you anti-craving?</p>
      </header>
      <div className="map-container">
        <MapComponent />
      </div>
    </div>
  );
}

export default App;
