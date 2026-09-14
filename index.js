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
    confirmBtn.className = "custom-dialog-btn danger";
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

// Al cargar la página
document.addEventListener("DOMContentLoaded", (event) => {
  const storedGameResults = localStorage.getItem("gameResults");
  if (storedGameResults) {
    gameResults = JSON.parse(storedGameResults);
  }
  renderPlayerButtons();
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

  // Mostrar el botón "Corregir" cuando se genera la tabla
  document.getElementById("correctButton").classList.remove("hidden");
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
    btn.innerHTML = `${player} <span style="font-size: 11px; opacity: 0.75;">(${playerBet})</span>`;
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

function showCorrectionModal() {
  const correctionPlayerSelect = document.getElementById(
    "correctionPlayerSelect"
  );
  correctionPlayerSelect.innerHTML = "";

  players.forEach((player) => {
    const option = document.createElement("option");
    option.value = player;
    option.innerText = player;
    correctionPlayerSelect.appendChild(option);
  });

  document.getElementById("correctionModal").style.display = "flex";
  document.getElementById("correctionModal").style.alignItems = "center";
}

function closeCorrectionModal() {
  document.getElementById("correctionModal").style.display = "none";
}

function applyCorrection() {
  const selectedPlayer = document.getElementById("correctionPlayerSelect")
    .value;
  const correctionPoints = parseInt(
    document.getElementById("correctionPoints").value,
    10
  );

  if (!isNaN(correctionPoints)) {
    playerPoints[selectedPlayer] += correctionPoints;
    updateTableHeader(); // Actualiza la cabecera con los nuevos puntos
    showAlert(
      `Se han ${correctionPoints >= 0 ? "sumado" : "restado"} ${Math.abs(
        correctionPoints
      )} puntos a ${selectedPlayer}.`,
      () => {
        closeCorrectionModal();
      }
    );
  } else {
    showAlert("Por favor, ingrese un valor numérico válido.");
  }
}

function resetGame() {
  showConfirm(
    "¿Vas a reiniciar la partida? ¿Ya terminó la anterior o andás cagoneando?",
    () => {
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

      // Limpiar almacenamiento local
      localStorage.removeItem("players");
      localStorage.removeItem("rounds");
      localStorage.removeItem("gameResults");

      // Resetear la interfaz
      document.getElementById("selectedPlayers").innerHTML = "";
      document.getElementById("playersHeader").innerHTML = "";
      document.getElementById("gameRounds").innerHTML = "";
      document.getElementById("mainTableContainer").classList.add("hidden");
      document.getElementById("correctButton").classList.add("hidden");
      document.getElementById("resetButton").classList.add("hidden");

      setPlayerMode("classic");

      // Volver a mostrar la pantalla de bienvenida
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

// Evento para detectar el intento de cerrar o recargar la página
window.addEventListener("beforeunload", (event) => {
  // Mensaje de advertencia
  const warningMessage =
    "¿Estás seguro de que quieres salir? Se perderán los datos no guardados.";

  // Establece el mensaje de advertencia
  event.preventDefault();
  event.returnValue = warningMessage;
  return warningMessage;
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
