import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {StyleSheet, View} from 'react-native';
import {WebView, WebViewMessageEvent} from 'react-native-webview';
import {Property} from '../types';
import {
  PropertyCluster,
  buildPropertyMarkers,
  clusterProperties,
  TUNISIA_REGION,
} from '../utils/geo';
import {getMapFallbackThumbnail, resolveMapThumbnailUrl} from '../utils/propertyImage';

export interface MapViewOSMHandle {
  showUserLocation: (lat: number, lng: number, accuracy?: number) => void;
  invalidateSize: () => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface Props {
  properties: Property[];
  onPropertyPress?: (property: Property) => void;
  onClusterPress?: (cluster: PropertyCluster) => void;
  onBoundsChange?: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
    zoom: number;
  }) => void;
  /** When false, disables map drag/zoom (mini map). Default true. */
  interactive?: boolean;
  style?: object;
  initialZoom?: number;
  highlightPropertyId?: number;
}

/** Photo pins earlier (city level). Clusters only at country zoom. */
const IMAGE_ZOOM = 9;
/** Soft cap for photo pins when zoomed (viewport-filtered in WebView). */
const MAP_IMAGE_LIMIT = 50;

const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="leaflet/leaflet.css" />
  <script src="leaflet/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #e8f4f5; }
    .leaflet-control-zoom a {
      color: #0B1F2E !important;
      border-radius: 10px !important;
      width: 34px !important;
      height: 34px !important;
      line-height: 34px !important;
      font-size: 16px !important;
    }
    .leaflet-control-zoom {
      border: none !important;
      box-shadow: 0 4px 14px rgba(11,31,46,0.12) !important;
      border-radius: 12px !important;
      overflow: hidden;
      margin-right: 12px !important;
      margin-top: 12px !important;
    }
    .pin-wrap {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      overflow: hidden;
      border: none;
      outline: none;
      box-shadow: 0 2px 8px rgba(11,31,46,0.28);
      background: #0B1F2E;
    }
    .pin-wrap.selected {
      box-shadow: 0 3px 12px rgba(11,31,46,0.4);
      transform: scale(1.12);
    }
    .pin-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .pin-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      background: linear-gradient(145deg, #163A52, #0B1F2E);
      color: #0DB8C4;
    }
    .leaflet-control-attribution {
      font-size: 9px !important;
      background: rgba(255,255,255,0.75) !important;
      padding: 2px 6px !important;
      border-radius: 6px 0 0 0 !important;
    }
    .cluster-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border-radius: 9px;
      background: #0DB8C4;
      border: 2px solid #fff;
      color: #fff;
      font: bold 10px/14px system-ui, sans-serif;
      text-align: center;
      box-sizing: border-box;
    }
    .user-loc {
      position: relative;
      width: 44px;
      height: 44px;
      margin-left: -22px;
      margin-top: -22px;
    }
    .user-dot {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 16px;
      height: 16px;
      margin: -8px 0 0 -8px;
      background: #0DB8C4;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(11,31,46,0.35);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    function esc(s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    var map = null;
    var markersLayer = null;
    var userLayer = null;
    var clusterData = [];
    var imageData = [];
    var imageZoom = ${IMAGE_ZOOM};
    var renderToken = 0;
    var lastMode = '';
    var lastSig = '';
    var zoomTimer = null;
    var highlightId = null;

    function initMap() {
      if (typeof L === 'undefined') return false;
      map = L.map('map', {
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
        inertia: true,
        wheelPxPerZoomLevel: 120
      }).setView([${TUNISIA_REGION.latitude}, ${TUNISIA_REGION.longitude}], 7);
      // OpenStreetMap — free tiles, no API key (CartoCDN now requires a key)
      window._tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        minZoom: 6,
        subdomains: 'abc',
        attribution: '&copy; OpenStreetMap',
        updateWhenZooming: false,
        updateWhenIdle: true,
        keepBuffer: 1
      }).addTo(map);
      markersLayer = L.layerGroup().addTo(map);
      userLayer = L.layerGroup().addTo(map);
      // Only refresh markers when zoom mode may change - never on every pan
      map.on('zoomend', function() { scheduleRefresh(false); emitBounds(); });
      map.on('moveend', function() { emitBounds(); });
      window.addEventListener('resize', function() {
        try { map.invalidateSize({animate:false}); } catch (e) {}
      });
      setTimeout(function() { try { map.invalidateSize({animate:false}); } catch (e) {} }, 60);
      return true;
    }

    function emitBounds() {
      if (!map || !window.ReactNativeWebView) return;
      try {
        var b = map.getBounds();
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'bounds',
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
          zoom: map.getZoom()
        }));
      } catch (e) {}
    }

    function scheduleRefresh(force) {
      if (zoomTimer) clearTimeout(zoomTimer);
      zoomTimer = setTimeout(function() { refreshMarkers(!!force); }, 40);
    }

    function photoIconHtml(item) {
      var src = esc(item.imageUrl || item.fallbackUrl || '');
      var selected = highlightId != null && Number(item.propertyId) === Number(highlightId);
      var cls = selected ? 'pin-wrap selected' : 'pin-wrap';
      var inner = src
        ? '<img class="pin-img" src="' + src + '" decoding="async" alt="" />'
        : '<div class="pin-fallback">+</div>';
      return '<div class="' + cls + '">' + inner + '</div>';
    }

    function addPhotoMarker(item) {
      var selected = highlightId != null && Number(item.propertyId) === Number(highlightId);
      var icon = L.divIcon({
        className: '',
        html: photoIconHtml(item),
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      var marker = L.marker([item.lat, item.lng], {
        icon: icon,
        keyboard: false,
        zIndexOffset: selected ? 900 : 0
      }).addTo(markersLayer);
      var pid = item.propertyId;
      marker.on('click', function() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'marker',
            propertyId: pid
          }));
        }
      });
    }

    function addClusterMarkers(items) {
      (items || []).forEach(function(item) {
        // Always prefer photo pin; badge shows count when > 1
        if (item.imageUrl || item.fallbackUrl) {
          var badge =
            item.count > 1
              ? '<span class="cluster-badge">' +
                esc(item.count > 99 ? '99+' : String(item.count)) +
                '</span>'
              : '';
          var icon = L.divIcon({
            className: '',
            html:
              '<div class="pin-wrap" style="position:relative">' +
              photoIconHtml(item).replace('class="pin-wrap"', 'class="pin-inner"') +
              badge +
              '</div>',
            iconSize: [36, 36],
            iconAnchor: [18, 18]
          });
          // Fix nested wrap: simpler HTML
          icon = L.divIcon({
            className: '',
            html:
              '<div class="pin-wrap" style="position:relative">' +
              (item.imageUrl || item.fallbackUrl
                ? '<img class="pin-img" src="' +
                  esc(item.imageUrl || item.fallbackUrl) +
                  '" decoding="async" alt="" />'
                : '<div class="pin-fallback">+</div>') +
              badge +
              '</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });
          var marker = L.marker([item.lat, item.lng], { icon: icon, keyboard: false }).addTo(markersLayer);
          marker.on('click', function() {
            if (window.ReactNativeWebView) {
              if (item.count === 1) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'marker',
                  propertyId: item.propertyId
                }));
              } else {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'cluster',
                  key: item.key,
                  lat: item.lat,
                  lng: item.lng
                }));
              }
            }
          });
          return;
        }
        var label = item.count > 99 ? '99+' : String(item.count);
        var numIcon = L.divIcon({
          className: '',
          html: '<div class="pin-wrap" style="display:flex;align-items:center;justify-content:center;background:#2EC4B6;color:#fff;font:bold 12px system-ui">' + esc(label) + '</div>',
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });
        var m2 = L.marker([item.lat, item.lng], { icon: numIcon, keyboard: false }).addTo(markersLayer);
        m2.on('click', function() {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'cluster',
              key: item.key,
              lat: item.lat,
              lng: item.lng
            }));
          }
        });
      });
    }

    function addImageMarkers(items) {
      var list = items || [];
      for (var i = 0; i < list.length; i++) {
        addPhotoMarker(list[i]);
      }
    }

    function dataSig() {
      return String(clusterData.length) + ':' + String(imageData.length) + ':' +
        (imageData[0] && imageData[0].propertyId) + ':' +
        (imageData[imageData.length - 1] && imageData[imageData.length - 1].propertyId);
    }

    function refreshMarkers(force) {
      if (!map || !markersLayer) return;
      try {
        var useImages = map.getZoom() >= imageZoom && imageData.length > 0;
        var mode = useImages ? 'image' : 'cluster';
        var sig = dataSig() + ':' + mode + ':' + map.getZoom();
        if (!force && mode === lastMode && sig === lastSig) return;

        renderToken++;
        markersLayer.clearLayers();
        lastMode = mode;
        lastSig = sig;
        if (useImages) {
          // Viewport filter - only pins you can see (keeps map fast)
          var b = map.getBounds().pad(0.15);
          var visible = [];
          for (var i = 0; i < imageData.length; i++) {
            var it = imageData[i];
            if (b.contains([it.lat, it.lng])) visible.push(it);
            if (visible.length >= 60) break;
          }
          addImageMarkers(visible.length ? visible : imageData.slice(0, 40));
        } else {
          addClusterMarkers(clusterData);
        }
      } catch (e) {}
    }

    window.updateMarkers = function(clusters, images) {
      clusterData = clusters || [];
      imageData = images || [];
      lastMode = '';
      lastSig = '';
      scheduleRefresh(true);
    };

    window.setHighlight = function(id) {
      highlightId = id == null || id === '' ? null : Number(id);
      lastMode = '';
      lastSig = '';
      scheduleRefresh(true);
    };

    window.setUserLocation = function(lat, lng, accuracy) {
      if (!map || !userLayer) return;
      userLayer.clearLayers();
      if (accuracy && accuracy > 0 && accuracy < 500) {
        L.circle([lat, lng], {
          radius: accuracy,
          color: '#4285F4',
          fillColor: '#4285F4',
          fillOpacity: 0.1,
          weight: 1,
          interactive: false
        }).addTo(userLayer);
      }
      var icon = L.divIcon({
        className: '',
        html: '<div class="user-loc"><div class="user-dot"></div></div>',
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });
      L.marker([lat, lng], { icon: icon, zIndexOffset: 2000, interactive: false }).addTo(userLayer);
      var z = Math.max(imageZoom + 1, 13);
      map.setView([lat, lng], z);
    };

    window.invalidateMapSize = function() {
      try { if (map) map.invalidateSize({ animate: false }); } catch (e) {}
    };

    window.flyTo = function(lat, lng, zoom) {
      if (!map) return;
      var z = zoom || Math.max(imageZoom + 2, 15);
      try {
        if (typeof map.flyTo === 'function') {
          map.flyTo([lat, lng], z, { animate: true, duration: 0.85 });
        } else {
          map.setView([lat, lng], z, { animate: false });
        }
        scheduleRefresh(true);
      } catch (e) {
        try { map.setView([lat, lng], z); } catch (e2) {}
      }
    };
    window.zoomIn = function() { if (map) map.zoomIn(); };
    window.zoomOut = function() { if (map) map.zoomOut(); };


    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initMap);
    } else {
      initMap();
    }
  </script>
</body>
</html>`;

function toMarkerPayload(properties: Property[]) {
  return buildPropertyMarkers(properties.slice(0, MAP_IMAGE_LIMIT), p => {
    const id = p.id || p.propertyId;
    return resolveMapThumbnailUrl(p.featuredImage || p.images?.[0], id);
  }).map(m => ({
    lat: m.latitude,
    lng: m.longitude,
    propertyId: m.propertyId,
    imageUrl: m.imageUrl,
    fallbackUrl: getMapFallbackThumbnail(m.propertyId),
  }));
}

function toClusterPayload(properties: Property[]) {
  return clusterProperties(properties).map(c => {
    const first = c.properties[0];
    const id = first ? first.id || first.propertyId : 0;
    const img = first
      ? resolveMapThumbnailUrl(first.featuredImage || first.images?.[0], id)
      : undefined;
    return {
      key: c.key,
      lat: c.latitude,
      lng: c.longitude,
      count: c.count,
      label: c.label,
      propertyId: id,
      imageUrl: img,
      fallbackUrl: getMapFallbackThumbnail(id),
    };
  });
}

export const MapViewOSM = memo(
  forwardRef<MapViewOSMHandle, Props>(function MapViewOSM(
    {
      properties,
      onPropertyPress,
      onClusterPress,
      onBoundsChange,
      interactive = true,
      style,
      initialZoom,
      highlightPropertyId,
    },
    ref,
  ) {
        const webRef = useRef<WebView>(null);
    const mapReady = useRef(false);
    const pendingFly = useRef<{lat: number; lng: number; zoom: number | null} | null>(
      null,
    );
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clusters = useMemo(() => clusterProperties(properties), [properties]);
    const clusterMap = useMemo(() => {
      const m = new Map<string, PropertyCluster>();
      clusters.forEach(c => m.set(c.key, c));
      return m;
    }, [clusters]);

    const propertyMap = useMemo(() => {
      const m = new Map<number, Property>();
      properties.forEach(p => m.set(p.id || p.propertyId, p));
      return m;
    }, [properties]);

    const markerPayload = useMemo(
      () => ({
        clusters: toClusterPayload(properties),
        images: toMarkerPayload(properties),
      }),
      [properties],
    );

    const pushMarkers = useCallback((payload: typeof markerPayload) => {
      const clustersJson = JSON.stringify(payload.clusters);
      const imagesJson = JSON.stringify(payload.images);
      webRef.current?.injectJavaScript(
        `(function(){try{if(window.updateMarkers)window.updateMarkers(${clustersJson},${imagesJson});}catch(e){}})(); true;`,
      );
    }, []);

    const schedulePushMarkers = useCallback(
      (payload: typeof markerPayload) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => pushMarkers(payload), 150);
      },
      [pushMarkers],
    );

    const showUserLocation = useCallback((lat: number, lng: number, accuracy?: number) => {
      const acc = accuracy != null ? accuracy : 'null';
      webRef.current?.injectJavaScript(
        `(function(){try{if(window.setUserLocation)window.setUserLocation(${lat}, ${lng}, ${acc});}catch(e){}})(); true;`,
      );
    }, []);

    const invalidateSize = useCallback(() => {
      webRef.current?.injectJavaScript(
        'try{if(window.invalidateMapSize)window.invalidateMapSize();else if(map)map.invalidateSize();}catch(e){}; true;',
      );
    }, []);

    const flyTo = useCallback((lat: number, lng: number, zoom?: number) => {
      const z = zoom != null ? zoom : null;
      pendingFly.current = {lat, lng, zoom: z};
      if (!mapReady.current) return;
      const zoomArg = z != null ? z : 'null';
      webRef.current?.injectJavaScript(
        `(function(){try{if(window.flyTo)window.flyTo(${lat},${lng},${zoomArg});}catch(e){}})(); true;`,
      );
    }, []);

    const zoomIn = useCallback(() => {
      webRef.current?.injectJavaScript(
        `(function(){try{if(window.zoomIn)window.zoomIn();}catch(e){}})(); true;`,
      );
    }, []);

    const zoomOut = useCallback(() => {
      webRef.current?.injectJavaScript(
        `(function(){try{if(window.zoomOut)window.zoomOut();}catch(e){}})(); true;`,
      );
    }, []);


    useImperativeHandle(
      ref,
      () => ({showUserLocation, invalidateSize, flyTo, zoomIn, zoomOut}),
      [showUserLocation, invalidateSize, flyTo, zoomIn, zoomOut],
    );

    useEffect(() => {
      if (mapReady.current) {
        schedulePushMarkers(markerPayload);
      }
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, [markerPayload, schedulePushMarkers]);

    useEffect(() => {
      if (!mapReady.current) return;
      const id = highlightPropertyId != null ? Number(highlightPropertyId) : 'null';
      webRef.current?.injectJavaScript(
        `(function(){try{if(window.setHighlight)window.setHighlight(${id});}catch(e){}})(); true;`,
      );
    }, [highlightPropertyId]);

    const onMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'bounds' && onBoundsChange) {
            onBoundsChange({
              north: Number(data.north),
              south: Number(data.south),
              east: Number(data.east),
              west: Number(data.west),
              zoom: Number(data.zoom),
            });
            return;
          }
          if (data.type === 'marker' && data.propertyId) {
            const property = propertyMap.get(Number(data.propertyId));
            if (property) onPropertyPress?.(property);
            return;
          }
          if (data.type === 'cluster' && data.key) {
            const cluster = clusterMap.get(String(data.key));
            if (!cluster) return;
            if (cluster.count === 1 && cluster.properties[0]) {
              onPropertyPress?.(cluster.properties[0]);
            } else {
              onClusterPress?.(cluster);
            }
          }
        } catch {
          // ignore
        }
      },
      [propertyMap, clusterMap, onPropertyPress, onClusterPress, onBoundsChange],
    );

    const onLoadEnd = useCallback(() => {
      mapReady.current = true;
      pushMarkers(markerPayload);
      invalidateSize();
      if (highlightPropertyId != null) {
        webRef.current?.injectJavaScript(
          `(function(){try{if(window.setHighlight)window.setHighlight(${Number(highlightPropertyId)});}catch(e){}})(); true;`,
        );
      }
      const queued = pendingFly.current;
      if (queued) {
        const zoomArg = queued.zoom != null ? queued.zoom : 'null';
        webRef.current?.injectJavaScript(
          `(function(){try{if(window.flyTo)window.flyTo(${queued.lat},${queued.lng},${zoomArg});}catch(e){}})(); true;`,
        );
      } else if (initialZoom != null && properties[0]) {
        const markers = buildPropertyMarkers([properties[0]]);
        const m = markers[0];
        if (m) {
          webRef.current?.injectJavaScript(
            `(function(){try{if(window.flyTo)window.flyTo(${m.latitude},${m.longitude},${initialZoom});}catch(e){}})(); true;`,
          );
        }
      }
      if (!interactive) {
        webRef.current?.injectJavaScript(
          `(function(){try{if(window.map){window.map.dragging.disable();window.map.touchZoom.disable();window.map.doubleClickZoom.disable();window.map.scrollWheelZoom.disable();window.map.boxZoom.disable();window.map.keyboard.disable();}}catch(e){}})(); true;`,
        );
      }
    }, [markerPayload, pushMarkers, invalidateSize, initialZoom, properties, interactive, highlightPropertyId]);

    return (
      <View
        style={[styles.wrap, style]}
        pointerEvents={interactive ? 'box-none' : 'none'}>
        <WebView
          ref={webRef}
          style={styles.map}
          source={{html: MAP_HTML, baseUrl: 'file:///android_asset/'}}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
          cacheEnabled
          androidLayerType="hardware"
          scrollEnabled={false}
          setSupportMultipleWindows={false}
          onMessage={onMessage}
          onLoadStart={() => {
            mapReady.current = false;
          }}
          onLoadEnd={onLoadEnd}
        />
      </View>
    );
  }),
);
const styles = StyleSheet.create({
  wrap: {...StyleSheet.absoluteFillObject, backgroundColor: '#e8f4f5'},
  map: {flex: 1, backgroundColor: '#e8f4f5'},
});