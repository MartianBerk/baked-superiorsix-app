import { Image, type ImageStyle, type StyleProp } from 'react-native';

const logo = require('../../../assets/icons/logo.png');

type Props = {
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
};

/** Superior Six header mark — `assets/icons/logo.png`. */
export function SuperiorSixLogo({
  width = 72,
  height = 72,
  style,
}: Props) {
  return (
    <Image
      source={logo}
      style={[{ width, height }, style]}
      resizeMode="contain"
      accessibilityLabel="Superior Six"
    />
  );
}
