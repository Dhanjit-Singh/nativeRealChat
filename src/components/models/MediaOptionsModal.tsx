import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { Ionicons } from '@expo/vector-icons';

interface MediaOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    onCamera: () => void;
    onGallery: () => void;
    onDocument?: () => void;
    onLocation?: () => void;
    onAudio?: () => void;
    onVideo?: () => void;
};

const MediaOptionsModal = ({
    visible,
    onClose,
    onCamera,
    onGallery,
    onDocument,
    onLocation,
    onAudio,
    onVideo
}: MediaOptionsModalProps) => {


    return (
        <>
            <Modal
                visible={visible}
                transparent={true}
                animationType="slide"
                onRequestClose={onClose}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                    <View style={styles.mediaModalContent}>
                        <View style={styles.mediaModalHeader}>
                            <Text style={styles.modalTitle}>Add Media</Text>
                        </View>

                        <View style={styles.mediaOptions}>
                            <TouchableOpacity style={styles.mediaOption} onPress={onCamera}>
                                <View style={[styles.mediaIconBg, { backgroundColor: "#075e54" }]}>
                                    <Ionicons name="camera" size={28} color="#fff" />
                                </View>
                                <Text style={styles.mediaOptionText}>Camera</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.mediaOption} onPress={onGallery}>
                                <View style={[styles.mediaIconBg, { backgroundColor: "#128c7e" }]}>
                                    <Ionicons name="images" size={28} color="#fff" />
                                </View>
                                <Text style={styles.mediaOptionText}>Gallery</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.mediaOption} onPress={onDocument || onClose}>
                                <View style={[styles.mediaIconBg, { backgroundColor: "#dc2626" }]}>
                                    <Ionicons name="document" size={28} color="#fff" />
                                </View>
                                <Text style={styles.mediaOptionText}>Document</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.mediaOption} onPress={onLocation || onClose}>
                                <View style={[styles.mediaIconBg, { backgroundColor: "#34b7f1" }]}>
                                    <Ionicons name="location" size={28} color="#fff" />
                                </View>
                                <Text style={styles.mediaOptionText}>Location</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.mediaOption} onPress={onAudio || onClose}>
                                <View style={[styles.mediaIconBg, { backgroundColor: "#f39c12" }]}>
                                    <Ionicons name="mic" size={28} color="#fff" />
                                </View>
                                <Text style={styles.mediaOptionText}>Audio</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.mediaOption} onPress={onVideo || onClose}>
                                <View style={[styles.mediaIconBg, { backgroundColor: "#e74c3c" }]}>
                                    <Ionicons name="videocam" size={28} color="#fff" />
                                </View>
                                <Text style={styles.mediaOptionText}>Video</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
};

export default MediaOptionsModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1f2937",
    },
    mediaModalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    mediaModalHeader: {
        alignItems: "center",
        marginBottom: 20,
    },
    mediaOptions: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-around",
    },
    mediaOption: {
        alignItems: "center",
        width: "30%",
        marginBottom: 20,
    },
    mediaIconBg: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    mediaOptionText: {
        fontSize: 12,
        color: "#6b7280",
        marginTop: 4,
    },
});