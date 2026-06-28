import { View, Text, TouchableOpacity, StyleSheet, Modal, Image, Platform } from "react-native";
import { Ionicons } from '@expo/vector-icons';

interface ImagePreviewModalComponentProps {
    visible: boolean;
    imageUri: string | null;
    onClose: () => void;
    onCrop: () => void;
    onSend: () => void;
};

const ImagePreviewModalComponent = ({
    visible,
    imageUri,
    onClose,
    onCrop,
    onSend
}: ImagePreviewModalComponentProps) => {
    return (
        <>
            <Modal
                visible={visible}
                transparent={true}
                animationType="slide"
                onRequestClose={onClose}
            >
                <View style={imagePreviewStyles.container}>
                    <View style={imagePreviewStyles.header}>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                        <Text style={imagePreviewStyles.title}>Preview Image</Text>
                        <TouchableOpacity onPress={onCrop}>
                            <Ionicons name="crop" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {imageUri && (
                        <Image
                            source={{ uri: imageUri }}
                            style={imagePreviewStyles.image}
                            resizeMode="contain"
                        />
                    )}

                    <View style={imagePreviewStyles.footer}>
                        <TouchableOpacity
                            style={imagePreviewStyles.sendButton}
                            onPress={onSend}
                        >
                            <Ionicons name="send" size={24} color="#fff" />
                            <Text style={imagePreviewStyles.sendText}>Send Image</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
};

export default ImagePreviewModalComponent;

const imagePreviewStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        maxHeight: "95%",
        paddingTop: 50
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: Platform.OS === 'ios' ? 48 : 16,
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    image: {
        flex: 1,
        width: '100%',
    },
    footer: {
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.8)',
        alignItems: 'center',
        marginHorizontal: 15,
    },
    sendButton: {
        backgroundColor: '#075e54',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 25,
        width: '100%',
    },

    sendText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
        flexShrink: 1,
        minWidth: 100,
    },
});