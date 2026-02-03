import { airsendSupabase } from '@/integrations/supabase/airsend-client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface AirSendFile {
  name: string;
  type: string;
  data: ArrayBuffer;
}

type SignalingMessage = 
  | { type: 'ready' }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit };

enum PacketType {
  METADATA = 0,
  CHUNK = 1,
  END = 2
}

const CHUNK_SIZE = 64 * 1024;
const BUFFER_THRESHOLD = CHUNK_SIZE * 8;
const MAX_FILE_SIZE = 500 * 1024 * 1024;

export class AirSendP2P {
  private pc: RTCPeerConnection | null = null;
  private channel: RealtimeChannel | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private sessionCode: string;
  private isReceiver: boolean;
  private onFileReceived?: (file: AirSendFile) => void;
  private onStatusChange?: (status: string) => void;
  private onProgress?: (progress: number) => void;
  
  private iceCandidatesQueue: RTCIceCandidateInit[] = [];
  private remoteDescriptionSet = false;
  private isSubscribed = false;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
  private readyInterval: ReturnType<typeof setInterval> | null = null;
  private maxRetries = 3;
  private currentRetry = 0;
  private destroyed = false;

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

    this.channel = airsendSupabase.channel(`airsend:${this.sessionCode}`, {
      config: { broadcast: { self: false } },
    });

    this.channel
      .on('broadcast', { event: 'signaling' }, (payload) => {
        if (!this.destroyed) {
          this.handleSignalingMessage(payload.payload as SignalingMessage);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && !this.destroyed) {
          this.isSubscribed = true;
          this.onStatusChange?.('Waiting for peer...');
          if (this.isReceiver) {
            this.sendSignalingMessage({ type: 'ready' });
            this.readyInterval = setInterval(() => {
              if (!this.destroyed && this.pc?.connectionState !== 'connected') {
                this.sendSignalingMessage({ type: 'ready' });
              } else if (this.readyInterval) {
                clearInterval(this.readyInterval);
                this.readyInterval = null;
              }
            }, 2000);
          }
        }
      });

    this.setupPeerConnection();
  }

  private setupPeerConnection() {
    // Use max 2 STUN servers - Chrome warns that 5+ servers slow down ICE discovery
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    this.pc = new RTCPeerConnection(configuration);

    this.pc.onicecandidate = (event) => {
      if (event.candidate && !this.destroyed) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (this.destroyed) return;
      const state = this.pc?.connectionState;
      if (state === 'connected') {
        this.onStatusChange?.('Connected');
        this.clearConnectionTimeout();
        if (this.readyInterval) {
          clearInterval(this.readyInterval);
          this.readyInterval = null;
        }
      } else if (state === 'failed' || state === 'disconnected') {
        if (!this.isReceiver && this.currentRetry < this.maxRetries) {
          this.currentRetry++;
          this.onStatusChange?.(`Reconnecting (${this.currentRetry}/${this.maxRetries})...`);
          this.restartIce();
        } else {
          this.onStatusChange?.('Connection failed. Please refresh.');
        }
      } else if (state === 'connecting') {
        this.onStatusChange?.('Connecting...');
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
    this.dataChannel.bufferedAmountLowThreshold = BUFFER_THRESHOLD;
    
    let receivedChunks: ArrayBuffer[] = [];
    let fileMetadata: { name: string; type: string; size: number } | null = null;
    let bytesReceived = 0;

    this.dataChannel.onopen = () => {
      if (this.destroyed) return;
      this.onStatusChange?.('Channel open - Ready to transfer');
      this.currentRetry = 0;
    };

    this.dataChannel.onerror = (e) => {
      console.error('DataChannel error:', e);
      if (!this.destroyed) {
        this.onStatusChange?.('Channel error occurred');
      }
    };

    this.dataChannel.onclose = () => {
      if (!this.destroyed) {
        this.onStatusChange?.('Channel closed');
      }
    };

    this.dataChannel.onmessage = async (event) => {
      if (this.destroyed) return;
      
      if (!(event.data instanceof ArrayBuffer)) return;
      
      const view = new DataView(event.data);
      const type = view.getUint8(0);

      switch (type) {
        case PacketType.METADATA: {
          const decoder = new TextDecoder();
          const jsonStr = decoder.decode(event.data.slice(1));
          try {
            fileMetadata = JSON.parse(jsonStr);
            receivedChunks = [];
            bytesReceived = 0;
            this.onStatusChange?.(`Receiving: ${fileMetadata?.name}`);
            this.onProgress?.(0);
          } catch (e) {
            console.error('Failed to parse metadata:', e);
          }
          break;
        }
        case PacketType.CHUNK: {
          const chunk = event.data.slice(1);
          receivedChunks.push(chunk);
          bytesReceived += chunk.byteLength;
          if (fileMetadata && fileMetadata.size > 0) {
            const progress = Math.min(99, Math.round((bytesReceived / fileMetadata.size) * 100));
            this.onProgress?.(progress);
          }
          break;
        }
        case PacketType.END: {
          if (fileMetadata) {
            if (fileMetadata.size === 0) {
              this.onFileReceived?.({
                name: fileMetadata.name,
                type: fileMetadata.type,
                data: new ArrayBuffer(0)
              });
            } else if (receivedChunks.length > 0) {
              const blob = new Blob(receivedChunks, { type: fileMetadata.type });
              if (blob.size !== fileMetadata.size) {
                console.warn(`Size mismatch: expected ${fileMetadata.size}, got ${blob.size}`);
              }
              const data = await blob.arrayBuffer();
              this.onFileReceived?.({
                name: fileMetadata.name,
                type: fileMetadata.type,
                data
              });
            }
            this.onStatusChange?.('Transfer complete');
            this.onProgress?.(100);
            receivedChunks = [];
            fileMetadata = null;
            bytesReceived = 0;
          }
          break;
        }
      }
    };
  }

  private async handleSignalingMessage(message: SignalingMessage) {
    if (!this.pc || this.destroyed) return;

    try {
      switch (message.type) {
        case 'ready':
          if (!this.isReceiver && !this.dataChannel) {
            await this.initiateConnection();
          }
          break;
        case 'offer':
          if (this.isReceiver) {
            this.iceCandidatesQueue = [];
            await this.pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
            this.remoteDescriptionSet = true;
            await this.processQueuedIceCandidates();
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            this.sendSignalingMessage({ type: 'answer', sdp: answer });
          }
          break;
        case 'answer':
          if (!this.isReceiver && this.pc.signalingState === 'have-local-offer') {
            this.iceCandidatesQueue = [];
            await this.pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
            this.remoteDescriptionSet = true;
            await this.processQueuedIceCandidates();
          }
          break;
        case 'ice-candidate':
          if (!message.candidate) break;
          if (this.remoteDescriptionSet) {
            try {
              await this.pc.addIceCandidate(new RTCIceCandidate(message.candidate));
            } catch (e) {
              if (!this.destroyed) console.warn('Failed to add ICE candidate:', e);
            }
          } else {
            this.iceCandidatesQueue.push(message.candidate);
          }
          break;
      }
    } catch (err) {
      console.error('Signaling error:', err);
    }
  }

  private async initiateConnection() {
    if (!this.pc || this.isReceiver || this.destroyed) return;

    this.dataChannel = this.pc.createDataChannel('airsend-p2p', { ordered: true });
    this.setupDataChannel(this.dataChannel);

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.sendSignalingMessage({ type: 'offer', sdp: offer });

    this.connectionTimeout = setTimeout(() => {
      if (!this.destroyed && this.pc?.connectionState !== 'connected') {
        this.onStatusChange?.('Connection timeout. Retrying...');
        this.restartIce();
      }
    }, 15000);
  }

  private async processQueuedIceCandidates() {
    while (this.iceCandidatesQueue.length > 0) {
      const candidate = this.iceCandidatesQueue.shift();
      if (candidate && this.pc && !this.destroyed) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Failed to add ICE candidate:', e);
        }
      }
    }
  }

  private sendSignalingMessage(message: SignalingMessage) {
    if (this.isSubscribed && !this.destroyed) {
      this.channel?.send({
        type: 'broadcast',
        event: 'signaling',
        payload: message,
      });
    }
  }

  isReady(): boolean {
    return this.dataChannel?.readyState === 'open';
  }

  async sendFile(file: File) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Connection not ready. Please wait for channel to open.');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    const metadata = JSON.stringify({ name: file.name, type: file.type, size: file.size });
    const metaBuffer = new TextEncoder().encode(metadata);
    const metaPacket = new Uint8Array(1 + metaBuffer.byteLength);
    metaPacket[0] = PacketType.METADATA;
    metaPacket.set(metaBuffer, 1);
    this.dataChannel.send(metaPacket);

    if (file.size === 0) {
      const endPacket = new Uint8Array([PacketType.END]);
      this.dataChannel.send(endPacket);
      this.onProgress?.(100);
      return;
    }

    const buffer = await file.arrayBuffer();
    let offset = 0;

    while (offset < buffer.byteLength) {
      if (this.destroyed) {
        throw new Error('Connection destroyed during transfer');
      }

      if (this.dataChannel.bufferedAmount > BUFFER_THRESHOLD) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            this.dataChannel?.removeEventListener('bufferedamountlow', handleLow);
            reject(new Error('Buffer drain timeout'));
          }, 30000);
          
          const handleLow = () => {
            clearTimeout(timeout);
            this.dataChannel?.removeEventListener('bufferedamountlow', handleLow);
            resolve();
          };
          this.dataChannel?.addEventListener('bufferedamountlow', handleLow);
        });
      }

      const end = Math.min(offset + CHUNK_SIZE, buffer.byteLength);
      const chunk = buffer.slice(offset, end);
      const packet = new Uint8Array(1 + chunk.byteLength);
      packet[0] = PacketType.CHUNK;
      packet.set(new Uint8Array(chunk), 1);
      
      this.dataChannel.send(packet);
      offset = end;
      this.onProgress?.(Math.round((offset / buffer.byteLength) * 100));
    }

    const endPacket = new Uint8Array([PacketType.END]);
    this.dataChannel.send(endPacket);
    this.onProgress?.(100);
  }

  private async restartIce() {
    if (!this.pc || this.isReceiver || this.destroyed) return;
    try {
      this.clearConnectionTimeout();
      this.iceCandidatesQueue = [];
      this.remoteDescriptionSet = false;
      const offer = await this.pc.createOffer({ iceRestart: true });
      await this.pc.setLocalDescription(offer);
      this.sendSignalingMessage({ type: 'offer', sdp: offer });
      this.connectionTimeout = setTimeout(() => {
        if (!this.destroyed && this.pc?.connectionState !== 'connected') {
          this.onStatusChange?.('Connection timeout. Retrying...');
          this.restartIce();
        }
      }, 15000);
    } catch (err) {
      console.error('ICE restart failed:', err);
    }
  }

  private clearConnectionTimeout() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  destroy() {
    this.destroyed = true;
    this.clearConnectionTimeout();
    if (this.readyInterval) {
      clearInterval(this.readyInterval);
      this.readyInterval = null;
    }
    this.dataChannel?.close();
    this.pc?.close();
    if (this.channel) {
      airsendSupabase.removeChannel(this.channel);
    }
    this.dataChannel = null;
    this.pc = null;
    this.channel = null;
  }
}
