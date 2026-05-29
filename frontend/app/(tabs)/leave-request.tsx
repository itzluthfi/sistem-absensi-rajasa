import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { leaveRequestsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface LeaveRequest {
  id: number;
  student_id: number;
  permission_type: 'izin' | 'sakit';
  start_date: string;
  end_date: string;
  reason: string;
  attachment?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by?: number;
  approved_at?: string;
  created_at: string;
}

export default function LeaveRequestScreen() {
  const { hasRole } = useAuthStore();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [permissionType, setPermissionType] = useState<'izin' | 'sakit'>('izin');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const insets = useSafeAreaInsets();
  const safeBottom = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const paddingBottom = 64 + safeBottom + 24;
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const canApprove = hasRole(['guru', 'wali_kelas', 'admin', 'super_admin']);

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    setIsLoading(true);
    try {
      const response = await leaveRequestsApi.getAll();
      const payload = response.data?.data ?? response.data ?? [];
      setLeaveRequests(Array.isArray(payload) ? payload : []);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Gagal memuat data izin');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Error', 'Izin akses galeri diperlukan');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) setAttachment(result.assets[0]);
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate || !reason.trim()) {
      Alert.alert('Error', 'Tanggal dan alasan wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('permission_type', permissionType);
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
      formData.append('reason', reason.trim());
      if (attachment) {
        formData.append('attachment', {
          uri: attachment.uri,
          type: attachment.mimeType || 'image/jpeg',
          name: attachment.fileName || 'surat.jpg',
        } as any);
      }
      await leaveRequestsApi.create(formData);
      Alert.alert('Berhasil', 'Pengajuan izin berhasil dikirim');
      setShowFormModal(false);
      resetForm();
      fetchLeaveRequests();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Gagal mengirim pengajuan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecision = async (id: number, decision: 'approve' | 'reject') => {
    try {
      if (decision === 'approve') await leaveRequestsApi.approve(id);
      else await leaveRequestsApi.reject(id);
      Alert.alert('Berhasil', decision === 'approve' ? 'Izin disetujui' : 'Izin ditolak');
      setSelectedRequest(null);
      fetchLeaveRequests();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Gagal memproses izin');
    }
  };

  const resetForm = () => {
    setPermissionType('izin');
    setStartDate('');
    setEndDate('');
    setReason('');
    setAttachment(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <Image
        source={isMobile ? require('../../assets/images/wallpaper-app-mobile.png') : require('../../assets/images/wallpapaer-app-desktop.png')}
        style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
        resizeMode="cover"
      />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(243, 244, 246, 0.75)', width: '100%', height: '100%' }]} />
      <View style={[styles.header, { backgroundColor: 'transparent', borderBottomColor: 'rgba(0, 0, 0, 0.05)' }]}>
        <Text style={styles.headerTitle}>Pengajuan Izin</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowFormModal(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Ajukan</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={leaveRequests}
        onRefresh={fetchLeaveRequests}
        refreshing={isLoading}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listContent, { paddingBottom }]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {isLoading ? <ActivityIndicator color="#3B82F6" /> : <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />}
            <Text style={styles.emptyText}>{isLoading ? 'Memuat...' : 'Belum ada pengajuan izin'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.requestCard} onPress={() => setSelectedRequest(item)}>
            <View style={styles.requestHeader}>
              <View style={styles.requestType}>
                <Ionicons name={item.permission_type === 'izin' ? 'document-text-outline' : 'medkit-outline'} size={20} color="#3B82F6" />
                <Text style={styles.requestTypeText}>{item.permission_type === 'izin' ? 'Izin' : 'Sakit'}</Text>
              </View>
              <StatusBadge status={item.approval_status} />
            </View>
            <Text style={styles.requestReason} numberOfLines={2}>{item.reason}</Text>
            <Text style={styles.requestDate}>
              {new Date(item.start_date).toLocaleDateString('id-ID')} - {new Date(item.end_date).toLocaleDateString('id-ID')}
            </Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={showFormModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ModalHeader title="Ajukan Izin" onClose={() => setShowFormModal(false)} />
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Jenis Izin</Text>
              <View style={styles.typeOptions}>
                <TypeOption active={permissionType === 'izin'} icon="document-text-outline" label="Izin" onPress={() => setPermissionType('izin')} />
                <TypeOption active={permissionType === 'sakit'} icon="medkit-outline" label="Sakit" onPress={() => setPermissionType('sakit')} />
              </View>
              <Input label="Tanggal Mulai" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
              <Input label="Tanggal Selesai" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
              <Input label="Alasan" value={reason} onChangeText={setReason} placeholder="Jelaskan alasan izin" multiline />
              <Text style={styles.inputLabel}>Lampiran</Text>
              <TouchableOpacity style={styles.attachmentButton} onPress={handlePickImage}>
                <Ionicons name="attach-outline" size={22} color="#3B82F6" />
                <Text style={styles.attachmentText}>{attachment ? 'Ganti Lampiran' : 'Pilih Surat / Dokumen'}</Text>
              </TouchableOpacity>
              {attachment && <Text style={styles.attachmentName}>{attachment.fileName || 'Lampiran dipilih'}</Text>}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowFormModal(false); resetForm(); }}>
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Kirim</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!selectedRequest} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedRequest && (
              <>
                <ModalHeader title="Detail Izin" onClose={() => setSelectedRequest(null)} />
                <ScrollView style={styles.modalBody}>
                  <DetailRow label="Jenis" value={selectedRequest.permission_type === 'izin' ? 'Izin' : 'Sakit'} />
                  <DetailRow label="Tanggal" value={`${new Date(selectedRequest.start_date).toLocaleDateString('id-ID')} - ${new Date(selectedRequest.end_date).toLocaleDateString('id-ID')}`} />
                  <DetailRow label="Alasan" value={selectedRequest.reason} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <StatusBadge status={selectedRequest.approval_status} />
                  </View>
                  <DetailRow label="Diajukan" value={new Date(selectedRequest.created_at).toLocaleString('id-ID')} />
                </ScrollView>
                {canApprove && selectedRequest.approval_status === 'pending' && (
                  <View style={styles.modalFooter}>
                    <TouchableOpacity style={styles.rejectButton} onPress={() => handleDecision(selectedRequest.id, 'reject')}>
                      <Text style={styles.rejectButtonText}>Tolak</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.approveButton} onPress={() => handleDecision(selectedRequest.id, 'approve')}>
                      <Text style={styles.approveButtonText}>Setujui</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>{title}</Text>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Ionicons name="close" size={22} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );
}

function TypeOption({ active, icon, label, onPress }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.typeOption, active && styles.typeOptionActive]} onPress={onPress}>
      <Ionicons name={icon} size={26} color={active ? '#3B82F6' : '#6B7280'} />
      <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Input({ label, value, onChangeText, placeholder, multiline }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean }) {
  return (
    <View style={styles.inputSection}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: LeaveRequest['approval_status'] }) {
  const colors = { pending: '#F59E0B', approved: '#10B981', rejected: '#EF4444' };
  const labels = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };
  return (
    <View style={[styles.statusBadge, { backgroundColor: `${colors[status]}20` }]}>
      <Text style={[styles.statusText, { color: colors[status] }]}>{labels[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: '#fff', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  addButton: { backgroundColor: '#3B82F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  addButtonText: { color: '#fff', fontWeight: '800' },
  listContent: { padding: 16, flexGrow: 1 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 70, gap: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
  requestCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  requestType: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requestTypeText: { fontSize: 14, fontWeight: '800', color: '#1F2937' },
  requestReason: { fontSize: 14, color: '#374151', marginBottom: 8 },
  requestDate: { fontSize: 12, color: '#9CA3AF' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  closeButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  modalBody: { padding: 16 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  inputSection: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '800', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, fontSize: 16 },
  textArea: { minHeight: 100 },
  typeOptions: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  typeOption: { flex: 1, backgroundColor: '#F9FAFB', borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, alignItems: 'center', gap: 6 },
  typeOptionActive: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  typeLabel: { fontSize: 14, color: '#6B7280', fontWeight: '700' },
  typeLabelActive: { color: '#3B82F6', fontWeight: '800' },
  attachmentButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 2, borderStyle: 'dashed', borderColor: '#D1D5DB', borderRadius: 12, padding: 18, justifyContent: 'center', gap: 8 },
  attachmentText: { fontSize: 14, color: '#6B7280', fontWeight: '700' },
  attachmentName: { fontSize: 12, color: '#10B981', marginTop: 8 },
  cancelButton: { flex: 1, backgroundColor: '#E5E7EB', borderRadius: 12, padding: 15, alignItems: 'center' },
  cancelButtonText: { fontSize: 14, fontWeight: '800', color: '#6B7280' },
  submitButton: { flex: 1, backgroundColor: '#10B981', borderRadius: 12, padding: 15, alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: '#9CA3AF' },
  submitButtonText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', gap: 16 },
  detailLabel: { fontSize: 14, color: '#6B7280' },
  detailValue: { fontSize: 14, color: '#1F2937', fontWeight: '700', flex: 1, textAlign: 'right' },
  rejectButton: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 12, padding: 15, alignItems: 'center' },
  rejectButtonText: { fontSize: 14, fontWeight: '800', color: '#EF4444' },
  approveButton: { flex: 1, backgroundColor: '#10B981', borderRadius: 12, padding: 15, alignItems: 'center' },
  approveButtonText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
