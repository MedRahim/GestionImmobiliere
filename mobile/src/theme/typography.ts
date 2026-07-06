import {Platform, TextStyle} from 'react-native';

const letterSpacing = {
  tight: 0.1,
  normal: 0.25,
  wide: 0.8,
  brand: 2.2,
};

export const typography = {
  fontRegular: Platform.select({ios: 'System', android: 'sans-serif'}),
  fontMedium: Platform.select({ios: 'System', android: 'sans-serif-medium'}),
  fontSemiBold: Platform.select({ios: 'System', android: 'sans-serif-medium'}),
  fontBold: Platform.select({ios: 'System', android: 'sans-serif-bold'}),
  fontBlack: Platform.select({ios: 'System', android: 'sans-serif-black'}),

  h1: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: letterSpacing.tight,
    fontFamily: Platform.select({ios: 'System', android: 'sans-serif-black'}),
  } as TextStyle,
  h2: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: letterSpacing.normal,
    fontFamily: Platform.select({ios: 'System', android: 'sans-serif-bold'}),
  } as TextStyle,
  h3: {
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: letterSpacing.normal,
    fontFamily: Platform.select({ios: 'System', android: 'sans-serif-bold'}),
  } as TextStyle,
  body: {
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: letterSpacing.tight,
    fontFamily: Platform.select({ios: 'System', android: 'sans-serif'}),
  } as TextStyle,
  bodySm: {
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: letterSpacing.tight,
    fontFamily: Platform.select({ios: 'System', android: 'sans-serif'}),
  } as TextStyle,
  caption: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: letterSpacing.wide,
    fontFamily: Platform.select({ios: 'System', android: 'sans-serif'}),
  } as TextStyle,
  button: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: letterSpacing.normal,
    fontFamily: Platform.select({ios: 'System', android: 'sans-serif-bold'}),
  } as TextStyle,

  shadowMarker: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
};
