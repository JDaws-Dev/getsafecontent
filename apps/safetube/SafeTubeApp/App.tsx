import React, { useRef, useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, BackHandler, Platform, StyleSheet, View, ActivityIndicator, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import type { WebViewError } from 'react-native-webview/lib/WebViewTypes';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

const WEB_APP_URL = 'https://getsafetube.com/play';

// Whitelist of allowed URL paths
const ALLOWED_PATHS = ['/play', '/login', '/signup', '/privacy', '/terms', '/support', '/'];

// Domains that are allowed for embeds/resources but NOT for direct navigation
const EMBED_ONLY_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
  'googlevideo.com',
];

// Domains allowed for resources (images, API calls)
const ALLOWED_RESOURCE_DOMAINS = [
  'getsafetube.com',
  'convex.cloud',
  'googleapis.com',
  'ytimg.com',
  'i.ytimg.com',
  'yt3.ggpht.com',
  'ggpht.com',
  'googleusercontent.com',
  ...EMBED_ONLY_DOMAINS,
];

// Check if URL is for the main SafeTube site
const isSafeTubeUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'getsafetube.com' || parsed.hostname === 'www.getsafetube.com';
  } catch {
    return false;
  }
};

// Check if this is a YouTube embed URL (not direct navigation)
const isYouTubeEmbedUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const isYouTubeDomain = EMBED_ONLY_DOMAINS.some(domain =>
      parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    );
    if (!isYouTubeDomain) return false;

    // Allow embed paths
    if (parsed.pathname.startsWith('/embed/')) return true;
    // Allow video streaming
    if (parsed.hostname.includes('googlevideo.com')) return true;
    // Allow YouTube player resources
    if (parsed.pathname.includes('/s/player/') || parsed.pathname.includes('/iframe_api')) return true;

    return false;
  } catch {
    return false;
  }
};

// Check if this is a direct YouTube navigation (should be BLOCKED)
const isDirectYouTubeNavigation = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const isYouTubeDomain = EMBED_ONLY_DOMAINS.some(domain =>
      parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    );
    if (!isYouTubeDomain) return false;

    // These are direct navigation attempts - BLOCK THEM
    if (parsed.pathname === '/' || parsed.pathname === '') return true;
    if (parsed.pathname.startsWith('/watch')) return true;
    if (parsed.pathname.startsWith('/shorts')) return true;
    if (parsed.pathname.startsWith('/channel')) return true;
    if (parsed.pathname.startsWith('/c/')) return true;
    if (parsed.pathname.startsWith('/@')) return true;
    if (parsed.pathname.startsWith('/results')) return true;
    if (parsed.pathname.startsWith('/feed')) return true;
    if (parsed.pathname.startsWith('/playlist')) return true;

    return false;
  } catch {
    return false;
  }
};

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [webViewError, setWebViewError] = useState<string | null>(null);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected);
      if (state.isConnected && webViewError) {
        setWebViewError(null);
      }
    });
    return () => unsubscribe();
  }, [webViewError]);

  // Handle deep linking
  useEffect(() => {
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    const handleURLEvent = (event: { url: string }) => {
      handleDeepLink(event.url);
    };

    handleInitialURL();
    const subscription = Linking.addEventListener('url', handleURLEvent);
    return () => subscription.remove();
  }, []);

  const handleDeepLink = (url: string) => {
    console.log('Deep link received:', url);

    if (url.startsWith('safetube://')) {
      const path = url.replace('safetube://', '/');
      const webUrl = `https://getsafetube.com${path}`;

      if (webViewRef.current && isSafeTubeUrl(webUrl)) {
        webViewRef.current.injectJavaScript(`
          window.location.href = ${JSON.stringify(webUrl)};
          true;
        `);
      }
    }
  };

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      });
      return () => backHandler.remove();
    }
  }, [canGoBack]);

  // **KEY FUNCTION**: Intercept navigation requests
  // This is where we block direct YouTube access while allowing embeds
  const handleShouldStartLoadWithRequest = (request: any): boolean => {
    const { url, isTopFrame, navigationType } = request;

    console.log(`[Nav] URL: ${url}, TopFrame: ${isTopFrame}, Type: ${navigationType}`);

    // Always allow SafeTube
    if (isSafeTubeUrl(url)) {
      console.log('[Nav] ALLOW - SafeTube URL');
      return true;
    }

    // Block direct YouTube navigation (main frame only)
    if (isTopFrame && isDirectYouTubeNavigation(url)) {
      console.log('[Nav] BLOCK - Direct YouTube navigation attempt');
      // Optionally show alert
      // Alert.alert('Blocked', 'Direct access to YouTube is not allowed.');
      return false;
    }

    // Allow YouTube embeds (iframes)
    if (!isTopFrame && isYouTubeEmbedUrl(url)) {
      console.log('[Nav] ALLOW - YouTube embed');
      return true;
    }

    // Allow YouTube resources (player scripts, video streams)
    if (isYouTubeEmbedUrl(url)) {
      console.log('[Nav] ALLOW - YouTube resource');
      return true;
    }

    // Allow other resources (images, API calls, etc.)
    try {
      const parsed = new URL(url);
      const isAllowedResource = ALLOWED_RESOURCE_DOMAINS.some(domain =>
        parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
      );
      if (isAllowedResource) {
        console.log('[Nav] ALLOW - Allowed resource domain');
        return true;
      }
    } catch {}

    // Block everything else in main frame
    if (isTopFrame) {
      console.log('[Nav] BLOCK - Unknown main frame navigation');
      return false;
    }

    // Allow sub-resources by default
    console.log('[Nav] ALLOW - Sub-resource');
    return true;
  };

  // Handle WebView errors
  const handleWebViewError = (event: { nativeEvent: WebViewError }) => {
    console.log('WebView error:', event.nativeEvent);
    setWebViewError(event.nativeEvent.description || 'Failed to load');
    setIsLoading(false);
  };

  // Retry loading
  const handleRetry = () => {
    setWebViewError(null);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  // JavaScript to inject for native app detection
  const injectedJavaScript = `
    (function() {
      // Flag to indicate we're in the native app
      window.isInSafeTubeApp = true;
      window.isSafeTubeApp = true;

      // Let the web app know the native bridge is ready
      window.dispatchEvent(new CustomEvent('safeTubeAppReady'));

      true;
    })();
  `;

  // Offline screen
  if (isConnected === false) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorIcon}>📡</Text>
          </View>
          <Text style={styles.errorTitle}>No Internet Connection</Text>
          <Text style={styles.errorMessage}>
            Please check your connection and try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Error screen
  if (webViewError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
          </View>
          <Text style={styles.errorTitle}>Something Went Wrong</Text>
          <Text style={styles.errorMessage}>
            We couldn't load SafeTube. Please try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#ef4444" />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>Loading SafeTube...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        onNavigationStateChange={(navState: WebViewNavigation) => setCanGoBack(navState.canGoBack)}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={handleWebViewError}
        injectedJavaScript={injectedJavaScript}
        // **KEY**: Intercept navigation requests to block YouTube
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        // Enable JavaScript and storage
        javaScriptEnabled={true}
        domStorageEnabled={true}
        // Allow media playback (for YouTube embeds)
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        // Allow fullscreen video
        allowsFullscreenVideo={true}
        // Cookies for auth
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        // User agent to identify as mobile app
        userAgent="SafeTubeApp/1.0 (Android; WebView)"
        // Allow mixed content
        mixedContentMode="compatibility"
        // UX settings
        bounces={false}
        pullToRefreshEnabled={false}
        scrollEnabled={true}
        showsVerticalScrollIndicator={true}
        showsHorizontalScrollIndicator={false}
        automaticallyAdjustContentInsets={true}
        allowsBackForwardNavigationGestures={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  webview: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
    zIndex: 1,
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#111827',
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorIcon: {
    fontSize: 40,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
