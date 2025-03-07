export class UI {
  private speedElement!: HTMLDivElement;
  private controlsElement!: HTMLDivElement;
  private trickTextElement!: HTMLDivElement;
  private playerInfoElement!: HTMLDivElement;
  private skateboard: any; // Reference to the skateboard instance
  private playerNickname: string = 'Player';

  constructor(skateboard: any) {
    this.skateboard = skateboard;
    this.createSpeedometer();
    this.createControlsInfo();
    this.createTrickText();
    this.createPlayerInfo();
  }

  private createSpeedometer(): void {
    // Create speedometer container
    this.speedElement = document.createElement('div');
    this.speedElement.style.position = 'fixed';
    this.speedElement.style.top = '20px';
    this.speedElement.style.right = '20px';
    this.speedElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.speedElement.style.color = 'white';
    this.speedElement.style.padding = '10px 20px';
    this.speedElement.style.borderRadius = '5px';
    this.speedElement.style.fontFamily = 'Arial, sans-serif';
    document.body.appendChild(this.speedElement);
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
    
    this.speedElement.innerHTML = `Speed: ${speedKmh.toFixed(1)} km/h${airStatus}`;
  }
} 