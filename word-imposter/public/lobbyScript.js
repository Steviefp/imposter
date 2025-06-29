const socket = io();

socket.emit("createRoom");

// display room code

let roomCode = generateUniqueRoomCode();
document.getElementById("roomCode").textContent = roomCode;

let mySocketID = null;

socket.on("yourID", (id) => {
  mySocketID = id;
  console.log("My Socket ID:", mySocketID);
});

socket.on("uniqueNameError", (message) => {
  alert(message); // or display it in the UI however you want
});