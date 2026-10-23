import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from '@/components/ui/image';
import { addRecentSearch, removeRecentSearch, useRecentSearches } from '@/lib/recent-searches';

import { MarketRow } from '../markets/market-row';
import { useSearchMarkets } from './use-search-markets';

const SECTION = 'font-inter-medium text-[11px] leading-4 tracking-[0.4px] text-ink-muted';

export function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(true);
  const recents = useRecentSearches();
  const { trending, results, loading, failed } = useSearchMarkets(query);

  const searching = query.trim().length > 0;

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-1">
        <View
          className={`h-10 flex-1 flex-row items-center gap-2 rounded-[10px] border bg-surface pl-3 pr-2.5 ${
            focused || searching ? 'border-accent' : 'border-transparent'
          }`}>
          <Image source={require('@/assets/images/search/icon-scan-field.svg')} className="size-4" />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={() => addRecentSearch(query)}
            placeholder="Search markets"
            placeholderTextColor="#4b535d"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="search"
            accessibilityLabel="Search markets"
            className="flex-1 p-0 font-inter text-[13px] leading-5 text-ink"
          />
          {searching ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={8}
              onPress={() => setQuery('')}
              className="size-5 items-center justify-center rounded-[10px] bg-line-strong">
              <Image source={require('@/assets/images/search/icon-close-small.svg')} className="size-3" />
            </Pressable>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
          <Text className="font-inter-medium text-[13px] leading-5 text-accent">Cancel</Text>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {searching ? (
          <>
            <View className="px-4 pb-2 pt-[18px]">
              <Text className={SECTION}>
                {loading
                  ? 'LOADING MARKETS…'
                  : `${results.length} ${results.length === 1 ? 'MARKET' : 'MARKETS'}`}
              </Text>
            </View>
            {results.map((ticker) => (
              <MarketRow
                key={ticker.instId}
                instId={ticker.instId}
                ticker={ticker}
                onOpen={() => addRecentSearch(ticker.instId)}
              />
            ))}
            {!loading && results.length === 0 ? (
              <View className="items-center px-8 py-10">
                <Text className="text-center font-inter text-[13px] leading-5 text-ink-muted">
                  {failed
                    ? "Couldn't load the market list. Check your connection and try again."
                    : `No markets match “${query.trim()}”.`}
                </Text>
              </View>
            ) : null}
            <View className="px-4 pt-4">
              <Text className="font-jetbrains text-[11px] leading-4 text-ink-faint">
                Matching is done on the market list fetched once from GET /api/v5/market/tickers, then
                filtered on-device — no request per keystroke.
              </Text>
            </View>
          </>
        ) : (
          <>
            {recents.length > 0 ? (
              <>
                <View className="px-4 pb-2 pt-[18px]">
                  <Text className={SECTION}>RECENT</Text>
                </View>
                {recents.map((item) => (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    onPress={() => setQuery(item)}
                    className="flex-row items-center gap-3 border-b border-line px-4 py-3.5 active:bg-surface">
                    <Image
                      source={require('@/assets/images/search/icon-scan-recent.svg')}
                      className="size-4"
                    />
                    <Text className="flex-1 font-inter text-[13px] leading-5 text-ink">{item}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item}`}
                      hitSlop={10}
                      onPress={() => removeRecentSearch(item)}>
                      <Image
                        source={require('@/assets/images/search/icon-close.svg')}
                        className="size-3.5"
                      />
                    </Pressable>
                  </Pressable>
                ))}
              </>
            ) : null}
            <View className="px-4 pb-2 pt-[18px]">
              <Text className={SECTION}>TRENDING</Text>
            </View>
            {trending.map((ticker) => (
              <MarketRow
                key={ticker.instId}
                instId={ticker.instId}
                ticker={ticker}
                onOpen={() => addRecentSearch(ticker.instId)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
