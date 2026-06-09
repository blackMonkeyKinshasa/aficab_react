import React, { ComponentProps, useCallback, useEffect, useState } from 'react';
import { Dimensions, Image, LayoutChangeEvent, Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Carousel from 'react-native-reanimated-carousel';

import { Airport } from '@/components/my-ui/airport';
import { Daily } from '@/components/my-ui/daily';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { color } from '@/constants/colors';
import { useI18n } from '@/lib/i18n';

const AnimatedText = Animated.createAnimatedComponent(Text);
const TAB_ANIM_DURATION = 260;

const { width } = Dimensions.get('window');

const data = [
  require('@/assets/carousele/kinvtc-hero-desktop-01.webp'),
  require('@/assets/carousele/kinvtc-hero-desktop-02.webp'),
  require('@/assets/carousele/kinvtc-hero-desktop-03.webp'),
  require('@/assets/carousele/kinvtc-hero-desktop-04.webp'),
  require('@/assets/carousele/kinvtc-hero-desktop-05.webp'),
];

interface RideBookingScreenProps {
  navigation?: any;
}

type RideType = 'daily' | 'airport';

interface TabLayout {
  x: number;
  width: number;
}

function TabHeader({
  label,
  iconName,
  onPress,
  onSelect = false,
  onTabLayout,
  isDark,
}: {
  label: string;
  iconName: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  onSelect: boolean;
  onTabLayout: (event: LayoutChangeEvent) => void;
  isDark: boolean;
}) {
  const inactiveColor = isDark ? '#9CA3AF' : '#6B7280';
  const selection = useSharedValue(onSelect ? 1 : 0);

  useEffect(() => {
    selection.value = withTiming(onSelect ? 1 : 0, { duration: TAB_ANIM_DURATION });
  }, [onSelect, selection]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: selection.value,
    width: interpolate(selection.value, [0, 1], [0, 28]),
    marginRight: interpolate(selection.value, [0, 1], [0, 8]),
    overflow: 'hidden' as const,
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(selection.value, [0, 1], [inactiveColor, color.white]),
    fontWeight: selection.value > 0.5 ? '700' : '400',
  }));

  return (
    <TouchableOpacity
      className="z-10 flex-1 items-center justify-center"
      onPress={onPress}
      onLayout={onTabLayout}>
      <View className="w-full flex-row items-center justify-center rounded-3xl px-4 py-3">
        <Animated.View style={iconStyle}>
          <Ionicons name={iconName} size={20} color={color.white} />
        </Animated.View>
        <AnimatedText className="text-base" style={textStyle}>
          {label}
        </AnimatedText>
      </View>
    </TouchableOpacity>
  );
}

export const RideBookingScreen: React.FC<RideBookingScreenProps> = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useI18n();

  const [rideType, setRideType] = useState<RideType>('daily');

  const dailyLayout = useSharedValue<TabLayout>({ x: 0, width: 0 });
  const airportLayout = useSharedValue<TabLayout>({ x: 0, width: 0 });
  const activeIndex = useSharedValue(0);

  const handleRideTypeChange = useCallback(
    (type: RideType) => {
      setRideType(type);
      activeIndex.value = withTiming(type === 'daily' ? 0 : 1, {
        duration: TAB_ANIM_DURATION,
      });
    },
    [activeIndex]
  );

  const indicatorStyle = useAnimatedStyle(() => {
    const x = interpolate(activeIndex.value, [0, 1], [dailyLayout.value.x, airportLayout.value.x]);
    const width = interpolate(
      activeIndex.value,
      [0, 1],
      [dailyLayout.value.width, airportLayout.value.width]
    );

    return {
      transform: [{ translateX: x }],
      width,
    };
  });

  return (
    <View className="flex-1">
      <View className="relative flex-1 bg-white dark:bg-black">
        {/* Carrousel */}
        <Carousel
          width={width}
          height={200}
          data={data}
          autoPlay
          autoPlayInterval={3000}
          loop
          renderItem={({ item }) => (
            <View
              style={{
                flex: 1,
                backgroundColor: '#000',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Image style={{ flex: 1, width: width, height: 200 }} source={item} />
            </View>
          )}
        />

        {/* TAB conatiner main */}
        <View
          className="absolute top-44 h-full w-full rounded-t-[24px] bg-white dark:bg-transparent"
          style={isDark ? { backgroundColor: color.appDarkBackground } : undefined}>
          {/* Tabs container */}
          <View className="mt-4 flex-1 items-center">
            {/*  container header tab*/}
            <View className="relative ml-4 mr-4 mt-1 flex-row items-center justify-center rounded-[42px] bg-muted p-2">
              <Animated.View
                pointerEvents="none"
                style={[
                  indicatorStyle,
                  { top: 8, bottom: 8 },
                  isDark ? { backgroundColor: color.primary } : undefined,
                ]}
                className="absolute left-0 rounded-3xl bg-primary"
              />
              <TabHeader
                label={t('booking.dailyTab')}
                iconName="car-sport-outline"
                onPress={() => handleRideTypeChange('daily')}
                onSelect={rideType === 'daily'}
                isDark={isDark}
                onTabLayout={(event) => {
                  const { x, width } = event.nativeEvent.layout;
                  dailyLayout.value = { x, width };
                }}
              />
              <View className="w-4" />
              <TabHeader
                label={t('booking.airportTab')}
                iconName="airplane-outline"
                onPress={() => handleRideTypeChange('airport')}
                onSelect={rideType === 'airport'}
                isDark={isDark}
                onTabLayout={(event) => {
                  const { x, width } = event.nativeEvent.layout;
                  airportLayout.value = { x, width };
                }}
              />
            </View>

            {/*  container body tab*/}
            <View className="mt-4 w-full flex-1">
              <NativeOnlyAnimatedView
                key={rideType}
                entering={FadeIn.duration(220)}
                exiting={FadeOut.duration(160)}
                className="flex-1">
                {rideType === 'daily' ? <Daily /> : <Airport />}
              </NativeOnlyAnimatedView>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};
