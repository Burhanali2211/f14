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
  
  private iceCandidatesQueue: RTCIceCandidateInit[] = [];
  private remoteDescriptionSet = false;
  private signalingQueue: any[] = [];
  private isSubscribed = false;

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

    this.onStatusChange?.('Initializing signaling...');

    // Join signaling channel
    this.channel = airsendSupabase.channel(`airsend:${this.sessionCode}`, {
      config: {
        broadcast: { self: false },
      },
    });

    this.channel
      .on('broadcast', { event: 'signaling' }, (payload) => {
        console.log('Received signaling message:', payload.payload.type);
        this.handleSignalingMessage(payload.payload as SignalingMessage);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Signaling channel subscribed');
          this.isSubscribed = true;
          this.onStatusChange?.('Signaling ready');
          
          // Send queued messages
          while (this.signalingQueue.length > 0) {
            const msg = this.signalingQueue.shift();
            this.sendSignalingMessage(msg);
          }

            // Wait a bit before initiating to ensure receiver is also ready
            if (!this.isReceiver) {
              setTimeout(() => {
                this.onStatusChange?.('Initiating connection...');
                this.initiateConnection();
              }, 2000);
            }
        }
      });

    this.setupPeerConnection();
  }

  private setupPeerConnection() {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
      ],
      iceCandidatePoolSize: 10,
    };

    this.pc = new RTCPeerConnection(configuration);

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('New ICE candidate:', event.candidate.type);
        this.sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    this.pc.onicecandidateerror = (event) => {
      console.warn('ICE candidate error:', event.errorText);
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      console.log('Connection state changed:', state);
      if (state === 'connected') {
        this.onStatusChange?.('Direct connection established');
      } else if (state === 'failed') {
        this.onStatusChange?.('Connection failed. Retrying...');
        this.restartIce();
      } else if (state === 'disconnected') {
        this.onStatusChange?.('Connection lost. Reconnecting...');
      } else {
        this.onStatusChange?.(`Connection: ${state}`);
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc?.iceConnectionState;
      console.log('ICE connection state:', state);
      if (state === 'failed') {
        this.onStatusChange?.('P2P connection failed. Network may be restrictive.');
      } else if (state === 'closed') {
        this.onStatusChange?.('Connection closed');
      }
    };

    if (this.isReceiver) {
      this.pc.ondatachannel = (event) => {
        console.log('Data channel received');
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
      console.log('Data channel opened');
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

    this.dataChannel.onerror = (err) => {
      console.error('Data channel error:', err);
      this.onStatusChange?.('Transfer error');
    };
  }

  private async initiateConnection() {
    if (!this.pc) return;

    console.log('Creating offer...');
    this.dataChannel = this.pc.createDataChannel('fileTransfer', {
      ordered: true
    });
    this.setupDataChannel(this.dataChannel);

    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      this.sendSignalingMessage({
        type: 'offer',
        sdp: offer,
      });
    } catch (err) {
      console.error('Failed to create offer:', err);
      this.onStatusChange?.('Failed to initiate connection');
    }
  }

  private async handleSignalingMessage(message: SignalingMessage) {
    if (!this.pc) return;

    try {
      if (message.type === 'offer' && this.isReceiver) {
        console.log('Received offer, setting remote description');
        await this.pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        this.remoteDescriptionSet = true;
        await this.processQueuedIceCandidates();
        
        console.log('Creating answer');
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.sendSignalingMessage({
          type: 'answer',
          sdp: answer,
        });
      } else if (message.type === 'answer' && !this.isReceiver) {
        console.log('Received answer, setting remote description');
        await this.pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        this.remoteDescriptionSet = true;
        await this.processQueuedIceCandidates();
      } else if (message.type === 'ice-candidate') {
        if (this.remoteDescriptionSet) {
          await this.pc.addIceCandidate(new RTCIceCandidate(message.candidate));
        } else {
          this.iceCandidatesQueue.push(message.candidate);
        }
      }
    } catch (err) {
      console.error('Signaling processing error:', err);
    }
  }

  private async processQueuedIceCandidates() {
    while (this.iceCandidatesQueue.length > 0) {
      const candidate = this.iceCandidatesQueue.shift();
      if (candidate && this.pc) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding queued ICE candidate:', err);
        }
      }
    }
  }

  private sendSignalingMessage(message: SignalingMessage) {
    if (!this.isSubscribed) {
      this.signalingQueue.push(message);
      return;
    }

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

  private async restartIce() {
    if (!this.pc || this.isReceiver) return;
    
    try {
      console.log('Restarting ICE...');
      const offer = await this.pc.createOffer({ iceRestart: true });
      await this.pc.setLocalDescription(offer);
      this.sendSignalingMessage({
        type: 'offer',
        sdp: offer,
      });
    } catch (err) {
      console.error('Failed to restart ICE:', err);
    }
  }

  destroy() {
    this.dataChannel?.close();
    this.pc?.close();
    if (this.channel) {
      airsendSupabase.removeChannel(this.channel);
    }
  }
}
