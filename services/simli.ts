
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
      const response = await fetch('https://api.simli.ai/startAudioToVideoSession', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        body: 
        
        JSON.stringify({
       faceId: this.faceId,
  apiKey: this.apiKey,
  apiVersion: 'v1',
  isJPG: true,
  syncAudio: true,
  audioInputFormat: 'pcm16',
  handleSilence: true,
  maxSessionLength: 600,
  maxIdleTime: 60
})
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Simli API responded with status ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      this.sessionId = data.session_id;

      this.ws = new WebSocket(`wss://api.simli.ai/StartAudioToVideoStream?session_id=${this.sessionId}`);
      
      return new Promise((resolve, reject) => {
        if (!this.ws) {
          return reject(new Error('WebSocket could not be initialized.'));
        }
        
        this.ws.onopen = () => {
          console.log('✅ Simli WebSocket connected');
          resolve(this.sessionId!);
        };
        
        this.ws.onerror = (error) => {
          console.error('❌ Simli WebSocket error:', error);
          // FIX: Reject with a proper Error object for better logging.
          reject(new Error('A WebSocket connection error occurred with the Simli service.'));
        };

        this.ws.onclose = (event) => {
            console.log(`Simli WebSocket closed: Code=${event.code}, Reason='${event.reason}', WasClean=${event.wasClean}`);
            // FIX: Add logging and reject on unclean close for better debugging.
            if (!event.wasClean) {
                reject(new Error(`Simli WebSocket closed unexpectedly. Code: ${event.code}.`));
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
