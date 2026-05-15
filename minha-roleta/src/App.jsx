import { useState, useEffect, useRef } from 'react';
import { Wheel } from 'react-custom-roulette';
import io from 'socket.io-client';
import { supabase } from './supabase';
import './App.css';

function App() {
  // ==========================================================================
  // ⚙️ CONFIGURAÇÕES GLOBAIS DA ROLETA
  // ==========================================================================
  const TEMPO_EXIBICAO = 8000; // Tempo (em ms) que o resultado fica na tela após girar
  const VALOR_MINIMO_GIRO = 20; // Valor mínimo do donate para ativar um giro automático

  // ==========================================================================
  // 🧠 ESTADOS DA APLICAÇÃO (MEMÓRIA DO COMPONENTE)
  // ==========================================================================
  // Estados de controle da animação da roleta
  const [mustSpin, setMustSpin] = useState(false); 
  const [prizeNumber, setPrizeNumber] = useState(0); 
  const [result, setResult] = useState(''); 
  const [isVisible, setIsVisible] = useState(false); 

  // Estados de controle de fila (para quando caem vários donates juntos)
  const [spinQueue, setSpinQueue] = useState(0); 
  const eventosProcessados = useRef(new Set()); 

  // Estados de controle visual do texto do resultado
  const resultRef = useRef(null); 
  const [textScale, setTextScale] = useState(1); 

  // Estados dos dados do banco de dados (Supabase)
  const [rouletteData, setRouletteData] = useState([]); 
  const [newOption, setNewOption] = useState(''); 

  // ==========================================================================
  // ☁️ SUPABASE: CONEXÃO E TEMPO REAL
  // ==========================================================================
  useEffect(() => {
    // Busca todas as roupas cadastradas na tabela 'roupas'
    const fetchRoupas = async () => {
      const { data, error } = await supabase.from('roupas').select('*');
      if (error) {
        console.error("Erro ao buscar roupas:", error);
      } else if (data) {
        setRouletteData(data);
      }
    };

    fetchRoupas(); 

    // "Liga o rádio": Escuta mudanças no banco 24h por dia. 
    const subscription = supabase
      .channel('roupas-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roupas' }, () => {
        fetchRoupas(); 
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  // ==========================================================================
  // 🔌 WARUDO: COMUNICAÇÃO LOCAL (TROCA DE ROUPA)
  // ==========================================================================
  const avisarWarudo = (nomeDaRoupa) => {
    try {
      const ws = new WebSocket('ws://127.0.0.1:19190'); 
      
      ws.onopen = () => {
        console.log(`Enviando para o Warudo: ${nomeDaRoupa}`);
        ws.send(nomeDaRoupa); 
        ws.close(); 
      };
      
      ws.onerror = (error) => {
        console.log("Warudo não está aberto ou a porta não foi configurada.", error);
      };
    } catch (err) {
      console.log("Erro ao tentar falar com o Warudo", err);
    }
  };

  // ==========================================================================
  // 🎲 LÓGICA DE GIRO DA ROLETA
  // ==========================================================================
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

  // Gerenciador de Fila: Se tiver giros pendentes e a roleta não estiver ocupada, gira.
  useEffect(() => {
    if (spinQueue > 0 && !isVisible) {
      setSpinQueue(prevQueue => prevQueue - 1); 
      triggerSpin(); 
    }
  }, [spinQueue, isVisible]); 

  // Botão manual do painel 
  const handleSpinClick = () => {
    if (rouletteData.length > 0) {
      setSpinQueue(prevQueue => prevQueue + 1);
    }
  };

  // ==========================================================================
  // 📏 AJUSTE AUTOMÁTICO DO TAMANHO DA PALAVRA
  // ==========================================================================
  useEffect(() => {
    if (result && resultRef.current) {
      const espacoSeguroDaRoleta = 420; 
      const tamanhoRealDaPalavra = resultRef.current.scrollWidth;

      if (tamanhoRealDaPalavra > espacoSeguroDaRoleta) {
        setTextScale(espacoSeguroDaRoleta / tamanhoRealDaPalavra);
      } else {
        setTextScale(1); 
      }
    }
  }, [result]); 

  // ==========================================================================
  // 💰 STREAMLABS: INTEGRAÇÃO COM DONATES (E LIVEPIX)
  // ==========================================================================
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokensParam = urlParams.get('token');
    
    if (!tokensParam) return; 

    const tokensList = tokensParam.split(',').map(token => token.trim());
    const activeSockets = []; 

    tokensList.forEach((tokenDaUrl) => {
      // Conecta no Streamlabs com o token
      const socket = io(`https://sockets.streamlabs.com?token=${tokenDaUrl}`, {
        transports: ['websocket']
      });

      // Escuta os alertas do Streamlabs
      socket.on('event', (eventData) => {
        if (eventData.type === 'donation') {
          
          // O Streamlabs pode mandar múltiplos donates de uma vez
          eventData.message.forEach((donate) => {
            const idDoEvento = donate._id || donate.id; 

            // Filtro Anti-Clone
            if (idDoEvento && eventosProcessados.current.has(idDoEvento)) {
              return; 
            }
            if (idDoEvento) {
              eventosProcessados.current.add(idDoEvento);
            }

            // 🕵️ OS ESPIÕES DE TESTE DE VALOR:
            console.log(` O Streamlabs avisou que chegou um donate de: R$ ${donate.amount}`);

            if (Number(donate.amount) >= VALOR_MINIMO_GIRO) {
              console.log(" Valor APROVADO! Colocando giro na fila.");
              setSpinQueue(prevQueue => prevQueue + 1);
            } else {
              console.log(" Valor RECUSADO! Abaixo do mínimo. A roleta não vai girar.");
            }
          });
        }
      });

      activeSockets.push(socket);
    });

    return () => {
      activeSockets.forEach(socket => socket.disconnect());
    };
  }, []); 

  // ==========================================================================
  // 💾 SUPABASE: INSERIR E DELETAR DADOS
  // ==========================================================================
  const handleAddOption = async (e) => {
    e.preventDefault();
    if (newOption.trim() !== '') {
      await supabase.from('roupas').insert([{ option: newOption }]);
      setNewOption(''); 
    }
  };

  const handleRemoveOption = async (idToRemove) => {
    if (rouletteData.length <= 1) return;
    await supabase.from('roupas').delete().eq('id', idToRemove);
  };

  const isObsMode = new URLSearchParams(window.location.search).get('obs') === 'true';

  // ==========================================================================
  // 🎨 RENDERIZAÇÃO DA INTERFACE (HTML/JSX)
  // ==========================================================================
  return (
    <div className="app-wrapper">
      <div className="container">
        
        {/* CAIXA DA ROLETA */}
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
            {spinQueue > 0 && (
              <div className="queue-counter">
                 {spinQueue} na fila
              </div>
            )}

            {rouletteData.length > 0 ? (
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
                  const roupaGanhadora = rouletteData[prizeNumber].option;
                  setResult(roupaGanhadora);

                  if (isObsMode) {
                    avisarWarudo(roupaGanhadora);
                  }

                  setTimeout(() => {
                    setIsVisible(false);
                  }, TEMPO_EXIBICAO);
                }}
              />
            ) : (
              <div style={{ color: '#fff', textAlign: 'center' }}>
                Carregando roupas... Adicione uma abaixo!
              </div>
            )}
            
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

        {/* PAINEL DE CONTROLE (Oculto na tela do OBS) */}
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
              {rouletteData.map((item) => (
                <li key={item.id} className="option-item">
                  <span className="option-text">{item.option}</span>
                  <button 
                    className="remove-button"
                    onClick={() => handleRemoveOption(item.id)}
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