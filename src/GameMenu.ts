export interface GameStartOptions {
  nickname: string;
  peerRole: 'host' | 'client';
  peerCode?: string; // Connection code when joining as client
}

export class GameMenu {
  private menuElement!: HTMLElement; // Use definite assignment assertion
  private nicknameInput!: HTMLInputElement;
  private menuContainer!: HTMLDivElement;
  private resumeButton!: HTMLButtonElement;
  private startButton!: HTMLButtonElement;
  private isInitialStart: boolean = true;
  
  // Peer-to-peer elements
  private hostRoleRadio!: HTMLInputElement;
  private clientRoleRadio!: HTMLInputElement;
  private peerCodeInput!: HTMLInputElement;
  private peerCodeDisplay!: HTMLDivElement;
  private p2pOptionsContainer!: HTMLDivElement;
  
  constructor(private onStartGame: (options: GameStartOptions) => void) {
    // Create menu element
    this.createMenuElement();
    
    // Show menu on start
    this.show();
  }
  
  private createMenuElement(): void {
    // Create main container
    this.menuElement = document.createElement('div');
    this.menuElement.id = 'game-menu';
    
    // Create menu content
    this.menuContainer = document.createElement('div');
    this.menuContainer.className = 'menu-container';
    
    // Create form
    const form = document.createElement('form');
    form.onsubmit = (e) => {
      e.preventDefault();
      this.startGame();
    };
    
    // Title
    const title = document.createElement('h1');
    title.textContent = 'Noob Skater P2P';
    form.appendChild(title);
    
    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Peer-to-Peer Multiplayer Skateboarding';
    subtitle.style.marginBottom = '20px';
    form.appendChild(subtitle);
    
    // Nickname field
    const nicknameGroup = document.createElement('div');
    nicknameGroup.className = 'form-group';
    
    const nicknameLabel = document.createElement('label');
    nicknameLabel.textContent = 'Your Nickname:';
    nicknameLabel.htmlFor = 'nickname-input';
    
    this.nicknameInput = document.createElement('input');
    this.nicknameInput.id = 'nickname-input';
    this.nicknameInput.type = 'text';
    this.nicknameInput.maxLength = 20;
    this.nicknameInput.required = true;
    this.nicknameInput.placeholder = 'Enter your nickname';
    
    nicknameGroup.appendChild(nicknameLabel);
    nicknameGroup.appendChild(this.nicknameInput);
    form.appendChild(nicknameGroup);
    
    // P2P Options Container
    this.p2pOptionsContainer = document.createElement('div');
    this.p2pOptionsContainer.id = 'p2p-options';
    
    // Connection type section
    const connectionSection = document.createElement('div');
    connectionSection.className = 'connection-section';
    
    const connectionTitle = document.createElement('h3');
    connectionTitle.textContent = 'Connection Type';
    connectionSection.appendChild(connectionTitle);
    
    // Host option
    const hostContainer = document.createElement('div');
    hostContainer.className = 'option-row';
    
    this.hostRoleRadio = document.createElement('input');
    this.hostRoleRadio.id = 'host-radio';
    this.hostRoleRadio.type = 'radio';
    this.hostRoleRadio.name = 'p2p-role';
    this.hostRoleRadio.value = 'host';
    this.hostRoleRadio.checked = true;
    
    const hostLabel = document.createElement('label');
    hostLabel.textContent = 'Create Game (Host)';
    hostLabel.htmlFor = 'host-radio';
    
    hostContainer.appendChild(this.hostRoleRadio);
    hostContainer.appendChild(hostLabel);
    connectionSection.appendChild(hostContainer);
    
    // Client option
    const clientContainer = document.createElement('div');
    clientContainer.className = 'option-row';
    
    this.clientRoleRadio = document.createElement('input');
    this.clientRoleRadio.id = 'client-radio';
    this.clientRoleRadio.type = 'radio';
    this.clientRoleRadio.name = 'p2p-role';
    this.clientRoleRadio.value = 'client';
    
    const clientLabel = document.createElement('label');
    clientLabel.textContent = 'Join Game (Client)';
    clientLabel.htmlFor = 'client-radio';
    
    clientContainer.appendChild(this.clientRoleRadio);
    clientContainer.appendChild(clientLabel);
    connectionSection.appendChild(clientContainer);
    
    this.p2pOptionsContainer.appendChild(connectionSection);
    
    // Peer connection code field
    const codeGroup = document.createElement('div');
    codeGroup.className = 'form-group';
    codeGroup.id = 'connection-code-group';
    codeGroup.style.display = 'none'; // Hidden by default (only shown for client)
    
    const codeLabel = document.createElement('label');
    codeLabel.textContent = 'Connection Code:';
    codeLabel.htmlFor = 'peer-code-input';
    
    this.peerCodeInput = document.createElement('input');
    this.peerCodeInput.id = 'peer-code-input';
    this.peerCodeInput.type = 'text';
    this.peerCodeInput.placeholder = 'Enter host\'s code';
    
    codeGroup.appendChild(codeLabel);
    codeGroup.appendChild(this.peerCodeInput);
    this.p2pOptionsContainer.appendChild(codeGroup);
    
    // Peer code display (for host)
    this.peerCodeDisplay = document.createElement('div');
    this.peerCodeDisplay.id = 'peer-code-display';
    this.peerCodeDisplay.innerHTML = '<p>Your connection code will appear here after starting</p>';
    this.p2pOptionsContainer.appendChild(this.peerCodeDisplay);
    
    // Add role change handlers
    this.hostRoleRadio.addEventListener('change', () => this.toggleRoleOptions());
    this.clientRoleRadio.addEventListener('change', () => this.toggleRoleOptions());
    
    form.appendChild(this.p2pOptionsContainer);
    
    // Start button
    this.startButton = document.createElement('button');
    this.startButton.type = 'submit';
    this.startButton.className = 'menu-button';
    this.startButton.textContent = 'Start Game';
    form.appendChild(this.startButton);
    
    // Resume button (hidden initially)
    this.resumeButton = document.createElement('button');
    this.resumeButton.textContent = 'Resume Game';
    this.resumeButton.className = 'menu-button';
    this.resumeButton.style.display = 'none';
    this.resumeButton.addEventListener('click', () => this.resumeGame());
    
    this.menuContainer.appendChild(form);
    this.menuContainer.appendChild(this.resumeButton);
    this.menuElement.appendChild(this.menuContainer);
    
    // Add to document
    document.body.appendChild(this.menuElement);
  }
  
  private toggleRoleOptions(): void {
    if (this.hostRoleRadio.checked) {
      document.getElementById('connection-code-group')!.style.display = 'none';
      this.peerCodeDisplay.style.display = 'block';
    } else {
      document.getElementById('connection-code-group')!.style.display = 'block';
      this.peerCodeDisplay.style.display = 'none';
    }
  }
  
  // Set the peer code in the display (called after host generates code)
  public setPeerCode(code: string): void {
    this.peerCodeDisplay.innerHTML = `
      <div class="code-box">${code}</div>
    `;
  }
  
  private startGame(): void {
    if (!this.nicknameInput.value.trim()) {
      alert('Please enter a nickname!');
      return;
    }
    
    // Validate peer code if client mode is selected
    if (this.clientRoleRadio.checked && !this.peerCodeInput.value.trim()) {
      alert('Please enter a connection code to join a game!');
      return;
    }
    
    const options: GameStartOptions = {
      nickname: this.nicknameInput.value.trim(),
      peerRole: this.hostRoleRadio.checked ? 'host' : 'client',
      peerCode: this.clientRoleRadio.checked ? this.peerCodeInput.value.trim() : undefined
    };
    
    // Hide the menu for both host and client
    this.hide();
    
    // Start the game
    this.onStartGame(options);
    
    // After first start, allow resuming
    if (this.isInitialStart) {
      this.isInitialStart = false;
    }
  }
  
  private resumeGame(): void {
    this.hide();
    
    // Pass empty options just to trigger the game to resume
    const options: GameStartOptions = {
      nickname: this.nicknameInput.value || 'Player',
      peerRole: 'host' // Default role doesn't matter for resuming
    };
    
    this.onStartGame(options);
  }
  
  public show(): void {
    this.menuElement.style.display = 'flex';
    
    if (!this.isInitialStart) {
      // After first game has started, show pause menu
      const form = this.menuContainer.querySelector('form')!;
      form.style.display = 'none';
      
      // Create or update the resume button
      if (!this.resumeButton.classList.contains('resume-button')) {
        this.resumeButton.classList.add('resume-button');
        this.resumeButton.textContent = 'RESUME GAME';
      }
      this.resumeButton.style.display = 'block';
      
      // Create pause menu title if it doesn't exist
      let pauseTitle = document.getElementById('pause-menu-title');
      if (!pauseTitle) {
        pauseTitle = document.createElement('h2');
        pauseTitle.id = 'pause-menu-title';
        pauseTitle.textContent = 'GAME PAUSED';
        this.menuContainer.insertBefore(pauseTitle, this.menuContainer.firstChild);
      }
      pauseTitle.style.display = 'block';
      
      // Create or update connection info container
      let connectionInfoContainer = document.getElementById('connection-info-container');
      if (!connectionInfoContainer) {
        connectionInfoContainer = document.createElement('div');
        connectionInfoContainer.id = 'connection-info-container';
        connectionInfoContainer.className = 'connection-info-container';
        this.menuContainer.appendChild(connectionInfoContainer);
      }
      
      // If there's a peer code in the peerCodeDisplay, show it in the connection info
      if (this.peerCodeDisplay.innerHTML.includes('code-box')) {
        connectionInfoContainer.innerHTML = `
          <h3>Your Connection Code</h3>
          ${this.peerCodeDisplay.innerHTML}
          <p class="info-text">Share this code with another player to let them join your game.</p>
        `;
        connectionInfoContainer.style.display = 'block';
      } else {
        connectionInfoContainer.style.display = 'none';
      }
    } else {
      // First time showing menu, display normal options
      this.menuContainer.querySelector('form')!.style.display = 'block';
      this.resumeButton.style.display = 'none';
      
      // Hide the pause title if it exists
      const pauseTitle = document.getElementById('pause-menu-title');
      if (pauseTitle) {
        pauseTitle.style.display = 'none';
      }
    }
  }
  
  public hide(): void {
    this.menuElement.style.display = 'none';
  }
  
  // Add this method to show a special waiting screen for the host
  public showHostWaitingScreen(): void {
    // Hide the main form elements except for the peer code display
    const form = this.menuContainer.querySelector('form')!;
    const formChildren = form.children;
    
    // Hide everything except the title and the peer code display
    for (let i = 0; i < formChildren.length; i++) {
      const child = formChildren[i] as HTMLElement;
      
      // Keep the title and peer code display visible
      if (child.tagName === 'H1' || child === this.p2pOptionsContainer) {
        child.style.display = 'block';
      } else {
        child.style.display = 'none';
      }
    }
    
    // Within p2pOptionsContainer, hide everything except peerCodeDisplay
    const p2pChildren = this.p2pOptionsContainer.children;
    for (let i = 0; i < p2pChildren.length; i++) {
      const child = p2pChildren[i] as HTMLElement;
      if (child !== this.peerCodeDisplay) {
        child.style.display = 'none';
      }
    }
    
    // Show a cancel button to go back to the main menu
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.className = 'menu-button cancel-button';
    cancelButton.style.backgroundColor = '#666';
    cancelButton.style.marginTop = '20px';
    cancelButton.addEventListener('click', () => {
      // Reset UI and show the full menu again
      this.resetMenuDisplay();
      // Don't trigger game start - just go back to menu
    });
    
    // Add a connection status message
    const statusMessage = document.createElement('p');
    statusMessage.className = 'connection-message';
    statusMessage.textContent = 'Waiting for another player to connect...';
    statusMessage.style.marginTop = '20px';
    statusMessage.style.fontStyle = 'italic';
    
    // Add these elements to the form
    form.appendChild(statusMessage);
    form.appendChild(cancelButton);
  }
  
  // Add this method to reset the menu display
  private resetMenuDisplay(): void {
    // Show all form elements
    const form = this.menuContainer.querySelector('form')!;
    const formChildren = form.children;
    
    // Show standard form elements
    for (let i = 0; i < formChildren.length; i++) {
      const child = formChildren[i] as HTMLElement;
      
      // Don't show elements with class "connection-message" and "cancel-button"
      if (!child.classList.contains('connection-message') && 
          !child.classList.contains('cancel-button')) {
        child.style.display = 'block';
      } else {
        // Remove temporary elements
        child.remove();
        i--; // Adjust index after removal
      }
    }
    
    // Reset p2pOptionsContainer children display
    const p2pChildren = this.p2pOptionsContainer.children;
    for (let i = 0; i < p2pChildren.length; i++) {
      const child = p2pChildren[i] as HTMLElement;
      child.style.display = 'block';
    }
    
    // Re-apply the toggle to hide/show appropriate elements
    this.toggleRoleOptions();
  }
} 