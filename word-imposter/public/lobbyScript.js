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
