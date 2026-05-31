import {
    mediaDevices,
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate
} from 'react-native-webrtc';

class WebRTCService {
    constructor() {
        this.localStream = null;
        this.peerConnection = null;
        this.pcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ]
        };
    }

    async getLocalStream(isVideo = true) {
        try {
            const constraints = {
                audio: true,
                video: isVideo ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                } : false
            };

            this.localStream = await mediaDevices.getUserMedia(constraints);
            return this.localStream;
        } catch (error) {
            console.error('Error getting local stream:', error);
            throw error;
        }
    }

    stopLocalStream() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                track.stop();
            });
            this.localStream = null;
        }
    }

    createPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.pcConfig);
        return this.peerConnection;
    }

    async createOffer() {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        return offer;
    }

    async createAnswer() {
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        return answer;
    }

    async setRemoteDescription(description) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
    }

    async addIceCandidate(candidate) {
        if (candidate) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }

    closeConnection() {
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        this.stopLocalStream();
    }

    // Add tracks to peer connection
    addTracks() {
        if (this.localStream && this.peerConnection) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }
    }
}

export default new WebRTCService();