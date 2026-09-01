import {Platform, TextStyle} from 'react-native';

const sans = Platform.select({ios: 'System', android: 'sans-serif'}) as string;
const sansMed = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
}) as string;
const sansBold = Platform.select({
  ios: 'System',
  android: 'sans-serif-bold',
}) as string;
const display = Platform.select({ios: 'Georgia', android: 'serif'}) as string;

export const typography = {
  fontRegular: sans,
  fontMedium: sansMed,
  fontSemiBold: sansMed,
  fontBold: sansBold,
  fontBlack: sansBold,
  fontDisplay: display,
  fontDisplayBold: display,

  display: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.4,
    fontFamily: display,
  } as TextStyle,
  h1: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.3,
    fontFamily: display,
  } as TextStyle,
  h2: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    fontFamily: sansBold,
  } as TextStyle,
  h3: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.05,
    fontFamily: sansBold,
  } as TextStyle,
  body: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
    fontFamily: sans,
  } as TextStyle,
  bodySm: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
    fontFamily: sans,
  } as TextStyle,
  caption: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.35,
    fontFamily: sansMed,
  } as TextStyle,
  button: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.25,
    fontFamily: sansBold,
  } as TextStyle,
  price: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    fontFamily: sansBold,
  } as TextStyle,

  shadowMarker: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
};
