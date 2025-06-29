const socket = io();

function createGame() {
  const name = document.getElementById("name").value.trim();
  if (!name) {
    alert("Please enter your name.");
    return;
  }


  socket.emit("createRoom", name);
  socket.on("roomCreated", (roomCode) => {
    document.getElementById("roomCode").textContent = roomCode;
    socket.emit("joinRoom", { roomCode, name , host: true });
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

socket.on("currentPlayers", (players) => {
  document.body.appendChild(playerList.getElement());
  playerList.updatePlayerList(players);
});
