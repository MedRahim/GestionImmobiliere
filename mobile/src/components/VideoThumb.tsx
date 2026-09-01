import React, {memo} from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {WebView} from 'react-native-webview';
import {AppIcon} from './ui/AppIcon';
import {colors} from '../theme';

type Mode = 'poster' | 'preview';

interface Props {
  url: string;
  style?: ViewStyle;
  /** poster = first frame paused; preview = muted autoplay loop */
  mode?: Mode;
  showBadge?: boolean;
  /** contain = full video visible; cover = fill */
  fit?: 'contain' | 'cover';
}

function videoHtml(url: string, mode: Mode, fit: 'contain' | 'cover') {
  const safe = String(url)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const autoplay = mode === 'preview';
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
  html,body{margin:0;padding:0;width:100%;height:100%;background:#0B1F2E;overflow:hidden}
  video{width:100%;height:100%;object-fit:${fit};display:block;background:#0B1F2E}
</style>
</head><body>
<video id="v" src="${safe}" muted playsinline webkit-playsinline preload="auto"
  ${autoplay ? 'autoplay loop' : ''}></video>
<script>
(function(){
  var v=document.getElementById('v');
  v.muted=true; v.volume=0;
  function showFrame(){
    try{
      if(${autoplay ? 'true' : 'false'}){
        var p=v.play(); if(p&&p.catch) p.catch(function(){});
      } else {
        v.pause();
        if(v.readyState>=2){ try{ v.currentTime=0.15; }catch(e){} }
      }
    }catch(e){}
  }
  v.addEventListener('loadeddata', showFrame);
  v.addEventListener('canplay', showFrame);
  v.addEventListener('seeked', function(){ if(!${autoplay ? 'true' : 'false'}) v.pause(); });
  showFrame();
  ${autoplay ? "setInterval(function(){ if(v.paused){ try{v.play();}catch(e){} } }, 1200);" : ''}
})();
</script>
</body></html>`;
}

/** Shows a real frame / muted loop from the video URL (not a photo). */
export const VideoThumb = memo(function VideoThumb({
  url,
  style,
  mode = 'poster',
  showBadge = true,
  fit = 'cover',
}: Props) {
  if (!url) return <View style={[styles.box, style]} />;

  return (
    <View style={[styles.box, style]}>
      <WebView
        source={{html: videoHtml(url, mode, fit), baseUrl: url}}
        style={styles.web}
        scrollEnabled={false}
        bounces={false}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
        pointerEvents="none"
      />
      {showBadge ? (
        <View style={styles.badge} pointerEvents="none">
          <AppIcon name="video" size={14} color={colors.white} filled />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
    backgroundColor: colors.primary,
  },
  web: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  badge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(13,184,196,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
