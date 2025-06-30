const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

function generateUniqueRoomCode() {
  const code = Math.random().toString(36).substring(2, 8).toLowerCase();
  // Ensure the code is unique by checking against existing rooms
  if (Object.keys(rooms).includes(code)) {
    return generateUniqueRoomCode(); // Recursively generate a new code
  }
  return code;
}

function getRandomWordAndGenre(filePath = "./public/words.json") {
  try {
    const data = JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
    const genres = Object.keys(data);

    // if words.json is empty or has no genres
    if (genres.length === 0) throw new Error("No genres found in JSON.");

    // randomly select from a genre and select word from that genre
    const genre = genres[Math.floor(Math.random() * genres.length)];
    const words = data[genre];

    if (!Array.isArray(words) || words.length === 0)
      throw new Error(`No words found for genre "${genre}".`);

    const word = words[Math.floor(Math.random() * words.length)];
    return { genre, word };
  } catch (err) {
    console.error("Error reading or parsing words.json:", err.message);
    return null;
  }
}
// ROUTING
app.use(express.static("public"));
const setupRoutes = require("./routes");
setupRoutes(app);

const rooms = {}; // Store game state per room

// io socket handling
io.on("connection", (socket) => {
  socket.on("createRoom", () => {
    console.log("========== createRoom handler TRIGGERED ==========");
    const roomCode = generateUniqueRoomCode();
    socket.emit("roomCreated", roomCode);

    rooms[roomCode] = []; // Initialize room with empty player list
  });

  socket.on("joinRoom", ({ roomCode, name, host = false }) => {
    if (!rooms[roomCode] && !host) {
      console.log(
        "========== joinRoom handler TRIGGERED - ROOM NOT FOUND =========="
      );
      socket.emit("roomNotFound", "Room does not exist.");
      return;
    }

    console.log("========== joinRoom handler TRIGGERED ==========");
    // Ensure unique name in room
    const nameTaken = rooms[roomCode].some((player) => player.name === name);

    // Check name length and uniqueness
    if (name.length < 1 || name.length > 20) {
      socket.emit(
        "uniqueNameError",
        "Name must be between 3 and 20 characters."
      );
      console.log(
        "========== joinRoom handler TRIGGERED - NAME LENGTH ERROR =========="
      );
      return;
    }
    if (nameTaken) {
      socket.emit("uniqueNameError", "Name already taken in this room.");
      console.log(
        "========== joinRoom handler TRIGGERED - NAME TAKEN =========="
      );
      return;
    }

    rooms[roomCode].push({
      id: socket.id,
      name,
      clue: "",
      isImposter: false,
      hasVoted: false,
    });
    socket.join(roomCode);
    socket.emit("yourID", socket.id);
    socket.emit("joinedSuccessfully");

    // sends updated live player list to all players in the room
    rooms[roomCode].forEach((player) => {
      io.to(player.id).emit(
        "currentPlayers",
        rooms[roomCode].map((p) => ({ name: p.name, id: p.id }))
      );
    });
  });
  socket.on("PlayerCheck", (roomCode) => {
    let playersReady = false;
    console.log("========== PlayerCheck handler TRIGGERED ==========");
    console.log("length of players in room:", rooms[roomCode].length);
    console.log("roomCode:", roomCode);
    if (rooms[roomCode] && rooms[roomCode].length === 4) {
      playersReady = true;
    }
    socket.emit("PlayerCheck", playersReady);
  });

  socket.on("startGamePrepare", (roomCode) => {
    console.log("========== startGamePrepare handler TRIGGERED ==========");
    rooms[roomCode].forEach((player) => {
      io.to(player.id).emit("startGamePrepare");
      io.to(player.id).emit("playersLoaded");
    });
  });

  // Start game when 4 players join
  socket.on("startGame", (roomCode) => {
    console.log("========== startGame handler TRIGGERED ==========");
    const players = rooms[roomCode];
    const imposterIndex = Math.floor(Math.random() * 4);
    const { genre, word } = getRandomWordAndGenre();
    console.log(rooms);
    console.log("imposterIndex:", imposterIndex);
    players.forEach((player, i) => {
      player.isImposter = i === imposterIndex;
      io.to(player.id).emit("gameStart", {
        word: player.isImposter ? null : word,
        isImposter: player.isImposter,
        players: players.map((p) => ({ name: p.name })),
        genre: genre,
      });
    });
    //socket.emit("gameStart");
  });

  socket.on("rejoin", ({ roomCode, name }) => {
    const room = rooms[roomCode];
    if (!room) {
      console.log(
        "========== rejoin handler TRIGGERED - ROOM NOT FOUND =========="
      );
      return;
    }

    const player = room.find((p) => p.name === name);
    if (player) {
      // Update old socket ID to new one
      player.id = socket.id;
      socket.join(roomCode);
      rooms[roomCode].forEach((player) => {
        io.to(player.id).emit("playersLoaded");
      });
      console.log(
        "========== rejoin handler TRIGGERED - PLAYER FOUND =========="
      );
    } else {
      socket.emit("rejoinFailed", "Player not found.");
      console.log(
        "========== rejoin handler TRIGGERED - PLAYER NOT FOUND =========="
      );
    }
  });

  socket.on("submitClue", ({ roomCode, clue }) => {
    console.log("========== submitClue handler TRIGGERED ==========");
    console.log("Room code:", roomCode);
    console.log("Clue submitted:", clue);
    const players = rooms[roomCode];
    console.log("players length:", players.length);
    console.log("socket ID:", socket.id);
    const player = players.find((p) => p.id === socket.id);

    if (!player) return;

    player.clue = clue;

    // Let this player know their clue was accepted
    socket.emit("clueReceived", { success: true });

    // 🔄 Realtime status update for all players
    console.log("========== playerUpdated event TRIGGERED ==========");
    io.to(roomCode).emit(
      "playerUpdated",
      players.map((p) => ({
        name: p.name,
        hasClue: !!p.clue,
        id: p.id,
      }))
    );

    // 📤 Immediately show all submitted clues (even partial)
    io.to(roomCode).emit(
      "showClues",
      players
        .filter((p) => p.clue) // only show those who submitted
        .map((p) => ({
          name: p.name,
          clue: p.clue,
          id: p.id,
        }))
    );
  });

  socket.on("vote", ({ roomCode, votedId }) => {
    console.log("========== vote handler TRIGGERED ==========");
    console.log("Room code:", roomCode);
    console.log("Voted ID:", votedId);

    const players = rooms[roomCode];
    const player = players.find((p) => p.id === votedId);

    if (!player.votes) player.votes = 0;
    player.votes++;
    //console.log("players", players);
    const imposterName = players.find((p) => p.isImposter).name;

    const totalVotes = players.reduce((sum, p) => sum + (p.votes || 0), 0);
    if (totalVotes === 4) {
      // -1 if tie, otherwise the player with the most votes
      const mostVoted = players.reduce((a, b) =>
        a === -1 || b === -1
          ? -1
          : (a.votes || 0) > (b.votes || 0)
          ? a
          : (a.votes || 0) < (b.votes || 0)
          ? b
          : -1
      );

      // if tie, imposter wins
      if (mostVoted === -1) {
        io.to(roomCode).emit("result", {
          votedOut: "No one",
          result: "It's a tie! Imposter wins",
          imposterName,
        });
        delete rooms[roomCode]; // reset room
        console.log("========== TIE DETECTED ==========");
        return;
      }
      const result = mostVoted.isImposter ? "Crew Wins!" : "Imposter Wins!";

      io.to(roomCode).emit("result", {
        votedOut: mostVoted.name,
        result,
        imposterName,
      });
      delete rooms[roomCode]; // reset room
    }
  });

  // socket.on("disconnect", () => {
  //   console.log("========== disconnect handler TRIGGERED ==========");
  //   for (const code in rooms) {
  //     rooms[code] = rooms[code].filter((p) => p.id !== socket.id);
  //     if (rooms[code].length === 0) delete rooms[code];
  //   }
  // });
});

server.listen(3000, () => console.log("Server on http://localhost:3000"));
