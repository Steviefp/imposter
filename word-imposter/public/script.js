const socket = io();
let roomCode = "";

let mySocketID = null;

socket.on("yourID", (id) => {
  mySocketID = id;
  console.log("My Socket ID:", mySocketID);
});

socket.on("uniqueNameError", (message) => {
  alert(message); // or display it in the UI however you want
});



function joinRoom() {
  const name = document.getElementById("name").value;
  roomCode = document.getElementById("room").value;
  socket.emit("joinRoom", { name, roomCode });
}

socket.on("joinedSuccessfully", () => {
  document.getElementById("lobby").style.display = "none";
  document.getElementById("game").style.display = "block";
});

socket.on("gameStart", ({ word, isImposter, players, genre }) => {
  document.getElementById("role").textContent = isImposter
    ? "You're the Imposter!"
    : "You're not the Imposter.";
  document.getElementById("role").classList.remove("imposter", "notImposter");
  document
    .getElementById("role")
    .classList.add(isImposter ? "imposter" : "notImposter");
  document.getElementById("wordDisplay").textContent = word
    ? `The Genre is: ${genre} and the word is: ${word}`
    : `The Genre is: ${genre}`;
});

function sendClue() {
  const clue = document.getElementById("clue").value;
  socket.emit("submitClue", { roomCode, clue });
}

socket.on("showClues", (clues) => {
  document.getElementById("clueSection").style.display = "none";
  const container = document.getElementById("clues");
  container.innerHTML = "<h3>Clues:</h3>";
  clues.forEach((c) => {
    container.innerHTML += `<p>${c.name}: ${c.clue}</p>`;
  });

  const voteSection = document.getElementById("voteSection");
  voteSection.style.display = "block";
  voteSection.innerHTML = "<h3>Vote who is the Imposter:</h3>";
  clues.forEach((c) => {
    if(mySocketID === c.id) return; // Don't show button for self
    
    // Create a button for each player to vote
    const btn = document.createElement("button");
    btn.textContent = c.name;
    btn.onclick = () => {
      // Emit vote
      socket.emit("vote", { roomCode, votedId: c.id });

      // Hide all buttons
      const allButtons = voteSection.querySelectorAll("button");
      allButtons.forEach((b) => (b.style.display = "none"));

      // Show confirmation message
      const msg = document.createElement("h4");
      msg.textContent = `You have chosen ${c.name}.`;
      voteSection.appendChild(msg);
    };
    voteSection.appendChild(btn);
  });
});

socket.on("result", ({ votedOut, result, imposterName }) => {
  document.getElementById("voteSection").style.display = "none";
  document.getElementById(
    "result"
  ).textContent = `Voted out: ${votedOut}. ${result}. Imposter was: ${imposterName}`;
});
