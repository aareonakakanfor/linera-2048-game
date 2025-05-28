import React, { useState, useEffect, useCallback } from 'react';
import './index.css';

// --- Linera Service Mock --- (Placeholder for actual Linera integration)
const lineraService = {
  loadGameState: async () => {
    // console.log('Linera: Attempting to load game state...');
    await new Promise(resolve => setTimeout(resolve, 200));
    const savedState = localStorage.getItem('linera2048GameState');
    if (savedState) {
      try {
        // console.log('Linera: Game state loaded from local storage (mock).');
        return JSON.parse(savedState);
      } catch (e) {
        console.error('Error parsing saved game state:', e);
        localStorage.removeItem('linera2048GameState');
        return null;
      }
    }
    // console.log('Linera: No saved game state found.');
    return null;
  },
  saveGameState: async (gameState) => {
    // console.log('Linera: Attempting to save game state...', gameState);
    await new Promise(resolve => setTimeout(resolve, 200));
    localStorage.setItem('linera2048GameState', JSON.stringify(gameState));
    // console.log('Linera: Game state saved to local storage (mock).');
  },
  loadPlayerProgression: async () => {
    // console.log('Linera: Attempting to load player progression...');
    await new Promise(resolve => setTimeout(resolve, 200));
    const savedProgression = localStorage.getItem('linera2048PlayerProgression');
    if (savedProgression) {
      try {
        // console.log('Linera: Player progression loaded.');
        return JSON.parse(savedProgression);
      } catch (e) {
        console.error('Error parsing saved player progression:', e);
        localStorage.removeItem('linera2048PlayerProgression');
        return { currentLevel: 1, bestScores: {} };
      }
    }
    // console.log('Linera: No player progression found.');
    return { currentLevel: 1, bestScores: {} }; // Default progression
  },
  savePlayerProgression: async (progression) => {
    // console.log('Linera: Attempting to save player progression...', progression);
    await new Promise(resolve => setTimeout(resolve, 200));
    localStorage.setItem('linera2048PlayerProgression', JSON.stringify(progression));
    // console.log('Linera: Player progression saved.');
  }
};

// --- Game Configuration ---
const gameLevels = [
  { level: 1, boardSize: 4, targetScore: 64 }, 
  { level: 2, boardSize: 4, targetScore: 128 },
  { level: 3, boardSize: 4, targetScore: 256 },
  { level: 4, boardSize: 4, targetScore: 512 },
  { level: 5, boardSize: 4, targetScore: 1024 },
  { level: 6, boardSize: 4, targetScore: 2048 },
  { level: 7, boardSize: 5, targetScore: 2048 },
  { level: 8, boardSize: 5, targetScore: 4096 },
  { level: 9, boardSize: 5, targetScore: 8192 },
  { level: 10, boardSize: 5, targetScore: 16384 },
];

const initialTileValue = () => (Math.random() < 0.9 ? 2 : 4);
let tileIdCounter = 0;
const getNewTileId = () => tileIdCounter++;

// --- Helper Functions ---
const createEmptyBoard = (size) => Array(size).fill(null).map(() => Array(size).fill(0));

const addNewTileToBoard = (board) => {
  const newBoard = board.map(row => row.map(tile => tile ? {...tile, isNew: false} : 0));
  const emptyTiles = [];
  newBoard.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell === 0) emptyTiles.push({ r, c });
    });
  });
  if (emptyTiles.length > 0) {
    const { r, c } = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
    newBoard[r][c] = { value: initialTileValue(), id: getNewTileId(), merged: false, isNew: true };
  }
  return newBoard;
};

// --- Core Game Logic ---
const processRow = (row) => {
  let filteredRow = row.filter(tile => tile !== 0);
  let newRow = [];
  let scoreIncrease = 0;
  let movedInRow = false;
  const originalRowSnapshot = row.map(t => t ? t.value : 0).join(','); // For checking if row changed

  for (let i = 0; i < filteredRow.length; i++) {
    let currentTile = filteredRow[i];
    if (i + 1 < filteredRow.length && filteredRow[i+1].value === currentTile.value) {
      const mergedValue = currentTile.value * 2;
      const newTile = { value: mergedValue, id: getNewTileId(), merged: true, isNew: false }; 
      newRow.push(newTile);
      scoreIncrease += mergedValue;
      i++; 
      movedInRow = true;
    } else {
      newRow.push(currentTile);
    }
  }
  
  while (newRow.length < row.length) {
    newRow.push(0);
  }
  
  const newRowSnapshot = newRow.map(t => t ? t.value : 0).join(',');
  if (originalRowSnapshot !== newRowSnapshot) {
      movedInRow = true;
  }

  return { newRow, scoreIncrease, moved: movedInRow }; 
};

const moveTiles = (board, direction) => {
  let tempBoard = board.map(row => row.map(tile => tile ? {...tile, merged: false, isNew: false } : 0));
  let totalScoreIncrease = 0;
  let overallMoved = false;
  const size = tempBoard.length;

  const rotateBoard = (b, times = 1) => {
    let currentBoard = b.map(row => [...row]);
    for (let t = 0; t < times; t++) {
        const rotated = createEmptyBoard(size);
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                rotated[c][size - 1 - r] = currentBoard[r][c];
            }
        }
        currentBoard = rotated;
    }
    return currentBoard;
  };

  let rotations = 0;
  if (direction === 'ArrowUp') { rotations = 1; }
  else if (direction === 'ArrowRight') { rotations = 2; }
  else if (direction === 'ArrowDown') { rotations = 3; }
  
  if (rotations > 0) tempBoard = rotateBoard(tempBoard, rotations);

  for (let r = 0; r < size; r++) {
    const { newRow, scoreIncrease, moved } = processRow(tempBoard[r]);
    tempBoard[r] = newRow;
    totalScoreIncrease += scoreIncrease;
    if (moved) overallMoved = true;
  }

  if (rotations > 0) tempBoard = rotateBoard(tempBoard, 4 - rotations); // Rotate back

  return { board: tempBoard, scoreIncrease: totalScoreIncrease, moved: overallMoved };
};

const checkGameOver = (board) => {
  const size = board.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 0) return false;
      if (c + 1 < size && board[r][c].value === board[r][c+1].value) return false;
      if (r + 1 < size && board[r][c].value === board[r+1][c].value) return false;
    }
  }
  return true;
};

const checkLevelComplete = (board, targetScore) => {
    if (!board || board.length === 0) return false;
    for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[r].length; c++) {
            if (board[r][c] && board[r][c].value >= targetScore) {
                return true;
            }
        }
    }
    return false;
};

// --- React Components ---
function Tile({ tileData, tileSize }) {
    if (!tileData || tileData.value === 0) {
        return <div className="tile-cell" style={{ width: tileSize, height: tileSize }}></div>;
    }
    const { value, isNew, merged } = tileData;
    const tileValueClass = value > 8192 ? 'tile-8192' : `tile-${value}`;
    const tileClasses = [
        'tile-inner',
        tileValueClass,
        isNew ? 'tile-new' : '',
        merged ? 'tile-merged' : ''
    ].filter(Boolean).join(' ');

    let fontSize = tileSize * 0.4;
    if (value >= 100) fontSize = tileSize * 0.35;
    if (value >= 1000) fontSize = tileSize * 0.3;
    if (value >= 10000) fontSize = tileSize * 0.25;

    return (
        <div className="tile-cell" style={{ width: tileSize, height: tileSize }}>
            <div className={tileClasses} style={{fontSize: `${fontSize}px`}}>
                {value}
            </div>
        </div>
    );
}

function GameBoard({ board, boardSizePx, tileSize }) {
    if (!board || board.length === 0) return <div id="game-board" style={{width: boardSizePx, height: boardSizePx, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>Loading Board...</div>; 
    const currentBoardSize = board.length;
    const boardStyle = {
        display: 'grid',
        gridTemplateColumns: `repeat(${currentBoardSize}, ${tileSize}px)`,
        gridTemplateRows: `repeat(${currentBoardSize}, ${tileSize}px)`,
        gap: `${gapSize}px`,
        backgroundColor: '#cdc1b4',
        border: `${gapSize}px solid #cdc1b4`,
        borderRadius: '6px',
        width: boardSizePx,
        height: boardSizePx,
        boxSizing: 'border-box',
    };

    return (
        <div id="game-board" style={boardStyle}>
            {board.map((row, rIndex) =>
                row.map((tileData, cIndex) => (
                    <Tile 
                        key={`${rIndex}-${cIndex}-${tileData ? tileData.id : `empty-${rIndex}-${cIndex}`}`} 
                        tileData={tileData} 
                        tileSize={tileSize} 
                    />
                ))
            )}
        </div>
    );
}

const boardPixelSize = Math.min(500, typeof window !== 'undefined' ? window.innerWidth - 40 : 500);
const gapSize = 10;

function App() {
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [board, setBoard] = useState([]); // Initialize as empty, will be set by initializeLevel
  const [score, setScore] = useState(0);
  const [bestScoreForLevel, setBestScoreForLevel] = useState(0);
  const [playerProgression, setPlayerProgression] = useState({ currentLevel: 1, bestScores: {} });
  const [isGameOver, setIsGameOver] = useState(false);
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const currentLevelConfig = gameLevels[currentLevelIndex] || gameLevels[0];
  const tileSize = (boardPixelSize - (currentLevelConfig.boardSize + 1) * gapSize) / currentLevelConfig.boardSize;

  const initializeLevel = useCallback((levelIdx, existingBoard = null, existingScore = 0) => {
    setIsLoading(true);
    const config = gameLevels[levelIdx];
    
    if (!config) {
        console.error("Invalid level index during initialization:", levelIdx, "Resetting to level 0.");
        const firstLevelConfig = gameLevels[0];
        setCurrentLevelIndex(0);
        let newBoard = createEmptyBoard(firstLevelConfig.boardSize);
        newBoard = addNewTileToBoard(newBoard);
        newBoard = addNewTileToBoard(newBoard);
        setBoard(newBoard.map(row => row.map(cell => cell === 0 ? 0 : {...cell, isNew: false, merged: false, id: getNewTileId() })));
        setScore(0);
        setBestScoreForLevel(playerProgression.bestScores?.[firstLevelConfig.level] || 0);
        setIsGameOver(false);
        setIsLevelComplete(false);
        setIsLoading(false);
        return;
    }

    setCurrentLevelIndex(levelIdx);
    setIsGameOver(false);
    setIsLevelComplete(false);
    tileIdCounter = 0; 

    if (existingBoard && existingBoard.length === config.boardSize && existingBoard.every(row => row.length === config.boardSize)) {
        setBoard(existingBoard.map(row => row.map(cell => cell === 0 ? 0 : {...cell, id: getNewTileId(), isNew: false, merged: false})));
        setScore(existingScore);
    } else {
        let newBoard = createEmptyBoard(config.boardSize);
        newBoard = addNewTileToBoard(newBoard);
        newBoard = addNewTileToBoard(newBoard);
        setBoard(newBoard.map(row => row.map(cell => cell === 0 ? 0 : {...cell, isNew: false, merged: false})));
        setScore(0);
    }
    const levelBest = playerProgression.bestScores?.[config.level] || 0;
    setBestScoreForLevel(levelBest);
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerProgression.bestScores]); 

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const progression = await lineraService.loadPlayerProgression();
      setPlayerProgression(progression);
      const gameData = await lineraService.loadGameState();
      
      let levelToLoadIdx = progression.currentLevel - 1;
      if (levelToLoadIdx >= gameLevels.length) levelToLoadIdx = gameLevels.length - 1;
      if (levelToLoadIdx < 0) levelToLoadIdx = 0;

      const targetLevelConfig = gameLevels[levelToLoadIdx];

      if (gameData && targetLevelConfig && gameData.level === targetLevelConfig.level && gameData.board && gameData.board.length === targetLevelConfig.boardSize) {
        initializeLevel(levelToLoadIdx, gameData.board, gameData.score);
      } else {
        initializeLevel(levelToLoadIdx);
      }
      // Ensure bestScoreForLevel is set based on the loaded progression for the initialized level
      const currentBest = progression.bestScores?.[gameLevels[levelToLoadIdx].level] || 0;
      setBestScoreForLevel(currentBest);
      setIsLoading(false);
    };
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializeLevel]); // initializeLevel is now stable if playerProgression.bestScores doesn't change during init

  useEffect(() => {
    if (!isLoading && !isGameOver && !isLevelComplete && board.length > 0 && currentLevelConfig) {
      const gameState = {
        board: board.map(row => row.map(tile => tile ? { value: tile.value, id: tile.id } : 0)),
        score: score,
        level: currentLevelConfig.level
      };
      setIsSaving(true);
      lineraService.saveGameState(gameState).finally(() => setIsSaving(false));
    }
  }, [board, score, currentLevelConfig, isLoading, isGameOver, isLevelComplete]);

  useEffect(() => {
    if (!isLoading) {
        setIsSaving(true);
        lineraService.savePlayerProgression(playerProgression).finally(() => setIsSaving(false));
    }
  }, [playerProgression, isLoading]);

  const handleKeyPress = useCallback((event) => {
    if (isGameOver || isLevelComplete || isLoading || isSaving) return;

    const validKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (!validKeys.includes(event.key)) return;
    event.preventDefault();

    const { board: movedBoard, scoreIncrease, moved } = moveTiles(board, event.key);

    if (moved) {
      let boardWithNewTile = addNewTileToBoard(movedBoard);
      setBoard(boardWithNewTile);
      const newScore = score + scoreIncrease;
      setScore(newScore);

      if (newScore > (playerProgression.bestScores?.[currentLevelConfig.level] || 0)) {
        setBestScoreForLevel(newScore);
        setPlayerProgression(prev => ({
            ...prev,
            bestScores: {
                ...prev.bestScores,
                [currentLevelConfig.level]: newScore
            }
        }));
      }

      if (checkLevelComplete(boardWithNewTile, currentLevelConfig.targetScore)) {
        setIsLevelComplete(true);
        if (currentLevelConfig.level === playerProgression.currentLevel && currentLevelIndex < gameLevels.length - 1) {
             setPlayerProgression(prev => ({
                ...prev,
                currentLevel: prev.currentLevel + 1
            }));
        }
      } else if (checkGameOver(boardWithNewTile)) {
        setIsGameOver(true);
      }
    }
  }, [board, score, isGameOver, isLevelComplete, isLoading, isSaving, currentLevelConfig, playerProgression, currentLevelIndex, initializeLevel]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  const startNewGame = () => {
    setIsLoading(true);
    const newProgression = { currentLevel: 1, bestScores: {} };
    setPlayerProgression(newProgression); 
    // initializeLevel will be called by the useEffect that watches playerProgression, 
    // or we can call it directly. Direct call is more predictable here.
    initializeLevel(0); // Start from level 1 (index 0)
    // No need to explicitly save progression here, the useEffect for playerProgression will handle it.
  };

  const handleTryAgain = () => {
    initializeLevel(currentLevelIndex, null, 0);
  };

  const handleNextLevel = () => {
    if (currentLevelIndex < gameLevels.length - 1) {
      const nextLevelIndex = currentLevelIndex + 1;
      initializeLevel(nextLevelIndex);
    } else {
      // Optionally, handle completion of all levels (e.g., show a special message)
      // For now, just allow replaying the last level or starting a new game.
      alert("Congratulations! You've completed all levels!");
    }
  };

  if (isLoading && board.length === 0) { 
    return <div className="container">Loading game...</div>;
  }

  return (
    <div className="container">
      <div className="heading">
        <h1>2048</h1>
        <div className="scores-container">
          <div className="score-box">
            Score
            <div id="score">{score}</div>
          </div>
          <div className="score-box">
            Best
            <div id="best-score">{bestScoreForLevel}</div>
          </div>
        </div>
      </div>
      <div className="game-meta">
        <p className="level-container">Level: <span id="current-level">{currentLevelConfig.level}</span> (Target: {currentLevelConfig.targetScore})</p>
        <button onClick={startNewGame} className="game-button">New Game</button>
      </div>
      <div id="game-board-container">
        {board.length > 0 ? 
            <GameBoard board={board} boardSizePx={boardPixelSize} tileSize={tileSize} /> 
            : <div style={{height: boardPixelSize, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Initializing board...</div>
        }
        {isGameOver && (
          <div id="game-over-message" className="message-overlay">
            <p>Game Over!</p>
            <button onClick={handleTryAgain} id="try-again-button" className="game-button">Try Again</button>
          </div>
        )}
        {isLevelComplete && (
          <div id="level-complete-message" className="message-overlay">
            <p>Level Complete!</p>
            {currentLevelIndex < gameLevels.length - 1 ? (
              <button onClick={handleNextLevel} id="next-level-button" className="game-button">Next Level</button>
            ) : (
              <p>You've completed all levels!</p>
            )}
            <button onClick={() => initializeLevel(currentLevelIndex)} className="game-button" style={{marginTop: '10px'}}>Replay Level</button>
          </div>
        )}
      </div>
      <p className="instructions">
        Use your <strong>arrow keys</strong> to move the tiles. 
        When two tiles with the same number touch, they <strong>merge into one!</strong>
        {isSaving && <span style={{color: 'orange', marginLeft: '10px'}}>(Saving...)</span>}
      </p>
      <p className="linera-info">
        Player progression and game state auto-saved (mocked via LocalStorage).
      </p>
    </div>
  );
}

export default App;

