import { Image, type ImageStyle, type StyleProp } from 'react-native';

const logoPlayer = require('../../../assets/icons/logo.png');
const logoAdmin = require('../../../assets/icons/logo-admin.png');

type Props = {
  /** Player mark vs admin mark. */
  variant?: 'player' | 'admin';
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
};

/**
 * Superior Six header mark.
 * Uses `assets/icons/logo.png` (player) / `logo-admin.png` (admin).
 */
export function SuperiorSixLogo({
  variant = 'player',
  width = 72,
  height = 72,
  style,
}: Props) {
  return (
    <Image
      source={variant === 'admin' ? logoAdmin : logoPlayer}
      style={[{ width, height }, style]}
      resizeMode="contain"
      accessibilityLabel={
        variant === 'admin' ? 'Superior Six Admin' : 'Superior Six'
      }
    />
  );
}
