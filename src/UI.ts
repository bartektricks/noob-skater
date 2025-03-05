export class UI {
  private speedElement!: HTMLDivElement;
  private car: any; // Reference to the car instance

  constructor(car: any) {
    this.car = car;
    this.createSpeedometer();
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

  public update(): void {
    // Calculate speed in km/h (converting from our arbitrary units)
    const speedKmh = Math.abs(this.car.speed * 100);
    this.speedElement.textContent = `Speed: ${speedKmh.toFixed(1)} km/h`;
  }
} 