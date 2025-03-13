import type { NetworkManager } from "./NetworkManager";

export interface ChatMessage {
  senderId: string;
  senderNickname: string;
  message: string;
  timestamp: number;
}

export class ChatManager {
  private chatMessages: ChatMessage[] = [];
  private networkManager: NetworkManager;
  private messageCallback: ((message: ChatMessage) => void) | null = null;
  private maxMessages = 50; // Maximum number of messages to keep in history
  
  constructor(networkManager: NetworkManager) {
    this.networkManager = networkManager;
    console.log("ChatManager initialized");
  }
  
  public initialize() {
    // Register to receive chat messages from the network manager
    console.log("Registering chat message handler");
    this.networkManager.registerChatMessageHandler((message: ChatMessage) => {
      console.log(`ChatManager received message: ${message.message} from ${message.senderNickname}`);
      this.addMessage(message);
    });
  }
  
  public sendMessage(message: string) {
    if (!message.trim()) return; // Don't send empty messages
    
    const myPeerId = this.networkManager.getMyPeerId();
    if (!myPeerId) {
      console.warn("Cannot send message - not connected");
      return; // Can't send if not connected
    }
    
    const chatMessage: ChatMessage = {
      senderId: myPeerId,
      senderNickname: this.networkManager.getMyNickname() || "Player",
      message: message.trim(),
      timestamp: Date.now()
    };
    
    console.log(`ChatManager sending message: ${chatMessage.message}`);
    
    // Add to local messages
    this.addMessage(chatMessage);
    
    // Send to all connected peers
    this.networkManager.sendChatMessage(chatMessage);
  }
  
  private addMessage(message: ChatMessage) {
    console.log(`ChatManager adding message to history: ${message.message}`);
    this.chatMessages.push(message);
    
    // Trim history if it exceeds maximum
    if (this.chatMessages.length > this.maxMessages) {
      this.chatMessages = this.chatMessages.slice(
        this.chatMessages.length - this.maxMessages
      );
    }
    
    // Notify callback if registered
    if (this.messageCallback) {
      console.log(`ChatManager notifying callback about message: ${message.message}`);
      this.messageCallback(message);
    } else {
      console.warn("No message callback registered in ChatManager");
    }
  }
  
  public getMessages(): ChatMessage[] {
    return [...this.chatMessages];
  }
  
  public clearMessages() {
    this.chatMessages = [];
  }
  
  public setMessageCallback(callback: (message: ChatMessage) => void) {
    console.log("ChatManager: Message callback registered");
    this.messageCallback = callback;
  }
} 