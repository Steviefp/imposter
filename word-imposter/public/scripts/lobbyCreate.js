const socket = io();
let ROOM_CODE;
let NAME;
function createLobby() {
  const name = document.getElementById("name").value.trim();
  NAME = name;
  if (!name) {
    alert("Please enter your name.");
    return;
  }

  socket.emit("createRoom", name);
  socket.on("roomCreated", (roomCode) => {
    document.getElementById("roomCode").textContent = roomCode;
    ROOM_CODE = roomCode;
    socket.emit("joinRoom", { roomCode, name, host: true });
  });
}

let mySocketID = null;

socket.on("yourID", (id) => {
  mySocketID = id;
  console.log("My Socket ID:", mySocketID);
});

socket.on("uniqueNameError", (message) => {
  alert(message); // or display it in the UI however you want
});

const playerList = new PlayerListComponent();
let playerCount = 0;
socket.on("currentPlayers", (players) => {
  document.body.appendChild(playerList.getElement());
  playerList.updatePlayerList(players);
});

function startGame() {
  socket.emit("PlayerCheck", ROOM_CODE);
  socket.on("PlayerCheck", (playersReady) => {
    if (playersReady) {
      socket.emit("startGamePrepare", ROOM_CODE);
    } else {
      alert("Not enough players to start the game. Need at least 4 players.");
    }
  });
}
socket.on("yourID", (id) => {
  sessionStorage.setItem("socketID", id);
});
socket.on("startGamePrepare", () => {
  sessionStorage.setItem("roomCode", ROOM_CODE);
  sessionStorage.setItem("playerName", NAME);
  window.location.href = "/game.html";
});
