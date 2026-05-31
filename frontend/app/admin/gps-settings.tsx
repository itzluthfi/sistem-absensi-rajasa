import { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { gpsLocationsApi } from "../../services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../../hooks/useToast";

// Platform-safe WebView
let WebView: any = null;
if (Platform.OS !== "web") {
  WebView = require("react-native-webview").WebView;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface GpsLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// ─── Leaflet Map with flyTo support ──────────────────────────────────────────
const LeafletMap = forwardRef(function LeafletMap(
  { locations }: { locations: GpsLocation[] },
  ref: any
) {
  const webViewRef = useRef<any>(null);
  const iframeRef = useRef<any>(null);
  const activeLocations = locations.filter((l) => l.is_active);

  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lng: number, zoom = 17) => {
      const js = `map.flyTo([${lat}, ${lng}], ${zoom}, {animate:true, duration:0.8}); void 0;`;
      if (Platform.OS === "web") {
        try {
          iframeRef.current?.contentWindow?.postMessage({ type: "flyTo", lat, lng, zoom }, "*");
        } catch {}
      } else {
        webViewRef.current?.injectJavaScript(js);
      }
    },
  }));

  if (activeLocations.length === 0) {
    return (
      <View style={styles.mapEmpty}>
        <Ionicons name="map-outline" size={40} color="#D1D5DB" />
        <Text style={styles.mapEmptyText}>Belum ada zona aktif</Text>
      </View>
    );
  }

  const centerLat = activeLocations[0].latitude;
  const centerLng = activeLocations[0].longitude;

  const circlesJs = activeLocations
    .map(
      (loc, i) => `
    L.circle([${loc.latitude}, ${loc.longitude}], {
      color: colors[${i % 5}], fillColor: colors[${i % 5}], fillOpacity: 0.13,
      weight: 2.5, radius: ${loc.radius_meters}, dashArray: '7,4'
    }).addTo(map).bindPopup('<b>${loc.name.replace(/'/g, "\\'")}</b><br>Radius: ${loc.radius_meters}m');
    var pin${i} = L.divIcon({
      className: '',
      html: '<div style="width:16px;height:16px;border-radius:50%;background:' + colors[${i % 5}] + ';border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>',
      iconSize:[16,16], iconAnchor:[8,8]
    });
    L.marker([${loc.latitude}, ${loc.longitude}], {icon: pin${i}}).addTo(map)
      .bindPopup('<b>${loc.name.replace(/'/g, "\\'")}</b><br>Lat: ${loc.latitude.toFixed(6)}<br>Lng: ${loc.longitude.toFixed(6)}<br>Radius: ${loc.radius_meters}m');
  `
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>*{margin:0;padding:0;box-sizing:border-box}html,body,#map{width:100%;height:100%;background:#EFF6FF}<\/style>
</head>
<body>
  <div id="map"></div>
  <script>
    var colors = ['#2563EB','#10B981','#F59E0B','#EF4444','#8B5CF6'];
    var map = L.map('map',{zoomControl:true,attributionControl:false}).setView([${centerLat},${centerLng}],15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
    ${circlesJs}
    // Listen for flyTo commands from parent
    window.addEventListener('message', function(e) {
      try {
        var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (d && d.type === 'flyTo') {
          map.flyTo([d.lat, d.lng], d.zoom || 17, {animate: true, duration: 0.8});
        }
      } catch(err) {}
    });
  <\/script>
</body>
</html>`;

  if (Platform.OS === "web") {
    return (
      <iframe
        ref={iframeRef}
        srcDoc={html}
        style={{ width: "100%", height: "100%", border: "none" }}
        sandbox="allow-scripts allow-same-origin"
        title="GPS Zones Map"
      />
    );
  }

  if (!WebView) return null;
  return (
    <WebView
      ref={webViewRef}
      source={{ html }}
      style={{ flex: 1, backgroundColor: "transparent" }}
      scrollEnabled={false}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      renderLoading={() => (
        <View style={styles.mapLoading}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      )}
    />
  );
});

// ─── Location Card ────────────────────────────────────────────────────────────
function LocationCard({
  loc,
  onFocus,
  onToggle,
  onDelete,
  isDeleting,
}: {
  loc: GpsLocation;
  onFocus: (loc: GpsLocation) => void;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onFocus(loc)}
      style={[styles.locCard, !loc.is_active && styles.locCardInactive]}
    >
      <View style={styles.locCardTop}>
        <View style={[styles.locDot, { backgroundColor: loc.is_active ? "#10B981" : "#9CA3AF" }]} />
        <Text style={styles.locName} numberOfLines={1}>{loc.name}</Text>
        <View style={styles.locActions}>
          {/* Focus/fly-to button */}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: "#EFF6FF" }]}
            onPress={() => onFocus(loc)}
          >
            <Ionicons name="locate-outline" size={16} color="#2563EB" />
          </TouchableOpacity>
          {/* Active toggle */}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: loc.is_active ? "#D1FAE5" : "#F3F4F6" }]}
            onPress={() => onToggle(loc.id)}
          >
            <Ionicons
              name={loc.is_active ? "eye-outline" : "eye-off-outline"}
              size={16}
              color={loc.is_active ? "#10B981" : "#9CA3AF"}
            />
          </TouchableOpacity>
          {/* Delete */}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: "#FEE2E2" }]}
            onPress={() => onDelete(loc.id)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            )}
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.locCardBody}>
        <View style={styles.locCoordRow}>
          <Ionicons name="location-outline" size={13} color="#6B7280" />
          <Text style={styles.locCoord}>
            {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
          </Text>
        </View>
        <View style={styles.locRadiusBadge}>
          <Ionicons name="radio-outline" size={12} color="#2563EB" />
          <Text style={styles.locRadiusText}>{loc.radius_meters}m</Text>
        </View>
      </View>
      {loc.is_active && (
        <Text style={styles.tapHint}>Ketuk kartu atau ikon 🎯 untuk fokus ke peta</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function GpsSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const paddingBottom = 24 + (insets.bottom > 0 ? insets.bottom + 8 : 16);

  const mapRef = useRef<any>(null);

  const [locations, setLocations] = useState<GpsLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Add modal state
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLat, setNewLat] = useState("");
  const [newLng, setNewLng] = useState("");
  const [newRadius, setNewRadius] = useState(100);
  const [isSaving, setIsSaving] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [noResultsMsg, setNoResultsMsg] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadLocations = async () => {
    setIsLoading(true);
    try {
      const res = await gpsLocationsApi.list();
      if (res.success && Array.isArray(res.data)) {
        setLocations(res.data);
      }
    } catch (e) {
      toast.error("Tidak dapat memuat data lokasi GPS.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // ─── Dual-strategy Nominatim Search ────────────────────────────────────────
  const nominatimFetch = async (text: string, withCountry: boolean): Promise<SearchResult[]> => {
    const params = new URLSearchParams({
      q: text,
      format: "json",
      limit: "8",
      addressdetails: "1",
      "accept-language": "id",
      ...(withCountry ? { countrycodes: "id" } : {}),
    });
    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "SistemAbsensiRajasa/1.0 (educational-app)",
        "Accept-Language": "id",
      },
    });
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({
      place_id: item.place_id,
      display_name: item.display_name,
      lat: item.lat,
      lon: item.lon,
    }));
  };

  const executeSearch = async (text: string) => {
    if (!text || text.trim().length < 3) {
      setSearchResults([]);
      setShowResults(false);
      setNoResultsMsg("");
      return;
    }
    setIsSearching(true);
    setNoResultsMsg("");
    try {
      // Strategy 1: with countrycodes=id (faster, more accurate for common names)
      let results = await nominatimFetch(text, true);

      // Strategy 2 fallback: without country restriction if results < 2
      if (results.length < 2) {
        const broader = await nominatimFetch(text, false);
        // Merge & deduplicate by place_id
        const ids = new Set(results.map((r) => r.place_id));
        for (const item of broader) {
          if (!ids.has(item.place_id)) {
            results.push(item);
            ids.add(item.place_id);
          }
        }
      }

      if (results.length > 0) {
        setSearchResults(results.slice(0, 8));
        setShowResults(true);
        setNoResultsMsg("");
      } else {
        setSearchResults([]);
        setShowResults(false);
        setNoResultsMsg("Tidak ditemukan. Coba kata kunci lain atau isi koordinat manual.");
      }
    } catch {
      setNoResultsMsg("Gagal menghubungi layanan pencarian. Periksa koneksi internet.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleQueryChange = (text: string) => {
    setSearchQuery(text);
    setNoResultsMsg("");
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (text.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => executeSearch(text), 700);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const selectPlace = (place: SearchResult) => {
    const lat = parseFloat(place.lat).toFixed(6);
    const lng = parseFloat(place.lon).toFixed(6);
    setNewLat(lat);
    setNewLng(lng);
    const shortName = place.display_name.split(",")[0].trim();
    setSearchQuery(shortName);
    if (!newName) setNewName(shortName);
    setShowResults(false);
    setSearchResults([]);
  };

  // ─── Map focus handler ───────────────────────────────────────────────────────
  const handleFocusLocation = (loc: GpsLocation) => {
    if (!loc.is_active) {
      toast.info("Aktifkan zona ini terlebih dahulu untuk melihatnya di peta.");
      return;
    }
    mapRef.current?.flyTo(loc.latitude, loc.longitude, 17);
  };

  // ─── Toggle location ─────────────────────────────────────────────────────────
  const handleToggle = async (id: number) => {
    try {
      const res = await gpsLocationsApi.toggle(id);
      if (res.success) {
        const loc = locations.find((l) => l.id === id);
        const newActive = !loc?.is_active;
        setLocations((prev) =>
          prev.map((l) => (l.id === id ? { ...l, is_active: newActive } : l))
        );
        toast.info(newActive ? "Zona diaktifkan." : "Zona dinonaktifkan.");
      } else {
        toast.error(res.message || "Tidak dapat mengubah status.");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Terjadi kesalahan.");
    }
  };

  // ─── Delete location ─────────────────────────────────────────────────────────
  const handleDelete = (id: number) => {
    Alert.alert("Hapus Lokasi", "Yakin ingin menghapus titik lokasi ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          setDeletingId(id);
          try {
            const res = await gpsLocationsApi.remove(id);
            if (res.success) {
              setLocations((prev) => prev.filter((l) => l.id !== id));
              toast.success("Lokasi GPS berhasil dihapus.");
            } else {
              toast.error(res.message || "Tidak dapat menghapus.");
            }
          } catch (e: any) {
            toast.error(e.response?.data?.message || "Terjadi kesalahan.");
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  // ─── Add new location ─────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const lat = parseFloat(newLat);
    const lng = parseFloat(newLng);
    if (!newName.trim()) {
      toast.error("Nama lokasi wajib diisi.");
      return;
    }
    if (isNaN(lat) || lat < -90 || lat > 90) {
      toast.error("Latitude tidak valid. Contoh: -7.245583");
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      toast.error("Longitude tidak valid. Contoh: 112.737750");
      return;
    }
    setIsSaving(true);
    try {
      const res = await gpsLocationsApi.create({
        name: newName.trim(),
        latitude: lat,
        longitude: lng,
        radius_meters: newRadius,
        is_active: true,
      });
      if (res.success) {
        setLocations((prev) => [...prev, res.data]);
        setShowModal(false);
        setNewName("");
        setNewLat("");
        setNewLng("");
        setNewRadius(100);
        setSearchQuery("");
        setSearchResults([]);
        setNoResultsMsg("");
        toast.success(`Zona "${res.data.name}" berhasil ditambahkan!`);
      } else {
        toast.error(res.message || "Gagal menambahkan lokasi.");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Terjadi kesalahan sistem.");
    } finally {
      setIsSaving(false);
    }
  };

  const activeCount = locations.filter((l) => l.is_active).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top : 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Zona GPS Geofencing</Text>
          <Text style={styles.headerSub}>{activeCount} zona aktif</Text>
        </View>
        <TouchableOpacity style={styles.addHeaderBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addHeaderBtnText}>Tambah</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Memuat zona GPS...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Map Preview */}
          <View style={styles.mapCard}>
            <View style={styles.mapHeader}>
              <Ionicons name="map" size={16} color="#2563EB" />
              <Text style={styles.mapHeaderTitle}>Peta Semua Zona Aktif</Text>
              <View style={styles.mapBadge}>
                <Text style={styles.mapBadgeText}>{activeCount} zona</Text>
              </View>
            </View>
            <View style={styles.mapWrapper}>
              <LeafletMap ref={mapRef} locations={locations} />
            </View>
            <Text style={styles.mapHint}>
              Ketuk kartu lokasi di bawah untuk fokus ke titik tersebut di peta ↑
            </Text>
          </View>

          {/* Location List */}
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={16} color="#2563EB" />
            <Text style={styles.sectionTitle}>Daftar Titik Lokasi</Text>
          </View>

          {locations.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="location-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Belum Ada Lokasi</Text>
              <Text style={styles.emptyDesc}>
                Tekan tombol "Tambah" di atas untuk menambahkan titik lokasi geofencing sekolah.
              </Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowModal(true)}>
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.emptyAddBtnText}>Tambah Lokasi Pertama</Text>
              </TouchableOpacity>
            </View>
          ) : (
            locations.map((loc) => (
              <LocationCard
                key={loc.id}
                loc={loc}
                onFocus={handleFocusLocation}
                onToggle={handleToggle}
                onDelete={handleDelete}
                isDeleting={deletingId === loc.id}
              />
            ))
          )}

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={18} color="#2563EB" />
            <Text style={styles.infoText}>
              Siswa berhasil absen jika lokasinya masuk ke dalam{" "}
              <Text style={{ fontWeight: "800" }}>salah satu</Text> zona aktif yang terdaftar.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Add Location Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Tambah Zona Geofencing</Text>
                <Text style={styles.modalSub}>Cari lokasi atau isi koordinat manual</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  setSearchQuery("");
                  setSearchResults([]);
                  setShowResults(false);
                  setNoResultsMsg("");
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ── Search Box ─────────────────────────────────────────── */}
              <View style={[styles.searchSection, { zIndex: 100 }]}>
                <Text style={styles.fieldLabel}>
                  CARI LOKASI / ALAMAT SEKOLAH
                </Text>
                <View style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}>
                  <Ionicons
                    name="search-outline"
                    size={19}
                    color={searchFocused ? "#2563EB" : "#9CA3AF"}
                    style={styles.searchIcon}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Ketik nama sekolah atau alamat..."
                    placeholderTextColor="#B0B7C3"
                    value={searchQuery}
                    onChangeText={handleQueryChange}
                    onFocus={() => {
                      setSearchFocused(true);
                      if (searchResults.length > 0) setShowResults(true);
                    }}
                    onBlur={() => setSearchFocused(false)}
                    returnKeyType="search"
                    onSubmitEditing={() => executeSearch(searchQuery)}
                  />
                  {isSearching ? (
                    <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 12 }} />
                  ) : searchQuery.length > 0 ? (
                    <TouchableOpacity
                      onPress={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                        setShowResults(false);
                        setNoResultsMsg("");
                      }}
                      style={styles.clearBtn}
                    >
                      <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Search Results Dropdown */}
                {showResults && searchResults.length > 0 && (
                  <View style={styles.dropdown}>
                    {searchResults.map((item, idx) => (
                      <TouchableOpacity
                        key={item.place_id}
                        style={[
                          styles.dropdownItem,
                          idx === searchResults.length - 1 && { borderBottomWidth: 0 },
                        ]}
                        onPress={() => selectPlace(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.dropdownIconWrap}>
                          <Ionicons name="pin" size={14} color="#2563EB" />
                        </View>
                        <Text style={styles.dropdownText} numberOfLines={2}>
                          {item.display_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* No Results Message */}
                {noResultsMsg ? (
                  <View style={styles.noResultBox}>
                    <Ionicons name="alert-circle-outline" size={15} color="#F59E0B" />
                    <Text style={styles.noResultText}>{noResultsMsg}</Text>
                  </View>
                ) : null}
              </View>

              {/* Name Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>NAMA ZONA / LOKASI</Text>
                <TextInput
                  style={styles.textField}
                  placeholder="Contoh: Gedung Utama, Lab Komputer"
                  placeholderTextColor="#B0B7C3"
                  value={newName}
                  onChangeText={setNewName}
                />
              </View>

              {/* Coordinates */}
              <View style={styles.coordRow}>
                <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.fieldLabel}>LATITUDE</Text>
                  <TextInput
                    style={styles.textField}
                    placeholder="-7.245583"
                    placeholderTextColor="#B0B7C3"
                    keyboardType="numeric"
                    value={newLat}
                    onChangeText={setNewLat}
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.fieldLabel}>LONGITUDE</Text>
                  <TextInput
                    style={styles.textField}
                    placeholder="112.737750"
                    placeholderTextColor="#B0B7C3"
                    keyboardType="numeric"
                    value={newLng}
                    onChangeText={setNewLng}
                  />
                </View>
              </View>

              {/* Radius */}
              <View style={styles.fieldGroup}>
                <View style={styles.radiusHeader}>
                  <Text style={styles.fieldLabel}>RADIUS ABSENSI</Text>
                  <Text style={styles.radiusValue}>{newRadius} meter</Text>
                </View>
                <View style={styles.radiusBtnRow}>
                  {[
                    { label: "−50m", delta: -50, color: "#EF4444" },
                    { label: "−10m", delta: -10, color: "#F59E0B" },
                    { label: "+10m", delta: 10, color: "#10B981" },
                    { label: "+50m", delta: 50, color: "#2563EB" },
                  ].map(({ label, delta, color }) => (
                    <TouchableOpacity
                      key={label}
                      style={[styles.radiusBtn, { backgroundColor: color }]}
                      onPress={() =>
                        setNewRadius((p) => Math.min(5000, Math.max(5, p + delta)))
                      }
                    >
                      <Text style={styles.radiusBtnText}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.radiusTrack}>
                  <View
                    style={[
                      styles.radiusFill,
                      { width: `${Math.min(100, (newRadius / 1000) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.radiusHint}>Ideal untuk sekolah: 100 – 200 meter</Text>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                onPress={handleAdd}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={20} color="#fff" />
                    <Text style={styles.saveBtnText}>SIMPAN ZONA BARU</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtn: { padding: 6, borderRadius: 10, backgroundColor: "#F3F4F6" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  headerSub: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  addHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 4,
  },
  addHeaderBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#6B7280", fontWeight: "600" },

  scrollContent: { padding: 16, gap: 12 },

  mapCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 4,
  },
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  mapHeaderTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: "#1F2937" },
  mapBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  mapBadgeText: { fontSize: 11, fontWeight: "700", color: "#2563EB" },
  mapWrapper: { height: 250, backgroundColor: "#EFF6FF" },
  mapLoading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#EFF6FF" },
  mapEmpty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  mapEmptyText: { fontSize: 13, color: "#9CA3AF" },
  mapHint: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontStyle: "italic",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
    marginTop: 4,
    marginBottom: 2,
  },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#374151", textTransform: "uppercase" },

  locCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },
  locCardInactive: { borderLeftColor: "#E5E7EB", opacity: 0.7 },
  locCardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  locDot: { width: 10, height: 10, borderRadius: 5 },
  locName: { flex: 1, fontSize: 15, fontWeight: "700", color: "#111827" },
  locActions: { flexDirection: "row", gap: 6 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  locCardBody: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  locCoordRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locCoord: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  locRadiusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  locRadiusText: { fontSize: 12, fontWeight: "700", color: "#2563EB" },
  tapHint: { fontSize: 10, color: "#9CA3AF", marginTop: 8, fontStyle: "italic" },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#374151" },
  emptyDesc: { fontSize: 13, color: "#9CA3AF", textAlign: "center", lineHeight: 18 },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 8,
    marginTop: 8,
  },
  emptyAddBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  infoBox: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 14,
    gap: 10,
    alignItems: "flex-start",
    marginTop: 4,
  },
  infoText: { flex: 1, fontSize: 13, color: "#1D4ED8", lineHeight: 18 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  modalSub: { fontSize: 13, color: "#9CA3AF", marginTop: 2 },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Search ────────────────────────────────────────────────────────────────
  searchSection: { marginBottom: 18, position: "relative" },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9CA3AF",
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    height: 52,
    paddingRight: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchBoxFocused: {
    borderColor: "#2563EB",
    backgroundColor: "#fff",
    shadowColor: "#2563EB",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: { marginLeft: 14, marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
    paddingVertical: 0,
  },
  clearBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  dropdown: {
    position: "absolute",
    top: 86,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 999,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
    gap: 10,
  },
  dropdownIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  dropdownText: { fontSize: 13, color: "#374151", flex: 1, lineHeight: 18 },

  noResultBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  noResultText: { fontSize: 12, color: "#92400E", flex: 1, lineHeight: 17 },

  // ── Fields ────────────────────────────────────────────────────────────────
  fieldGroup: { marginBottom: 16 },
  textField: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
  },
  coordRow: { flexDirection: "row", marginBottom: 0 },

  radiusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  radiusValue: { fontSize: 18, fontWeight: "900", color: "#2563EB" },
  radiusBtnRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  radiusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  radiusBtnText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  radiusTrack: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  radiusFill: { height: "100%", backgroundColor: "#2563EB", borderRadius: 3 },
  radiusHint: { fontSize: 11, color: "#9CA3AF" },

  saveBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnDisabled: { backgroundColor: "#93C5FD" },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
});
