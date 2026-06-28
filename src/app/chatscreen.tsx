import { View, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Image, Modal, Alert, ScrollView, RefreshControl } from "react-native";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLoading } from "@/context/LoadingContext";
import CallScreen from "@/components/CallScreen";
import InCallManager from "react-native-incall-manager";
import { Audio } from 'expo-av';
import { useSocket } from "@/context/SocketContext";
import MediaOptionsModal from "../components/models/MediaOptionsModal";
import ImagePreviewModalComponent from "../components/models/ImagePreviewModalComponent";
import ShowFullImagePreviewModal from "../components/models/ShowFullImagePreviewModal";
import { ChatHeader } from "../components/ChatHeader";
import { MessageBubble } from "../components/MessageBubble";


type Message = {
    _id: string;
    text?: string;
    image?: string;
    imageUrl?: string;
    sender: {
        _id: string;
        email: string;
        name: string;
    };
    createdAt: string;
    messageType: string;
    readBy?: string[];
};

type DisplayMessage = {
    id: string;
    text?: string;
    image?: string;
    sender: string;
    time: string;
    status: string;
    senderName: string;
};

export default function ChatScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [message, setMessage] = useState("");
    const [showOptions, setShowOptions] = useState(false);
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [showMediaOptions, setShowMediaOptions] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string>("");
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);
    const flatListRef = useRef<FlatList<DisplayMessage> | null>(null);
    const { showLoader, hideLoader } = useLoading();

    const [callVisible, setCallVisible] = useState(false);
    const [callType, setCallType] = useState(null);
    const [isInitiator, setIsInitiator] = useState(false);
    const [incomingCall, setIncomingCall] = useState(null);
    const [callConnecting, setCallConnecting] = useState(false);
    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
    const [showImagePreview, setShowImagePreview] = useState(false);
    const [fullImageVisible, setFullImageVisible] = useState(false);
    const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);
    const [imageSizes, setImageSizes] = useState<{ [key: string]: { width: number, height: number } }>({});


    const { chatId, userId, userName, userAvatar, userEmail, userPhone, userStatus, isOnline, lastSeen } = params;

    const {
        socket,
        onlineUsers,
        isConnected,
    } = useSocket();

    const isChatUserOnline = onlineUsers.includes(userId as string);

    useEffect(() => {
        if (!socket) return;

        // Listen for incoming calls (matching React app)
        const handleIncomingCall = ({ from, fromName, callType: incomingType }) => {
            console.log('📞 Incoming call from:', fromName);
            setIncomingCall({
                from,
                fromName,
                callType: incomingType
            });
        };

        // Listen for call acceptance
        const handleCallAccepted = ({ from }) => {
            console.log('Call accepted by:', from);
            setCallConnecting(false);
            // Don't show alert, just update state
        };

        // Listen for call rejection
        const handleCallRejected = () => {
            console.log('Call rejected');
            setCallConnecting(false);
            Alert.alert('Call Rejected', 'The user declined your call');
        };

        // Listen for call ended by other user
        const handleCallEnded = () => {
            console.log('Call ended by other user');
            endCall(false);
            Alert.alert('Call Ended', 'The call has ended');
        };

        socket.on('incoming-call', handleIncomingCall);
        socket.on('call-accepted', handleCallAccepted);
        socket.on('call-rejected', handleCallRejected);
        socket.on('call-ended', handleCallEnded);

        return () => {
            socket.off('incoming-call', handleIncomingCall);
            socket.off('call-accepted', handleCallAccepted);
            socket.off('call-rejected', handleCallRejected);
            socket.off('call-ended', handleCallEnded);
        };
    }, [socket]);

    // Get current user from storage
    useEffect(() => {
        const getCurrentUser = async () => {
            try {
                const userString = await AsyncStorage.getItem('user');
                if (userString) {
                    const user = JSON.parse(userString);
                    setCurrentUser(user);
                    if (user && user.id) {
                        setCurrentUserId(user.id);
                        console.log("Current user ID set to:", user.id);
                    }
                }
            } catch (error) {
                console.error("Error getting user:", error);
            }
        };
        getCurrentUser();
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (msg) => {

            const incomingChatId = msg.chat || msg.chatId;

            if (incomingChatId !== chatId) {
                return;
            }

            const senderId = msg.sender?._id || msg.senderId;

            const isMe = senderId === currentUserId;

            const newMessage = {
                id: msg._id,
                text: msg.text,
                image: msg.imageUrl,
                sender: isMe ? "me" : "other",
                time: new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
                status: "delivered",
                senderName: msg.sender?.name || userName || "User",
            };

            setMessages(prev => {

                const senderId = msg.sender?._id || msg.senderId;

                const isMyMessage = senderId === currentUserId;

                if (isMyMessage) {

                    const tempIndex = prev.findIndex(
                        m =>
                            m.sender === "me" &&
                            m.text === msg.text &&
                            m.status === "sending"
                    );

                    if (tempIndex !== -1) {

                        const updated = [...prev];

                        updated[tempIndex] = {
                            ...updated[tempIndex],
                            id: msg._id,
                            status: "delivered",
                        };

                        return updated;
                    }
                }

                const exists = prev.some(m => m.id === msg._id);

                if (exists) {
                    return prev;
                }

                return [...prev, newMessage];
            });

            requestAnimationFrame(() => {
                flatListRef.current?.scrollToEnd({
                    animated: true,
                });
            });
        };

        // Listen for image messages
        const handleReceiveImage = (imageMsg: any) => {

            if (imageMsg.chat !== chatId) return;

            setMessages((prev) => {
                const exists = prev.some((m) => m.id === imageMsg._id);
                if (exists) return prev;

                const isMe = imageMsg.senderId === currentUserId;
                const newMessage: DisplayMessage = {
                    id: imageMsg._id || Date.now().toString(),
                    image: imageMsg.imageUrl,
                    sender: isMe ? "me" : "other",
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: "delivered",
                    senderName: isMe ? "Me" : (userName as string) || "User"
                };
                return [...prev, newMessage];
            });

            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        };

        socket.on('receiveMessage', handleReceiveMessage);
        socket.on('receiveImage', handleReceiveImage);

        return () => {
            socket.off('receiveMessage', handleReceiveMessage);
            socket.off('receiveImage', handleReceiveImage);
        };
    }, [socket, chatId, currentUserId, userName]);

    useEffect(() => {
        if (socket && chatId) {
            socket.emit(
                "joinChat",
                chatId
            );
        }
    }, [socket, chatId]);

    const fetchChat = useCallback(async (showLoadingIndicator = false) => {
        if (!chatId || !currentUserId) return;

        if (showLoadingIndicator) {
            showLoader("Loading messages...");
        }

        try {
            const response = await axios.get(`https://real-chat-backend-c3nm.onrender.com/api/messages/${chatId}`);
            console.log("📚 Fetched messages count:", response.data.length);
            // console.log("📚 Fetched messages:", response.data);

            const transformedMessages: DisplayMessage[] = response.data.map((msg: Message) => {
                const isMe = msg.sender._id === currentUserId;

                return {
                    id: msg._id,
                    text: msg.text,
                    image: msg.imageUrl,
                    sender: isMe ? "me" : "other",
                    time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: msg.readBy?.includes(currentUserId) ? "read" : "delivered",
                    senderName: msg.sender.name
                };
            });

            setMessages(transformedMessages);
            // setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({
                    animated: false,
                });
            }, 300);

        } catch (error: any) {
            console.error("❌ Error fetching messages:", error.response?.data?.message || error.message);
            if (showLoadingIndicator) {
                Alert.alert("Error", "Failed to load messages");
            }
        } finally {
            if (showLoadingIndicator) {
                hideLoader();
            }
        }
    }, [chatId, currentUserId, showLoader, hideLoader]);

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
        }
    }, [messages]);

    const sendMessage = () => {
        const textToSend = message.trim();

        if (!textToSend) return;

        if (!socket || !socket.connected) {
            Alert.alert("Error", "Not connected to server");
            return;
        }

        const tempId = `temp-${Date.now()}`;

        const optimisticMessage: DisplayMessage = {
            id: tempId,
            text: textToSend,
            sender: "me",
            time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            }),
            status: "sending",
            senderName: "Me",
        };

        setMessages(prev => [...prev, optimisticMessage]);

        setMessage("");

        setTimeout(() => {
            flatListRef.current?.scrollToEnd({
                animated: true,
            });
        }, 150);

        socket.emit("sendMessage", {
            chatId,
            senderId: currentUserId,
            text: textToSend,
            tempId,
        });
    };

    useEffect(() => {
        if (!chatId || !currentUserId) return;

        fetchChat(true);
    }, [chatId, currentUserId]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchChat(true);
        setRefreshing(false);
    }, [fetchChat]);

    const handleImagePick = async () => {
        setShowMediaOptions(false);
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant permission to access your photos');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.8,
            allowsMultipleSelection: false,
        });

        if (!result.canceled && result.assets[0]) {
            // Show preview instead of uploading immediately
            setTimeout(() => {
                setSelectedImageUri(result.assets[0].uri);
                setShowImagePreview(true);
            }, 100);
        }
    };

    const handleCropImage = async () => {
        if (!selectedImageUri) return;

        // Use ImagePicker's crop capability only when user wants to crop
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 1,
            aspect: [4, 3], // Optional: specify crop aspect ratio
            base64: false,
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedImageUri(result.assets[0].uri);
            setShowImagePreview(true);
        }
    };

    const sendSelectedImage = async () => {
        if (!selectedImageUri) return;

        setShowImagePreview(false);
        showLoader("Uploading image...");

        const formData = new FormData();
        formData.append('image', {
            uri: selectedImageUri,
            type: 'image/jpeg',
            name: `photo_${Date.now()}.jpg`,
        } as any);
        formData.append('chatId', chatId as string);
        formData.append('senderId', currentUserId);

        try {
            const response = await axios.post(
                `https://real-chat-backend-c3nm.onrender.com/api/messages/send-image`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                }
            );

            if (socket && socket.connected) {
                socket.emit("sendImage", {
                    chatId: chatId,
                    senderId: currentUserId,
                    imageUrl: response.data.imageUrl,
                    imageName: response.data.imageName,
                    imageSize: response.data.imageSize,
                    messageId: response.data._id
                });
            }

            await fetchChat(false);
            setSelectedImageUri(null);

            // Optional: Show success feedback
            // Alert.alert("Success", "Image sent successfully");
        } catch (error) {
            console.error("Error uploading image:", error);
            Alert.alert("Error", "Failed to upload image");
        } finally {
            hideLoader();
        }
    };

    const cancelImagePreview = () => {
        setShowImagePreview(false);
        setSelectedImageUri(null);
    };

    const handleCamera = async () => {
        setShowMediaOptions(false);

        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant permission to access camera');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedImageUri(result.assets[0].uri);
            setShowImagePreview(true);
        }
    };

    const handleCall = () => {
        // Alert.alert(
        //     "Call Feature",
        //     "Video/Audio calling is coming soon!",
        //     [{ text: "OK" }]
        // );

        startCall('audio');
    };

    const handleVideoCall = () => {
        // Alert.alert(
        //     "Video Call Feature",
        //     "Video calling is coming soon!",
        //     [{ text: "OK" }]
        // );

        startCall('video');
    };

    const startCall = async (type: any) => {
        if (callConnecting || callVisible) {
            return;
        }

        setCallConnecting(true);

        try {
            // Request microphone permission using expo-av
            const { status: audioStatus } = await Audio.requestPermissionsAsync();

            let cameraStatus = { status: 'granted' };
            if (type === 'video') {
                // Request camera permission only for video calls
                const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
                cameraStatus = cameraPermission;
            }

            if (type === 'video' && cameraStatus.status !== 'granted') {
                Alert.alert('Permission needed', 'Camera permission is required for video calls');
                setCallConnecting(false);
                return;
            }

            if (audioStatus !== 'granted') {
                Alert.alert('Permission needed', 'Microphone permission is required for calls');
                setCallConnecting(false);
                return;
            }

            // Set audio mode for calls
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            // Start InCallManager
            InCallManager.start({ media: type === 'video' ? 'video' : 'audio' });

            // Emit call initiation
            socket.emit('initiate-call', {
                to: chatId,
                from: currentUserId,
                fromName: currentUser?.name,
                chatId: chatId,
                callType: type
            });

            // Show the call screen
            setCallType(type);
            setIsInitiator(true);
            setCallVisible(true);
            setCallConnecting(false);
        } catch (error) {
            console.error('Error starting call:', error);
            Alert.alert('Error', 'Failed to start call');
            setCallConnecting(false);
            InCallManager.stop();
        }
    };

    const acceptCall = () => {
        setCallType(incomingCall.callType);
        setIsInitiator(false);
        setCallVisible(true);
        setIncomingCall(null);

        // Emit call acceptance
        socket.emit('accept-call', {
            to: incomingCall.from,
            from: currentUserId,
            chatId: chatId
        });
    };

    const rejectCall = () => {
        socket.emit('reject-call', {
            to: incomingCall.from,
            from: currentUserId,
            chatId: chatId
        });
        setIncomingCall(null);
        InCallManager.stop();
    };

    const endCall = (emitToOther = true) => {
        setCallVisible(false);
        setCallType(null);
        setIsInitiator(false);
        setCallConnecting(false);
        InCallManager.stop();

        if (emitToOther && socket) {
            socket.emit('end-call', {
                to: chatId,
                from: currentUserId,
                chatId: chatId
            });
        }
    };

    // Add Incoming Call Modal component
    const IncomingCallModal = () => (
        <Modal
            visible={!!incomingCall && !callVisible}
            transparent={true}
            animationType="fade"
        >
            <View style={additionalStyles.incomingCallOverlay}>
                <View style={additionalStyles.incomingCallCard}>
                    <View style={additionalStyles.incomingCallAvatar}>
                        <Text style={additionalStyles.incomingCallAvatarText}>
                            {incomingCall?.fromName?.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text style={additionalStyles.incomingCallName}>{incomingCall?.fromName}</Text>
                    <Text style={additionalStyles.incomingCallType}>
                        {incomingCall?.callType === 'video' ? 'Video Call' : 'Audio Call'}
                    </Text>

                    <View style={additionalStyles.incomingCallActions}>
                        <TouchableOpacity
                            style={[additionalStyles.incomingCallButton, additionalStyles.rejectButton]}
                            onPress={rejectCall}
                        >
                            <Ionicons name="call" size={28} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[additionalStyles.incomingCallButton, additionalStyles.acceptButton]}
                            onPress={acceptCall}
                        >
                            <Ionicons name="call" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const additionalStyles = StyleSheet.create({
        incomingCallOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.9)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        incomingCallCard: {
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 24,
            alignItems: 'center',
            width: '80%',
        },
        incomingCallAvatar: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#075e54',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
        },
        incomingCallAvatarText: {
            fontSize: 32,
            color: '#fff',
            fontWeight: 'bold',
        },
        incomingCallName: {
            fontSize: 20,
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: 8,
        },
        incomingCallType: {
            fontSize: 14,
            color: '#6b7280',
            marginBottom: 24,
        },
        incomingCallActions: {
            flexDirection: 'row',
            gap: 20,
        },
        incomingCallButton: {
            width: 60,
            height: 60,
            borderRadius: 30,
            justifyContent: 'center',
            alignItems: 'center',
        },
        acceptButton: {
            backgroundColor: '#22c55e',
        },
        rejectButton: {
            backgroundColor: '#ef4444',
            transform: [{ rotate: '135deg' }],
        },
    });

    const handleImageLoad = (id: string, width: number, height: number) => {
        const maxWidth = 250;
        const maxHeight = 300;

        let newWidth = Math.min(width, maxWidth);
        let newHeight = (newWidth / width) * height;

        if (newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = (maxHeight / height) * width;
        }

        setImageSizes(prev => ({
            ...prev,
            [id]: { width: newWidth, height: newHeight }
        }));
    };

    const ChatOptionsModal = () => (
        <Modal
            visible={showOptions}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowOptions(false)}
        >
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptions(false)}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Chat Options</Text>
                        <TouchableOpacity onPress={() => setShowOptions(false)}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView>
                        <TouchableOpacity style={styles.modalOption}>
                            <Ionicons name="person-outline" size={24} color="#075e54" />
                            <Text style={styles.modalOptionText}>Contact Info</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption}>
                            <Ionicons name="notifications-off-outline" size={24} color="#075e54" />
                            <Text style={styles.modalOptionText}>Mute Notifications</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption}>
                            <Ionicons name="search-outline" size={24} color="#075e54" />
                            <Text style={styles.modalOptionText}>Search Messages</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption}>
                            <Ionicons name="color-palette-outline" size={24} color="#075e54" />
                            <Text style={styles.modalOptionText}>Wallpaper</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption}>
                            <Ionicons name="star-outline" size={24} color="#075e54" />
                            <Text style={styles.modalOptionText}>Starred Messages</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption}>
                            <Ionicons name="trash-outline" size={24} color="#dc2626" />
                            <Text style={[styles.modalOptionText, { color: "#dc2626" }]}>Clear Chat</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption}>
                            <Ionicons name="ban-outline" size={24} color="#dc2626" />
                            <Text style={[styles.modalOptionText, { color: "#dc2626" }]}>Block User</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption}>
                            <Ionicons name="flag-outline" size={24} color="#dc2626" />
                            <Text style={[styles.modalOptionText, { color: "#dc2626" }]}>Report</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const formatLastSeen = (dateString: string) => {
        if (!dateString) return "";

        const date = new Date(dateString);
        const now = new Date();

        const hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, "0");

        const formattedHours = hours % 12 || 12;
        const ampm = hours >= 12 ? "PM" : "AM";

        const time = `${formattedHours}:${minutes} ${ampm}`;

        if (date.toDateString() === now.toDateString()) {
            return `today at ${time}`;
        }

        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);

        if (date.toDateString() === yesterday.toDateString()) {
            return `yesterday at ${time}`;
        }

        return `${date.getDate()} ${date.toLocaleString("en-US", {
            month: "short",
        })} at ${time}`;
    };

    return (
        <>
            <ImagePreviewModalComponent
                visible={showImagePreview}
                imageUri={selectedImageUri}
                onClose={cancelImagePreview}
                onCrop={handleCropImage}
                onSend={sendSelectedImage}
            />

            <Stack.Screen
                options={{
                    header: () => (
                        <ChatHeader
                            userName={userName}
                            isChatUserOnline={isChatUserOnline}
                            lastSeen={lastSeen}
                            onBack={() => router.back()}
                            onCall={handleCall}
                            onVideoCall={handleVideoCall}
                            onOptions={() => setShowOptions(true)}
                            formatLastSeen={formatLastSeen}
                        />
                    ),
                    headerStyle: { backgroundColor: "#f0f2f5" },
                    headerShadowVisible: false,
                }}
            />

            < KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "padding"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 60}
            >
                <View style={styles.container}>
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={({ item }) => (
                            <MessageBubble
                                item={item}
                                imageSizes={imageSizes}
                                onImageLoad={handleImageLoad}
                                onImagePress={(uri) => {
                                    setSelectedFullImage(uri);
                                    setFullImageVisible(true);
                                }}
                            />
                        )}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.messagesContainer}
                        keyboardDismissMode="on-drag"
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={true}
                        initialNumToRender={50}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        updateCellsBatchingPeriod={30}
                        removeClippedSubviews={false}
                        onLayout={() => {
                            flatListRef.current?.scrollToEnd({
                                animated: false,
                            });
                        }}
                        // removeClippedSubviews={Platform.OS === 'android'}
                        onContentSizeChange={() => {
                            flatListRef.current?.scrollToEnd({ animated: false });
                        }}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={["#075e54"]}
                                tintColor="#075e54"
                            />
                        }
                        ListEmptyComponent={() => (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
                                <Text style={styles.emptyText}>No messages yet</Text>
                                <Text style={styles.emptySubText}>Start a conversation!</Text>
                            </View>
                        )}
                    />

                    <View style={styles.inputContainer}>
                        <TouchableOpacity style={styles.attachButton} onPress={() => setShowMediaOptions(true)}>
                            <Ionicons name="add-circle" size={28} color="#075e54" />
                        </TouchableOpacity>

                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            value={message}
                            onChangeText={setMessage}
                            multiline
                            maxLength={1000}
                            autoCorrect={false}
                            autoCapitalize="none"
                            spellCheck={false}
                            onBlur={() => {
                                // Don't trim the message
                                // Just keep as is
                            }}
                        />

                        {message.trim() ? (
                            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                                <Ionicons name="send" size={24} color="#075e54" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.micButton}>
                                <Ionicons name="mic" size={24} color="#075e54" />
                            </TouchableOpacity>
                        )}

                    </View>
                </View>
            </KeyboardAvoidingView >

            <ChatOptionsModal />
            <MediaOptionsModal
                visible={showMediaOptions}
                onClose={() => setShowMediaOptions(false)}
                onCamera={handleCamera}
                onGallery={handleImagePick}
            />
            <IncomingCallModal />

            <CallScreen
                visible={callVisible}
                callType={callType}
                isInitiator={isInitiator}
                remoteUserId={chatId}
                remoteUserName={userName}
                socket={socket}
                currentUserId={currentUserId}
                onEndCall={() => endCall(true)}
                onCallEnded={() => {
                    setCallVisible(false);
                    setIncomingCall(null);
                }}
            />


            <ShowFullImagePreviewModal
                visible={fullImageVisible}
                imageUri={selectedFullImage || ''}
                onClose={() => setFullImageVisible(false)}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f0f2f5",
        height: "100%",
    },
    messagesContainer: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        flexGrow: 1,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        marginBottom: 40,
    },
    attachButton: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        backgroundColor: "#f0f2f5",
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        maxHeight: 100,
    },
    sendButton: {
        marginLeft: 8,
    },
    micButton: {
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1f2937",
    },
    modalOption: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    modalOptionText: {
        fontSize: 16,
        marginLeft: 12,
        color: "#374151",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#666",
        marginTop: 16,
    },
    emptySubText: {
        fontSize: 14,
        color: "#999",
        marginTop: 8,
    },
    previewContainer: {
        backgroundColor: "#fff",
        padding: 10,
        borderTopWidth: 1,
        borderColor: "#ddd",
    },
    previewImage: {
        width: 150,
        height: 150,
        borderRadius: 10,
    },
    previewSendButton: {
        position: "absolute",
        right: 20,
        bottom: 20,
        backgroundColor: "#075e54",
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
    },
});