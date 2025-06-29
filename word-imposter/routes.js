const path = require("path");
function setupRoutes(app) {
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

  app.get("/join", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "joinGame.html"));
  });

  app.get("/lobby", (req, res) => {
    res.sendFile(path.join(__dirname,  "public", "lobbyCreate.html"));
  });

  app.get("/help", (req, res) => {
    res.sendFile(path.join(__dirname,  "public", "help.html"));
  });
  app.get("/game", (req, res) => {
    res.sendFile(path.join(__dirname,  "public", "game.html"));
  });
}

module.exports = setupRoutes;