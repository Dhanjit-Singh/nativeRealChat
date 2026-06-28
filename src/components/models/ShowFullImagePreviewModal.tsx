import { Modal, View, TouchableOpacity, Image, StyleSheet, Alert, Platform } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useState } from 'react';

interface ImagePreviewModalProps {
    visible: boolean;
    imageUri: string;
    onClose: () => void;
}

const ShowFullImagePreviewModal = ({ visible, imageUri, onClose }: ImagePreviewModalProps) => {
    const [downloading, setDownloading] = useState(false);

    const downloadImage = async () => {
        if (!imageUri) return;

        try {
            setDownloading(true);

            // Request permission
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please grant permission to save images');
                return;
            }

            // Generate filename
            const filename = `image_${Date.now()}.jpg`;
            const downloadPath = FileSystem.documentDirectory + filename;

            // Download image
            const result = await FileSystem.downloadAsync(imageUri, downloadPath);

            // Save to gallery
            await MediaLibrary.saveToLibraryAsync(result.uri);

            Alert.alert('Success', 'Image saved to gallery');
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Error', 'Failed to download image');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={downloadImage}
                        style={styles.downloadButton}
                        disabled={downloading}
                    >
                        <Ionicons
                            name={downloading ? "hourglass" : "download-outline"}
                            size={24}
                            color="#fff"
                        />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    activeOpacity={1}
                    style={styles.imageContainer}
                    onPress={onClose}
                >
                    <Image
                        source={{ uri: imageUri }}
                        style={styles.fullImage}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

export default ShowFullImagePreviewModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        zIndex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    closeButton: {
        padding: 8,
    },
    downloadButton: {
        padding: 8,
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
});