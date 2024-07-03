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
  document.getElementById("playersModal").style.display = "flex";
  document.getElementById("playersModal").style.alignItems = "center";
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
  document.getElementById("roundsModal").style.display = "flex";
  document.getElementById("roundsModal").style.alignItems = "center";
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
    // Celda de apuestas
    const betsTd = document.createElement("td");
    betsTd.classList.add("bets-cell");
    row.push(betsTd);
    tr.appendChild(betsTd);

    // Celda de resultados
    const resultsTd = document.createElement("td");
    if (playerIndex === dealerIndex) {
      resultsTd.innerHTML = `<button onclick="startBetting(${roundNumber}, ${dealerIndex})">Dar</button>`;
    }
    row.push(resultsTd);
    tr.appendChild(resultsTd);
  });

  tableRows.push(row);
  document.getElementById("gameRounds").appendChild(tr);
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
    // Celda de apuestas
    const betsTd = document.createElement("td");
    betsTd.classList.add("bets-cell");
    row.push(betsTd);
    tr.appendChild(betsTd);

    // Celda de resultados
    const resultsTd = document.createElement("td");
    if (playerIndex === dealerIndex) {
      resultsTd.innerHTML = `<button onclick="startBetting(${roundNumber}, ${dealerIndex})">Dar</button>`;
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

  const effectiveRound = ((currentRound - 1) % rounds) + 1; // Ajustar la ronda efectiva
  let startingIndex = (dealerIndex + 1) % players.length;

  // Función para mostrar la pregunta de apuesta para el jugador actual
  const askForBet = () => {
    bettingContent.innerHTML = `<p><b class="player">${
      players[startingIndex]
    }</b><br><br>¿Cuántas cartas querés apostar en la ronda ${currentRound}?
    ${
      currentRoundBets.length
        ? `<br><br>Apostados hasta el momento: ${currentRoundBets}</p>`
        : ""
    }`;
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

  bettingModal.style.display = "flex";
  bettingModal.style.alignItems = "center";

  // Llamar a nextPlayer después de confirmar la apuesta del jugador actual
  const confirmBet = (bet, dealerIndex) => {
    currentRoundBets.push(bet);

    if (currentBettorIndex === players.length - 1) {
      const totalBets = currentRoundBets.reduce((a, b) => a + b, 0);
      if (totalBets === currentRound) {
        alert(`No se puede apostar: ${bet}. Tiene que aprenderse las reglas.`);
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
    playerResultDiv.innerHTML = `<p><b class="player">${player}</b></p>`;
    for (let i = -effectiveRound; i <= 0; i++) {
      const resultButton = document.createElement("button");
      resultButton.innerText = i === 0 ? "Ganó" : i;
      resultButton.onclick = (event) => confirmResult(player, i, event);
      playerResultDiv.appendChild(resultButton);
    }
    resultsContent.appendChild(playerResultDiv);
  });

  resultsModal.style.display = "flex";
  resultsModal.style.alignItems = "center";
}

function confirmResult(player, result, event) {
  const playerIndex = players.indexOf(player);
  currentRoundResults[playerIndex] = result;

  // Deshabilitar los botones después de la selección
  const playerResultDiv = event.target.parentElement;
  const buttons = Array.from(playerResultDiv.children);

  buttons.forEach((button) => {
    button.disabled = true;
  });

  // Verificar si todos los resultados están ingresados
  if (currentRoundResults.every((r) => r !== null)) {
    // Verificar si todos los jugadores han seleccionado "Ganó"
    const allWinners = currentRoundResults.every((r) => r === 0);
    if (allWinners) {
      alert(
        "Todos los jugadores pusieron que ganaron. No se hagan los boludos que alguno tuvo que perder."
      );
      // Reiniciar los botones para que los jugadores puedan elegir de nuevo
      buttons.forEach((button) => {
        button.disabled = false;
      });
      return; // Evitar cerrar el modal si todos han seleccionado "Ganó"
    }

    updateTableWithResults();
    closeResultsModal();
  } else {
    // Verificar si se han seleccionado solo "Ganó"
    const onlyWinners = currentRoundResults.every((r) => r === 0);
    if (onlyWinners) {
      alert("Debe seleccionar al menos un jugador como perdedor.");
      // Reiniciar los botones para que los jugadores puedan elegir de nuevo
      buttons.forEach((button) => {
        button.disabled = false;
      });
    }
  }
}

function closeResultsModal() {
  document.getElementById("resultsModal").style.display = "none";
}

function updateTableWithResults() {
  const roundRowIndex = currentRound - 1;
  const row = tableRows[roundRowIndex];

  players.forEach((player, index) => {
    const betCellIndex = index * 2;
    const resultCellIndex = betCellIndex + 1;

    // Actualizar celda de apuestas
    row[betCellIndex].innerText = currentRoundBets[index];

    // Actualizar celda de resultados
    const result = currentRoundResults[index];
    if (result === 0) {
      row[resultCellIndex].innerHTML = `<span>${
        10 + currentRoundBets[index]
      }</span>`;
      playerPoints[player] += 10 + currentRoundBets[index];
    } else {
      row[resultCellIndex].innerHTML = `<span class="${
        result < 0 ? "negative" : ""
      }">${result}</span>`;
      playerPoints[player] += result;
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

  podiumModal.style.display = "flex";
  podiumModal.style.alignItems = "center";
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
