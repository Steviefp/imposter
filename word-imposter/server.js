const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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

app.use(express.static("public"));

const rooms = {}; // Store game state per room

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ roomCode, name }) => {
    if (!rooms[roomCode]) rooms[roomCode] = [];

    rooms[roomCode].push({
      id: socket.id,
      name,
      clue: "",
      isImposter: false,
      hasVoted: false,
    });
    socket.join(roomCode);

    // Start game when 4 players join
    if (rooms[roomCode].length === 4) {
      const players = rooms[roomCode];
      const imposterIndex = Math.floor(Math.random() * 4);
      const { genre, word } = getRandomWordAndGenre();

      players.forEach((player, i) => {
        player.isImposter = i === imposterIndex;
        io.to(player.id).emit("gameStart", {
          word: player.isImposter ? null : word,
          isImposter: player.isImposter,
          players: players.map((p) => ({ name: p.name })),
          genre: genre,
        });
      });
    }
  });

  socket.on("submitClue", ({ roomCode, clue }) => {
    const players = rooms[roomCode];
    const player = players.find((p) => p.id === socket.id);
    player.clue = clue;

    if (players.every((p) => p.clue)) {
      io.to(roomCode).emit(
        "showClues",
        players.map((p) => ({
          name: p.name,
          clue: p.clue,
          id: p.id,
        }))
      );
    }
  });

  socket.on("vote", ({ roomCode, votedId }) => {
    console.log("========== vote handler TRIGGERED ==========");
    console.log("Room code:", roomCode);
    console.log("Voted ID:", votedId);

    const players = rooms[roomCode];
    const player = players.find((p) => p.id === votedId);

    if (!player.votes) player.votes = 0;
    player.votes++;
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

  socket.on("disconnect", () => {
    for (const code in rooms) {
      rooms[code] = rooms[code].filter((p) => p.id !== socket.id);
      if (rooms[code].length === 0) delete rooms[code];
    }
  });
});

server.listen(3000, () => console.log("Server on http://localhost:3000"));
