import { useState, useEffect, useRef } from 'react';
import { Wheel } from 'react-custom-roulette';
import io from 'socket.io-client';
import './App.css';

function App() {
  const TEMPO_EXIBICAO = 8000; 
  const VALOR_MINIMO_GIRO = 20; 

  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [result, setResult] = useState('');
  const [isVisible, setIsVisible] = useState(false); 

 
  const [spinQueue, setSpinQueue] = useState(0);
  // Memória para não contar o mesmo donate duas vezes
  const eventosProcessados = useRef(new Set());

  const resultRef = useRef(null);
  const [textScale, setTextScale] = useState(1);

  const [rouletteData, setRouletteData] = useState([
    { option: 'Prime' }, { option: 'Brazil' }, { option: 'Street' },
    { option: 'Casual' }, { option: 'Sweater' }, { option: 'Bikini' },
    { option: 'Ghost' }, { option: 'Palhaxota' }, { option: 'Purplerina' },
    { option: 'Freira' }, { option: 'Natal' }, { option: 'Cavalheira' },
    { option: 'Kitsune' }, //{ option: 'Bunny' }, //{ option: 'Schola' }
  ]);

  const [newOption, setNewOption] = useState('');

  const triggerSpin = () => {
    setRouletteData((currentData) => {
      if (currentData.length > 0) {
        const newPrizeNumber = Math.floor(Math.random() * currentData.length);
        setPrizeNumber(newPrizeNumber);
        setMustSpin(true);
        setResult(''); 
        setIsVisible(true); 
      }
      return currentData;
    });
  };

  
  // Gerenciador da Fila
  useEffect(() => {
    // Se tem alguém na fila de espera E a roleta está livre (escondida)
    if (spinQueue > 0 && !isVisible) {
      setSpinQueue(prevQueue => prevQueue - 1); // Tira 1 da fila
      triggerSpin(); // Manda girar!
    }
  }, [spinQueue, isVisible]); 
  
  const handleSpinClick = () => {
    if (rouletteData.length > 0) {
      // O botão manual agora também entra na fila educadamente!
      setSpinQueue(prevQueue => prevQueue + 1);
    }
  };

  // Mágica de medir o texto nativo
 useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokensParam = urlParams.get('token');
    
    if (!tokensParam) return; 

    const tokensList = tokensParam.split(',').map(token => token.trim());
    const activeSockets = []; 

    tokensList.forEach((tokenDaUrl) => {
      const socket = io('https://realtime.streamelements.com', {
        transports: ['websocket']
      });

      socket.on('connect', () => {
        socket.emit('authenticate', { method: 'jwt', token: tokenDaUrl });
      });

      socket.on('event', (eventData) => {
        // 🛡️ O FILTRO ANTI-CLONE AQUI!
        // Pega a identidade única desse evento
        const idDoEvento = eventData._id; 

        // Se esse donate já passou por aqui, ignora e cancela!
        if (idDoEvento && eventosProcessados.current.has(idDoEvento)) {
          return; 
        }

        // Anota na prancheta que já recebemos esse ID
        if (idDoEvento) {
          eventosProcessados.current.add(idDoEvento);
        }

        if (eventData.type === 'tip') {
          const amount = eventData.amount 
                      || (eventData.data && eventData.data.amount) 
                      || (eventData.detail && eventData.detail.amount);

          if (Number(amount) >= VALOR_MINIMO_GIRO) {
            setSpinQueue(prevQueue => prevQueue + 1);
          }
        }
      });

      activeSockets.push(socket);
    });

    return () => {
      activeSockets.forEach(socket => socket.disconnect());
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
    if (rouletteData.length <= 1) return;
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
            boxShadow: isObsMode ? 'none' : '',
            opacity: (isObsMode && !isVisible) ? 0 : 1,
            visibility: (isObsMode && !isVisible) ? 'hidden' : 'visible',
            transition: 'opacity 0.5s ease-in-out, visibility 0.5s ease-in-out'
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

                setTimeout(() => {
                  setIsVisible(false); // Quando some, o Guarda de Trânsito puxa o próximo!
                }, TEMPO_EXIBICAO);
              }}
            />
            
            {result && (
              <div className="result-text-container">
                <div className="result-text-inner">
                  <div 
                    ref={resultRef}
                    style={{ 
                      transform: `scale(${textScale})`, 
                      transformOrigin: 'center' 
                    }}
                  >
                    {result}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button 
            className="spin-button"
            onClick={handleSpinClick} 
            disabled={rouletteData.length === 0}
            style={{ display: isObsMode ? 'none' : 'block' }}
          >
            GIRAR!
          </button>
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