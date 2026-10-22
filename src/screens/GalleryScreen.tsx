// src/screens/GalleryScreen.tsx — capture gallery (reference 4).
// Adaptive grid, skeleton loading, honest empty/error/permission states,
// and a fullscreen image preview. Shows only real MediaStore URIs.

import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Screen, AppHeader } from '../components/ui';
import { IconButton } from '../components/buttons';
import { EmptyState, ErrorView, LoadingView, NoticeCard } from '../components/states';
import { AppIcon } from '../components/AppIcon';
import { getMediaButtonModule } from '../native/modules';
import { spacing, typography, useAppTheme } from '../theme';

const isVideo = (uri: string) => uri.toLowerCase().endsWith('.mp4');
const fileName = (uri: string) => uri.split('/').pop() ?? uri;

const GalleryGridSeparator = () => (
  <View style={{ height: spacing.galleryGap }} />
);

const GalleryScreen = () => {
  const { colors, dark } = useAppTheme();
  const { width } = useWindowDimensions();

  const [media, setMedia] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  // Missing bridge is not a load failure: it gets its own unavailable state
  // with no retry action that cannot succeed (audit finding B-11).
  const [unavailable, setUnavailable] = useState(false);

  const moduleAvailable = getMediaButtonModule()?.listMedia != null;

  const numColumns = width >= 700 ? 5 : 3;
  const tile =
    (width - spacing.screen * 2 - spacing.galleryGap * (numColumns - 1)) /
    numColumns;

  const load = useCallback(async (isRefresh = false) => {
    const listMedia = getMediaButtonModule()?.listMedia;
    if (!listMedia) {
      setUnavailable(true);
      setError(undefined);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setUnavailable(false);
    if (isRefresh) {
      setRefreshing(true);
    }
    try {
      const arr = await listMedia();
      setMedia(Array.isArray(arr) ? arr : []);
      setError(undefined);
    } catch (e: any) {
      setError(e?.message || 'Failed to load gallery');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Screen>
        <AppHeader title="Gallery" subtitle="Your captures" />
        <LoadingView message="Loading media…" />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.screen }}>
        <AppHeader
          title="Gallery"
          subtitle={
            media.length > 0
              ? `${media.length} item${media.length === 1 ? '' : 's'}`
              : 'Your captures'
          }
        />
      </View>

      {unavailable ? (
        <View style={{ paddingHorizontal: spacing.screen }}>
          <NoticeCard
            tone="brand"
            title="Media listing lives in the native module"
            message="Captured photos and videos appear here once the media bridge lands."
          />
        </View>
      ) : error ? (
        <ErrorView message={error} onRetry={() => load()} />
      ) : media.length === 0 ? (
        <EmptyState
          icon="image"
          title="No captures yet"
          message="Photos and videos you capture with ShutterTap will appear here."
          actionLabel={moduleAvailable ? 'Reload' : undefined}
          onAction={moduleAvailable ? () => load() : undefined}
        />
      ) : (
        <FlatList
          key={numColumns}
          data={media}
          keyExtractor={item => item}
          numColumns={numColumns}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={dark ? colors.primaryBright : colors.primary}
            />
          }
          ItemSeparatorComponent={GalleryGridSeparator}
          renderItem={({ item, index }) => {
            const column = index % numColumns;
            return (
              <Pressable
                onPress={() => (isVideo(item) ? undefined : setPreviewUri(item))}
                disabled={isVideo(item)}
                accessibilityRole={isVideo(item) ? undefined : 'button'}
                accessibilityLabel={
                  isVideo(item)
                    ? `Video: ${fileName(item)}`
                    : `Preview photo: ${fileName(item)}`
                }
                style={{
                  width: tile,
                  height: tile,
                  marginLeft: column === 0 ? 0 : spacing.galleryGap,
                  backgroundColor: colors.elevated,
                }}>
                {isVideo(item) ? (
                  <View
                    style={[
                      styles.videoTile,
                      { backgroundColor: colors.elevated },
                    ]}>
                    <AppIcon
                      name="video"
                      size={26}
                      color={colors.textMuted}
                    />
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.textSecondary, textAlign: 'center' },
                      ]}
                      numberOfLines={2}>
                      {fileName(item)}
                    </Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: item }}
                    style={{ width: tile, height: tile }}
                    resizeMode="cover"
                  />
                )}
              </Pressable>
            );
          }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
        />
      )}

      <Modal
        visible={previewUri != null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}>
        <View style={[styles.previewRoot, { backgroundColor: colors.scrim }]}>
          <View
            style={[
              styles.previewBar,
              { paddingTop: spacing.xxl },
            ]}>
            <IconButton
              icon="x"
              label="Close preview"
              variant="chrome"
              onPress={() => setPreviewUri(null)}
            />
          </View>
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={styles.previewImage}
              resizeMode="contain"
              accessible
              accessibilityLabel={`Photo preview: ${fileName(previewUri)}`}
            />
          ) : null}
          {previewUri ? (
            <Text
              style={[typography.caption, { color: colors.cameraControl }]}>
              {fileName(previewUri)}
            </Text>
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  videoTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 6,
  },
  previewRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  previewBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'flex-end',
    padding: spacing.lg,
  },
  previewImage: { width: '100%', height: '70%' },
});

export default GalleryScreen;
