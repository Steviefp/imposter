const socket = io();

let NAME;
function joinRoom() {
  const name = document.getElementById("name").value.trim();
  NAME = name;
  if (!name) {
    alert("Please enter your name.");
    return;
  }

  const roomCode = document.getElementById("room").value.trim();
  if (!roomCode) {
    alert("Please enter a room code.");
    return;
  }

  socket.emit("joinRoom", { roomCode, name });
  socket.once("roomNotFound", (message) => {
    alert(message);
  });

  socket.once("uniqueNameError", (message) => {
    alert(message);
    return;
  });

  socket.once("joinedSuccessfully", () => {
    //joinLobby();
  });
}

function joinLobby() {
  alert("Successfully joined the room!");
}

const playerList = new PlayerListComponent();

socket.on("currentPlayers", (players) => {
  document.body.appendChild(playerList.getElement());
  playerList.updatePlayerList(players);
});

socket.on("yourID", (id) => {
  sessionStorage.setItem("socketID", id);
});

socket.on("startGamePrepare", () => {
  roomCode = document.getElementById("room").value.trim();
  sessionStorage.setItem("roomCode", roomCode);
  sessionStorage.setItem("playerName", NAME);
  window.location.href = "/game.html";
});
