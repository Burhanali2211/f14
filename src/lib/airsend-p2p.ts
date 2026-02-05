import { airsendSupabase } from '@/integrations/supabase/airsend-client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface AirSendFile {
  name: string;
  type: string;
  data: ArrayBuffer;
}

type SignalingMessage =
  | { type: 'ready' }
  | { type: 'request-restart' }
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
export const MAX_FILE_SIZE = 500 * 1024 * 1024;
/** Connection timeout - allow time for user to browse files (e.g. open file manager) */
const CONNECTION_TIMEOUT_MS = 180_000;
/** Grace period for 'disconnected' - user may switch apps to pick file, take time */
const DISCONNECTED_GRACE_MS = 120_000;
/** Buffer drain timeout - slow networks need more time */
const BUFFER_DRAIN_TIMEOUT_MS = 60_000;

const MAX_FILENAME_LENGTH = 255;
const SAFE_FILENAME_REGEX = /^[^<>:"/\\|?*\x00-\x1f]*$/;

function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  const turnUrl = import.meta.env.VITE_AIRSEND_TURN_URL;
  const turnUser = import.meta.env.VITE_AIRSEND_TURN_USER;
  const turnCred = import.meta.env.VITE_AIRSEND_TURN_CRED;
  if (turnUrl && turnUser && turnCred) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
  }
  return servers;
}

function sanitizeFilename(name: string): string {
  const base = name.replace(/^.*[/\\]/, '').slice(0, MAX_FILENAME_LENGTH);
  return SAFE_FILENAME_REGEX.test(base) ? base : base.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') || 'file';
}

interface FileMetadata {
  name: string;
  type: string;
  size: number;
}

function parseAndValidateMetadata(jsonStr: string): FileMetadata | null {
  try {
    const parsed = JSON.parse(jsonStr) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const { name, type, size } = parsed as Record<string, unknown>;
    if (typeof name !== 'string' || typeof type !== 'string' || typeof size !== 'number') return null;
    if (size < 0 || size > MAX_FILE_SIZE) return null;
    return { name: sanitizeFilename(name), type: type || 'application/octet-stream', size };
  } catch {
    return null;
  }
}

export class AirSendP2P {
  private pc: RTCPeerConnection | null = null;
  private channel: RealtimeChannel | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private sessionCode: string;
  private isReceiver: boolean;
  private onFileReceived?: (file: AirSendFile) => void;
  private onStatusChange?: (status: string) => void;
  private onProgress?: (progress: number) => void;
  private onConnectionLost?: () => void;

  private iceCandidatesQueue: RTCIceCandidateInit[] = [];
  private remoteDescriptionSet = false;
  private isSubscribed = false;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
  private disconnectedGraceTimeout: ReturnType<typeof setTimeout> | null = null;
  private readyInterval: ReturnType<typeof setInterval> | null = null;
  private maxRetries = 15;
  private currentRetry = 0;
  private destroyed = false;
  private sendAbortController: AbortController | null = null;

  constructor(sessionCode: string, isReceiver: boolean) {
    this.sessionCode = sessionCode;
    this.isReceiver = isReceiver;
  }

  async start(callbacks: {
    onFileReceived?: (file: AirSendFile) => void;
    onStatusChange?: (status: string) => void;
    onProgress?: (progress: number) => void;
    onConnectionLost?: () => void;
  }) {
    this.onFileReceived = callbacks.onFileReceived;
    this.onStatusChange = callbacks.onStatusChange;
    this.onProgress = callbacks.onProgress;
    this.onConnectionLost = callbacks.onConnectionLost;

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
    const configuration = { iceServers: getIceServers() };
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
        this.clearDisconnectedGraceTimeout();
        this.onStatusChange?.('Connected');
        this.clearConnectionTimeout();
        if (this.readyInterval) {
          clearInterval(this.readyInterval);
          this.readyInterval = null;
        }
      } else if (state === 'failed') {
        this.clearDisconnectedGraceTimeout();
        this.dataChannel = null;
        if (this.currentRetry < this.maxRetries) {
          this.currentRetry++;
          this.onStatusChange?.(`Reconnecting (${this.currentRetry}/${this.maxRetries})...`);
          if (this.isReceiver) {
            this.onConnectionLost?.();
            this.sendSignalingMessage({ type: 'ready' });
          } else {
            this.restartIce();
          }
        } else {
          if (this.isReceiver) this.onConnectionLost?.();
          this.onStatusChange?.('Connection failed. Please try again.');
        }
      } else if (state === 'closed') {
        this.dataChannel = null;
        if (this.isReceiver) this.onConnectionLost?.();
      } else if (state === 'disconnected') {
        this.onStatusChange?.('Connection paused - take your time selecting a file');
        if (this.currentRetry < this.maxRetries) {
          this.clearDisconnectedGraceTimeout();
          this.disconnectedGraceTimeout = setTimeout(() => {
            if (!this.destroyed && this.pc?.connectionState === 'disconnected') {
              this.disconnectedGraceTimeout = null;
              this.dataChannel = null;
              this.currentRetry++;
              this.onStatusChange?.(`Reconnecting (${this.currentRetry}/${this.maxRetries})...`);
              if (this.isReceiver) {
                this.onConnectionLost?.();
                this.sendSignalingMessage({ type: 'ready' });
              } else {
                this.restartIce();
              }
            }
          }, DISCONNECTED_GRACE_MS);
        } else {
          this.clearDisconnectedGraceTimeout();
          if (this.isReceiver) this.onConnectionLost?.();
          this.onStatusChange?.('Connection lost. Session will recover when you return.');
        }
      } else if (state === 'connecting') {
        this.clearDisconnectedGraceTimeout();
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
    let fileMetadata: FileMetadata | null = null;
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
          fileMetadata = parseAndValidateMetadata(jsonStr);
          receivedChunks = [];
          bytesReceived = 0;
          if (fileMetadata) {
            this.onStatusChange?.(`Receiving: ${fileMetadata.name}`);
            this.onProgress?.(0);
          } else {
            console.error('Invalid or malformed metadata');
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
                data: new ArrayBuffer(0),
              });
            } else if (receivedChunks.length > 0) {
              const blob = new Blob(receivedChunks, { type: fileMetadata.type });
              if (blob.size !== fileMetadata.size) {
                this.onStatusChange?.('Transfer failed: file corrupted (size mismatch)');
                console.error(`Size mismatch: expected ${fileMetadata.size}, got ${blob.size}`);
                receivedChunks = [];
                fileMetadata = null;
                bytesReceived = 0;
                break;
              }
              const data = await blob.arrayBuffer();
              this.onFileReceived?.({
                name: fileMetadata.name,
                type: fileMetadata.type,
                data,
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
          if (!this.isReceiver) {
            if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
              await this.initiateConnection();
            }
          }
          break;
        case 'request-restart':
          if (!this.isReceiver && this.currentRetry < this.maxRetries) {
            this.currentRetry++;
            this.onStatusChange?.(`Reconnecting (${this.currentRetry}/${this.maxRetries})...`);
            this.restartIce();
          }
          break;
        case 'offer':
          if (this.isReceiver) {
            this.iceCandidatesQueue = [];
            const state = this.pc?.connectionState;
            const needsNewPc = !this.pc || state === 'failed' || state === 'closed' || state === 'disconnected';
            if (needsNewPc) {
              this.pc?.close();
              this.dataChannel = null;
              this.currentRetry = 0;
              this.setupPeerConnection();
            }
            if (this.pc) {
              await this.pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
              this.remoteDescriptionSet = true;
              await this.processQueuedIceCandidates();
              const answer = await this.pc.createAnswer();
              await this.pc.setLocalDescription(answer);
              this.sendSignalingMessage({ type: 'answer', sdp: answer });
            }
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
    }, CONNECTION_TIMEOUT_MS);
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

  cancelSend(): void {
    this.sendAbortController?.abort();
  }

  async sendFile(file: File, options?: { signal?: AbortSignal }) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Connection not ready. Please wait for channel to open.');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    this.sendAbortController = new AbortController();
    const signal = options?.signal ?? this.sendAbortController.signal;

    const metadata = JSON.stringify({
      name: sanitizeFilename(file.name),
      type: file.type || 'application/octet-stream',
      size: file.size,
    });
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
      if (this.destroyed || signal.aborted) {
        throw new Error(signal.aborted ? 'Transfer cancelled' : 'Connection destroyed during transfer');
      }

      if (this.dataChannel.bufferedAmount > BUFFER_THRESHOLD) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            this.dataChannel?.removeEventListener('bufferedamountlow', handleLow);
            reject(new Error('Buffer drain timeout - network may be slow'));
          }, BUFFER_DRAIN_TIMEOUT_MS);

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
      this.clearDisconnectedGraceTimeout();
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
      }, CONNECTION_TIMEOUT_MS);
    } catch (err) {
      console.error('ICE restart failed:', err);
    }
  }

  private clearDisconnectedGraceTimeout() {
    if (this.disconnectedGraceTimeout) {
      clearTimeout(this.disconnectedGraceTimeout);
      this.disconnectedGraceTimeout = null;
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
    this.sendAbortController?.abort();
    this.clearConnectionTimeout();
    this.clearDisconnectedGraceTimeout();
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
