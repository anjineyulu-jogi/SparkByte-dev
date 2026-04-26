export class AudioStreamPlayer {
  audioContext: AudioContext;
  nextTime: number = 0;

  constructor(sampleRate: number = 24000) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: sampleRate
    });
  }

  async playBase64Pcm(base64: string) {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // Decode base64 16-bit PCM to ArrayBuffer
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, this.audioContext.sampleRate);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;
    if (this.nextTime < currentTime) {
        this.nextTime = currentTime;
    }

    source.start(this.nextTime);
    this.nextTime += audioBuffer.duration;
  }

  stop() {
    this.audioContext.close();
    this.nextTime = 0;
  }
}

export class AudioStreamRecorder {
  audioContext: AudioContext | null = null;
  mediaStream: MediaStream | null = null;
  processor: ScriptProcessorNode | null = null;
  onData: ((base64: string) => void) | null = null;

  async start(onDataCb: (base64: string) => void) {
    this.onData = onDataCb;
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Requesting 16000Hz via context
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    
    // Using ScriptProcessorNode (deprecated but highly compatible)
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
      const float32Array = e.inputBuffer.getChannelData(0);
      const int16Array = new Int16Array(float32Array.length);
      for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      const uint8Array = new Uint8Array(int16Array.buffer);
      let binaryStr = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryStr += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binaryStr);
      if (this.onData) this.onData(base64);
    };

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  stop() {
    if (this.processor && this.audioContext) {
      this.processor.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
    }
  }
}
