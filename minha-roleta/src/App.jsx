import { useState, useEffect } from 'react';
import { Wheel } from 'react-custom-roulette';
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

  
  useEffect(() => {
    
    const urlParams = new URLSearchParams(window.location.search);
    const tokenDaUrl = urlParams.get('token');

  
    if (!tokenDaUrl) {
      console.log('Modo de Edição: Conexão com StreamElements desativada (Sem token na URL).');
      return;
    }

    const ws = new WebSocket('wss://astro.streamelements.com');

    ws.onopen = () => {
      console.log('Conectado ao StreamElements Astro no OBS!');
      
      const authMessage = {
        type: 'subscribe',
        nonce: 'roleta-obs-123',
        topic: 'channel.activities',
        token: tokenDaUrl, 
        token_type: 'jwt'
      };
      
      ws.send(JSON.stringify(authMessage));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const activity = message.data || message;

        
        if (activity.type === 'tip') {
          const amount = activity.amount || (activity.detail && activity.detail.amount);
          
          
          if (amount === 10) {
            console.log('Doação de R$ 10 recebida! Girando a roleta...');
            triggerSpin();
          }
        }
      } catch (error) {
        console.error('Erro ao ler a mensagem do WebSocket:', error);
      }
    };

    ws.onclose = () => console.log('Desconectado do StreamElements.');
    ws.onerror = (error) => console.error('Erro no WebSocket:', error);

    
    return () => {
      ws.close();
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
        
        {/* Lado Esquerdo: A Roleta */}
        <div 
          className="card roulette-section" 
          style={{ 
            backgroundColor: isObsMode ? 'transparent' : '#1e1e1e', 
            border: isObsMode ? 'none' : '1px solid #333', 
            boxShadow: isObsMode ? 'none' : '' 
          }}
        >
          {/* Esconde o título no OBS */}
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

          {/* Esconde o botão de girar manualmente no OBS */}
          <button 
            className="spin-button"
            onClick={handleSpinClick} 
            disabled={mustSpin || rouletteData.length === 0}
            style={{ display: isObsMode ? 'none' : 'block' }}
          >
            {mustSpin ? 'Girando...' : 'GIRAR!'}
          </button>

          {/* O resultado final aparece bem grande */}
          {result && <h2 className="result-text">Resultado: {result}!</h2>}
        </div>

        {/* Lado Direito: Controles - Só aparece se NÃO estiver no modo OBS */}
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