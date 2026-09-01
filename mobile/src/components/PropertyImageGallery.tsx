import React, {useMemo, useState} from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {AppIcon} from './ui/AppIcon';
import {AppText} from './ui/AppText';
import {VideoThumb} from './VideoThumb';
import {colors, radius} from '../theme';

const {width: SCREEN_W} = Dimensions.get('window');

type MediaItem =
  | {kind: 'video'; url: string}
  | {kind: 'image'; url: string};

interface Props {
  images: string[];
  videoUrl?: string | null;
  height?: number;
  overlay?: React.ReactNode;
  showThumbnails?: boolean;
  listingBadge?: string;
}

function autoplayVideoHtml(url: string) {
  const safe = String(url)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // object-fit:contain so the FULL video is visible (letterboxed if needed)
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<style>
  html,body{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden}
  video{width:100%;height:100%;object-fit:contain;display:block;background:#000}
</style>
</head>
<body>
<video id="player" src="${safe}" muted autoplay loop playsinline webkit-playsinline preload="auto"></video>
<script>
(function(){
  var v=document.getElementById('player');
  function go(){
    try{
      v.muted=true;
      v.setAttribute('muted','');
      v.volume=0;
      var p=v.play();
      if(p&&p.catch){p.catch(function(){ setTimeout(go,400); });}
    }catch(e){}
  }
  v.addEventListener('loadeddata',go);
  v.addEventListener('canplay',go);
  go();
  setInterval(function(){ if(v.paused) go(); },1000);
})();
</script>
</body>
</html>`;
}

function BigVideo({url, height}: {url: string; height: number}) {
  return (
    <View style={{width: SCREEN_W, height, backgroundColor: '#000'}}>
      <WebView
        source={{html: autoplayVideoHtml(url), baseUrl: url}}
        style={{flex: 1, backgroundColor: '#000', width: SCREEN_W, height}}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
        scrollEnabled={false}
        bounces={false}
      />
    </View>
  );
}

export function PropertyImageGallery({
  images,
  videoUrl,
  height = 300,
  overlay,
  showThumbnails = true,
  listingBadge,
}: Props) {
  const media = useMemo<MediaItem[]>(() => {
    const items: MediaItem[] = [];
    if (videoUrl) items.push({kind: 'video', url: videoUrl});
    images.forEach(url => {
      if (url) items.push({kind: 'image', url});
    });
    return items;
  }, [images, videoUrl]);

  const [selected, setSelected] = useState(0);
  const current = media[selected] || media[0];

  if (!media.length) {
    return (
      <View style={[styles.hero, styles.placeholder, {height}]}>
        <AppText style={styles.placeholderEmoji}>🏡</AppText>
      </View>
    );
  }

  return (
    <View>
      <View style={[styles.wrap, {height}]}>
        {current?.kind === 'video' ? (
          <BigVideo url={current.url} height={height} />
        ) : (
          <Image
            source={{uri: current.url}}
            style={{width: SCREEN_W, height}}
            resizeMode="cover"
          />
        )}

        {listingBadge ? (
          <View style={styles.listingBadge} pointerEvents="none">
            <AppText
              variant="caption"
              color={colors.white}
              weight="bold"
              style={styles.listingBadgeText}>
              {listingBadge}
            </AppText>
          </View>
        ) : null}

        {media.length > 1 ? (
          <View style={styles.counter} pointerEvents="none">
            <AppIcon name="camera" size={12} color={colors.white} />
            <AppText variant="caption" color={colors.white} weight="bold">
              {selected + 1}/{media.length}
            </AppText>
          </View>
        ) : null}

        {overlay}
      </View>

      {showThumbnails && media.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbRow}>
          {media.map((item, i) => (
            <Pressable
              key={`thumb-${item.kind}-${i}`}
              onPress={() => setSelected(i)}
              style={[styles.thumb, i === selected && styles.thumbActive]}>
              {item.kind === 'video' ? (
                <VideoThumb
                  url={item.url}
                  mode="poster"
                  fit="cover"
                  style={styles.thumbFill}
                />
              ) : (
                <Image
                  source={{uri: item.url}}
                  style={styles.thumbImg}
                  resizeMode="cover"
                />
              )}
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  hero: {width: '100%'},
  placeholder: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {fontSize: 64},
  listingBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    zIndex: 2,
  },
  listingBadgeText: {
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  counter: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(11,31,46,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    zIndex: 2,
  },
  thumbRow: {paddingHorizontal: 16, paddingVertical: 14},
  thumb: {
    width: 108,
    height: 82,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: 'transparent',
    marginRight: 10,
    backgroundColor: colors.surfaceAlt,
  },
  thumbActive: {borderColor: colors.accent},
  thumbImg: {width: '100%', height: '100%'},
  thumbFill: {width: '100%', height: '100%'},
});
