let players = [];
let rounds = 0;
let currentRound = 1;
let currentBettorIndex = 0;
let currentRoundBets = [];
let currentRoundResults = [];
let tableRows = [];
let playerPoints = {};
let lastDealerIndex = -1;
let secondHalfDealerOffset = 0;
let orderedPlayers = [];
let gameResults = [];
let currentRoundLosers = [];
let currentRoundLoserScores = {};

// Diálogos in-app compatibles con iPhone / Safari
const nativeAlert = window.alert ? window.alert.bind(window) : () => {};
const nativeConfirm = window.confirm ? window.confirm.bind(window) : () => false;

function showAlert(message, onAcceptOrOptions) {
  return new Promise((resolve) => {
    const modal = document.getElementById("customDialogModal");
    const icon = document.getElementById("customDialogIcon");
    const title = document.getElementById("customDialogTitle");
    const msg = document.getElementById("customDialogMessage");
    const actions = document.getElementById("customDialogActions");

    let callback = null;
    let customTitle = "¡Atención!";
    let customIcon = "⚠️";
    let buttonText = "Entendido";

    if (typeof onAcceptOrOptions === "function") {
      callback = onAcceptOrOptions;
    } else if (onAcceptOrOptions && typeof onAcceptOrOptions === "object") {
      if (onAcceptOrOptions.onAccept) callback = onAcceptOrOptions.onAccept;
      if (onAcceptOrOptions.title) customTitle = onAcceptOrOptions.title;
      if (onAcceptOrOptions.icon) customIcon = onAcceptOrOptions.icon;
      if (onAcceptOrOptions.buttonText) buttonText = onAcceptOrOptions.buttonText;
    }

    if (!modal) {
      nativeAlert(message);
      if (callback) callback();
      resolve();
      return;
    }

    icon.innerText = customIcon;
    title.innerText = customTitle;
    msg.innerText = message;
    actions.innerHTML = "";

    const okBtn = document.createElement("button");
    okBtn.className = "custom-dialog-btn";
    okBtn.innerText = buttonText;
    okBtn.onclick = () => {
      modal.style.display = "none";
      if (callback) callback();
      resolve();
    };

    actions.appendChild(okBtn);
    modal.style.display = "flex";
    okBtn.focus();
  });
}

function showConfirm(message, onConfirm, onCancel, options = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById("customDialogModal");
    const icon = document.getElementById("customDialogIcon");
    const title = document.getElementById("customDialogTitle");
    const msg = document.getElementById("customDialogMessage");
    const actions = document.getElementById("customDialogActions");

    const customTitle = options.title || "¿Estás seguro?";
    const customIcon = options.icon || "❓";
    const confirmText = options.confirmText || "Confirmar";
    const cancelText = options.cancelText || "Cancelar";
    const confirmClass = options.confirmClass ? ` ${options.confirmClass}` : " danger";

    if (!modal) {
      const res = nativeConfirm(message);
      if (res && typeof onConfirm === "function") onConfirm();
      else if (!res && typeof onCancel === "function") onCancel();
      resolve(res);
      return;
    }

    icon.innerText = customIcon;
    title.innerText = customTitle;
    msg.innerText = message;
    actions.innerHTML = "";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "custom-dialog-btn secondary";
    cancelBtn.innerText = cancelText;
    cancelBtn.onclick = () => {
      modal.style.display = "none";
      if (typeof onCancel === "function") onCancel();
      resolve(false);
    };

    const confirmBtn = document.createElement("button");
    confirmBtn.className = `custom-dialog-btn${confirmClass}`;
    confirmBtn.innerText = confirmText;
    confirmBtn.onclick = () => {
      modal.style.display = "none";
      if (typeof onConfirm === "function") onConfirm();
      resolve(true);
    };

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    modal.style.display = "flex";
    confirmBtn.focus();
  });
}

// Override global para atrapar cualquier alert nativo no contemplado
window.alert = function (message) {
  showAlert(message);
};

// Al cargar o recargar la página (compatible con iPhone / Safari)
document.addEventListener("DOMContentLoaded", (event) => {
  renderPlayerButtons();

  const savedGameActive = localStorage.getItem("gameActive");
  const savedPlayers = localStorage.getItem("players");
  const savedRounds = localStorage.getItem("rounds");

  if (savedGameActive === "true" && savedPlayers && savedRounds) {
    let parsedPlayers = [];
    let parsedRounds = 0;
    try {
      parsedPlayers = JSON.parse(savedPlayers);
      parsedRounds = parseInt(savedRounds, 10);
    } catch (e) {}

    if (Array.isArray(parsedPlayers) && parsedPlayers.length > 0 && parsedRounds > 0) {
      const storedGameResults = localStorage.getItem("gameResults");
      const parsedResults = storedGameResults ? JSON.parse(storedGameResults) : [];
      const totalRounds = parsedRounds * 2;
      const nextRound = Math.min(parsedResults.length + 1, totalRounds);

      // Ocultar bienvenida mientras el usuario decide en el modal
      document.getElementById("welcomeScreen").style.display = "none";

      // Alerta modal in-app al recargar
      showConfirm(
        `Se recargó la página mientras había una partida en juego.\n\n• Ronda: ${nextRound} de ${totalRounds}\n• Jugadores: ${parsedPlayers.join(", ")}\n\n¿Querés reanudar la partida donde la dejaste?`,
        () => {
          restoreSavedGame();
        },
        () => {
          clearGameState();
          renderPlayerButtons();
          showWelcomeScreen();
        },
        {
          title: "Partida en curso",
          icon: "🔄",
          confirmText: "Reanudar partida",
          cancelText: "Nueva partida",
          confirmClass: "primary"
        }
      );
      return;
    }
  }

  showWelcomeScreen();
});

function setupThemeToggle() {
  const toggleThemeButton = document.getElementById("toggleThemeButton");
  toggleThemeButton.addEventListener("click", toggleTheme);

  // Set the initial theme based on the preferred color scheme
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.add("light-mode");
  }
}

function toggleTheme() {
  const isDarkMode = document.body.classList.contains("dark-mode");
  if (isDarkMode) {
    document.body.classList.remove("dark-mode");
    document.body.classList.add("light-mode");
    document.getElementById("toggleThemeButton").innerText =
      "Cambiar a modo oscuro";
  } else {
    document.body.classList.remove("light-mode");
    document.body.classList.add("dark-mode");
    document.getElementById("toggleThemeButton").innerText =
      "Cambiar a modo claro";
  }
}

// Listas de jugadores por modo
const defaultPlayersList = ["Fer", "Ari", "Laro", "Juryk", "Lina", "Fede", "Alitan"];
const ariPlayersList = ["Stefi", "Vane", "Ari", "Flor", "Marian", "Leo"];
let currentMode = "classic"; // "classic" | "ari"

function renderPlayerButtons() {
  const container = document.getElementById("playerButtons");
  if (!container) return;

  const currentList = currentMode === "ari" ? ariPlayersList : defaultPlayersList;
  container.innerHTML = "";

  currentList.forEach((name) => {
    const btn = document.createElement("button");
    btn.innerText = name;
    if (players.includes(name)) {
      btn.disabled = true;
    }
    btn.onclick = () => {
      selectPlayer(name);
      btn.disabled = true;
    };
    container.appendChild(btn);
  });

  const customBtn = document.createElement("button");
  customBtn.innerText = "Otro";
  customBtn.onclick = () => showCustomPlayerInput();
  container.appendChild(customBtn);
}

function setPlayerMode(mode) {
  currentMode = mode;
  const tabClassic = document.getElementById("tabClassicMode");
  const tabAri = document.getElementById("tabAriMode");

  if (tabClassic && tabAri) {
    if (mode === "ari") {
      tabClassic.classList.remove("active");
      tabAri.classList.add("active");
    } else {
      tabClassic.classList.add("active");
      tabAri.classList.remove("active");
    }
  }
  renderPlayerButtons();
}

function showWelcomeScreen() {
  document.getElementById("welcomeScreen").style.display = "flex";
}

function continueFromWelcome() {
  document.getElementById("welcomeScreen").style.display = "none";
  showPlayersModal();
}

function showPlayersModal() {
  renderPlayerButtons();
  const modal = document.getElementById("playersModal");
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
}

function selectPlayer(player) {
  if (!players.includes(player)) {
    players.push(player);
    updateSelectedPlayers();
  } else {
    showAlert(`${player} ya ha sido seleccionado.`);
  }
}

function showCustomPlayerInput() {
  document.getElementById("customPlayerInput").classList.remove("hidden");
}

function addCustomPlayer() {
  const customPlayerName = document
    .getElementById("customPlayerName")
    .value.trim();
  if (customPlayerName && !players.includes(customPlayerName)) {
    players.push(customPlayerName);
    updateSelectedPlayers();
    renderPlayerButtons();
    document.getElementById("customPlayerName").value = "";
  } else if (players.includes(customPlayerName)) {
    showAlert(`${customPlayerName} ya juega. ¿Se viene el clon o qué?`);
  }
}

function updateSelectedPlayers() {
  const selectedPlayersDiv = document.getElementById("selectedPlayers");
  selectedPlayersDiv.innerHTML = "";
  players.forEach((player, index) => {
    const playerSpan = document.createElement("span");
    playerSpan.innerText = `${index + 1}. ${player} `;
    selectedPlayersDiv.appendChild(playerSpan);
  });
}

function confirmPlayers() {
  if (players.length > 0) {
    localStorage.setItem("players", JSON.stringify(players));
    players.forEach((player) => {
      playerPoints[player] = 0;
    });
    document.getElementById("playersModal").style.display = "none";
    showRoundsModal();
  } else {
    showAlert("Jajaja quería armar una partida sin jugadores el loco.");
  }
}

function showRoundsModal() {
  document.getElementById("roundsModal").style.display = "flex";
  document.getElementById("roundsModal").style.alignItems = "center";
}

function selectRounds(selectedRounds) {
  const maxRounds = Math.floor(40 / players.length);
  if (selectedRounds > maxRounds) {
    showAlert(
      `Mamita querida. Siendo ${players.length} Solamente van a poder jugar ${maxRounds} rondas. ¿No sabés dividir?`
    );
    return;
  }

  rounds = selectedRounds;
  localStorage.setItem("rounds", rounds);
  
  if (rounds % players.length === 0) {
    showDealerWarningModal();
  } else {
    secondHalfDealerOffset = 0;
    currentGameId = "game_" + Date.now();
    localStorage.setItem("currentGameId", currentGameId);
    localStorage.setItem("secondHalfDealerOffset", "0");
    localStorage.setItem("gameActive", "true");
    localStorage.setItem("playerPoints", JSON.stringify(playerPoints));
    syncCurrentGameToHistory(false);
    document.getElementById("roundsModal").style.display = "none";
    generateGameTable();
  }
}

function showDealerWarningModal() {
  document.getElementById("roundsModal").style.display = "none";
  const modal = document.getElementById("dealerWarningModal");
  const text = document.getElementById("dealerWarningText");
  const buttonsDiv = document.getElementById("dealerWarningButtons");
  
  const screwedPlayer = players[0];
  
  text.innerText = `Están re cagando a ${screwedPlayer}, le toca dar 2 veces la de 1. Vean a quién le toca más baja y le toca la de 1 después:`;
  
  buttonsDiv.innerHTML = "";
  players.forEach((player, index) => {
    if (index !== 0) {
      const btn = document.createElement("button");
      btn.innerText = player;
      btn.onclick = () => {
        secondHalfDealerOffset = index;
        currentGameId = "game_" + Date.now();
        localStorage.setItem("currentGameId", currentGameId);
        localStorage.setItem("secondHalfDealerOffset", index.toString());
        localStorage.setItem("gameActive", "true");
        localStorage.setItem("playerPoints", JSON.stringify(playerPoints));
        syncCurrentGameToHistory(false);
        modal.style.display = "none";
        generateGameTable();
      };
      buttonsDiv.appendChild(btn);
    }
  });
  
  modal.style.display = "flex";
  modal.style.alignItems = "center";
}

function generateGameTable() {
  try {
    if (!history.state || !history.state.inGame) {
      history.pushState({ inGame: true }, "");
    }
  } catch (e) {}

  const tableContainer = document.getElementById("mainTableContainer");
  const playersHeader = document.getElementById("playersHeader");
  const gameRounds = document.getElementById("gameRounds");

  playersHeader.innerHTML = "";

  // Agregar encabezado para la columna de números de ronda
  const thRounds = document.createElement("th");
  thRounds.innerText = "";
  playersHeader.appendChild(thRounds);

  // Agregar encabezado para cada jugador
  players.forEach((player) => {
    const th = document.createElement("th");
    th.colSpan = 2; // Cada jugador tendrá dos columnas (apuestas y resultados)
    th.innerText = player;
    playersHeader.appendChild(th);
  });

  // Crear las filas de rondas
  tableRows = [];
  const totalRounds = rounds * 2;
  for (let i = 1; i <= totalRounds; i++) {
    addRoundRow(i);
  }
  showOnlyFirstShortButton();
  tableContainer.classList.remove("hidden");

  // Mostrar los botones cuando se genera la tabla
  document.getElementById("correctButton").classList.remove("hidden");
  document.getElementById("historyButton").classList.remove("hidden");
  document.getElementById("resetButton").classList.remove("hidden");
}

function addRoundRow(roundNumber) {
  const tr = document.createElement("tr");
  const row = [];

  // Celda de número de ronda
  const roundTd = document.createElement("td");
  roundTd.classList.add("round");
  roundTd.innerText = ((roundNumber - 1) % rounds) + 1;
  tr.appendChild(roundTd);

  // Identificar al jugador que reparte en esta ronda
  let baseDealerIndex = (roundNumber - 1) % players.length;
  let dealerIndex;
  if (roundNumber > rounds) {
    dealerIndex = (baseDealerIndex + secondHalfDealerOffset) % players.length;
  } else {
    dealerIndex = baseDealerIndex;
  }

  lastDealerIndex = dealerIndex;

  players.forEach((player, playerIndex) => {
    // Celda de apuestas
    const betsTd = document.createElement("td");
    betsTd.classList.add("bets-cell");
    row.push(betsTd);
    tr.appendChild(betsTd);

    // Celda de resultados
    const resultsTd = document.createElement("td");
    if (playerIndex === dealerIndex) {
      resultsTd.innerHTML = `<button class="short" onclick="startBetting(${roundNumber}, ${dealerIndex})">Dar</button>`;
    }
    row.push(resultsTd);
    tr.appendChild(resultsTd);
  });

  tableRows.push(row);
  document.getElementById("gameRounds").appendChild(tr);
}

function startBetting(roundNumber, dealerIndex) {
  currentRound = roundNumber;
  currentRoundBets = [];
  currentRoundResults = new Array(players.length).fill(null); // Inicializar con null
  currentBettorIndex = 0;
  showBettingModal(dealerIndex);
}

function showBettingModal(dealerIndex) {
  const bettingModal = document.getElementById("bettingModal");
  const bettingContent = document.getElementById("bettingContent");
  const bettingLeaderboard = document.getElementById("bettingLeaderboard");

  // Ordenar jugadores por puntaje y mostrar
  const sortedPlayers = Object.keys(playerPoints).sort((a, b) => {
    if (playerPoints[b] !== playerPoints[a]) {
      return playerPoints[b] - playerPoints[a];
    }
    if (a === 'Fer') return 1;
    if (b === 'Fer') return -1;
    return 0;
  });
  
  bettingLeaderboard.innerHTML = "";
  sortedPlayers.forEach((player, index) => {
    const playerDiv = document.createElement("div");
    playerDiv.innerText = `${index + 1}. ${player} (${playerPoints[player]})`;
    // Resaltar al primero (o primeros si hay empate)
    if (playerPoints[player] === playerPoints[sortedPlayers[0]] && currentRound > 1) {
      playerDiv.style.fontWeight = "bold";
      playerDiv.style.color = "#ffb041";
    }
    bettingLeaderboard.appendChild(playerDiv);
  });

  const effectiveRound = ((currentRound - 1) % rounds) + 1; // Ajustar la ronda efectiva
  var startingIndex = (dealerIndex + 1) % players.length;
  let orderPlayers = (array, index) =>
    index >= 0 && index < array.length
      ? [...Array(array.length).keys()]
          .slice(index)
          .concat([...Array(array.length).keys()].slice(0, index))
      : (() => {
          throw new Error("Índice fuera de rango");
        })();
  let ordeningPlayers = orderPlayers(players, startingIndex);
  orderedPlayers = ordeningPlayers;

  // Función para mostrar la pregunta de apuesta para el jugador actual
  const askForBet = () => {
    const currentPlayer = players[orderedPlayers[currentBettorIndex]];

    const backButton = document.getElementById("betBackButton");
    if (backButton) {
      if (currentBettorIndex > 0) {
        backButton.classList.remove("hidden");
        backButton.onclick = () => goBackBet();
      } else {
        backButton.classList.add("hidden");
      }
    }

    let betsSummary = "";
    if (currentRoundBets.length > 0) {
      const summaryItems = currentRoundBets
        .map((bet, idx) => `<span><b>${players[orderedPlayers[idx]]}:</b> ${bet}</span>`)
        .join(" ");
      betsSummary = `<div class="bets-summary" style="margin: 12px 0 16px 0; font-size: 14px; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 8px;">${summaryItems}</div>`;
    }

    bettingContent.innerHTML = `<p><b class="player">${currentPlayer}</b><br><br>¿Cuánto querés apostar en la ronda ${currentRound}?</p>
    ${betsSummary}
    <div id="betButtonsContainer" style="margin-bottom: 8px;"></div>`;

    const betButtonsContainer = document.getElementById("betButtonsContainer");
    for (let i = 0; i <= effectiveRound; i++) {
      const betButton = document.createElement("button");
      betButton.innerText = i;
      betButton.onclick = () => confirmBet(i, dealerIndex);
      betButtonsContainer.appendChild(betButton);
    }
  };

  const goBackBet = () => {
    if (currentBettorIndex > 0) {
      currentRoundBets.pop();
      currentBettorIndex--;
      askForBet();
    }
  };

  // Mostrar la pregunta de apuesta para el jugador inicial
  askForBet();

  bettingModal.style.display = "flex";
  bettingModal.style.alignItems = "center";

  // Llamar a askForBet o finalizar después de confirmar la apuesta del jugador actual
  const confirmBet = (bet, dealerIndex) => {
    currentRoundBets.push(bet);

    if (currentBettorIndex === players.length - 1) {
      const totalBets = currentRoundBets.reduce((a, b) => a + b, 0);
      if (totalBets === currentRound) {
        showAlert(
          `No podés apostar: ${bet}. Hace 80 años que jugamos a esto y no sabés las reglas.`
        );
        currentRoundBets.pop();
        return;
      }
    }

    currentBettorIndex++;

    if (currentBettorIndex < players.length) {
      askForBet();
    } else {
      const backButton = document.getElementById("betBackButton");
      if (backButton) backButton.classList.add("hidden");
      document.getElementById("bettingModal").style.display = "none";
      askForRoundResults();
    }
  };
}

function askForRoundResults() {
  currentRoundLosers = [];
  currentRoundLoserScores = {};
  showLosersSelectionStep();
}

function showLosersSelectionStep() {
  const resultsModal = document.getElementById("resultsModal");
  const resultsContent = document.getElementById("resultsContent");
  const backButton = document.getElementById("resultsBackButton");

  if (backButton) {
    backButton.classList.add("hidden");
  }

  const effectiveRound = ((currentRound - 1) % rounds) + 1;

  resultsContent.innerHTML = `
    <h2>¿Quiénes perdieron?</h2>
    <p style="color: var(--text-muted); font-size: 14px; margin-top: -10px; margin-bottom: 16px;">
      Ronda ${currentRound} (${effectiveRound} ${effectiveRound === 1 ? "carta" : "cartas"}). Seleccioná a los que no cumplieron su apuesta:
    </p>
    <div id="losersButtons" class="losers-player-buttons"></div>
    <h3 style="font-size: 14px; margin-bottom: 8px;">Perdieron:</h3>
    <div id="selectedLosersBox" class="selected-losers-box"></div>
    <button class="results-action-btn" onclick="proceedToLoserScoring()">Continuar</button>
  `;

  renderLosersSelectionButtons();

  resultsModal.style.display = "flex";
  resultsModal.style.alignItems = "center";
}

function renderLosersSelectionButtons() {
  const losersButtons = document.getElementById("losersButtons");
  const selectedLosersBox = document.getElementById("selectedLosersBox");
  if (!losersButtons || !selectedLosersBox) return;

  losersButtons.innerHTML = "";

  // Botones de cada jugador (con su apuesta al lado)
  players.forEach((player, index) => {
    const betIndex = orderedPlayers.indexOf(index);
    const playerBet = currentRoundBets[betIndex];
    const isSelected = currentRoundLosers.includes(player);

    const btn = document.createElement("button");
    const pts = playerPoints[player] ?? 0;
    const ptsSign = pts >= 0 ? "+" : "";
    btn.innerHTML = `${player} <span style="font-size: 11px; opacity: 0.5;">Apostó ${playerBet} <br> Tiene ${ptsSign}${pts}</span>`;
    btn.disabled = isSelected;
    btn.onclick = () => {
      if (!currentRoundLosers.includes(player)) {
        currentRoundLosers.push(player);
        renderLosersSelectionButtons();
      }
    };
    losersButtons.appendChild(btn);
  });

  // Chips de perdedores seleccionados
  selectedLosersBox.innerHTML = "";
  if (currentRoundLosers.length === 0) {
    selectedLosersBox.classList.add("empty");
    selectedLosersBox.innerText = "Nadie seleccionado todavía (todos ganarían)";
  } else {
    selectedLosersBox.classList.remove("empty");
    currentRoundLosers.forEach((player) => {
      const chip = document.createElement("div");
      chip.className = "loser-chip";
      chip.title = "Clic para desmarcar";
      chip.innerHTML = `<span>${player}</span><span class="loser-chip-remove">×</span>`;
      chip.onclick = () => {
        currentRoundLosers = currentRoundLosers.filter((p) => p !== player);
        delete currentRoundLoserScores[player];
        renderLosersSelectionButtons();
      };
      selectedLosersBox.appendChild(chip);
    });
  }
}

function proceedToLoserScoring() {
  if (currentRoundLosers.length === 0) {
    showAlert(
      "¿QUEEE? Mirá si van a ganar todos. Me estás rompiendo la regla principal del juego. Fijate bien quién perdió, no sean lauchas.",
      {
        title: "¡Pará la mano!",
        icon: "🐀",
        buttonText: "Elegir perdedores"
      }
    );
    return;
  }

  showLosersScoringStep();
}

function showLosersScoringStep() {
  const resultsContent = document.getElementById("resultsContent");
  const backButton = document.getElementById("resultsBackButton");

  if (backButton) {
    backButton.classList.remove("hidden");
    backButton.onclick = () => showLosersSelectionStep();
  }

  const effectiveRound = ((currentRound - 1) % rounds) + 1;

  // Inicializar puntaje por default en -1 para los seleccionados si aún no lo tienen
  currentRoundLosers.forEach((player) => {
    if (currentRoundLoserScores[player] === undefined) {
      currentRoundLoserScores[player] = -1;
    }
  });

  resultsContent.innerHTML = `
    <h2>Puntos de derrota</h2>
    <p style="color: var(--text-muted); font-size: 14px; margin-top: -10px; margin-bottom: 20px;">
      Ronda ${currentRound} (${effectiveRound} ${effectiveRound === 1 ? "carta" : "cartas"}). Marcá los puntos que le descuentan a cada uno:
    </p>
    <div id="losersScoringContainer"></div>
    <button class="results-action-btn" onclick="finalizeRoundResults()">Confirmar Ronda</button>
  `;

  renderLosersScoringRows(effectiveRound);
}

function renderLosersScoringRows(effectiveRound) {
  const container = document.getElementById("losersScoringContainer");
  if (!container) return;

  container.innerHTML = "";

  currentRoundLosers.forEach((player) => {
    const playerIndex = players.indexOf(player);
    const betIndex = orderedPlayers.indexOf(playerIndex);
    const playerBet = currentRoundBets[betIndex];

    const row = document.createElement("div");
    row.className = "loser-scoring-row";

    const header = document.createElement("div");
    header.className = "loser-scoring-header";
    header.innerHTML = `<b class="player">${player}</b> <span style="font-size: 13px; color: var(--text-muted);">(Apostó ${playerBet})</span>`;
    row.appendChild(header);

    const buttonsDiv = document.createElement("div");
    buttonsDiv.className = "loser-scoring-buttons";

    for (let score = -1; score >= -effectiveRound; score--) {
      const btn = document.createElement("button");
      btn.className =
        "loser-score-btn" +
        (currentRoundLoserScores[player] === score ? " selected" : "");
      btn.innerText = score;
      const s = score;
      btn.onclick = () => {
        currentRoundLoserScores[player] = s;
        renderLosersScoringRows(effectiveRound);
      };
      buttonsDiv.appendChild(btn);
    }

    row.appendChild(buttonsDiv);
    container.appendChild(row);
  });
}

function finalizeRoundResults() {
  for (const player of currentRoundLosers) {
    if (currentRoundLoserScores[player] === undefined) {
      showAlert(`Por favor elegí el puntaje de ${player}.`);
      return;
    }
  }

  // Asignar los resultados: los que están en currentRoundLosers reciben su valor negativo, los demás 0 (Ganó)
  currentRoundResults = players.map((player) => {
    if (currentRoundLosers.includes(player)) {
      return currentRoundLoserScores[player];
    } else {
      return 0; // Ganó
    }
  });

  const backButton = document.getElementById("resultsBackButton");
  if (backButton) backButton.classList.add("hidden");

  updateTableWithResults();
  closeResultsModal();
}

function closeResultsModal() {
  document.getElementById("resultsModal").style.display = "none";
}

function updateTableWithResults() {
  const roundRowIndex = currentRound - 1;
  const row = tableRows[roundRowIndex];
  let roundResults = [];

  players.forEach((player, index) => {
    const betCellIndex = index * 2;
    const resultCellIndex = betCellIndex + 1;

    // Actualizar celda de apuestas
    let reorderBets = (array, indexes) => {
      let result = new Array(array.length);
      indexes.forEach((index, i) => {
        result[index] = array[i];
      });
      return result;
    };
    let orderedBets = reorderBets(currentRoundBets, orderedPlayers);
    row[betCellIndex].innerText = orderedBets[index];

    // Actualizar celda de resultados con puntaje acumulado + puntaje de la ronda
    const prevPoints = playerPoints[player];
    const result = currentRoundResults[index];
    let roundPoints = 0;
    if (result === 0) {
      roundPoints = 10 + orderedBets[index];
      row[resultCellIndex].innerHTML = `<span class="score-accum">${prevPoints}</span><span class="score-delta positive">+${roundPoints}</span>`;
      playerPoints[player] += roundPoints;
    } else {
      roundPoints = result;
      row[resultCellIndex].innerHTML = `<span class="score-accum">${prevPoints}</span><span class="score-delta negative">${roundPoints}</span>`;
      playerPoints[player] += roundPoints;
    }

    roundResults.push({
      player: player,
      bet: orderedBets[index],
      result: result
    });
  });

  gameResults.push({
    round: currentRound,
    results: roundResults
  });

  // Guardar en localStorage
  localStorage.setItem("gameResults", JSON.stringify(gameResults));
  localStorage.setItem("playerPoints", JSON.stringify(playerPoints));
  localStorage.setItem("gameActive", "true");
  syncCurrentGameToHistory(false);

  updateTableHeader();
  updateRoundNumbers(); // Asegurar que los números de ronda se actualicen
  showOnlyFirstShortButton();

  // Verificar si todas las rondas han sido completadas
  const totalRounds = rounds * 2;
  if (currentRound === totalRounds) {
    showPodium();
  }
}

function updateRoundNumbers() {
  const tableRows = document.querySelectorAll("#gameRounds tr");
  tableRows.forEach((tr, index) => {
    const effectiveRoundNumber = (index % rounds) + 1;
    tr.querySelector("td").innerText = effectiveRoundNumber;
  });
}

let confettiAnimationId = null;

function startConfetti(durationMs = 4500) {
  stopConfetti();
  const canvas = document.getElementById("confettiCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.display = "block";

  const colors = [
    "#fbbf24", // Gold
    "#2dd4bf", // Teal
    "#f43f5e", // Rose
    "#a855f7", // Purple
    "#38bdf8", // Sky blue
    "#ffffff", // White
    "#f59e0b"  // Amber
  ];

  const particleCount = 130;
  const particles = [];

  for (let i = 0; i < particleCount; i++) {
    const fromLeft = i % 2 === 0;
    particles.push({
      x: fromLeft ? width * 0.15 : width * 0.85,
      y: height * 0.75,
      vx: (fromLeft ? 1 : -1) * (Math.random() * 11 + 3),
      vy: -(Math.random() * 15 + 10),
      size: Math.random() * 9 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
      gravity: 0.35,
      friction: 0.982
    });
  }

  const startTime = Date.now();

  function render() {
    const elapsed = Date.now() - startTime;
    ctx.clearRect(0, 0, width, height);

    let activeParticles = 0;
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= p.friction;
      p.rotation += p.rotationSpeed;

      if (elapsed > durationMs - 1200) {
        p.opacity = Math.max(0, 1 - (elapsed - (durationMs - 1200)) / 1200);
      }

      if (p.y < height + 40 && p.opacity > 0) {
        activeParticles++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, (p.size * 2) / 3);
        ctx.restore();
      }
    });

    if (activeParticles > 0 && elapsed < durationMs) {
      confettiAnimationId = requestAnimationFrame(render);
    } else {
      stopConfetti();
    }
  }

  confettiAnimationId = requestAnimationFrame(render);
}

function stopConfetti() {
  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
  }
  const canvas = document.getElementById("confettiCanvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = "none";
  }
}

function showPodium() {
  const podiumModal = document.getElementById("podiumModal");
  const podiumContent = document.getElementById("podiumContent");

  // Ordenar los jugadores por puntaje de mayor a menor
  const sortedPlayers = Object.keys(playerPoints).sort((a, b) => {
    if (playerPoints[b] !== playerPoints[a]) {
      return playerPoints[b] - playerPoints[a];
    }
    if (a === 'Fer') return 1;
    if (b === 'Fer') return -1;
    return 0;
  });

  // Guardar la partida en el historial como finalizada
  syncCurrentGameToHistory(true);

  // Calcular cantidad de veces que cada jugador apostó 0 y manos ganadas (result === 0)
  const zeroBetsCount = {};
  const wonHandsCount = {};
  players.forEach((p) => {
    zeroBetsCount[p] = 0;
    wonHandsCount[p] = 0;
  });

  const totalRoundsPlayed = gameResults.length;
  gameResults.forEach((roundData) => {
    roundData.results.forEach((r) => {
      if (r.bet === 0) {
        zeroBetsCount[r.player]++;
      }
      if (r.result === 0) {
        wonHandsCount[r.player]++;
      }
    });
  });

  // Encontrar el máximo de veces que se apostó 0
  let maxZeroBets = 0;
  Object.values(zeroBetsCount).forEach((count) => {
    if (count > maxZeroBets) maxZeroBets = count;
  });

  // Identificar si algún jugador ganó todas las manos
  const perfectPlayers = players.filter(
    (p) => totalRoundsPlayed > 0 && wonHandsCount[p] === totalRoundsPlayed
  );

  // Generar el contenido del podio
  podiumContent.innerHTML = "";

  // Si hay puntaje perfecto, disparar confeti y mostrar tarjeta destacada
  if (perfectPlayers.length > 0) {
    startConfetti();

    const perfectCard = document.createElement("div");
    perfectCard.className = "perfect-score-card";

    const header = document.createElement("div");
    header.className = "perfect-score-header";
    header.innerText = "👑 ¡PUNTAJE PERFECTO! 👑";

    const names = document.createElement("div");
    names.className = "perfect-score-names";
    names.innerText = perfectPlayers.join(", ");

    const desc = document.createElement("p");
    desc.className = "perfect-score-desc";
    const manosTexto =
      totalRoundsPlayed === 1
        ? "la única mano"
        : `las ${totalRoundsPlayed} manos`;
    desc.innerText = `¡Partida impecable! Ganó ${manosTexto} sin errar una sola apuesta. ¡Felicitaciones crack! 🏆`;

    perfectCard.appendChild(header);
    perfectCard.appendChild(names);
    perfectCard.appendChild(desc);
    podiumContent.appendChild(perfectCard);

    const sectionTitle = document.createElement("div");
    sectionTitle.className = "podium-section-title";
    sectionTitle.innerText = "Tabla de posiciones";
    podiumContent.appendChild(sectionTitle);
  }

  // Listado de jugadores con medallas y estados
  const medals = ["🥇", "🥈", "🥉"];
  sortedPlayers.forEach((player, index) => {
    const isRat = maxZeroBets > 0 && zeroBetsCount[player] === maxZeroBets;
    const ratEmoji = isRat ? " 🐀" : "";
    const isPerfect = perfectPlayers.includes(player);
    const crownEmoji = isPerfect ? " 👑" : "";
    const positionLabel = medals[index] || `${index + 1}.`;

    const playerDiv = document.createElement("div");
    playerDiv.className = `podium-item ${
      isPerfect ? "podium-perfect" : index === 0 ? "podium-first" : ""
    }`;

    const nameSpan = document.createElement("span");
    nameSpan.className = "podium-player-name";
    nameSpan.innerText = `${positionLabel} ${player}${crownEmoji}${ratEmoji}`;

    const scoreSpan = document.createElement("span");
    scoreSpan.className = "podium-player-score";
    scoreSpan.innerText = `${playerPoints[player]} pts`;

    playerDiv.appendChild(nameSpan);
    playerDiv.appendChild(scoreSpan);
    podiumContent.appendChild(playerDiv);
  });

  podiumModal.style.display = "flex";
  podiumModal.style.alignItems = "center";
}

function closePodiumModal() {
  stopConfetti();
  document.getElementById("podiumModal").style.display = "none";
}

function updateTableHeader() {
  const playersHeader = document.getElementById("playersHeader");
  playersHeader.innerHTML = "";

  const thRounds = document.createElement("th");
  thRounds.innerText = "";
  playersHeader.appendChild(thRounds);

  players.forEach((player) => {
    const th = document.createElement("th");
    th.innerText = `${player} (${playerPoints[player]})`;
    th.colSpan = 2;
    playersHeader.appendChild(th);
  });
}

let tempCorrectionPoints = 0;
let initialPlayerPoints = 0;

function showCorrectionModal() {
  const correctionPlayerSelect = document.getElementById("correctionPlayerSelect");
  if (!correctionPlayerSelect) return;
  correctionPlayerSelect.innerHTML = "";

  players.forEach((player) => {
    const option = document.createElement("option");
    option.value = player;
    option.innerText = `${player} (${playerPoints[player] || 0} pts)`;
    correctionPlayerSelect.appendChild(option);
  });

  if (players.length > 0) {
    onCorrectionPlayerChange();
  }

  const modal = document.getElementById("correctionModal");
  modal.style.display = "flex";
  modal.style.alignItems = "center";
}

function onCorrectionPlayerChange() {
  const select = document.getElementById("correctionPlayerSelect");
  if (!select) return;
  const selectedPlayer = select.value;
  initialPlayerPoints = (playerPoints && playerPoints[selectedPlayer] !== undefined)
    ? playerPoints[selectedPlayer]
    : 0;
  tempCorrectionPoints = initialPlayerPoints;
  updateCorrectionDisplay();
}

function adjustCorrectionPoints(delta) {
  tempCorrectionPoints += delta;
  updateCorrectionDisplay();
}

function updateCorrectionDisplay() {
  const valSpan = document.getElementById("correctionCurrentValue");
  const deltaSpan = document.getElementById("correctionDeltaDisplay");
  if (!valSpan || !deltaSpan) return;

  valSpan.innerText = tempCorrectionPoints;

  const diff = tempCorrectionPoints - initialPlayerPoints;
  if (diff > 0) {
    deltaSpan.innerHTML = `<span class="delta-positive">(+${diff})</span>`;
  } else if (diff < 0) {
    deltaSpan.innerHTML = `<span class="delta-negative">(${diff})</span>`;
  } else {
    deltaSpan.innerHTML = `<span style="color: var(--text-muted); font-size: 0.8rem;">(sin cambios)</span>`;
  }
}

function closeCorrectionModal() {
  const modal = document.getElementById("correctionModal");
  if (modal) modal.style.display = "none";
}

function confirmCorrection() {
  const select = document.getElementById("correctionPlayerSelect");
  if (!select) return;
  const selectedPlayer = select.value;
  const diff = tempCorrectionPoints - initialPlayerPoints;

  if (diff === 0) {
    closeCorrectionModal();
    return;
  }

  playerPoints[selectedPlayer] = tempCorrectionPoints;
  localStorage.setItem("playerPoints", JSON.stringify(playerPoints));
  syncCurrentGameToHistory(false);
  updateTableHeader();

  const changeText = diff > 0 ? `+${diff}` : `${diff}`;
  showAlert(
    `Se actualizó el puntaje de ${selectedPlayer} a ${tempCorrectionPoints} puntos (${changeText}).`,
    () => {
      closeCorrectionModal();
    }
  );
}

// Historial de Partidas y Estadísticas
let currentGameId = localStorage.getItem("currentGameId") || null;
let currentHistoryView = "podium"; // "podium" | "chart" | "list"
let currentChartMetric = "wins"; // "wins" | "points"
const CHART_PALETTE = [
  "#2dd4bf", // Teal
  "#fbbf24", // Amber / Gold
  "#f43f5e", // Rose
  "#a855f7", // Purple
  "#38bdf8", // Sky blue
  "#34d399", // Emerald
  "#f97316", // Orange
  "#818cf8", // Indigo
  "#e879f9", // Fuchsia
  "#94a3b8"  // Slate
];

function getGameHistory() {
  try {
    const raw = localStorage.getItem("gameHistory");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function syncCurrentGameToHistory(isFinished = false) {
  if (!players || players.length === 0 || !rounds) return;

  if (!currentGameId) {
    currentGameId = localStorage.getItem("currentGameId") || ("game_" + Date.now());
    localStorage.setItem("currentGameId", currentGameId);
  }

  let history = getGameHistory();
  let existingIndex = history.findIndex((m) => m.id === currentGameId);

  const sorted = Object.keys(playerPoints).sort(
    (a, b) => (playerPoints[b] || 0) - (playerPoints[a] || 0)
  );
  const maxPoints = sorted.length > 0 ? playerPoints[sorted[0]] : 0;
  const winners = isFinished
    ? sorted.filter((p) => playerPoints[p] === maxPoints)
    : [];

  const now = new Date();
  const dateFormatted =
    existingIndex >= 0 && history[existingIndex].date
      ? history[existingIndex].date
      : now.toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        }) +
        " " +
        now.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit"
        });

  const matchData = {
    id: currentGameId,
    date: dateFormatted,
    rounds: rounds,
    totalRounds: rounds * 2,
    currentRoundNumber: currentRound,
    players: [...players],
    secondHalfDealerOffset: secondHalfDealerOffset,
    gameResults: JSON.parse(JSON.stringify(gameResults)),
    playerPoints: { ...playerPoints },
    status: isFinished ? "completed" : "in_progress",
    winners: winners
  };

  if (existingIndex >= 0) {
    history[existingIndex] = matchData;
  } else {
    history.unshift(matchData);
  }

  localStorage.setItem("gameHistory", JSON.stringify(history));
}

function resumeMatchFromHistory(matchId) {
  const history = getGameHistory();
  const match = history.find((m) => (m.id || "") === matchId);
  if (!match) {
    showAlert("No se encontró la partida en el historial.");
    return;
  }

  const doResume = () => {
    currentGameId = match.id;
    localStorage.setItem("currentGameId", currentGameId);
    localStorage.setItem("gameActive", "true");
    localStorage.setItem("players", JSON.stringify(match.players || []));
    localStorage.setItem("rounds", (match.rounds || 5).toString());
    localStorage.setItem(
      "secondHalfDealerOffset",
      (match.secondHalfDealerOffset || 0).toString()
    );
    localStorage.setItem("gameResults", JSON.stringify(match.gameResults || []));
    localStorage.setItem(
      "playerPoints",
      JSON.stringify(match.playerPoints || {})
    );

    restoreSavedGame();
    closeHistoryModal();
    showAlert(
      `Partida reanudada (${(match.players || []).join(", ")}). ¡A jugar!`
    );
  };

  if (
    players.length > 0 &&
    currentGameId &&
    currentGameId !== match.id &&
    localStorage.getItem("gameActive") === "true"
  ) {
    showConfirm(
      "Hay otra partida activa en la mesa. ¿Deseas cargar esta partida del historial?",
      () => doResume(),
      null,
      {
        title: "Cargar partida",
        confirmText: "Cargar",
        cancelText: "Cancelar",
        icon: "🔄"
      }
    );
  } else {
    doResume();
  }
}

function showHistoryModal() {
  const modal = document.getElementById("historyModal");
  if (!modal) return;

  modal.style.display = "flex";
  modal.style.alignItems = "center";
  updateHistoryModalContent();
}

function closeHistoryModal() {
  const modal = document.getElementById("historyModal");
  if (modal) modal.style.display = "none";
}

function setHistoryView(view) {
  currentHistoryView = view;
  const tabPodium = document.getElementById("tabHistoryPodium");
  const tabChart = document.getElementById("tabHistoryChart");
  const tabList = document.getElementById("tabHistoryList");
  const podiumView = document.getElementById("historyPodiumView");
  const chartView = document.getElementById("historyChartView");
  const listView = document.getElementById("historyListView");

  if (tabPodium) tabPodium.classList.toggle("active", view === "podium");
  if (tabChart) tabChart.classList.toggle("active", view === "chart");
  if (tabList) tabList.classList.toggle("active", view === "list");

  if (podiumView) podiumView.classList.toggle("hidden", view !== "podium");
  if (chartView) chartView.classList.toggle("hidden", view !== "chart");
  if (listView) listView.classList.toggle("hidden", view !== "list");

  updateHistoryModalContent();
}

function setChartMetric(metric) {
  currentChartMetric = metric;
  const btnWins = document.getElementById("metricWinsBtn");
  const btnPoints = document.getElementById("metricPointsBtn");

  if (metric === "wins") {
    if (btnWins) btnWins.classList.add("active");
    if (btnPoints) btnPoints.classList.remove("active");
  } else {
    if (btnWins) btnWins.classList.remove("active");
    if (btnPoints) btnPoints.classList.add("active");
  }

  renderHistoryChart();
}

function updateHistoryModalContent() {
  if (currentHistoryView === "podium") {
    renderHistoryPodium();
  } else if (currentHistoryView === "chart") {
    renderHistoryChart();
  } else {
    renderHistoryList();
  }
}

function renderHistoryPodium() {
  const container = document.getElementById("podiumViewContent");
  if (!container) return;

  const history = getGameHistory();

  if (history.length === 0) {
    container.innerHTML = `<div class="empty-history-box">No hay partidas registradas aún.<br>Al jugar se registrarán las medallas y las estadísticas aquí.</div>`;
    return;
  }

  // 1. Calcular podio de medallas (Victorias en partidas completadas)
  const winsCount = {};
  history.forEach((m) => {
    if (Array.isArray(m.winners) && m.winners.length > 0) {
      m.winners.forEach((w) => {
        winsCount[w] = (winsCount[w] || 0) + 1;
      });
    }
  });

  const winnersRanking = Object.entries(winsCount)
    .sort((a, b) => b[1] - a[1]);

  // 2. Calcular medallero inverso "Rey Rata" (apuestas 0 en todas las partidas)
  const zeroBetsTotal = {};
  history.forEach((m) => {
    if (Array.isArray(m.gameResults)) {
      m.gameResults.forEach((roundData) => {
        if (Array.isArray(roundData.results)) {
          roundData.results.forEach((r) => {
            if (r.bet === 0) {
              zeroBetsTotal[r.player] = (zeroBetsTotal[r.player] || 0) + 1;
            }
          });
        }
      });
    }
  });

  const ratRanking = Object.entries(zeroBetsTotal)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  // Armar Podio Olímpico de Campeones
  let podiumHtml = "";
  if (winnersRanking.length === 0) {
    podiumHtml = `<div class="empty-history-box" style="padding: 14px 0;">Aún no hay partidas finalizadas con ganador registrado.</div>`;
  } else {
    const first = winnersRanking[0] || null;
    const second = winnersRanking[1] || null;
    const third = winnersRanking[2] || null;

    podiumHtml = `
      <div class="olympic-podium">
        <!-- 2do Puesto -->
        <div class="podium-step second">
          ${second ? `
            <div class="podium-step-avatar">🥈</div>
            <div class="podium-step-name" title="${second[0]}">${second[0]}</div>
            <div class="podium-step-score">${second[1]} ${second[1] === 1 ? "victoria" : "victorias"}</div>
            <div class="podium-pillar">2</div>
          ` : `
            <div class="podium-step-avatar" style="opacity: 0.3;">🥈</div>
            <div class="podium-step-score">-</div>
            <div class="podium-pillar" style="opacity: 0.3;">2</div>
          `}
        </div>

        <!-- 1er Puesto -->
        <div class="podium-step first">
          ${first ? `
            <div class="podium-step-avatar">👑🥇</div>
            <div class="podium-step-name" title="${first[0]}">${first[0]}</div>
            <div class="podium-step-score">${first[1]} ${first[1] === 1 ? "victoria" : "victorias"}</div>
            <div class="podium-pillar">1</div>
          ` : `
            <div class="podium-step-avatar" style="opacity: 0.3;">🥇</div>
            <div class="podium-step-score">-</div>
            <div class="podium-pillar" style="opacity: 0.3;">1</div>
          `}
        </div>

        <!-- 3er Puesto -->
        <div class="podium-step third">
          ${third ? `
            <div class="podium-step-avatar">🥉</div>
            <div class="podium-step-name" title="${third[0]}">${third[0]}</div>
            <div class="podium-step-score">${third[1]} ${third[1] === 1 ? "victoria" : "victorias"}</div>
            <div class="podium-pillar">3</div>
          ` : `
            <div class="podium-step-avatar" style="opacity: 0.3;">🥉</div>
            <div class="podium-step-score">-</div>
            <div class="podium-pillar" style="opacity: 0.3;">3</div>
          `}
        </div>
      </div>
    `;
  }

  // Armar Medallero Inverso "Rey Rata"
  let ratHtml = "";
  if (ratRanking.length === 0) {
    ratHtml = `<div class="empty-history-box" style="padding: 10px 0;">🧀 ¡Nadie apostó 0 todavía! No hay ratas en el historial.</div>`;
  } else {
    const kingRat = ratRanking[0];
    const secondRat = ratRanking[1] || null;
    const thirdRat = ratRanking[2] || null;

    let runnersHtml = "";
    if (secondRat || thirdRat) {
      runnersHtml = `
        <div class="rat-runners-grid">
          ${secondRat ? `
            <div class="rat-runner-card">
              <span class="rat-runner-badge">🥈🐀</span>
              <div class="rat-runner-info">
                <span class="rat-runner-name" title="${secondRat[0]}">${secondRat[0]}</span>
                <span class="rat-runner-stats">${secondRat[1]} veces dijo 0</span>
              </div>
            </div>
          ` : `<div></div>`}
          ${thirdRat ? `
            <div class="rat-runner-card">
              <span class="rat-runner-badge">🥉🐀</span>
              <div class="rat-runner-info">
                <span class="rat-runner-name" title="${thirdRat[0]}">${thirdRat[0]}</span>
                <span class="rat-runner-stats">${thirdRat[1]} veces dijo 0</span>
              </div>
            </div>
          ` : `<div></div>`}
        </div>
      `;
    }

    ratHtml = `
      <div class="rat-king-card">
        <div class="rat-king-badge">👑🐀</div>
        <div class="rat-king-info">
          <span class="rat-king-title">Gran Rey Rata</span>
          <span class="rat-king-name">${kingRat[0]}</span>
          <span class="rat-king-stats">${kingRat[1]} veces apostó 0 en total</span>
        </div>
      </div>
      ${runnersHtml}
    `;
  }

  container.innerHTML = `
    <div class="podium-view-container">
      <div class="podium-section-block">
        <div class="podium-section-title">🏆 Podio de Campeones</div>
        <div class="podium-section-subtitle">Top 3 con más partidas ganadas</div>
        ${podiumHtml}
      </div>

      <div class="rat-section-container">
        <div class="podium-section-title" style="color: #fbbf24;">🐀 Medallero Inverso: Las Más Ratas</div>
        <div class="podium-section-subtitle">Los que más veces apostaron 0 en todas las partidas</div>
        ${ratHtml}
      </div>
    </div>
  `;
}

function renderHistoryChart() {
  const canvas = document.getElementById("historyPieCanvas");
  const legend = document.getElementById("chartLegend");
  if (!canvas || !legend) return;

  const history = getGameHistory();
  const ctx = canvas.getContext("2d");

  const dpr = window.devicePixelRatio || 1;
  const size = 240;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  if (ctx.resetTransform) ctx.resetTransform();
  else ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);

  legend.innerHTML = "";

  if (history.length === 0) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.38, 0, Math.PI * 2);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 18;
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 13px Manrope, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Sin datos", size / 2, size / 2);

    legend.innerHTML = `<div class="empty-history-box" style="grid-column: 1 / -1;">No hay partidas registradas aún.<br>Al completar una partida se guardarán las estadísticas automáticamente.</div>`;
    return;
  }

  const playerStats = {};

  history.forEach((match) => {
    if (currentChartMetric === "wins") {
      if (Array.isArray(match.winners)) {
        match.winners.forEach((w) => {
          playerStats[w] = (playerStats[w] || 0) + 1;
        });
      }
    } else {
      if (match.points) {
        Object.entries(match.points).forEach(([player, pts]) => {
          playerStats[player] = (playerStats[player] || 0) + pts;
        });
      }
    }
  });

  const playerEntries = Object.entries(playerStats)
    .filter(([_, val]) => val > 0)
    .sort((a, b) => b[1] - a[1]);

  const totalValue = playerEntries.reduce((sum, [_, val]) => sum + val, 0);

  if (totalValue === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 13px Manrope, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Sin valores > 0", size / 2, size / 2);
    legend.innerHTML = `<div class="empty-history-box" style="grid-column: 1 / -1;">No hay puntajes positivos acumulados para graficar.</div>`;
    return;
  }

  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size * 0.42;
  const innerRadius = size * 0.25;

  let currentAngle = -Math.PI / 2;

  playerEntries.forEach(([player, val], index) => {
    const sliceAngle = (val / totalValue) * (Math.PI * 2);
    const endAngle = currentAngle + sliceAngle;
    const color = CHART_PALETTE[index % CHART_PALETTE.length];

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, currentAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, currentAngle, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.stroke();

    currentAngle = endAngle;

    const percent = Math.round((val / totalValue) * 100);
    const unitLabel =
      currentChartMetric === "wins"
        ? val === 1
          ? "victoria"
          : "victorias"
        : "pts";

    const item = document.createElement("div");
    item.className = "chart-legend-item";
    item.innerHTML = `
      <div class="chart-legend-color" style="background-color: ${color};"></div>
      <span class="chart-legend-name" title="${player}">${player}</span>
      <span class="chart-legend-val">${val} ${unitLabel} <span style="font-weight: normal; opacity: 0.7;">(${percent}%)</span></span>
    `;
    legend.appendChild(item);
  });

  ctx.fillStyle = "#f8fafc";
  ctx.font = "800 16px Manrope, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(totalValue, centerX, centerY - 6);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 10px Manrope, sans-serif";
  ctx.fillText(
    currentChartMetric === "wins" ? "VICTORIAS" : "PUNTOS",
    centerX,
    centerY + 12
  );
}

function renderHistoryList() {
  const container = document.getElementById("historyMatchesList");
  if (!container) return;

  const history = getGameHistory();
  container.innerHTML = "";

  if (history.length === 0) {
    container.innerHTML = `<div class="empty-history-box">No hay partidas registradas aún.<br>Cuando juegues una partida se listará aquí.</div>`;
    return;
  }

  history.forEach((match, index) => {
    const card = document.createElement("div");
    card.className = "history-match-card";

    const matchTotalRounds = match.totalRounds || (match.rounds ? match.rounds * 2 : 10);
    const roundsPlayed = match.gameResults ? match.gameResults.length : 0;
    const isFinished = match.status === "completed" || roundsPlayed >= matchTotalRounds;

    const winnersList = Array.isArray(match.winners) ? match.winners : [];
    const winnersText =
      winnersList.length > 0 ? winnersList.join(", ") : "En juego...";

    const pointsMap = match.playerPoints || match.points || {};
    const sortedPlayers = Object.keys(pointsMap).sort(
      (a, b) => (pointsMap[b] || 0) - (pointsMap[a] || 0)
    );

    let playersChipsHtml = "";
    sortedPlayers.forEach((p) => {
      const isWinner = isFinished && winnersList.includes(p);
      const pts = pointsMap[p];
      playersChipsHtml += `<span class="history-player-chip ${
        isWinner ? "is-winner" : ""
      }">${isWinner ? "👑 " : ""}${p}: ${pts} pts</span>`;
    });

    const matchNumber = history.length - index;
    const matchId = match.id || `match_${index}`;

    card.innerHTML = `
      <div class="history-match-header">
        <div class="history-match-info">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span><b>Partida #${matchNumber}</b> • ${match.date || ""}</span>
            <span class="match-status-badge ${isFinished ? "completed" : "in-progress"}">
              ${isFinished ? "✓ Finalizada" : `⏳ Ronda ${roundsPlayed + 1} de ${matchTotalRounds}`}
            </span>
          </div>
          <span class="history-match-rounds">${match.rounds || "?"} rondas (${matchTotalRounds} manos)</span>
        </div>
        <div class="history-match-actions">
          ${!isFinished ? `
            <button class="resume-match-btn" title="Reanudar esta partida">▶ Reanudar</button>
          ` : ""}
          <button class="delete-match-btn" title="Eliminar partida #${matchNumber}" aria-label="Eliminar partida">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="history-match-winner">
        <span>${isFinished ? "🏆 Ganador:" : "⚡ Líder:"}</span> <b>${winnersText}</b>
      </div>
      <div class="history-match-players">
        ${playersChipsHtml}
      </div>
    `;

    const resumeBtn = card.querySelector(".resume-match-btn");
    if (resumeBtn) {
      resumeBtn.onclick = () => resumeMatchFromHistory(matchId);
    }

    const deleteBtn = card.querySelector(".delete-match-btn");
    if (deleteBtn) {
      deleteBtn.onclick = () => promptDeleteMatch(matchId, matchNumber);
    }

    container.appendChild(card);
  });
}

function promptDeleteMatch(matchId, matchNumber) {
  showConfirm(
    `¿Querés eliminar la Partida #${matchNumber} del historial? Esta acción no se puede deshacer.`,
    () => {
      deleteMatchFromHistory(matchId);
    },
    null,
    {
      title: "Eliminar partida",
      confirmText: "Sí, eliminar",
      cancelText: "Cancelar",
      icon: "🗑️"
    }
  );
}

function deleteMatchFromHistory(matchId) {
  let history = getGameHistory();
  history = history.filter((m, idx) => (m.id || `match_${idx}`) !== matchId);
  localStorage.setItem("gameHistory", JSON.stringify(history));
  updateHistoryModalContent();
  showAlert("La partida ha sido eliminada del historial.");
}

function promptClearHistory() {
  const history = getGameHistory();
  if (history.length === 0) {
    showAlert("El historial ya está vacío.");
    return;
  }

  showConfirm(
    "¿Estás seguro de que querés borrar todo el historial de partidas guardadas? Esta acción no se puede deshacer.",
    () => {
      localStorage.removeItem("gameHistory");
      updateHistoryModalContent();
      showAlert("El historial de partidas se ha borrado correctamente.");
    },
    null,
    {
      title: "Borrar Historial",
      confirmText: "Sí, borrar",
      cancelText: "Cancelar",
      icon: "🗑️"
    }
  );
}

function clearGameState() {
  stopConfetti();
  // Limpiar variables
  players = [];
  rounds = 0;
  currentRound = 1;
  currentBettorIndex = 0;
  currentRoundBets = [];
  currentRoundResults = [];
  currentRoundLosers = [];
  currentRoundLoserScores = {};
  tableRows = [];
  playerPoints = {};
  lastDealerIndex = -1;
  secondHalfDealerOffset = 0;
  gameResults = [];
  currentGameSavedToHistory = false;
  currentGameId = null;

  // Limpiar almacenamiento local
  localStorage.removeItem("players");
  localStorage.removeItem("rounds");
  localStorage.removeItem("secondHalfDealerOffset");
  localStorage.removeItem("gameResults");
  localStorage.removeItem("playerPoints");
  localStorage.removeItem("gameActive");
  localStorage.removeItem("currentGameSavedToHistory");
  localStorage.removeItem("currentGameId");

  // Resetear la interfaz
  document.getElementById("selectedPlayers").innerHTML = "";
  document.getElementById("playersHeader").innerHTML = "";
  document.getElementById("gameRounds").innerHTML = "";
  document.getElementById("mainTableContainer").classList.add("hidden");
  document.getElementById("correctButton").classList.add("hidden");
  document.getElementById("historyButton").classList.add("hidden");
  document.getElementById("resetButton").classList.add("hidden");

  setPlayerMode("classic");
}

function restoreSavedGame() {
  try {
    currentGameId = localStorage.getItem("currentGameId") || ("game_" + Date.now());
    localStorage.setItem("currentGameId", currentGameId);
    players = JSON.parse(localStorage.getItem("players") || "[]");
    rounds = parseInt(localStorage.getItem("rounds") || "0", 10);
    secondHalfDealerOffset = parseInt(localStorage.getItem("secondHalfDealerOffset") || "0", 10);
    const storedGameResults = localStorage.getItem("gameResults");
    gameResults = storedGameResults ? JSON.parse(storedGameResults) : [];

    // Inicializar puntos en 0
    playerPoints = {};
    players.forEach((p) => {
      playerPoints[p] = 0;
    });

    // Ocultar modales y pantallas previas
    document.getElementById("welcomeScreen").style.display = "none";
    document.getElementById("playersModal").style.display = "none";
    document.getElementById("roundsModal").style.display = "none";
    document.getElementById("dealerWarningModal").style.display = "none";
    document.getElementById("podiumModal").style.display = "none";

    // Generar la tabla de juego limpia
    generateGameTable();

    // Reconstruir rondas completadas
    gameResults.forEach((roundData, roundIndex) => {
      const row = tableRows[roundIndex];
      if (!row) return;

      roundData.results.forEach((res) => {
        const playerIndex = players.indexOf(res.player);
        if (playerIndex === -1) return;

        const betCellIndex = playerIndex * 2;
        const resultCellIndex = betCellIndex + 1;

        row[betCellIndex].innerText = res.bet;

        const prevPoints = playerPoints[res.player];
        let roundPoints = 0;
        if (res.result === 0) {
          roundPoints = 10 + res.bet;
          row[resultCellIndex].innerHTML = `<span class="score-accum">${prevPoints}</span><span class="score-delta positive">+${roundPoints}</span>`;
          playerPoints[res.player] += roundPoints;
        } else {
          roundPoints = res.result;
          row[resultCellIndex].innerHTML = `<span class="score-accum">${prevPoints}</span><span class="score-delta negative">${roundPoints}</span>`;
          playerPoints[res.player] += roundPoints;
        }
      });
    });

    // Restaurar puntos guardados si existieron correcciones manuales
    const savedPlayerPoints = localStorage.getItem("playerPoints");
    if (savedPlayerPoints) {
      try {
        const parsedPoints = JSON.parse(savedPlayerPoints);
        if (parsedPoints && typeof parsedPoints === "object") {
          playerPoints = parsedPoints;
        }
      } catch (e) {}
    }

    currentRound = gameResults.length + 1;
    updateTableHeader();
    updateRoundNumbers();
    showOnlyFirstShortButton();

    const totalRounds = rounds * 2;
    if (currentRound > totalRounds) {
      showPodium();
    }
  } catch (err) {
    console.error("Error al restaurar partida guardada:", err);
    showAlert("No se pudo restaurar la partida anterior. Se iniciará una nueva.");
    clearGameState();
    showWelcomeScreen();
  }
}

function resetGame() {
  showConfirm(
    "¿Vas a reiniciar la partida? ¿Ya terminó la anterior o andás cagoneando?",
    () => {
      clearGameState();
      showWelcomeScreen();
    },
    null,
    {
      title: "¿Reiniciar partida?",
      confirmText: "Sí, reiniciar",
      cancelText: "Cancelar",
      icon: "⚠️"
    }
  );
}

// Evento para detectar el intento de cerrar o recargar la página en navegadores compatibles (Desktop)
window.addEventListener("beforeunload", (event) => {
  if (players.length > 0 && rounds > 0 && localStorage.getItem("gameActive") === "true") {
    const warningMessage =
      "¿Estás seguro de que quieres salir? Se perderán los datos no guardados.";
    event.preventDefault();
    event.returnValue = warningMessage;
    return warningMessage;
  }
});

// Manejo de navegación "Atrás" (gesto en iPhone / Safari) con diálogo in-app
window.addEventListener("popstate", () => {
  if (players.length > 0 && rounds > 0 && localStorage.getItem("gameActive") === "true") {
    try {
      history.pushState({ inGame: true }, "");
    } catch (e) {}
    showConfirm(
      "¿Querés salir de la partida en curso?",
      () => {
        clearGameState();
        showWelcomeScreen();
      },
      null,
      {
        title: "Salir de la partida",
        confirmText: "Salir",
        cancelText: "Seguir jugando",
        icon: "⚠️"
      }
    );
  }
});

function showOnlyFirstShortButton() {
  const shortButtons = document.querySelectorAll("button.short");
  shortButtons.forEach((button, index) => {
    if (index === 0) {
      button.disabled = false;
    } else {
      button.disabled = true;
    }
  });
}
