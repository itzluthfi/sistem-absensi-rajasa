import { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  TextInput,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { settingsApi } from "../../services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Platform-safe WebView: native uses react-native-webview, web uses iframe
let WebView: any = null;
if (Platform.OS !== "web") {
  // Dynamic require so web bundle never tries to load this native-only module
  WebView = require("react-native-webview").WebView;
}
 
interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// ─── Cross-platform Leaflet Map Component ───────────────────────────────────
// On native (Android/iOS): renders in react-native-webview
// On web (Vercel/browser): renders in a standard HTML <iframe>
function LeafletMapView({ lat, lng, radius }: { lat: number; lng: number; radius: number }) {
  const leafletHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body,#map{width:100%;height:100%;background:#e8f4f8}
  <\/style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([${lat},${lng}],16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
    L.circle([${lat},${lng}],{
      color:'#2563EB',fillColor:'#2563EB',fillOpacity:0.12,
      weight:2.5,radius:${radius},dashArray:'6,4'
    }).addTo(map);
    var pin=L.divIcon({
      className:'',
      html:'<div style="width:18px;height:18px;border-radius:50%;background:#EF4444;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>',
      iconSize:[18,18],iconAnchor:[9,9]
    });
    L.marker([${lat},${lng}],{icon:pin}).addTo(map)
      .bindPopup('<b>Pusat Sekolah<\/b><br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}<br>Radius: ${radius}m');
  <\/script>
</body>
</html>`;

  if (Platform.OS === "web") {
    // Web (Vercel/browser): use native iframe
    return (
      <iframe
        srcDoc={leafletHtml}
        style={{ width: "100%", height: "100%", border: "none" }}
        sandbox="allow-scripts allow-same-origin"
        title="GPS Geofence Map"
      />
    );
  }

  // Native (Android/iOS): use react-native-webview
  if (!WebView) return null;
  return (
    <WebView
      source={{ html: leafletHtml }}
      style={{ flex: 1, backgroundColor: "transparent" }}
      scrollEnabled={false}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      startInLoadingState={true}
      renderLoading={() => (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#e8f4f8", justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      )}
    />
  );
}
// ─────────────────────────────────────────────────────────────────────────────

 
export default function GpsSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
 
  const safeBottom = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const paddingBottom = 24 + safeBottom;
 
  // State variables
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [schoolLatitude, setSchoolLatitude] = useState("-7.245583");
  const [schoolLongitude, setSchoolLongitude] = useState("112.737750");
  const [schoolRadius, setSchoolRadius] = useState(100);
 
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
 
  // Debounce ref for typing search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
 
  // Load GPS settings on mount
  const loadGpsSettings = async () => {
    setIsLoading(true);
    try {
      const res = await settingsApi.getGps();
      if (res.success && res.data) {
        setSchoolLatitude(String(res.data.school_latitude));
        setSchoolLongitude(String(res.data.school_longitude));
        setSchoolRadius(res.data.school_radius_meters || 100);
      }
    } catch (e: any) {
      console.error("Gagal memuat pengaturan GPS", e);
      Alert.alert(
        "Gagal Memuat",
        "Terjadi kesalahan saat memuat koordinat GPS dari server."
      );
    } finally {
      setIsLoading(false);
    }
  };
 
  useEffect(() => {
    loadGpsSettings();
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);
 
  // Execute Nominatim search
  const executeSearch = async (text: string) => {
    if (!text || text.trim().length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
 
    setIsSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        text
      )}&format=json&limit=5&addressdetails=1&countrycodes=id`;
      
      const res = await fetch(url, {
        headers: {
          "User-Agent": "SistemAbsensiRajasa/1.0.0 (luthfi@rajasa.school)",
        },
      });
      const data = await res.json();
 
      if (Array.isArray(data)) {
        const mapped: SearchResult[] = data.map((item: any) => ({
          place_id: item.place_id,
          display_name: item.display_name,
          lat: item.lat,
          lon: item.lon,
        }));
        setSearchResults(mapped);
        setShowResults(mapped.length > 0);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    } catch (error) {
      console.error("Error searching location:", error);
    } finally {
      setIsSearching(false);
    }
  };
 
  // Trigger search on query change
  const handleQueryChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
 
    if (text.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        executeSearch(text);
      }, 800); // 800ms debounce
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };
 
  // Handle place selection
  const selectPlace = (place: SearchResult) => {
    setSchoolLatitude(parseFloat(place.lat).toFixed(6));
    setSchoolLongitude(parseFloat(place.lon).toFixed(6));
    setSearchQuery(place.display_name);
    setShowResults(false);
    
    Alert.alert(
      "Lokasi Terpilih",
      `Koordinat otomatis diisi ke:\nLat: ${place.lat}\nLng: ${place.lon}`
    );
  };
 
  // Save GPS settings
  const handleSaveSettings = async () => {
    const lat = parseFloat(schoolLatitude);
    const lng = parseFloat(schoolLongitude);
 
    if (isNaN(lat) || lat < -90 || lat > 90) {
      Alert.alert("Input Salah", "Latitude harus bernilai antara -90 dan 90.");
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      Alert.alert("Input Salah", "Longitude harus bernilai antara -180 dan 180.");
      return;
    }
    if (schoolRadius < 5 || schoolRadius > 5000) {
      Alert.alert("Input Salah", "Radius absensi harus antara 5m dan 5000m.");
      return;
    }
 
    setIsSaving(true);
    try {
      const res = await settingsApi.updateGps({
        school_latitude: lat,
        school_longitude: lng,
        school_radius_meters: schoolRadius,
      });
 
      if (res.success) {
        Alert.alert(
          "Berhasil Disimpan",
          "Pengaturan GPS Geofencing sekolah berhasil diperbarui di database server."
        );
      } else {
        Alert.alert("Gagal Menyimpan", res.message || "Gagal memperbarui pengaturan.");
      }
    } catch (e: any) {
      Alert.alert(
        "Kesalahan",
        e.response?.data?.message || "Terjadi kesalahan sistem saat menyimpan."
      );
    } finally {
      setIsSaving(false);
    }
  };
 
  // Adjust radius helpers
  const increaseRadius = (amount: number) => {
    setSchoolRadius((prev) => Math.min(5000, prev + amount));
  };

  const decreaseRadius = (amount: number) => {
    setSchoolRadius((prev) => Math.max(5, prev - amount));
  };

  return (
    <View style={[styles.container, { backgroundColor: "transparent" }]}>
      <Image
        source={
          isMobile
            ? require("../../assets/images/wallpaper-app-mobile.png")
            : require("../../assets/images/wallpaper-app-desktop.png")
        }
        style={[
          StyleSheet.absoluteFillObject,
          { width: "100%", height: "100%" },
        ]}
        resizeMode="cover"
      />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: "rgba(243, 244, 246, 0.85)",
            width: "100%",
            height: "100%",
          },
        ]}
      />
 
      {/* Dynamic Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Konfigurasi GPS Geofencing</Text>
      </View>
 
      {isLoading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Memuat Pengaturan GPS Aktif...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location" size={20} color="#2563EB" />
              <Text style={styles.cardTitle}>GPS Geofencing Absensi</Text>
            </View>
            <Text style={styles.cardDesc}>
              Tentukan koordinat geografis pusat sekolah SMKS Rajasa dan batas
              radius pencatatan absensi hibrida agar siswa tidak dapat bolos dari luar kelas.
            </Text>
 
            {/* Nominatim Autocomplete Search */}
            <View style={styles.searchSection}>
              <Text style={styles.inputLabel}>Cari Lokasi / Alamat Sekolah</Text>
              <View style={styles.searchBar}>
                <Ionicons
                  name="search-outline"
                  size={20}
                  color="#9CA3AF"
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Ketik alamat sekolah..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={handleQueryChange}
                  onFocus={() => setShowResults(searchResults.length > 0)}
                />
                {isSearching && (
                  <ActivityIndicator size="small" color="#2563EB" />
                )}
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      setShowResults(false);
                    }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color="#9CA3AF"
                      style={{ marginLeft: 8 }}
                    />
                  </TouchableOpacity>
                )}
              </View>
 
              {/* Autocomplete Results Dropdown */}
              {showResults && (
                <View style={styles.dropdown}>
                  {searchResults.map((item) => (
                    <TouchableOpacity
                      key={item.place_id}
                      style={styles.dropdownItem}
                      onPress={() => selectPlace(item)}
                    >
                      <Ionicons
                        name="pin-outline"
                        size={16}
                        color="#4B5563"
                        style={{ marginRight: 8, marginTop: 2 }}
                      />
                      <Text style={styles.dropdownText} numberOfLines={2}>
                        {item.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
 
            {/* Coordinate Inputs */}
            <View style={styles.coordinatesRow}>
              <View style={[styles.inputBox, { marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Latitude</Text>
                <TextInput
                  style={styles.coordInput}
                  keyboardType="numeric"
                  value={schoolLatitude}
                  onChangeText={setSchoolLatitude}
                  placeholder="-7.245583"
                />
              </View>
              <View style={[styles.inputBox, { marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Longitude</Text>
                <TextInput
                  style={styles.coordInput}
                  keyboardType="numeric"
                  value={schoolLongitude}
                  onChangeText={setSchoolLongitude}
                  placeholder="112.737750"
                />
              </View>
            </View>
 
            {/* Interactive Leaflet Map with Radius Circle */}
            <View style={styles.mapContainer}>
              <View style={styles.mapTitleRow}>
                <Ionicons name="map" size={14} color="#2563EB" />
                <Text style={styles.mapTitle}>Peta Interaktif & Radius Geofence</Text>
              </View>
              <View style={styles.mapWrapper}>
                <LeafletMapView
                  lat={parseFloat(schoolLatitude) || -7.245583}
                  lng={parseFloat(schoolLongitude) || 112.73775}
                  radius={schoolRadius}
                />
                {/* Legend overlay */}
                <View style={styles.mapLegend}>
                  <View style={styles.legendItem}>
                    <View style={styles.legendDotRed} />
                    <Text style={styles.legendText}>Pusat Sekolah</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={styles.legendDotBlue} />
                    <Text style={styles.legendText}>Radius {schoolRadius}m</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.mapHelp}>
                🔵 Lingkaran biru = batas radius absensi. 🔴 Titik merah = pusat sekolah.
              </Text>
            </View>
 
            {/* Radius Configuration */}
            <View style={styles.radiusContainer}>
              <View style={styles.radiusHeaderRow}>
                <Text style={styles.inputLabel}>Batas Radius Absensi</Text>
                <Text style={styles.radiusValText}>{schoolRadius} Meter</Text>
              </View>
 
              <View style={styles.radiusControls}>
                <TouchableOpacity
                  style={[styles.radiusBtn, { backgroundColor: "#EF4444" }]}
                  onPress={() => decreaseRadius(50)}
                >
                  <Text style={styles.radiusBtnText}>-50m</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radiusBtn, { backgroundColor: "#F59E0B" }]}
                  onPress={() => decreaseRadius(10)}
                >
                  <Text style={styles.radiusBtnText}>-10m</Text>
                </TouchableOpacity>
                <View style={styles.radiusProgressWrapper}>
                  <View style={styles.radiusProgressBarTrack}>
                    <View
                      style={[
                        styles.radiusProgressBarFill,
                        { width: `${Math.min(100, (schoolRadius / 1000) * 100)}%` },
                      ]}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.radiusBtn, { backgroundColor: "#10B981" }]}
                  onPress={() => increaseRadius(10)}
                >
                  <Text style={styles.radiusBtnText}>+10m</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radiusBtn, { backgroundColor: "#2563EB" }]}
                  onPress={() => increaseRadius(50)}
                >
                  <Text style={styles.radiusBtnText}>+50m</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.radiusHelp}>
                Radius absensi ideal untuk lingkungan sekolah adalah 100 - 150 meter.
              </Text>
            </View>
 
            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSaveSettings}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={20}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.saveButtonText}>SIMPAN PENGATURAN GPS</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "ios" ? 48 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 12,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1F2937" },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#4B5563", fontWeight: "600" },
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#1F2937" },
  cardDesc: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 20,
  },
  searchSection: {
    marginBottom: 20,
    zIndex: 100,
    position: "relative",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
  },
  dropdown: {
    position: "absolute",
    top: 72,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownText: { fontSize: 13, color: "#374151", flex: 1, lineHeight: 17 },
  coordinatesRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  inputBox: { flex: 1 },
  inputLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4B5563",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  coordInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "700",
  },
  mapContainer: {
    marginBottom: 20,
  },
  mapTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  mapTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4B5563",
    textTransform: "uppercase",
  },
  mapWrapper: {
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#e8f4f8",
  },
  mapWebView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#e8f4f8",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  mapLoadingText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
  },
  mapLegend: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 10,
    padding: 8,
    gap: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#fff",
  },
  legendDotBlue: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
    opacity: 0.7,
  },
  legendText: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "600",
  },
  mapHelp: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 6,
    fontStyle: "italic",
    textAlign: "center",
  },
  radiusContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  radiusHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  radiusValText: { fontSize: 16, fontWeight: "900", color: "#2563EB" },
  radiusControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  radiusBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  radiusBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  radiusProgressWrapper: {
    flex: 1,
    height: 8,
    justifyContent: "center",
  },
  radiusProgressBarTrack: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  radiusProgressBarFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 4,
  },
  radiusHelp: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 15,
  },
  saveButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#93C5FD",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
