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
}

interface Props {
  properties: Property[];
  onPropertyPress?: (property: Property) => void;
  onClusterPress?: (cluster: PropertyCluster) => void;
}

const MAP_IMAGE_LIMIT = 35;
const IMAGE_ZOOM = 10;

const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #d4eef0; }
    .pin-wrap {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      overflow: hidden;
      border: 2.5px solid #fff;
      outline: 2px solid #2EC4B6;
      box-shadow: 0 2px 8px rgba(22,33,43,0.35);
      background: #16212B;
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
      background: linear-gradient(145deg, #1e2d3a, #16212B);
      color: #2EC4B6;
    }
    .cluster-pin {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #2EC4B6;
      border: 3px solid #fff;
      box-shadow: 0 2px 10px rgba(22,33,43,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font: bold 13px/1 system-ui, sans-serif;
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
      background: #4285F4;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(22,33,43,0.35);
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

    function initMap() {
      if (typeof L === 'undefined') return false;
      map = L.map('map', {
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true,
        zoomAnimation: true,
        fadeAnimation: false,
        markerZoomAnimation: false
      }).setView([${TUNISIA_REGION.latitude}, ${TUNISIA_REGION.longitude}], 7);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        minZoom: 6,
        attribution: '&copy; OpenStreetMap',
        updateWhenZooming: false,
        updateWhenIdle: true,
        keepBuffer: 3
      }).addTo(map);
      markersLayer = L.layerGroup().addTo(map);
      userLayer = L.layerGroup().addTo(map);
      map.on('zoomend', function() { refreshMarkers(); });
      setTimeout(function() { map.invalidateSize(); }, 80);
      return true;
    }

    function addClusterMarkers(items) {
      (items || []).forEach(function(item) {
        var label = item.count > 99 ? '99+' : String(item.count);
        var icon = L.divIcon({
          className: '',
          html: '<div class="cluster-pin">' + esc(label) + '</div>',
          iconSize: [38, 38],
          iconAnchor: [19, 19]
        });
        var marker = L.marker([item.lat, item.lng], { icon: icon }).addTo(markersLayer);
        marker.on('click', function() {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'cluster',
              key: item.key
            }));
          }
        });
      });
    }

    function addImageMarkers(items, token) {
      var i = 0;
      var batch = 6;
      function step() {
        if (token !== renderToken) return;
        var end = Math.min(i + batch, items.length);
        for (; i < end; i++) {
          var item = items[i];
          var fb = esc(item.fallbackUrl || '');
          var src = esc(item.imageUrl || item.fallbackUrl || '');
          var inner = src
            ? '<img class="pin-img" src="' + src + '" loading="lazy" decoding="async" alt="" onerror="this.onerror=null;this.src=\\'' + fb + '\\';" />'
            : '<div class="pin-fallback">+</div>';
          var icon = L.divIcon({
            className: '',
            html: '<div class="pin-wrap">' + inner + '</div>',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });
          var marker = L.marker([item.lat, item.lng], { icon: icon }).addTo(markersLayer);
          (function(pid) {
            marker.on('click', function() {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'marker',
                  propertyId: pid
                }));
              }
            });
          })(item.propertyId);
        }
        if (i < items.length && token === renderToken) {
          requestAnimationFrame(step);
        }
      }
      step();
    }

    function refreshMarkers() {
      if (!map || !markersLayer) return;
      renderToken++;
      var token = renderToken;
      markersLayer.clearLayers();
      var useImages = map.getZoom() >= imageZoom;
      if (useImages && imageData.length) {
        addImageMarkers(imageData, token);
      } else {
        addClusterMarkers(clusterData);
      }
    }

    window.updateMarkers = function(clusters, images) {
      clusterData = clusters || [];
      imageData = images || [];
      refreshMarkers();
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
      map.flyTo([lat, lng], 14, { duration: 0.5 });
    };

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
  return clusterProperties(properties).map(c => ({
    key: c.key,
    lat: c.latitude,
    lng: c.longitude,
    count: c.count,
    label: c.label,
  }));
}

export const MapViewOSM = memo(
  forwardRef<MapViewOSMHandle, Props>(function MapViewOSM(
    {properties, onPropertyPress, onClusterPress},
    ref,
  ) {
    const webRef = useRef<WebView>(null);
    const mapReady = useRef(false);
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

    useImperativeHandle(ref, () => ({showUserLocation}), [showUserLocation]);

    useEffect(() => {
      if (mapReady.current) {
        schedulePushMarkers(markerPayload);
      }
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, [markerPayload, schedulePushMarkers]);

    const onMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
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
      [propertyMap, clusterMap, onPropertyPress, onClusterPress],
    );

    const onLoadEnd = useCallback(() => {
      mapReady.current = true;
      pushMarkers(markerPayload);
      webRef.current?.injectJavaScript('try{if(map)map.invalidateSize();}catch(e){}; true;');
    }, [markerPayload, pushMarkers]);

    return (
      <View style={styles.wrap} pointerEvents="box-none">
        <WebView
          ref={webRef}
          style={styles.map}
          source={{html: MAP_HTML, baseUrl: 'https://unpkg.com/'}}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          cacheEnabled
          androidLayerType="hardware"
          scrollEnabled={false}
          setSupportMultipleWindows={false}
          onMessage={onMessage}
          onLoadEnd={onLoadEnd}
        />
      </View>
    );
  }),
);

const styles = StyleSheet.create({
  wrap: {...StyleSheet.absoluteFillObject, backgroundColor: '#d4eef0'},
  map: {flex: 1, backgroundColor: '#d4eef0'},
});
