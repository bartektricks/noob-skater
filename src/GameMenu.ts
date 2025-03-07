export interface GameStartOptions {
  nickname: string;
  server: string;
}

export class GameMenu {
  private menuElement!: HTMLElement; // Use definite assignment assertion
  private nicknameInput!: HTMLInputElement;
  private serverSelect!: HTMLSelectElement;
  private menuContainer!: HTMLDivElement;
  private resumeButton!: HTMLButtonElement;
  private startButton!: HTMLButtonElement;
  private isInitialStart: boolean = true;
  
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
    
    // Add title
    const title = document.createElement('h1');
    title.textContent = 'NOOB SKATER';
    
    // Add instructions
    const instructions = document.createElement('p');
    instructions.innerHTML = `
      <strong>Controls:</strong><br>
      W/S - Move forward/backward<br>
      A/D - Turn left/right<br>
      SPACE - Jump<br>
      J - Do a 360 Flip (in air)<br>
      K - Grind rails (near rails in air)<br>
      ESC - Toggle menu
    `;
    
    // Create form for nickname and server
    const form = document.createElement('form');
    form.onsubmit = (e) => {
      e.preventDefault();
      this.startGame();
    };
    
    // Add nickname input
    const nicknameGroup = document.createElement('div');
    nicknameGroup.className = 'form-group';
    
    const nicknameLabel = document.createElement('label');
    nicknameLabel.textContent = 'Your Nickname:';
    nicknameLabel.htmlFor = 'nickname-input';
    
    this.nicknameInput = document.createElement('input');
    this.nicknameInput.id = 'nickname-input';
    this.nicknameInput.type = 'text';
    this.nicknameInput.placeholder = 'Enter your nickname';
    this.nicknameInput.maxLength = 15;
    this.nicknameInput.required = true;
    this.nicknameInput.value = 'Skater' + Math.floor(Math.random() * 1000);
    
    nicknameGroup.appendChild(nicknameLabel);
    nicknameGroup.appendChild(this.nicknameInput);
    
    // Add server selection
    const serverGroup = document.createElement('div');
    serverGroup.className = 'form-group';
    
    const serverLabel = document.createElement('label');
    serverLabel.textContent = 'Select Server:';
    serverLabel.htmlFor = 'server-select';
    
    this.serverSelect = document.createElement('select');
    this.serverSelect.id = 'server-select';
    
    // Add server options
    const servers = [
      { id: 'local', name: 'Local (Offline)' },
      { id: 'us-east', name: 'US East (Coming Soon)', disabled: true },
      { id: 'us-west', name: 'US West (Coming Soon)', disabled: true },
      { id: 'eu', name: 'Europe (Coming Soon)', disabled: true },
      { id: 'asia', name: 'Asia (Coming Soon)', disabled: true }
    ];
    
    servers.forEach(server => {
      const option = document.createElement('option');
      option.value = server.id;
      option.textContent = server.name;
      if (server.disabled) {
        option.disabled = true;
      }
      this.serverSelect.appendChild(option);
    });
    
    serverGroup.appendChild(serverLabel);
    serverGroup.appendChild(this.serverSelect);
    
    // Add start button
    this.startButton = document.createElement('button');
    this.startButton.className = 'menu-button';
    this.startButton.textContent = 'START SKATING';
    this.startButton.type = 'submit';
    
    // Create resume button (hidden initially)
    this.resumeButton = document.createElement('button');
    this.resumeButton.className = 'menu-button';
    this.resumeButton.textContent = 'RESUME GAME';
    this.resumeButton.style.display = 'none';
    this.resumeButton.style.margin = '24px auto 0';
    this.resumeButton.addEventListener('click', () => {
      this.resumeGame();
    });
    
    // Append all elements
    form.appendChild(nicknameGroup);
    form.appendChild(serverGroup);
    form.appendChild(this.startButton);
    
    this.menuContainer.appendChild(title);
    this.menuContainer.appendChild(instructions);
    this.menuContainer.appendChild(form);
    this.menuContainer.appendChild(this.resumeButton);
    this.menuElement.appendChild(this.menuContainer);
    
    // Add to document
    document.body.appendChild(this.menuElement);
  }
  
  private startGame(): void {
    if (!this.nicknameInput.value.trim()) {
      alert('Please enter a nickname!');
      return;
    }
    
    const options: GameStartOptions = {
      nickname: this.nicknameInput.value.trim(),
      server: this.serverSelect.value
    };
    
    this.hide();
    this.onStartGame(options);
    
    // After first start, show resume button and hide form when reopening menu
    if (this.isInitialStart) {
      this.isInitialStart = false;
    }
  }
  
  private resumeGame(): void {
    const options: GameStartOptions = {
      nickname: this.nicknameInput.value.trim(),
      server: this.serverSelect.value
    };
    
    this.hide();
    this.onStartGame(options);
  }
  
  public show(): void {
    this.menuElement.classList.remove('hidden');
    
    // If not the initial start, show the resume button and hide form fields
    if (!this.isInitialStart) {
      this.resumeButton.style.display = 'block';
      this.startButton.textContent = 'RESTART GAME';
    }
  }
  
  public hide(): void {
    this.menuElement.classList.add('hidden');
  }
} 