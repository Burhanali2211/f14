import { airsendSupabase } from '@/integrations/supabase/airsend-client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface AirSendFile {
  name: string;
  type: string;
  data: ArrayBuffer;
}

type SignalingMessage = 
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit };

export class AirSendP2P {
  private pc: RTCPeerConnection | null = null;
  private channel: RealtimeChannel | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private sessionCode: string;
  private isReceiver: boolean;
  private onFileReceived?: (file: AirSendFile) => void;
  private onStatusChange?: (status: string) => void;
  private onProgress?: (progress: number) => void;

  constructor(sessionCode: string, isReceiver: boolean) {
    this.sessionCode = sessionCode;
    this.isReceiver = isReceiver;
  }

  async start(callbacks: {
    onFileReceived?: (file: AirSendFile) => void;
    onStatusChange?: (status: string) => void;
    onProgress?: (progress: number) => void;
  }) {
    this.onFileReceived = callbacks.onFileReceived;
    this.onStatusChange = callbacks.onStatusChange;
    this.onProgress = callbacks.onProgress;

    this.onStatusChange?.('Initializing...');

    // Join signaling channel
    this.channel = airsendSupabase.channel(`airsend:${this.sessionCode}`, {
      config: {
        broadcast: { self: false },
      },
    });

    this.channel
      .on('broadcast', { event: 'signaling' }, (payload) => {
        this.handleSignalingMessage(payload.payload as SignalingMessage);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.onStatusChange?.('Signaling ready');
          if (!this.isReceiver) {
            this.initiateConnection();
          }
        }
      });

    this.setupPeerConnection();
  }

  private setupPeerConnection() {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    };

    this.pc = new RTCPeerConnection(configuration);

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      if (state === 'connected') {
        this.onStatusChange?.('Direct connection established');
      } else {
        this.onStatusChange?.(`Connection: ${state}`);
      }
    };

    if (this.isReceiver) {
      this.pc.ondatachannel = (event) => {
        this.setupDataChannel(event.channel);
      };
    }
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;
    this.dataChannel.binaryType = 'arraybuffer';
    let receivedChunks: ArrayBuffer[] = [];
    let fileInfo: { name: string; type: string; size: number } | null = null;
    let receivedSize = 0;

    this.dataChannel.onopen = () => {
      this.onStatusChange?.('Ready to transfer');
    };

    this.dataChannel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          if (event.data === 'END') {
            if (fileInfo && receivedChunks.length > 0) {
              const blob = new Blob(receivedChunks, { type: fileInfo.type });
              blob.arrayBuffer().then(data => {
                this.onFileReceived?.({
                  name: fileInfo!.name,
                  type: fileInfo!.type,
                  data,
                });
                this.onStatusChange?.('File received successfully');
                this.onProgress?.(100);
              });
            }
            return;
          }
          
          fileInfo = JSON.parse(event.data);
          receivedChunks = [];
          receivedSize = 0;
          this.onStatusChange?.(`Receiving ${fileInfo?.name}...`);
        } catch (e) {
          console.error('Failed to parse file info:', e);
        }
      } else if (event.data instanceof ArrayBuffer) {
        receivedChunks.push(event.data);
        receivedSize += event.data.byteLength;
        if (fileInfo?.size) {
          const progress = Math.round((receivedSize / fileInfo.size) * 100);
          this.onProgress?.(progress);
        }
      }
    };
  }

  private async initiateConnection() {
    if (!this.pc) return;

    this.dataChannel = this.pc.createDataChannel('fileTransfer', {
      ordered: true
    });
    this.setupDataChannel(this.dataChannel);

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    this.sendSignalingMessage({
      type: 'offer',
      sdp: offer,
    });
  }

  private async handleSignalingMessage(message: SignalingMessage) {
    if (!this.pc) return;

    try {
      if (message.type === 'offer' && this.isReceiver) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.sendSignalingMessage({
          type: 'answer',
          sdp: answer,
        });
      } else if (message.type === 'answer' && !this.isReceiver) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
      } else if (message.type === 'ice-candidate') {
        await this.pc.addIceCandidate(new RTCIceCandidate(message.candidate));
      }
    } catch (err) {
      console.error('Signaling error:', err);
    }
  }

  private sendSignalingMessage(message: SignalingMessage) {
    this.channel?.send({
      type: 'broadcast',
      event: 'signaling',
      payload: message,
    });
  }

  async sendFile(file: File) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Connection not ready. Please wait for direct connection.');
    }

    const fileInfo = { name: file.name, type: file.type, size: file.size };
    this.dataChannel.send(JSON.stringify(fileInfo));

    const CHUNK_SIZE = 16384; // 16KB
    const buffer = await file.arrayBuffer();
    
    for (let offset = 0; offset < buffer.byteLength; offset += CHUNK_SIZE) {
      const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
      this.dataChannel.send(chunk);
      
      const progress = Math.round((offset / buffer.byteLength) * 100);
      this.onProgress?.(progress);

      // Throttle to avoid buffer overflow
      if (this.dataChannel.bufferedAmount > CHUNK_SIZE * 20) {
        await new Promise(r => {
          const check = () => {
            if (this.dataChannel!.bufferedAmount < CHUNK_SIZE * 10) {
              r(null);
            } else {
              setTimeout(check, 30);
            }
          };
          check();
        });
      }
    }

    this.dataChannel.send('END');
    this.onProgress?.(100);
  }

  destroy() {
    this.dataChannel?.close();
    this.pc?.close();
    if (this.channel) {
      airsendSupabase.removeChannel(this.channel);
    }
  }
}
