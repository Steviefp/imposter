class PlayerListComponent {
  constructor() {
    this.element = this.createElement();
    this.playerListContainer = this.element.querySelector(".playerList");
    this.playerCountText = this.element.querySelector(".playerCount");
  }

  createElement() {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="lobby">
        <p class="playerCount">Waiting for players to join...</p>
        <div class="playerList"></div>
      </div>
    `;
    return wrapper.firstElementChild;
  }

  setPlayerCount(count) {
    this.playerCountText.textContent = `${count} player${
      count !== 1 ? "s" : ""
    } in lobby...`;
  }

  updatePlayerList(players) {
    console.log("Creating PlayerListComponent element");

    this.playerListContainer.innerHTML = ""; // Clear list
    players.forEach((player) => {
      const p = document.createElement("h3");
      p.textContent = player.name;
      this.playerListContainer.appendChild(p);
    });
    this.setPlayerCount(players.length);
  }

  getElement() {
    return this.element;
  }
}
