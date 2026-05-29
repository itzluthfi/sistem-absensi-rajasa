import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { classesApi, studentsApi, teachersApi } from '../../services/api';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DataType = 'students' | 'teachers' | 'classes';

type DataRecord = {
  id: number;
  full_name?: string;
  class_name?: string;
  academic_year?: string;
  nis?: string;
  nisn?: string;
  nip?: string;
  user_id?: number;
  class_id?: number | null;
  major_id?: number;
  homeroom_teacher_id?: number | null;
  class?: { class_name?: string };
  major?: { major_name?: string };
  homeroom_teacher?: { full_name?: string };
};

const tabs: Array<{ key: DataType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'students', label: 'Siswa', icon: 'school-outline' },
  { key: 'teachers', label: 'Guru', icon: 'people-outline' },
  { key: 'classes', label: 'Kelas', icon: 'business-outline' },
];

const apiMap = {
  students: studentsApi,
  teachers: teachersApi,
  classes: classesApi,
};

const emptyForm = {
  id: '',
  user_id: '',
  class_id: '',
  major_id: '',
  homeroom_teacher_id: '',
  full_name: '',
  class_name: '',
  academic_year: '',
  nis: '',
  nisn: '',
  nip: '',
};

export default function MasterDataScreen() {
  const [activeType, setActiveType] = useState<DataType>('students');
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState(emptyForm);
  const insets = useSafeAreaInsets();
  const safeBottom = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const paddingBottom = 64 + safeBottom + 24;
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  useEffect(() => {
    fetchRecords();
  }, [activeType]);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const response = await apiMap[activeType].getAll();
      const payload = response.data?.data ?? response.data ?? [];
      setRecords(Array.isArray(payload) ? payload : []);
    } catch (error: any) {
      Alert.alert('Gagal Memuat Data', error.response?.data?.message || 'Periksa koneksi API backend.');
    }
    setIsLoading(false);
  };

  const filteredRecords = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return records;
    return records.filter((item) => getTitle(item).toLowerCase().includes(term) || getSubtitle(item).toLowerCase().includes(term));
  }, [records, query, activeType]);

  const getTitle = (item: DataRecord) => {
    if (activeType === 'classes') return item.class_name || `Kelas #${item.id}`;
    return item.full_name || `Data #${item.id}`;
  };

  const getSubtitle = (item: DataRecord) => {
    if (activeType === 'students') {
      return [item.nis ? `NIS ${item.nis}` : null, item.class?.class_name].filter(Boolean).join(' | ') || 'Siswa';
    }
    if (activeType === 'teachers') {
      return item.nip ? `NIP ${item.nip}` : 'Guru';
    }
    return [item.academic_year, item.major?.major_name, item.homeroom_teacher?.full_name].filter(Boolean).join(' | ') || 'Kelas';
  };

  const openCreate = () => {
    setForm(emptyForm);
    setModalMode('create');
  };

  const openEdit = (item: DataRecord) => {
    setForm({
      ...emptyForm,
      id: String(item.id),
      user_id: item.user_id ? String(item.user_id) : '',
      class_id: item.class_id ? String(item.class_id) : '',
      major_id: item.major_id ? String(item.major_id) : '',
      homeroom_teacher_id: item.homeroom_teacher_id ? String(item.homeroom_teacher_id) : '',
      full_name: item.full_name || '',
      class_name: item.class_name || '',
      academic_year: item.academic_year || '',
      nis: item.nis || '',
      nisn: item.nisn || '',
      nip: item.nip || '',
    });
    setModalMode('edit');
  };

  const setField = (key: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const buildPayload = () => {
    if (activeType === 'students') {
      return {
        ...(modalMode === 'create' ? { user_id: Number(form.user_id) } : {}),
        class_id: form.class_id ? Number(form.class_id) : null,
        full_name: form.full_name.trim(),
        nis: form.nis.trim() || null,
        nisn: form.nisn.trim() || null,
      };
    }

    if (activeType === 'teachers') {
      return {
        ...(modalMode === 'create' ? { user_id: Number(form.user_id) } : {}),
        full_name: form.full_name.trim(),
        nip: form.nip.trim() || null,
      };
    }

    return {
      ...(modalMode === 'create' ? { major_id: Number(form.major_id) } : {}),
      homeroom_teacher_id: form.homeroom_teacher_id ? Number(form.homeroom_teacher_id) : null,
      class_name: form.class_name.trim(),
      academic_year: form.academic_year.trim() || null,
    };
  };

  const validateForm = () => {
    if (activeType === 'classes') {
      if (!form.class_name.trim()) return 'Nama kelas wajib diisi';
      if (modalMode === 'create' && !Number(form.major_id)) return 'Major ID wajib diisi karena backend membutuhkannya';
      return null;
    }

    if (!form.full_name.trim()) return 'Nama lengkap wajib diisi';
    if (modalMode === 'create' && !Number(form.user_id)) return 'User ID wajib diisi karena backend membutuhkannya';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Data Belum Lengkap', validationError);
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await apiMap[activeType].create(buildPayload());
      } else {
        await apiMap[activeType].update(Number(form.id), buildPayload());
      }
      setModalMode(null);
      await fetchRecords();
      Alert.alert('Berhasil', modalMode === 'create' ? 'Data berhasil ditambahkan' : 'Data berhasil diperbarui');
    } catch (error: any) {
      Alert.alert('Gagal Menyimpan', error.response?.data?.message || 'Periksa field dan hak akses akun.');
    }
    setSubmitting(false);
  };

  const handleDelete = (item: DataRecord) => {
    Alert.alert('Hapus Data', `Hapus ${getTitle(item)}?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiMap[activeType].delete(item.id);
            await fetchRecords();
          } catch (error: any) {
            Alert.alert('Gagal Menghapus', error.response?.data?.message || 'Data tidak dapat dihapus.');
          }
        },
      },
    ]);
  };

  const renderForm = () => (
    <Modal visible={!!modalMode} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {modalMode === 'create' ? 'Tambah' : 'Edit'} {tabs.find((item) => item.key === activeType)?.label}
            </Text>
            <TouchableOpacity onPress={() => setModalMode(null)} style={styles.iconButton}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {activeType !== 'classes' ? (
              <>
                {modalMode === 'create' && (
                  <Input label="User ID" value={form.user_id} onChangeText={(text) => setField('user_id', text)} keyboardType="numeric" />
                )}
                <Input label="Nama Lengkap" value={form.full_name} onChangeText={(text) => setField('full_name', text)} />
                {activeType === 'students' ? (
                  <>
                    <Input label="Class ID" value={form.class_id} onChangeText={(text) => setField('class_id', text)} keyboardType="numeric" />
                    <Input label="NIS" value={form.nis} onChangeText={(text) => setField('nis', text)} />
                    <Input label="NISN" value={form.nisn} onChangeText={(text) => setField('nisn', text)} />
                  </>
                ) : (
                  <Input label="NIP" value={form.nip} onChangeText={(text) => setField('nip', text)} />
                )}
              </>
            ) : (
              <>
                {modalMode === 'create' && (
                  <Input label="Major ID" value={form.major_id} onChangeText={(text) => setField('major_id', text)} keyboardType="numeric" />
                )}
                <Input label="Nama Kelas" value={form.class_name} onChangeText={(text) => setField('class_name', text)} />
                <Input label="Tahun Ajaran" value={form.academic_year} onChangeText={(text) => setField('academic_year', text)} placeholder="2025/2026" />
                <Input label="Homeroom Teacher ID" value={form.homeroom_teacher_id} onChangeText={(text) => setField('homeroom_teacher_id', text)} keyboardType="numeric" />
              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setModalMode(null)}>
              <Text style={styles.secondaryButtonText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Simpan</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <Image
        source={isMobile ? require('../../assets/images/wallpaper-app-mobile.png') : require('../../assets/images/wallpapaer-app-desktop.png')}
        style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
        resizeMode="cover"
      />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(243, 244, 246, 0.75)', width: '100%', height: '100%' }]} />
      <View style={[styles.segment, { backgroundColor: 'transparent', borderBottomColor: 'rgba(0, 0, 0, 0.05)' }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.segmentItem, activeType === tab.key && styles.segmentItemActive]}
            onPress={() => {
              setActiveType(tab.key);
              setQuery('');
            }}
          >
            <Ionicons name={tab.icon} size={18} color={activeType === tab.key ? '#fff' : '#6B7280'} />
            <Text style={[styles.segmentText, activeType === tab.key && styles.segmentTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cari data"
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openCreate}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchRecords} />}
        contentContainerStyle={[styles.listContent, { paddingBottom }]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {isLoading ? (
              <ActivityIndicator color="#3B82F6" />
            ) : (
              <>
                <Ionicons name="file-tray-outline" size={44} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>Data belum tersedia</Text>
                <Text style={styles.emptyText}>Tarik untuk memuat ulang atau tambah data baru.</Text>
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardIcon}>
              <Ionicons
                name={tabs.find((tab) => tab.key === activeType)?.icon || 'document-outline'}
                size={22}
                color="#3B82F6"
              />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{getTitle(item)}</Text>
              <Text style={styles.cardSubtitle}>{getSubtitle(item)}</Text>
              <Text style={styles.cardMeta}>ID: {item.id}</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.smallButton} onPress={() => openEdit(item)}>
                <Ionicons name="create-outline" size={18} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {renderForm()}
    </View>
  );
}

function Input({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric';
  placeholder?: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder || label}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    minHeight: 42,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  segmentItemActive: {
    backgroundColor: '#3B82F6',
  },
  segmentText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#fff',
  },
  toolbar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 3,
  },
  cardMeta: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 72,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 6,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '88%',
  },
  modalHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 7,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#111827',
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
