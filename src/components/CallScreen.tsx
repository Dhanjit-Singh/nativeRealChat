import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    SafeAreaView,
    Dimensions,
    Alert,
    Platform
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { Ionicons } from '@expo/vector-icons';
import InCallManager from 'react-native-incall-manager';
import WebRTCService from '../services/webrtcService';

const { width, height } = Dimensions.get('window');

const CallScreen = ({
    visible,
    callType,
    isInitiator,
    remoteUserId,
    remoteUserName,
    socket,
    currentUserId,
    onEndCall,
    onCallEnded
}) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isConnecting, setIsConnecting] = useState(true);
    const [callDuration, setCallDuration] = useState(0);
    const [speakerOn, setSpeakerOn] = useState(true);

    const callTimerRef = useRef(null);
    const peerConnectionRef = useRef(null);

    // Setup WebRTC
    useEffect(() => {
        if (visible) {
            setupWebRTC();
            startTimer();
            InCallManager.start({ media: callType === 'video' ? 'video' : 'audio' });
            InCallManager.setSpeakerphoneOn(true);
        }

        return () => {
            cleanupCall();
            stopTimer();
            InCallManager.stop();
        };
    }, [visible]);

    // Socket event listeners for WebRTC signaling
    useEffect(() => {
        if (!socket || !visible) return;

        const handleWebRTCOffer = async ({ from, offer }) => {
            console.log('Received offer from:', from);
            if (from !== remoteUserId) return;

            try {
                await WebRTCService.setRemoteDescription(offer);
                const answer = await WebRTCService.createAnswer();
                socket.emit('webrtc-answer', { to: remoteUserId, from: currentUserId, answer });
            } catch (error) {
                console.error('Error handling offer:', error);
            }
        };

        const handleWebRTCAnswer = async ({ from, answer }) => {
            console.log('Received answer from:', from);
            if (from !== remoteUserId) return;
            await WebRTCService.setRemoteDescription(answer);
        };

        const handleWebRTCIceCandidate = async ({ from, candidate }) => {
            console.log('Received ICE candidate from:', from);
            if (from !== remoteUserId) return;
            await WebRTCService.addIceCandidate(candidate);
        };

        socket.on('webrtc-offer', handleWebRTCOffer);
        socket.on('webrtc-answer', handleWebRTCAnswer);
        socket.on('webrtc-ice-candidate', handleWebRTCIceCandidate);

        return () => {
            socket.off('webrtc-offer', handleWebRTCOffer);
            socket.off('webrtc-answer', handleWebRTCAnswer);
            socket.off('webrtc-ice-candidate', handleWebRTCIceCandidate);
        };
    }, [socket, visible, remoteUserId, currentUserId]);

    const setupWebRTC = async () => {
        try {
            setIsConnecting(true);
            console.log('Setting up WebRTC...');

            // Get local stream
            const stream = await WebRTCService.getLocalStream(callType === 'video');
            setLocalStream(stream);

            // Create peer connection
            const peerConnection = WebRTCService.createPeerConnection();
            peerConnectionRef.current = peerConnection;

            // Add tracks to peer connection
            WebRTCService.addTracks();

            // Handle remote stream
            peerConnection.ontrack = (event) => {
                console.log('Received remote track:', event.track.kind);
                if (event.streams && event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                    setIsConnecting(false);
                }
            };

            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate && socket) {
                    console.log('Sending ICE candidate');
                    socket.emit('webrtc-ice-candidate', {
                        to: remoteUserId,
                        from: currentUserId,
                        candidate: event.candidate
                    });
                }
            };

            // Handle connection state
            peerConnection.onconnectionstatechange = () => {
                console.log('Connection state:', peerConnection.connectionState);
                if (peerConnection.connectionState === 'failed' || 
                    peerConnection.connectionState === 'disconnected') {
                    Alert.alert('Call Error', 'Connection lost');
                    endCall();
                }
            };

            // If initiator, create and send offer
            if (isInitiator) {
                console.log('Creating offer as initiator');
                const offer = await WebRTCService.createOffer();
                socket.emit('webrtc-offer', {
                    to: remoteUserId,
                    from: currentUserId,
                    offer
                });
            }

        } catch (error) {
            console.error('Error setting up WebRTC:', error);
            setIsConnecting(false);
            Alert.alert('Error', 'Failed to start call: ' + error.message);
            endCall();
        }
    };

    const cleanupCall = () => {
        console.log('Cleaning up call...');
        WebRTCService.closeConnection();
        setLocalStream(null);
        setRemoteStream(null);
        peerConnectionRef.current = null;
        setIsVideoEnabled(true);
        setIsAudioEnabled(true);
    };

    const startTimer = () => {
        setCallDuration(0);
        callTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    };

    const stopTimer = () => {
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
            }
        }
    };

    const toggleAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);
            }
        }
    };

    const toggleSpeaker = () => {
        const newState = !speakerOn;
        setSpeakerOn(newState);
        InCallManager.setSpeakerphoneOn(newState);
    };

    const endCall = () => {
        console.log('Ending call...');
        cleanupCall();
        stopTimer();

        if (socket && remoteUserId) {
            socket.emit('end-call', {
                to: remoteUserId,
                from: currentUserId,
                chatId: remoteUserId
            });
        }

        if (onEndCall) {
            onEndCall();
        }
        if (onCallEnded) {
            onCallEnded();
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent
        >
            <SafeAreaView style={styles.container}>
                {/* Remote Video (Full Screen) */}
                {callType === 'video' && remoteStream ? (
                    <RTCView
                        streamURL={remoteStream.toURL()}
                        style={styles.remoteVideo}
                        objectFit="cover"
                    />
                ) : (
                    <View style={styles.audioContainer}>
                        <View style={styles.avatarLarge}>
                            <Text style={styles.avatarLargeText}>
                                {remoteUserName?.charAt(0).toUpperCase() || '?'}
                            </Text>
                        </View>
                        <Text style={styles.remoteName}>{remoteUserName || 'User'}</Text>
                        <Text style={styles.callStatus}>
                            {isConnecting ? 'Connecting...' : formatDuration(callDuration)}
                        </Text>
                    </View>
                )}

                {/* Local Video (Picture-in-Picture) */}
                {callType === 'video' && localStream && (
                    <View style={styles.localVideoContainer}>
                        <RTCView
                            streamURL={localStream.toURL()}
                            style={styles.localVideo}
                            objectFit="cover"
                            mirror={true}
                        />
                    </View>
                )}

                {/* Call Duration for Video */}
                {callType === 'video' && !isConnecting && (
                    <View style={styles.durationContainer}>
                        <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
                    </View>
                )}

                {/* Connecting Overlay */}
                {isConnecting && (
                    <View style={styles.connectingOverlay}>
                        <Text style={styles.connectingText}>Establishing connection...</Text>
                    </View>
                )}

                {/* Call Controls */}
                <View style={styles.controlsContainer}>
                    <TouchableOpacity style={styles.controlButton} onPress={toggleAudio}>
                        <View style={[
                            styles.controlIcon,
                            !isAudioEnabled && styles.controlIconOff
                        ]}>
                            <Ionicons
                                name={isAudioEnabled ? "mic" : "mic-off"}
                                size={24}
                                color="#fff"
                            />
                        </View>
                        <Text style={styles.controlLabel}>Mic</Text>
                    </TouchableOpacity>

                    {callType === 'video' && (
                        <TouchableOpacity style={styles.controlButton} onPress={toggleVideo}>
                            <View style={[
                                styles.controlIcon,
                                !isVideoEnabled && styles.controlIconOff
                            ]}>
                                <Ionicons
                                    name={isVideoEnabled ? "videocam" : "videocam-off"}
                                    size={24}
                                    color="#fff"
                                />
                            </View>
                            <Text style={styles.controlLabel}>Video</Text>
                        </TouchableOpacity>
                    )}

                    {callType === 'audio' && (
                        <TouchableOpacity style={styles.controlButton} onPress={toggleSpeaker}>
                            <View style={styles.controlIcon}>
                                <Ionicons name={speakerOn ? "volume-high" : "volume-mute"} size={24} color="#fff" />
                            </View>
                            <Text style={styles.controlLabel}>Speaker</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.controlButton} onPress={endCall}>
                        <View style={[styles.controlIcon, styles.endCallIcon]}>
                            <Ionicons name="call" size={28} color="#fff" />
                        </View>
                        <Text style={styles.controlLabel}>End</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    remoteVideo: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    localVideoContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 16,
        width: 120,
        height: 160,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#fff',
        overflow: 'hidden',
        zIndex: 1,
        backgroundColor: '#000',
    },
    localVideo: {
        width: '100%',
        height: '100%',
    },
    audioContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    avatarLarge: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#075e54',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarLargeText: {
        fontSize: 48,
        color: '#fff',
        fontWeight: 'bold',
    },
    remoteName: {
        fontSize: 24,
        color: '#fff',
        fontWeight: '600',
        marginBottom: 8,
    },
    callStatus: {
        fontSize: 16,
        color: '#aaa',
    },
    durationContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    durationText: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        color: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        fontSize: 16,
        fontWeight: '500',
    },
    connectingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    connectingText: {
        color: '#fff',
        fontSize: 18,
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        gap: 30,
    },
    controlButton: {
        alignItems: 'center',
    },
    controlIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    controlIconOff: {
        backgroundColor: '#dc2626',
    },
    endCallIcon: {
        backgroundColor: '#dc2626',
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    controlLabel: {
        color: '#fff',
        fontSize: 12,
        marginTop: 4,
    },
});

export default CallScreen;