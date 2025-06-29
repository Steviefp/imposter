const path = require("path");
function setupRoutes(app) {
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

  app.get("/join", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "joinGame.html"));
  });

  app.get("/lobby", (req, res) => {
    res.sendFile(path.join(__dirname,  "public", "lobby.html"));
  });

  app.get("/help", (req, res) => {
    res.sendFile(path.join(__dirname,  "public", "help.html"));
  });
}

module.exports = setupRoutes;