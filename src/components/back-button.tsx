
import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

type BackButtonProps = {
  label?: string;
  topSpacing?: number;
};

export default function BackButton({
  label = 'Back to learning path',
  topSpacing = 75,
}: BackButtonProps) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.setParams({ category: undefined })}
      style={{
        alignSelf: 'flex-start',
        marginTop: topSpacing,
        marginBottom: 16,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: '#E2E8F0',
        zIndex: 10,
        elevation: 10,
      }}
    >
      <Text style={{ color: '#334155', fontWeight: 'bold' }}>
        ← {label}
      </Text>
    </Pressable>
  );
}
