import { Skateboard } from './Skateboard';

export class UI {
  private controlsElement!: HTMLDivElement;
  private trickTextElement!: HTMLDivElement;
  private playerInfoElement!: HTMLDivElement;
  private exitButtonElement!: HTMLButtonElement;
  private pauseMenuElement!: HTMLDivElement; // Pause menu container
  private serverIdElement!: HTMLDivElement; // Element to display server ID
  private skateboard: Skateboard;
  private playerNickname: string = 'Player';
  private trickDisplay: HTMLDivElement;
  private notificationDisplay: HTMLDivElement;
  private notificationTimeout: number | null = null;
  private connectionStatusDisplay: HTMLDivElement;
  private onExitToMenu: (() => void) | null = null; // Callback for exit button
  private isPauseMenuVisible: boolean = false; // Track pause menu visibility

  constructor(skateboard: Skateboard) {
    this.skateboard = skateboard;
    this.createControlsInfo();
    this.createTrickText();
    this.createPlayerInfo();
    this.createPauseMenu();
    
    
    // Create trick display
    this.trickDisplay = document.createElement('div');
    this.trickDisplay.className = 'trick-display';
    document.body.appendChild(this.trickDisplay);
    
    // Create notification display
    this.notificationDisplay = document.createElement('div');
    this.notificationDisplay.className = 'notification-display';
    this.notificationDisplay.style.position = 'absolute';
    this.notificationDisplay.style.top = '20px';
    this.notificationDisplay.style.left = '50%';
    this.notificationDisplay.style.transform = 'translateX(-50%)';
    this.notificationDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.notificationDisplay.style.color = 'white';
    this.notificationDisplay.style.padding = '10px 20px';
    this.notificationDisplay.style.borderRadius = '5px';
    this.notificationDisplay.style.zIndex = '1000';
    this.notificationDisplay.style.display = 'none';
    document.body.appendChild(this.notificationDisplay);
    
    // Create connection status display
    this.connectionStatusDisplay = document.createElement('div');
    this.connectionStatusDisplay.className = 'connection-status disconnected';
    this.connectionStatusDisplay.textContent = 'Disconnected';
    this.connectionStatusDisplay.style.display = 'none'; // Hidden by default
    document.body.appendChild(this.connectionStatusDisplay);
  }
  
  private createPlayerInfo(): void {
    // Create player info container
    this.playerInfoElement = document.createElement('div');
    this.playerInfoElement.style.position = 'fixed';
    this.playerInfoElement.style.top = '20px';
    this.playerInfoElement.style.left = '20px';
    this.playerInfoElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.playerInfoElement.style.color = 'white';
    this.playerInfoElement.style.padding = '10px 20px';
    this.playerInfoElement.style.borderRadius = '5px';
    this.playerInfoElement.style.fontFamily = 'Arial, sans-serif';
    this.updatePlayerInfo();
    document.body.appendChild(this.playerInfoElement);
  }
  
  private updatePlayerInfo(): void {
    this.playerInfoElement.innerHTML = `
      <div style="font-weight: bold;">${this.playerNickname}</div>
      <div>Server: Local</div>
    `;
  }
  
  public setPlayerNickname(nickname: string): void {
    this.playerNickname = nickname;
    this.updatePlayerInfo();
  }
  
  private createControlsInfo(): void {
    // Create controls info container
    this.controlsElement = document.createElement('div');
    this.controlsElement.style.position = 'fixed';
    this.controlsElement.style.bottom = '20px';
    this.controlsElement.style.left = '20px';
    this.controlsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.controlsElement.style.color = 'white';
    this.controlsElement.style.padding = '10px 20px';
    this.controlsElement.style.borderRadius = '5px';
    this.controlsElement.style.fontFamily = 'Arial, sans-serif';
    
    // Add controls information
    this.controlsElement.innerHTML = `
      <div style="margin-bottom: 5px; font-weight: bold;">Controls:</div>
      <div>W/S - Accelerate/Brake</div>
      <div>A/D - Turn Left/Right</div>
      <div>Spacebar - Jump</div>
      <div>J - 360 Flip (in air)</div>
      <div>K - Grind (near rails)</div>
    `;
    
    document.body.appendChild(this.controlsElement);
  }

  private createTrickText(): void {
    // Create trick text element
    this.trickTextElement = document.createElement('div');
    this.trickTextElement.style.position = 'fixed';
    this.trickTextElement.style.top = '90%';
    this.trickTextElement.style.left = '50%';
    this.trickTextElement.style.transform = 'translate(-50%, -50%)';
    this.trickTextElement.style.color = 'white';
    this.trickTextElement.style.textShadow = '2px 2px 4px #000000';
    this.trickTextElement.style.fontSize = '24px';
    this.trickTextElement.style.fontWeight = 'bold';
    this.trickTextElement.style.fontFamily = 'Arial, sans-serif';
    this.trickTextElement.style.textAlign = 'center';
    this.trickTextElement.style.opacity = '0';
    this.trickTextElement.style.transition = 'opacity 0.5s ease-out';
    this.trickTextElement.style.pointerEvents = 'none'; // Don't interfere with clicks
    document.body.appendChild(this.trickTextElement);
  }

  public showTrickText(text: string): void {
    // Display the trick text
    this.trickTextElement.textContent = text;
    this.trickTextElement.style.opacity = '1';
    
    // Hide after a delay
    setTimeout(() => {
      this.trickTextElement.style.opacity = '0';
    }, 1000);
  }

  public update(): void {
    // Calculate speed in km/h (converting from our arbitrary units)
    const speedKmh = Math.abs(this.skateboard.speed * 100);
    
    // Add jump status indicator
    const isInAir = !this.skateboard.isGrounded; // Assuming isGrounded is accessible
    const airStatus = isInAir ? '<span style="color: yellow;"> (In Air!)</span>' : '';
  
  }

  /**
   * Shows a notification message on screen
   * @param message The message to display
   * @param duration Duration in milliseconds to show the message (default: 3000ms)
   */
  public showNotification(message: string, duration: number = 3000): void {
    this.notificationDisplay.textContent = message;
    this.notificationDisplay.style.display = 'block';
    
    // Clear any existing timeout
    if (this.notificationTimeout !== null) {
      window.clearTimeout(this.notificationTimeout);
    }
    
    // Set timeout to hide notification
    this.notificationTimeout = window.setTimeout(() => {
      this.notificationDisplay.style.display = 'none';
      this.notificationTimeout = null;
    }, duration);
  }

  // Add method to show connection status
  public showConnectionStatus(status: 'connected' | 'disconnected' | 'connecting'): void {
    // Remove all status classes
    this.connectionStatusDisplay.classList.remove('connected', 'disconnected', 'connecting');
    
    // Add the current status class
    this.connectionStatusDisplay.classList.add(status);
    
    // Update text content
    this.connectionStatusDisplay.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    
    // Show the status display
    this.connectionStatusDisplay.style.display = 'block';
    
    console.log("Connection status updated:", status);
  }

  /**
   * Creates the pause menu that appears when ESC is pressed
   */
  private createPauseMenu(): void {
    // Create pause menu container
    this.pauseMenuElement = document.createElement('div');
    this.pauseMenuElement.className = 'pause-menu';
    this.pauseMenuElement.style.position = 'absolute';
    this.pauseMenuElement.style.top = '0';
    this.pauseMenuElement.style.left = '0';
    this.pauseMenuElement.style.width = '100%';
    this.pauseMenuElement.style.height = '100%';
    this.pauseMenuElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.pauseMenuElement.style.display = 'none';
    this.pauseMenuElement.style.zIndex = '2000';
    this.pauseMenuElement.style.alignItems = 'center';
    this.pauseMenuElement.style.justifyContent = 'center';
    this.pauseMenuElement.style.flexDirection = 'column';
    
    // Create pause menu title
    const title = document.createElement('h2');
    title.textContent = 'Game Paused';
    title.style.color = 'white';
    title.style.marginBottom = '30px';
    title.style.fontSize = '32px';
    this.pauseMenuElement.appendChild(title);
    
    // Create server ID display element (initially hidden)
    this.serverIdElement = document.createElement('div');
    this.serverIdElement.className = 'server-id';
    this.serverIdElement.style.color = 'white';
    this.serverIdElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.serverIdElement.style.padding = '10px 15px';
    this.serverIdElement.style.borderRadius = '4px';
    this.serverIdElement.style.marginBottom = '20px';
    this.serverIdElement.style.fontFamily = 'monospace';
    this.serverIdElement.style.fontSize = '16px';
    this.serverIdElement.style.display = 'none';
    this.pauseMenuElement.appendChild(this.serverIdElement);
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.flexDirection = 'column';
    buttonContainer.style.gap = '15px';
    buttonContainer.style.width = '250px';
    
    // Create resume button
    const resumeButton = document.createElement('button');
    resumeButton.textContent = 'Resume Game';
    resumeButton.style.padding = '12px 20px';
    resumeButton.style.fontSize = '18px';
    resumeButton.style.border = 'none';
    resumeButton.style.borderRadius = '4px';
    resumeButton.style.backgroundColor = '#4CAF50';
    resumeButton.style.color = 'white';
    resumeButton.style.cursor = 'pointer';
    resumeButton.style.fontWeight = 'bold';
    resumeButton.addEventListener('mouseover', () => {
      resumeButton.style.backgroundColor = '#45a049';
    });
    resumeButton.addEventListener('mouseout', () => {
      resumeButton.style.backgroundColor = '#4CAF50';
    });
    resumeButton.addEventListener('click', () => {
      this.togglePauseMenu(false);
    });
    buttonContainer.appendChild(resumeButton);
    
    // Create main menu button
    const mainMenuButton = document.createElement('button');
    mainMenuButton.textContent = 'Back to Main Menu';
    mainMenuButton.style.padding = '12px 20px';
    mainMenuButton.style.fontSize = '18px';
    mainMenuButton.style.border = 'none';
    mainMenuButton.style.borderRadius = '4px';
    mainMenuButton.style.backgroundColor = '#f44336';
    mainMenuButton.style.color = 'white';
    mainMenuButton.style.cursor = 'pointer';
    mainMenuButton.style.fontWeight = 'bold';
    mainMenuButton.addEventListener('mouseover', () => {
      mainMenuButton.style.backgroundColor = '#d32f2f';
    });
    mainMenuButton.addEventListener('mouseout', () => {
      mainMenuButton.style.backgroundColor = '#f44336';
    });
    mainMenuButton.addEventListener('click', () => {
      if (this.onExitToMenu) {
        this.togglePauseMenu(false);
        this.onExitToMenu();
      }
    });
    buttonContainer.appendChild(mainMenuButton);
    
    this.pauseMenuElement.appendChild(buttonContainer);
    document.body.appendChild(this.pauseMenuElement);
  }
  
  /**
   * Toggle the visibility of the pause menu
   */
  public togglePauseMenu(show?: boolean): void {
    if (show !== undefined) {
      this.isPauseMenuVisible = show;
    } else {
      this.isPauseMenuVisible = !this.isPauseMenuVisible;
    }
    
    if (this.isPauseMenuVisible) {
      this.pauseMenuElement.style.display = 'flex';
      // Hide the exit button when pause menu is visible
      if (this.exitButtonElement) {
        this.exitButtonElement.style.display = 'none';
      }
    } else {
      this.pauseMenuElement.style.display = 'none';
      // Show the exit button when pause menu is hidden
      if (this.exitButtonElement) {
        this.exitButtonElement.style.display = 'block';
      }
    }
  }
  
  /**
   * Set the callback function for when the exit button is clicked
   */
  public setExitToMenuCallback(callback: () => void): void {
    this.onExitToMenu = callback;
  }
  
  /**
   * Get whether the pause menu is currently visible
   */
  public getIsPauseMenuVisible(): boolean {
    return this.isPauseMenuVisible;
  }

  /**
   * Display the server ID in the pause menu
   */
  public setServerIdInPauseMenu(serverId: string | null): void {
    if (serverId) {
      this.serverIdElement.textContent = `Server ID: ${serverId}`;
      this.serverIdElement.style.display = 'block';
    } else {
      this.serverIdElement.style.display = 'none';
    }
  }
} 