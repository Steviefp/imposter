const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {}; // Store game state per room

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ roomCode, name }) => {
    if (!rooms[roomCode]) rooms[roomCode] = [];

    rooms[roomCode].push({ id: socket.id, name, clue: "", isImposter: false });
    socket.join(roomCode);

    // Start game when 4 players join
    if (rooms[roomCode].length === 4) {
      const players = rooms[roomCode];
      const imposterIndex = Math.floor(Math.random() * 4);
      const word = "banana";

      players.forEach((player, i) => {
        player.isImposter = i === imposterIndex;
        io.to(player.id).emit("gameStart", {
          word: player.isImposter ? null : word,
          isImposter: player.isImposter,
          players: players.map(p => ({ name: p.name }))
        });
      });
    }
  });

  socket.on("submitClue", ({ roomCode, clue }) => {
    const players = rooms[roomCode];
    const player = players.find(p => p.id === socket.id);
    player.clue = clue;

    if (players.every(p => p.clue)) {
      io.to(roomCode).emit("showClues", players.map(p => ({
        name: p.name,
        clue: p.clue,
        id: p.id
      })));
    }
  });

  socket.on("vote", ({ roomCode, votedId }) => {
    const players = rooms[roomCode];
    const player = players.find(p => p.id === votedId);

    if (!player.votes) player.votes = 0;
    player.votes++;

    const totalVotes = players.reduce((sum, p) => sum + (p.votes || 0), 0);
    if (totalVotes === 4) {
      const mostVoted = players.reduce((a, b) => (a.votes || 0) > (b.votes || 0) ? a : b);
      const result = mostVoted.isImposter ? "Crew Wins!" : "Imposter Wins!";
      io.to(roomCode).emit("result", { votedOut: mostVoted.name, result });
      delete rooms[roomCode]; // reset room
    }
  });

  socket.on("disconnect", () => {
    for (const code in rooms) {
      rooms[code] = rooms[code].filter(p => p.id !== socket.id);
      if (rooms[code].length === 0) delete rooms[code];
    }
  });
});

server.listen(3000, () => console.log("Server on http://localhost:3000"));
