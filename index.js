let players = [];
let rounds = 0;
let currentRound = 1;
let currentBettorIndex = 0;
let currentRoundBets = [];
let currentRoundResults = [];
let tableRows = [];
let playerPoints = {};
let lastDealerIndex = -1;

// Al cargar la página
document.addEventListener("DOMContentLoaded", (event) => {
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

function showWelcomeScreen() {
  document.getElementById("welcomeScreen").style.display = "flex";
}

function continueFromWelcome() {
  document.getElementById("welcomeScreen").style.display = "none";
  showPlayersModal();
}

function showPlayersModal() {
  document.getElementById("playersModal").style.display = "block";
}

function selectPlayer(player) {
  if (!players.includes(player)) {
    players.push(player);
    updateSelectedPlayers();
  } else {
    alert(`${player} ya ha sido seleccionado.`);
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
    document.getElementById("customPlayerName").value = "";
  } else if (players.includes(customPlayerName)) {
    alert(`${customPlayerName} ya ha sido seleccionado.`);
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
    alert("Debe seleccionar al menos un jugador.");
  }
}

function showRoundsModal() {
  document.getElementById("roundsModal").style.display = "block";
}

function selectRounds(selectedRounds) {
  rounds = selectedRounds;
  localStorage.setItem("rounds", rounds);
  document.getElementById("roundsModal").style.display = "none";
  generateGameTable();
}

function generateGameTable() {
  const tableContainer = document.getElementById("mainTableContainer");
  const playersHeader = document.getElementById("playersHeader");
  const gameRounds = document.getElementById("gameRounds");

  playersHeader.innerHTML = "";
  gameRounds.innerHTML = "";

  players.forEach((player) => {
    const th = document.createElement("th");
    th.innerText = player;
    playersHeader.appendChild(th);
  });

  tableRows = [];
  const totalRounds = rounds * 2;
  for (let i = 1; i <= totalRounds; i++) {
    addRoundRow(i);
  }

  tableContainer.classList.remove("hidden");

  // Mostrar el botón "Corregir" cuando se genera la tabla
  document.getElementById("correctButton").classList.remove("hidden");
}

function addRoundRow(roundNumber) {
  const tr = document.createElement("tr");
  const row = [];

  // Identificar al jugador que reparte en esta ronda
  let dealerIndex = (roundNumber - 1) % players.length;
  while (dealerIndex === lastDealerIndex) {
    dealerIndex = Math.floor(Math.random() * players.length);
  }
  lastDealerIndex = dealerIndex;

  players.forEach((player, playerIndex) => {
    const td = document.createElement("td");
    if (playerIndex === dealerIndex) {
      td.innerHTML = `<button onclick="startBetting(${roundNumber}, ${dealerIndex})">Dar</button>`;
    }
    tr.appendChild(td);
    row.push(td);
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

  const effectiveRound = ((currentRound - 1) % rounds) + 1; // Ajustar la ronda efectiva
  let startingIndex = (dealerIndex + 1) % players.length;

  // Función para mostrar la pregunta de apuesta para el jugador actual
  const askForBet = () => {
    bettingContent.innerHTML = `<p><b>${players[startingIndex]}</b>, ¿cuántas cartas quieres apostar en la ronda ${currentRound}?</p>`;
    for (let i = 0; i <= effectiveRound; i++) {
      const betButton = document.createElement("button");
      betButton.innerText = i;
      betButton.onclick = () => confirmBet(i, dealerIndex);
      bettingContent.appendChild(betButton);
    }
  };

  // Mostrar la pregunta de apuesta para el jugador inicial
  askForBet();

  // Función para avanzar al siguiente jugador y mostrar su pregunta de apuesta
  const nextPlayer = () => {
    startingIndex = (startingIndex + 1) % players.length;
    if (startingIndex === dealerIndex) {
      startingIndex = (startingIndex + 1) % players.length; // Saltar al siguiente jugador después del repartidor
    }
    askForBet();
  };

  bettingModal.style.display = "block";

  // Llamar a nextPlayer después de confirmar la apuesta del jugador actual
  const confirmBet = (bet, dealerIndex) => {
    currentRoundBets.push(bet);

    if (currentBettorIndex === players.length - 1) {
      const totalBets = currentRoundBets.reduce((a, b) => a + b, 0);
      if (totalBets === currentRound) {
        alert(`No se puede apostar: ${bet}. Debe desempatar.`);
        currentRoundBets.pop();
        return;
      }
    }

    currentBettorIndex++;

    if (currentBettorIndex < players.length - 1) {
      // Asegurarse de que el dealer sea el último
      nextPlayer();
    } else if (currentBettorIndex === players.length - 1) {
      startingIndex = dealerIndex; // El dealer es el último en apostar
      askForBet();
    } else {
      document.getElementById("bettingModal").style.display = "none";
      askForRoundResults();
    }
  };
}

function askForRoundResults() {
  const resultsModal = document.getElementById("resultsModal");
  const resultsContent = document.getElementById("resultsContent");

  const effectiveRound = ((currentRound - 1) % rounds) + 1; // Ajustar la ronda efectiva

  resultsContent.innerHTML = `<p>¿Quién perdió y por cuánto en la ronda ${currentRound}?</p>`;
  players.forEach((player, index) => {
    const playerResultDiv = document.createElement("div");
    playerResultDiv.innerHTML = `<p>${player}</p>`;
    for (let i = -effectiveRound; i <= 0; i++) {
      const resultButton = document.createElement("button");
      resultButton.innerText = i === 0 ? "Ganó" : i;
      resultButton.onclick = (event) => confirmResult(player, i, event);
      playerResultDiv.appendChild(resultButton);
    }
    resultsContent.appendChild(playerResultDiv);
  });

  resultsModal.style.display = "block";
}

function confirmResult(player, result, event) {
  const playerIndex = players.indexOf(player);
  currentRoundResults[playerIndex] = result;

  // Deshabilitar los botones después de la selección
  const playerResultDiv = event.target.parentElement;
  Array.from(playerResultDiv.children).forEach(
    (button) => (button.disabled = true)
  );

  // Verificar si todos los resultados están ingresados
  if (currentRoundResults.every((r) => r !== null)) {
    updateTableWithResults();
    closeResultsModal();
  }
}

function closeResultsModal() {
  document.getElementById("resultsModal").style.display = "none";
}

function updateTableWithResults() {
  const roundRowIndex = currentRound - 1;
  tableRows[roundRowIndex].forEach((cell, index) => {
    const result = currentRoundResults[index];

    if (result === 0) {
      cell.innerHTML = `<span>${10 + currentRoundBets[index]}</span>`;
      playerPoints[players[index]] += 10 + currentRoundBets[index];
    } else {
      cell.innerHTML = `<span>${result}</span>`;
      playerPoints[players[index]] += result;
    }
  });

  updateTableHeader();

  // Verificar si todas las rondas han sido completadas
  const totalRounds = rounds * 2;
  if (currentRound === totalRounds) {
    showPodium();
  }
}

function showPodium() {
  const podiumModal = document.getElementById("podiumModal");
  const podiumContent = document.getElementById("podiumContent");

  // Ordenar los jugadores por puntaje de mayor a menor
  const sortedPlayers = Object.keys(playerPoints).sort(
    (a, b) => playerPoints[b] - playerPoints[a]
  );

  // Generar el contenido del podio
  podiumContent.innerHTML = "";
  sortedPlayers.forEach((player, index) => {
    const playerDiv = document.createElement("div");
    playerDiv.innerText = `${index + 1}. ${player} (${
      playerPoints[player]
    } puntos)`;
    podiumContent.appendChild(playerDiv);
  });

  podiumModal.style.display = "block";
}

function closePodiumModal() {
  document.getElementById("podiumModal").style.display = "none";
}

function updateTableHeader() {
  const playersHeader = document.getElementById("playersHeader");
  playersHeader.innerHTML = "";

  players.forEach((player) => {
    const th = document.createElement("th");
    th.innerText = `${player} (${playerPoints[player]})`;
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

  document.getElementById("correctionModal").style.display = "block";
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
    alert(
      `Se han ${correctionPoints >= 0 ? "asignado" : "restado"} ${Math.abs(
        correctionPoints
      )} puntos a ${selectedPlayer}.`
    );
    closeCorrectionModal();
  } else {
    alert("Por favor, ingrese un valor numérico válido.");
  }
}
