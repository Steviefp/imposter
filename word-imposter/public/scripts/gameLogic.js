const socket = io();
const roomCode = sessionStorage.getItem("roomCode");
const name = sessionStorage.getItem("playerName");
const mySocketID = sessionStorage.getItem("socketID");

socket.emit("rejoin", { roomCode, name });

socket.on("playersLoaded", () => {
  console.log("========== playersLoaded handler TRIGGERED ==========");
  socket.emit("startGame", roomCode);
});








socket.on("gameStart", ({ word, isImposter, players, genre }) => {
  console.log("========== gameStart handler TRIGGERED ==========");
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
  const clueInput = document.getElementById("clue");
  const clue = clueInput.value.trim();

  if (!clue) {
    alert("Please enter a clue.");
    return;
  }

  const clueContainer = document.getElementById("clues");

  // If no clues have been displayed yet, allow submission without duplicate check
  if (!clueContainer || clueContainer.querySelectorAll("p").length === 0) {
    console.log("No existing clues, skipping duplicate check.");
  } else {
    const existingClues = Array.from(clueContainer.querySelectorAll("p"))
      .map(p => p.textContent.split(":")[1]?.trim().toLowerCase());

    if (existingClues.includes(clue.toLowerCase())) {
      alert("This clue has already been submitted. Please enter a new clue.");
      return;
    }
  }

  // Emit to server
  socket.emit("submitClue", { roomCode, clue });

  // Optional: clear input field after sending
  clueInput.value = "";
}

socket.on("showClues", (clues) => {
  //document.getElementById("clueSection").style.display = "none";
  const container = document.getElementById("clues");
  container.innerHTML = "<h3>Clues:</h3>";
  clues.forEach((c) => {
    container.innerHTML += `<p>${c.name}: ${c.clue}</p>`;
  });

  const voteSection = document.getElementById("voteSection");
  voteSection.style.display = "block";
  voteSection.innerHTML = "<h3>Vote who is the Imposter:</h3>";
  clues.forEach((c) => {
    if (mySocketID === c.id) return; // Don't show button for self

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
