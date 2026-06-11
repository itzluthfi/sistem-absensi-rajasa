import {
  useEffect,
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
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
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { gpsLocationsApi, settingsApi } from "../../../services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../../../hooks/useToast";
import Skeleton from "../../../components/ui/Skeleton";
import * as Location from "expo-location";

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
  ref: any,
) {
  const webViewRef = useRef<any>(null);
  const iframeRef = useRef<any>(null);
  const activeLocations = locations.filter((l) => l.is_active);

  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lng: number, zoom = 17) => {
      const js = `map.flyTo([${lat}, ${lng}], ${zoom}, {animate:true, duration:0.8}); void 0;`;
      if (Platform.OS === "web") {
        try {
          iframeRef.current?.contentWindow?.postMessage(
            { type: "flyTo", lat, lng, zoom },
            "*",
          );
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
  `,
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

// ─── Leaflet Map Selector (with drag & click coordinates selection) ──────────
interface LeafletMapSelectorProps {
  initialLat: number;
  initialLng: number;
  initialRadius: number;
  onCoordsChange: (lat: number, lng: number) => void;
}

const LeafletMapSelector = forwardRef(function LeafletMapSelector(
  {
    initialLat,
    initialLng,
    initialRadius,
    onCoordsChange,
  }: LeafletMapSelectorProps,
  ref: any,
) {
  const webViewRef = useRef<any>(null);
  const iframeRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    updateCoords: (lat: number, lng: number, radius: number) => {
      const data = { type: "updateCoords", lat, lng, radius };
      if (Platform.OS === "web") {
        try {
          iframeRef.current?.contentWindow?.postMessage(data, "*");
        } catch {}
      } else {
        const js = `
          if (window.updateMarker) {
            window.updateMarker(${lat}, ${lng}, ${radius});
            map.setView([${lat}, ${lng}], map.getZoom());
            if (circle) {
              map.fitBounds(circle.getBounds());
            }
          }
          void 0;
        `;
        webViewRef.current?.injectJavaScript(js);
      }
    },
  }));

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
    var map = L.map('map',{zoomControl:true,attributionControl:false}).setView([${initialLat},${initialLng}],16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

    var marker = null;
    var circle = null;

    window.updateMarker = function(lat, lng, radius) {
      if (marker) {
        marker.setLatLng([lat, lng]);
      } else {
        marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on('dragend', function(e) {
          var latlng = marker.getLatLng();
          sendCoords(latlng.lat, latlng.lng);
        });
      }

      if (circle) {
        circle.setLatLng([lat, lng]);
        circle.setRadius(radius);
      } else {
        circle = L.circle([lat, lng], {
          color: '#2563EB',
          fillColor: '#2563EB',
          fillOpacity: 0.15,
          weight: 2,
          radius: radius
        }).addTo(map);
      }
    };

    function sendCoords(lat, lng) {
      var data = { type: 'mapClick', lat: lat, lng: lng };
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      } else {
        window.parent.postMessage(data, '*');
      }
    }

    // Initialize marker
    window.updateMarker(${initialLat}, ${initialLng}, ${initialRadius});

    // Fit bounds
    if (circle) {
      map.fitBounds(circle.getBounds());
    }

    // Map click handler
    map.on('click', function(e) {
      window.updateMarker(e.latlng.lat, e.latlng.lng, circle ? circle.getRadius() : 100);
      sendCoords(e.latlng.lat, e.latlng.lng);
    });

    // Listen to parent updates
    window.addEventListener('message', function(e) {
      try {
        var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (d && d.type === 'updateCoords') {
          window.updateMarker(d.lat, d.lng, d.radius);
          map.setView([d.lat, d.lng], map.getZoom());
          if (circle) {
            map.fitBounds(circle.getBounds());
          }
        }
      } catch(err) {}
    });
  <\/script>
</body>
</html>`;

  // Message handler for Web
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handleMessage = (e: MessageEvent) => {
      const data = e.data;
      if (data && data.type === "mapClick") {
        onCoordsChange(data.lat, data.lng);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onCoordsChange]);

  if (Platform.OS === "web") {
    return (
      <iframe
        ref={iframeRef}
        srcDoc={html}
        style={{ width: "100%", height: "100%", border: "none" }}
        sandbox="allow-scripts allow-same-origin"
        title="GPS Zones Selector"
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
      onMessage={(event: any) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data && data.type === "mapClick") {
            onCoordsChange(data.lat, data.lng);
          }
        } catch {}
      }}
    />
  );
});

// ─── Location Card ────────────────────────────────────────────────────────────
function LocationCard({
  loc,
  onFocus,
  onToggle,
  onEdit,
  onDelete,
  isDeleting,
}: {
  loc: GpsLocation;
  onFocus: (loc: GpsLocation) => void;
  onToggle: (id: number) => void;
  onEdit: (loc: GpsLocation) => void;
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
        <View
          style={[
            styles.locDot,
            { backgroundColor: loc.is_active ? "#10B981" : "#9CA3AF" },
          ]}
        />
        <Text style={styles.locName} numberOfLines={1}>
          {loc.name}
        </Text>
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
            style={[
              styles.iconBtn,
              { backgroundColor: loc.is_active ? "#D1FAE5" : "#F3F4F6" },
            ]}
            onPress={() => onToggle(loc.id)}
          >
            <Ionicons
              name={loc.is_active ? "eye-outline" : "eye-off-outline"}
              size={16}
              color={loc.is_active ? "#10B981" : "#9CA3AF"}
            />
          </TouchableOpacity>
          {/* Edit button */}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: "#EFF6FF" }]}
            onPress={() => onEdit(loc)}
          >
            <Ionicons name="create-outline" size={16} color="#2563EB" />
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
        <Text style={styles.tapHint}>
          Ketuk kartu atau ikon 🎯 untuk fokus ke peta
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function GpsSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;
  const paddingBottom = 24 + (insets.bottom > 0 ? insets.bottom + 8 : 16);

  const mapRef = useRef<any>(null);
  const modalMapRef = useRef<any>(null);

  const [locations, setLocations] = useState<GpsLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Modal configuration states
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<number | null>(
    null,
  );
  const [newName, setNewName] = useState("");
  const [newLat, setNewLat] = useState("");
  const [newLng, setNewLng] = useState("");
  const [newRadius, setNewRadius] = useState(100);
  const [isSaving, setIsSaving] = useState(false);
  const [isRetrievingLocation, setIsRetrievingLocation] = useState(false);

  // System configuration states
  const [entryMode, setEntryMode] = useState<"scan" | "click">("scan");
  const [enableDailyCheckoutState, setEnableDailyCheckoutState] =
    useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Security configuration states
  const [securityEnableBiometrics, setSecurityEnableBiometrics] = useState(true);
  const [securityEnableDeviceBinding, setSecurityEnableDeviceBinding] = useState(true);
  const [securityEnableGeofencing, setSecurityEnableGeofencing] = useState(true);
  const [securityEnableFakeGps, setSecurityEnableFakeGps] = useState(true);

  // Security Info Modal states
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalTitle, setInfoModalTitle] = useState("");
  const [infoModalDesc, setInfoModalDesc] = useState("");

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

      const settingsRes = await settingsApi.getSystemSettings();
      if (settingsRes?.data) {
        setEntryMode(settingsRes.data.mode ?? "scan");
        setEnableDailyCheckoutState(
          settingsRes.data.enable_daily_checkout ?? false,
        );
        setSecurityEnableBiometrics(
          settingsRes.data.security_enable_biometrics ?? true,
        );
        setSecurityEnableDeviceBinding(
          settingsRes.data.security_enable_device_binding ?? true,
        );
        setSecurityEnableGeofencing(
          settingsRes.data.security_enable_geofencing ?? true,
        );
        setSecurityEnableFakeGps(
          settingsRes.data.security_enable_fake_gps ?? true,
        );
      }
    } catch (e) {
      toast.error("Tidak dapat memuat data lokasi GPS / konfigurasi sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEntryMode = async (newMode: "scan" | "click") => {
    setIsUpdatingSettings(true);
    try {
      const res = await settingsApi.updateSystemSettings({ mode: newMode });
      if (res.success) {
        setEntryMode(newMode);
        toast.success(
          `Mode absensi masuk diubah ke: ${newMode === "scan" ? "Scan Gerbang" : "Klik Mandiri"}`,
        );
      } else {
        toast.error(res.message || "Gagal mengubah mode absensi masuk.");
      }
    } catch (e: any) {
      toast.error(
        e.response?.data?.message || "Gagal memperbarui mode absensi.",
      );
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleToggleCheckout = async (newVal: boolean) => {
    setIsUpdatingSettings(true);
    try {
      const res = await settingsApi.updateSystemSettings({
        enable_daily_checkout: newVal,
      });
      if (res.success) {
        setEnableDailyCheckoutState(newVal);
        toast.success(
          `Absensi pulang ${newVal ? "diaktifkan" : "dinonaktifkan"}.`,
        );
      } else {
        toast.error(res.message || "Gagal mengubah konfigurasi absen pulang.");
      }
    } catch (e: any) {
      toast.error(
        e.response?.data?.message ||
          "Gagal memperbarui konfigurasi absen pulang.",
      );
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleToggleSecuritySetting = async (key: string, currentValue: boolean) => {
    setIsUpdatingSettings(true);
    const newValue = !currentValue;
    try {
      const payload: any = {};
      payload[key] = newValue;
      const res = await settingsApi.updateSystemSettings(payload);
      if (res.success) {
        if (key === "security_enable_biometrics") setSecurityEnableBiometrics(newValue);
        else if (key === "security_enable_device_binding") setSecurityEnableDeviceBinding(newValue);
        else if (key === "security_enable_geofencing") setSecurityEnableGeofencing(newValue);
        else if (key === "security_enable_fake_gps") setSecurityEnableFakeGps(newValue);
        
        let labelName = "";
        if (key === "security_enable_biometrics") labelName = "Autentikasi Biometrik";
        else if (key === "security_enable_device_binding") labelName = "Kunci Perangkat";
        else if (key === "security_enable_geofencing") labelName = "Geofencing Area";
        else if (key === "security_enable_fake_gps") labelName = "Deteksi Fake GPS";

        toast.success(
          `${labelName} ${newValue ? "diaktifkan" : "dinonaktifkan"}.`,
        );
      } else {
        toast.error(res.message || "Gagal memperbarui pengaturan keamanan.");
      }
    } catch (e: any) {
      toast.error(
        e.response?.data?.message || "Gagal memperbarui konfigurasi keamanan.",
      );
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const openInfo = (title: string, desc: string) => {
    setInfoModalTitle(title);
    setInfoModalDesc(desc);
    setShowInfoModal(true);
  };

  useEffect(() => {
    loadLocations();
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // ─── Dual-strategy Nominatim Search ────────────────────────────────────────
  const nominatimFetch = async (
    text: string,
    withCountry: boolean,
  ): Promise<SearchResult[]> => {
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
      let results = await nominatimFetch(text, true);

      if (results.length < 2) {
        const broader = await nominatimFetch(text, false);
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
        setNoResultsMsg(
          "Tidak ditemukan. Coba kata kunci lain atau isi koordinat manual.",
        );
      }
    } catch {
      setNoResultsMsg(
        "Gagal menghubungi layanan pencarian. Periksa koneksi internet.",
      );
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
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    setNewLat(lat.toFixed(6));
    setNewLng(lng.toFixed(6));
    const shortName = place.display_name.split(",")[0].trim();
    setSearchQuery(shortName);
    if (!newName) setNewName(shortName);
    setShowResults(false);
    setSearchResults([]);

    // Update Map position
    updateModalMap(lat, lng, newRadius);
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
          prev.map((l) => (l.id === id ? { ...l, is_active: newActive } : l)),
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
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirmId === null) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
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
  };

  // ─── Get current location ───────────────────────────────────────────────────
  const handleUseCurrentLocation = async () => {
    setIsRetrievingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        toast.error(
          "Izin lokasi ditolak. Silakan aktifkan izin lokasi di pengaturan perangkat.",
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (loc && loc.coords) {
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        setNewLat(lat.toFixed(6));
        setNewLng(lng.toFixed(6));
        toast.success("Koordinat lokasi saat ini berhasil diterapkan.");

        // Update modal map
        updateModalMap(lat, lng, newRadius);
      } else {
        toast.error("Gagal mendeteksi lokasi saat ini.");
      }
    } catch (error: any) {
      toast.error(
        "Gagal mendapatkan lokasi saat ini: " + (error?.message || error),
      );
    } finally {
      setIsRetrievingLocation(false);
    }
  };

  // ─── Add/Edit save action ────────────────────────────────────────────────────
  const handleSave = async () => {
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
      if (modalMode === "create") {
        const res = await gpsLocationsApi.create({
          name: newName.trim(),
          latitude: lat,
          longitude: lng,
          radius_meters: newRadius,
          is_active: true,
        });
        if (res.success) {
          setLocations((prev) => [...prev, res.data]);
          setModalMode(null);
          toast.success(`Zona "${res.data.name}" berhasil ditambahkan!`);
        } else {
          toast.error(res.message || "Gagal menambahkan lokasi.");
        }
      } else {
        if (editingLocationId === null) return;
        const res = await gpsLocationsApi.update(editingLocationId, {
          name: newName.trim(),
          latitude: lat,
          longitude: lng,
          radius_meters: newRadius,
        });
        if (res.success) {
          setLocations((prev) =>
            prev.map((l) => (l.id === editingLocationId ? res.data : l)),
          );
          setModalMode(null);
          toast.success(`Zona "${res.data.name}" berhasil diperbarui!`);
        } else {
          toast.error(res.message || "Gagal memperbarui lokasi.");
        }
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Terjadi kesalahan sistem.");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Helper to sync state changes to Leaflet Map Selector ───────────────────
  const updateModalMap = (lat: number, lng: number, radius: number) => {
    modalMapRef.current?.updateCoords(lat, lng, radius);
  };

  const handleMapCoordsChange = (lat: number, lng: number) => {
    setNewLat(lat.toFixed(6));
    setNewLng(lng.toFixed(6));
  };

  const handleRadiusAdjust = (delta: number) => {
    const nextRadius = Math.min(5000, Math.max(5, newRadius + delta));
    setNewRadius(nextRadius);
    const lat = parseFloat(newLat);
    const lng = parseFloat(newLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      updateModalMap(lat, lng, nextRadius);
    }
  };

  const openAdd = () => {
    setNewName("");
    setNewLat("-7.245583");
    setNewLng("112.737750");
    setNewRadius(100);
    setSearchQuery("");
    setSearchResults([]);
    setNoResultsMsg("");
    setEditingLocationId(null);
    setModalMode("create");
  };

  const openEdit = (loc: GpsLocation) => {
    setNewName(loc.name);
    setNewLat(loc.latitude.toString());
    setNewLng(loc.longitude.toString());
    setNewRadius(loc.radius_meters);
    setSearchQuery("");
    setSearchResults([]);
    setNoResultsMsg("");
    setEditingLocationId(loc.id);
    setModalMode("edit");
  };

  const activeCount = locations.filter((l) => l.is_active).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top > 0 ? insets.top : 16 },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Pengaturan GPS Lokasi Absen</Text>
          <Text style={styles.headerSub}>{activeCount} zona aktif</Text>
        </View>
        <TouchableOpacity style={styles.addHeaderBtn} onPress={openAdd}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addHeaderBtnText}>Tambah</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Map Preview Skeleton */}
          <View
            style={[
              styles.mapCard,
              isDesktop && {
                maxWidth: 850,
                alignSelf: "center",
                width: "100%",
              },
            ]}
          >
            <View style={styles.mapHeader}>
              <Ionicons name="map" size={16} color="#2563EB" />
              <Text style={styles.mapHeaderTitle}>Peta Semua Zona Aktif</Text>
            </View>
            <View
              style={[
                styles.mapWrapper,
                { padding: 0 },
                isDesktop && { height: 380 },
              ]}
            >
              <Skeleton width="100%" height="100%" borderRadius={0} />
            </View>
          </View>

          {/* Location List Header */}
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={16} color="#2563EB" />
            <Text style={styles.sectionTitle}>Daftar Titik Lokasi</Text>
          </View>

          {/* Skeleton Location Cards */}
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.locCard}>
              <View style={styles.locCardTop}>
                <Skeleton
                  width={12}
                  height={12}
                  borderRadius={6}
                  style={{ marginRight: 8 }}
                />
                <Skeleton width={150} height={16} borderRadius={4} />
                <View style={styles.locActions}>
                  <Skeleton width={32} height={32} borderRadius={8} />
                  <Skeleton width={32} height={32} borderRadius={8} />
                  <Skeleton width={32} height={32} borderRadius={8} />
                  <Skeleton width={32} height={32} borderRadius={8} />
                </View>
              </View>
              <View style={styles.locCardBody}>
                <View
                  style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
                >
                  <Skeleton width={12} height={12} borderRadius={6} />
                  <Skeleton width={140} height={12} borderRadius={4} />
                </View>
                <Skeleton width={50} height={20} borderRadius={10} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Map Preview */}
          <View
            style={[
              styles.mapCard,
              isDesktop && {
                maxWidth: 850,
                alignSelf: "center",
                width: "100%",
              },
            ]}
          >
            <View style={styles.mapHeader}>
              <Ionicons name="map" size={16} color="#2563EB" />
              <Text style={styles.mapHeaderTitle}>Peta Semua Zona Aktif</Text>
              <View style={styles.mapBadge}>
                <Text style={styles.mapBadgeText}>{activeCount} zona</Text>
              </View>
            </View>
            <View style={[styles.mapWrapper, isDesktop && { height: 380 }]}>
              <LeafletMap ref={mapRef} locations={locations} />
            </View>
            <Text style={styles.mapHint}>
              Ketuk kartu lokasi di bawah untuk fokus ke titik tersebut di peta
              ↑
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
                Tekan tombol "Tambah" di atas untuk menambahkan titik lokasi
                Absensi sekolah.
              </Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd}>
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.emptyAddBtnText}>
                  Tambah Lokasi Pertama
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            locations.map((loc) => (
              <LocationCard
                key={loc.id}
                loc={loc}
                onFocus={handleFocusLocation}
                onToggle={handleToggle}
                onEdit={openEdit}
                onDelete={handleDelete}
                isDeleting={deletingId === loc.id}
              />
            ))
          )}

          {/* Pengaturan Konfigurasi Umum Sistem */}
          <View style={styles.sectionHeader}>
            <Ionicons name="settings" size={16} color="#2563EB" />
            <Text style={styles.sectionTitle}>Pengaturan Sistem</Text>
          </View>

          <View style={styles.settingsCard}>
            <View style={styles.settingsRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.settingsLabel}>Mode Absensi Masuk</Text>
                <Text style={styles.settingsDesc}>
                  {entryMode === "scan"
                    ? "Diabsenkan oleh Petugas piket menggunakan scan kartu QR gerbang masuk."
                    : "Siswa dapat mengklik absen mandiri dengan verifikasi GPS radius geofence."}
                </Text>
              </View>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    entryMode === "scan" && styles.toggleBtnActive,
                  ]}
                  onPress={() => handleToggleEntryMode("scan")}
                  disabled={isUpdatingSettings}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      entryMode === "scan" && styles.toggleBtnTextActive,
                    ]}
                  >
                    Scan
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    entryMode === "click" && styles.toggleBtnActive,
                  ]}
                  onPress={() => handleToggleEntryMode("click")}
                  disabled={isUpdatingSettings}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      entryMode === "click" && styles.toggleBtnTextActive,
                    ]}
                  >
                    Click
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={[
                styles.settingsRow,
                {
                  borderTopWidth: 1,
                  borderTopColor: "#E5E7EB",
                  paddingTop: 16,
                  marginTop: 16,
                },
              ]}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.settingsLabel}>Absensi Pulang Harian</Text>
                <Text style={styles.settingsDesc}>
                  {enableDailyCheckoutState
                    ? "Siswa wajib melakukan absen pulang di akhir jam sekolah."
                    : "Absen pulang harian dinonaktifkan (tidak perlu absen pulang)."}
                </Text>
              </View>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    !enableDailyCheckoutState && styles.toggleBtnActiveDanger,
                  ]}
                  onPress={() => handleToggleCheckout(false)}
                  disabled={isUpdatingSettings}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      !enableDailyCheckoutState && styles.toggleBtnTextActive,
                    ]}
                  >
                    Off
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    enableDailyCheckoutState && styles.toggleBtnActive,
                  ]}
                  onPress={() => handleToggleCheckout(true)}
                  disabled={isUpdatingSettings}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      enableDailyCheckoutState && styles.toggleBtnTextActive,
                    ]}
                  >
                    On
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Pengaturan Fitur Keamanan Absensi */}
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={16} color="#2563EB" />
            <Text style={styles.sectionTitle}>Fitur Keamanan Absensi</Text>
          </View>

          <View style={styles.settingsCard}>
            {/* 1. Biometrics */}
            <View style={styles.settingsRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.settingsLabel}>Autentikasi Biometrik</Text>
                  <TouchableOpacity onPress={() => openInfo("Autentikasi Biometrik", "Siswa wajib melakukan verifikasi sidik jari (Fingerprint) atau FaceID sebelum melakukan presensi. Opsi ini mencegah siswa menitipkan akun ke orang lain.")}>
                    <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.settingsDesc}>
                  Verifikasi sidik jari / FaceID saat presensi.
                </Text>
              </View>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    !securityEnableBiometrics && styles.toggleBtnActiveDanger,
                  ]}
                  onPress={() => handleToggleSecuritySetting("security_enable_biometrics", securityEnableBiometrics)}
                  disabled={isUpdatingSettings}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      !securityEnableBiometrics && styles.toggleBtnTextActive,
                    ]}
                  >
                    Off
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    securityEnableBiometrics && styles.toggleBtnActive,
                  ]}
                  onPress={() => handleToggleSecuritySetting("security_enable_biometrics", securityEnableBiometrics)}
                  disabled={isUpdatingSettings}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      securityEnableBiometrics && styles.toggleBtnTextActive,
                    ]}
                  >
                    On
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Device Binding */}
            <View
              style={[
                styles.settingsRow,
                {
                  borderTopWidth: 1,
                  borderTopColor: "#E5E7EB",
                  paddingTop: 16,
                  marginTop: 16,
                },
              ]}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.settingsLabel}>Kunci Perangkat (Device Binding)</Text>
                  <TouchableOpacity onPress={() => openInfo("Kunci Perangkat (Device Binding)", "Mengunci akun siswa pada handphone (device) pertama yang mereka gunakan saat presensi. Siswa tidak akan bisa presensi menggunakan HP milik teman mereka. Guru/Admin dapat melakukan reset kunci ini pada menu daftar siswa jika diperlukan.")}>
                    <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.settingsDesc}>
                  Batasi 1 akun siswa hanya untuk 1 perangkat HP utama.
                </Text>
              </View>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    !securityEnableDeviceBinding && styles.toggleBtnActiveDanger,
                  ]}
                  onPress={() => handleToggleSecuritySetting("security_enable_device_binding", securityEnableDeviceBinding)}
                  disabled={isUpdatingSettings}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      !securityEnableDeviceBinding && styles.toggleBtnTextActive,
                    ]}
                  >
                    Off
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    securityEnableDeviceBinding && styles.toggleBtnActive,
                  ]}
                  onPress={() => handleToggleSecuritySetting("security_enable_device_binding", securityEnableDeviceBinding)}
                  disabled={isUpdatingSettings}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      securityEnableDeviceBinding && styles.toggleBtnTextActive,
                    ]}
                  >
                    On
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. Geofencing */}
            <View
              style={[
                styles.settingsRow,
                {
                  borderTopWidth: 1,
                  borderTopColor: "#E5E7EB",
                  paddingTop: 16,
                  marginTop: 16,
                },
              ]}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.settingsLabel}>Pembatasan Radius (Geofencing)</Text>
                  <TouchableOpacity onPress={() => openInfo("Pembatasan Radius (Geofencing)", "Membatasi presensi mandiri (Click) hanya ketika koordinat GPS siswa berada di dalam radius zona sekolah yang aktif. Jika dinonaktifkan, siswa dapat melakukan presensi dari mana saja.")}>
                    <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.settingsDesc}>
                  Validasi presensi hanya dalam jangkauan geofence sekolah.
                </Text>
              </View>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    !securityEnableGeofencing && styles.toggleBtnActiveDanger,
                  ]}
                  onPress={() => handleToggleSecuritySetting("security_enable_geofencing", securityEnableGeofencing)}
                  disabled={isUpdatingSettings}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      !securityEnableGeofencing && styles.toggleBtnTextActive,
                    ]}
                  >
                    Off
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    securityEnableGeofencing && styles.toggleBtnActive,
                  ]}
                  onPress={() => handleToggleSecuritySetting("security_enable_geofencing", securityEnableGeofencing)}
                  disabled={isUpdatingSettings}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      securityEnableGeofencing && styles.toggleBtnTextActive,
                    ]}
                  >
                    On
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 4. Fake GPS */}
            <View
              style={[
                styles.settingsRow,
                {
                  borderTopWidth: 1,
                  borderTopColor: "#E5E7EB",
                  paddingTop: 16,
                  marginTop: 16,
                },
              ]}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.settingsLabel}>Deteksi Fake GPS / Mock Location</Text>
                  <TouchableOpacity onPress={() => openInfo("Deteksi Fake GPS / Mock Location", "Mendeteksi penggunaan aplikasi lokasi palsu (Fake GPS) pada perangkat HP siswa saat melakukan presensi. Jika terdeteksi, presensi akan langsung diblokir.")}>
                    <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.settingsDesc}>
                  Blokir presensi jika terdeteksi menggunakan lokasi palsu.
                </Text>
              </View>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    !securityEnableFakeGps && styles.toggleBtnActiveDanger,
                  ]}
                  onPress={() => handleToggleSecuritySetting("security_enable_fake_gps", securityEnableFakeGps)}
                  disabled={isUpdatingSettings}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      !securityEnableFakeGps && styles.toggleBtnTextActive,
                    ]}
                  >
                    Off
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    securityEnableFakeGps && styles.toggleBtnActive,
                  ]}
                  onPress={() => handleToggleSecuritySetting("security_enable_fake_gps", securityEnableFakeGps)}
                  disabled={isUpdatingSettings}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      securityEnableFakeGps && styles.toggleBtnTextActive,
                    ]}
                  >
                    On
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={18} color="#2563EB" />
            <Text style={styles.infoText}>
              Siswa berhasil absen jika lokasinya masuk ke dalam{" "}
              <Text style={{ fontWeight: "800" }}>salah satu</Text> zona aktif
              yang terdaftar.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Add / Edit Location Modal */}
      <Modal
        visible={modalMode !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMode(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalSheet, { paddingBottom: 20 + insets.bottom }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {modalMode === "create"
                    ? "Tambah Zona Absensi"
                    : "Edit Zona Absensi"}
                </Text>
                <Text style={styles.modalSub}>
                  {modalMode === "create"
                    ? "Cari lokasi, isi koordinat, atau gunakan peta"
                    : "Ubah lokasi menggunakan form atau peta"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setModalMode(null);
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
                <View
                  style={[
                    styles.searchBox,
                    searchFocused && styles.searchBoxFocused,
                  ]}
                >
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
                    <ActivityIndicator
                      size="small"
                      color="#2563EB"
                      style={{ marginRight: 12 }}
                    />
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
                          idx === searchResults.length - 1 && {
                            borderBottomWidth: 0,
                          },
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
                    <Ionicons
                      name="alert-circle-outline"
                      size={15}
                      color="#F59E0B"
                    />
                    <Text style={styles.noResultText}>{noResultsMsg}</Text>
                  </View>
                ) : null}
              </View>

              {/* ── Interactive Map Selector ───────────────────────────── */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  PILIH TITIK PADA PETA (GESER MARKER / KLIK)
                </Text>
                <View style={styles.modalMapWrapper}>
                  {modalMode !== null && (
                    <LeafletMapSelector
                      ref={modalMapRef}
                      initialLat={parseFloat(newLat) || -7.245583}
                      initialLng={parseFloat(newLng) || 112.73775}
                      initialRadius={newRadius}
                      onCoordsChange={handleMapCoordsChange}
                    />
                  )}
                </View>
              </View>

              {/* ── Geolocation Current Position Button ────────────────── */}
              <TouchableOpacity
                style={styles.currentLocBtn}
                onPress={handleUseCurrentLocation}
                disabled={isRetrievingLocation}
                activeOpacity={0.8}
              >
                {isRetrievingLocation ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <Ionicons name="location" size={18} color="#2563EB" />
                )}
                <Text style={styles.currentLocBtnText}>
                  {isRetrievingLocation
                    ? "Mengakses GPS..."
                    : "Gunakan Lokasi Saat Ini"}
                </Text>
              </TouchableOpacity>

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
                    onChangeText={(val) => {
                      setNewLat(val);
                      const parsed = parseFloat(val);
                      const parsedLng = parseFloat(newLng);
                      if (!isNaN(parsed) && !isNaN(parsedLng)) {
                        updateModalMap(parsed, parsedLng, newRadius);
                      }
                    }}
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
                    onChangeText={(val) => {
                      setNewLng(val);
                      const parsed = parseFloat(val);
                      const parsedLat = parseFloat(newLat);
                      if (!isNaN(parsed) && !isNaN(parsedLat)) {
                        updateModalMap(parsedLat, parsed, newRadius);
                      }
                    }}
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
                      onPress={() => handleRadiusAdjust(delta)}
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
                <Text style={styles.radiusHint}>
                  Ideal untuk sekolah: 100 – 200 meter
                </Text>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="#fff" />
                    <Text style={styles.saveBtnText}>
                      {modalMode === "create"
                        ? "SIMPAN ZONA BARU"
                        : "SIMPAN PERUBAHAN"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContent}>
            <Ionicons name="trash-outline" size={48} color="#EF4444" />
            <Text style={styles.confirmTitle}>Hapus Lokasi</Text>
            <Text style={styles.confirmText}>
              Apakah Anda yakin ingin menghapus titik lokasi "
              {locations.find((l) => l.id === deleteConfirmId)?.name || "ini"}"?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setDeleteConfirmId(null)}
              >
                <Text style={styles.confirmCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDestructiveButton}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmDestructiveText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Security Info Explanation Modal */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalContent}>
            <View style={styles.infoModalHeader}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#2563EB" />
              <Text style={styles.infoModalTitle}>{infoModalTitle}</Text>
            </View>
            <Text style={styles.infoModalDesc}>{infoModalDesc}</Text>
            <TouchableOpacity
              style={styles.infoModalCloseBtn}
              onPress={() => setShowInfoModal(false)}
            >
              <Text style={styles.infoModalCloseText}>Mengerti</Text>
            </TouchableOpacity>
          </View>
        </View>
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

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
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
  mapHeaderTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  mapBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  mapBadgeText: { fontSize: 11, fontWeight: "700", color: "#2563EB" },
  mapWrapper: { height: 250, backgroundColor: "#EFF6FF" },
  mapLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
  },
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
    textTransform: "uppercase",
  },

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
  locCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
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
  locCardBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
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
  tapHint: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 8,
    fontStyle: "italic",
  },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#374151" },
  emptyDesc: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
  },
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
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    height: 46,
    paddingRight: 6,
  },
  searchBoxFocused: {
    borderColor: "#2563EB",
    backgroundColor: "#fff",
  },
  searchIcon: { marginLeft: 12, marginRight: 6 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
    paddingVertical: 0,
    ...(Platform.OS === "web" &&
      ({
        outlineStyle: "none",
      } as any)),
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

  // ── Geolocation current position button ────────────────────────────────────
  currentLocBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  currentLocBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },

  // ── Modal Map Selector ─────────────────────────────────────────────────────
  modalMapWrapper: {
    height: 220,
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },

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
    ...(Platform.OS === "web" &&
      ({
        outlineStyle: "none",
      } as any)),
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
  saveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Delete Confirmation Modal
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  confirmContent: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    marginHorizontal: 32,
    alignItems: "center",
    width: "85%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
    marginTop: 14,
    marginBottom: 8,
  },
  confirmText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmButtons: { flexDirection: "row", gap: 12, width: "100%" },
  confirmCancelButton: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  confirmCancelText: { fontSize: 14, fontWeight: "800", color: "#6B7280" },
  confirmDestructiveButton: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  confirmDestructiveText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  settingsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingsLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  settingsDesc: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 15,
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#2563EB",
  },
  toggleBtnActiveDanger: {
    backgroundColor: "#EF4444",
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  toggleBtnTextActive: {
    color: "#fff",
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
  },
  infoModalContent: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    width: "85%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  infoModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  infoModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
  },
  infoModalDesc: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 24,
  },
  infoModalCloseBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  infoModalCloseText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
});
