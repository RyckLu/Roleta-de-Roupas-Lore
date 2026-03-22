import { useState, useEffect } from 'react';
import { Wheel } from 'react-custom-roulette';
import io from 'socket.io-client';
import './App.css';

function App() {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [result, setResult] = useState('');

  const [rouletteData, setRouletteData] = useState([
    { option: 'Prime' },
    { option: 'Brazil' },
    { option: 'Street' },
    { option: 'Casual' },
    { option: 'Sweater' },
    { option: 'Bikini' },
    { option: 'Ghost' },
    { option: 'Palhaxota' },
    { option: 'Purplerina' },
    { option: 'Freira' },
    { option: 'Natal' },
    { option: 'Cavalheira' },
    { option: 'Kitsune' }
  ]);

  const [newOption, setNewOption] = useState('');

  const triggerSpin = () => {
    setRouletteData((currentData) => {
      if (currentData.length > 0) {
        const newPrizeNumber = Math.floor(Math.random() * currentData.length);
        setPrizeNumber(newPrizeNumber);
        setMustSpin(true);
        setResult(''); 
      }
      return currentData;
    });
  };

  const handleSpinClick = () => {
    if (!mustSpin && rouletteData.length > 0) {
      triggerSpin();
    }
  };

  // Conexão limpa e direta com o StreamElements
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenDaUrl = urlParams.get('token');

    if (!tokenDaUrl) return; // Se não tiver token, ignora a conexão silenciosamente

    const socket = io('https://realtime.streamelements.com', {
      transports: ['websocket']
    });

    socket.on('connect', () => {
      socket.emit('authenticate', { method: 'jwt', token: tokenDaUrl });
    });

    socket.on('event', (eventData) => {
      if (eventData.type === 'tip') {
        const amount = eventData.amount 
                    || (eventData.data && eventData.data.amount) 
                    || (eventData.detail && eventData.detail.amount);

        // Dispara a roleta se o valor for 20 ou maior
        if (Number(amount) >= 20) {
          triggerSpin();
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []); 

  const handleAddOption = (e) => {
    e.preventDefault();
    if (newOption.trim() !== '') {
      setRouletteData([...rouletteData, { option: newOption }]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (indexToRemove) => {
    if (rouletteData.length <= 1) {
      alert("A roleta precisa de pelo menos uma opção!");
      return;
    }
    const newData = rouletteData.filter((_, index) => index !== indexToRemove);
    setRouletteData(newData);
  };

  const isObsMode = new URLSearchParams(window.location.search).get('obs') === 'true';

  return (
    <div className="app-wrapper">
      <div className="container">
        
        <div 
          className="card roulette-section" 
          style={{ 
            backgroundColor: isObsMode ? 'transparent' : '#1e1e1e', 
            border: isObsMode ? 'none' : '1px solid #333', 
            boxShadow: isObsMode ? 'none' : '' 
          }}
        >
          <h1 style={{ display: isObsMode ? 'none' : 'block' }}>Roleta de Roupas</h1>
          
          <div className="wheel-container">
            <Wheel
              mustStartSpinning={mustSpin}
              prizeNumber={prizeNumber}
              data={rouletteData}
              backgroundColors={['#883030', '#46ad32', '#2db1b6', '#3453a7', '#803aaf', '#b333b3', '#a52f66']}
              textColors={['#ffffff']}
              outerBorderColor="#1e1e1e"
              outerBorderWidth={0}
              innerBorderColor="#1e1e1e"
              radiusLineColor="#1e1e1e"
              radiusLineWidth={2}
              spinDuration={0.4}
              onStopSpinning={() => {
                setMustSpin(false);
                setResult(rouletteData[prizeNumber].option);
              }}
            />
          </div>

          <button 
            className="spin-button"
            onClick={handleSpinClick} 
            disabled={mustSpin || rouletteData.length === 0}
            style={{ display: isObsMode ? 'none' : 'block' }}
          >
            {mustSpin ? 'Girando...' : 'GIRAR!'}
          </button>

          {result && <h2 className="result-text">Resultado: {result}!</h2>}
        </div>

        {!isObsMode && (
          <div className="card controls-section">
            <h2>Personalizar Opções</h2>
            
            <form onSubmit={handleAddOption} className="add-form">
              <input
                type="text"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                placeholder="Digite uma nova opção..."
              />
              <button type="submit" className="add-button">Adicionar</button>
            </form>

            <ul className="options-list">
              {rouletteData.map((item, index) => (
                <li key={index} className="option-item">
                  <span className="option-text">{item.option}</span>
                  <button 
                    className="remove-button"
                    onClick={() => handleRemoveOption(index)}
                    disabled={mustSpin}
                    title="Remover opção"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;