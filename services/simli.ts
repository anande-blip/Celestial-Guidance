
export interface SimliConfig {
  apiKey: string;
  faceId: string;
}

export class SimliService {
  private apiKey: string;
  private faceId: string;
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;

  constructor(config: SimliConfig) {
    this.apiKey = config.apiKey;
    this.faceId = config.faceId;
  }

  async startSession(): Promise<string> {
    try {
      console.log('🔮 Requesting Simli session via local proxy...');
      
      // Étape 1: Appeler notre propre proxy backend pour obtenir un session_id
      const response = await fetch('/api/simli-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          faceId: this.faceId,
          apiKey: this.apiKey, // On envoie la clé au proxy
        })
      });

      console.log('📥 Proxy response status:', response.status);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ Proxy Error Response:', response.status, errorBody);
        throw new Error(`Proxy server responded with status ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      this.sessionId = data.sessionId;

      if (!this.sessionId) {
        console.error("Proxy response did not contain 'sessionId'. Response:", data);
        throw new Error("Proxy did not return a Simli session_id.");
      }

      console.log('🔑 Received session ID from proxy:', this.sessionId);

      // Étape 2: Utiliser le session_id pour se connecter au WebSocket
      const wsUrl = `wss://api.simli.ai/StartAudioToVideoStream?session_id=${this.sessionId}&apiKey=${this.apiKey}`;
      console.log('🔌 Connecting to WebSocket:', wsUrl.replace(this.apiKey, '***'));
      this.ws = new WebSocket(wsUrl);
      
      return new Promise((resolve, reject) => {
        if (!this.ws) {
          return reject(new Error('WebSocket could not be initialized.'));
        }
        
        this.ws.onopen = () => {
          console.log('✅ Simli WebSocket connected!');
          resolve(this.sessionId!);
        };
        
        this.ws.onerror = (error) => {
          console.error('❌ Simli WebSocket error:', error);
          reject(new Error('WebSocket connection failed.'));
        };

        this.ws.onclose = (event) => {
          console.log(`WebSocket closed: Code=${event.code}, Clean=${event.wasClean}, Reason=${event.reason}`);
          if (!event.wasClean) {
            reject(new Error(`WebSocket closed unexpectedly. Code: ${event.code}.`));
          }
        };
      });
    } catch (error) {
      console.error('Simli session start error:', error);
      throw error;
    }
  }

  sendAudioData(audioData: Uint8Array) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(audioData);
    }
  }



  onVideoFrame(callback: (videoData: string) => void) {
    if (this.ws) {
      this.ws.onmessage = (event) => {
        callback(event.data);
      };
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
