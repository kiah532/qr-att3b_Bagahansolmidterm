import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  theme?: 'primary';
  disabled?: boolean;
  onPress: () => void;
};

export default function AppButton({
  title,
  icon,
  theme,
  disabled,
  onPress,
}: Props) {
  const isPrimary = theme === 'primary';

  return (
    <View style={styles.buttonOuter}>
      <Pressable
        disabled={disabled}
        style={[
          styles.buttonInner,
          isPrimary ? styles.primaryInner : styles.secondaryInner,
          disabled && styles.disabled,
        ]}
        onPress={onPress}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={isPrimary ? COLORS.textOnPrimary : COLORS.textPrimary}
            style={styles.icon}
          />
        )}
        <Text
          style={[
            styles.label,
            isPrimary ? styles.primaryLabel : styles.secondaryLabel,
          ]}
        >
          {title}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonOuter: {
    width: '100%',
    marginBottom: 12,
  },
  buttonInner: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryInner: {
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  secondaryInner: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    paddingRight: 8,
  },
  label: {
    fontSize: 16,
  },
  primaryLabel: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
  },
  secondaryLabel: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
});