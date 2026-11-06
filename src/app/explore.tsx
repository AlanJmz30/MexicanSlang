
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const categories = [
  {
    emoji: '🇲🇽',
    title: 'Expresiones básicas',
    description: 'Aprende frases para conversar todos los días.',
    color: '#DDF5E3',
  },
  {
    emoji: '😎',
    title: 'Jerga mexicana',
    description: 'Habla como alguien de México.',
    color: '#FFF0CC',
  },
  {
    emoji: '🗣️',
    title: 'Frases de la calle',
    description: 'Descubre cómo se habla en situaciones reales.',
    color: '#E8E3FF',
  },
];

export default function ExploreScreen() {
  const [progress, setProgress] = useState({
    basics: { lessons: 0, bestScore: 0 },
    slang: { lessons: 0, bestScore: 0 },
    street: { lessons: 0, bestScore: 0 },
  });

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const categories = ['basics', 'slang', 'street'] as const;

        const results = await Promise.all(
          categories.map(async (category) => {
            const lessons = await AsyncStorage.getItem(
              `mexicanSlangCompletedLessons_${category}`
            );
            const bestScore = await AsyncStorage.getItem(
              `mexicanSlangBestScore_${category}`
            );

            return {
              category,
              lessons: Number(lessons ?? 0),
              bestScore: Number(bestScore ?? 0),
            };
          })
        );

        setProgress((previous) => ({
          ...previous,
          ...Object.fromEntries(
            results.map((item) => [
              item.category,
              { lessons: item.lessons, bestScore: item.bestScore },
            ])
          ),
        }));
      } catch (error) {
        console.log('Error al cargar el progreso:', error);
      }
    };

    loadProgress();
  }, []);
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>¡QUÉ ONDA!</Text>
      <Text style={styles.title}>MexicanSlang 🇲🇽</Text>
      <Text style={styles.subtitle}>
        Aprende español mexicano una expresión a la vez.
      </Text>

      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>🌮</Text>
        <Text style={styles.heroTitle}>¡Ponte a prueba!</Text>
        <Text style={styles.heroText}>
          Practica expresiones mexicanas y descubre cuánto sabes.
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => router.navigate('/')}>
          <Text style={styles.buttonText}>Empezar a aprender →</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Explora por categorías</Text>

      {categories.map((category) => (
        <Pressable
          key={category.title}
          style={[styles.category, { backgroundColor: category.color }]}
          onPress={() =>
            router.push({
              pathname: '/',
              params: {
                category:
                  category.title === 'Jerga mexicana'
                    ? 'slang'
                    : category.title === 'Frases de la calle'
                      ? 'street'
                      : 'basics',
              },
            })
          }>
          <Text style={styles.categoryEmoji}>{category.emoji}</Text>
          <View style={styles.categoryContent}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <Text style={styles.categoryDescription}>
              {category.description}
            </Text>
            {(() => {
  const key =
    category.title === 'Jerga mexicana'
      ? 'slang'
      : category.title === 'Frases de la calle'
        ? 'street'
        : 'basics';

  const total = 6;
  const completed = Math.min(progress[key].lessons, total);
  const percentage = (completed / total) * 100;

  return (
    <View style={{ marginTop: 12 }}>
      <View
        style={{
          height: 8,
          backgroundColor: 'rgba(255,255,255,0.45)',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
        <View
          style={{
            height: 8,
            width: `${percentage}%`,
            backgroundColor: '#166534',
            borderRadius: 10,
          }}
        />
      </View>

      <Text
        style={{
          fontSize: 12,
          marginTop: 5,
          color: '#333',
        }}>
        {completed} de {total} lecciones · {Math.round(percentage)}%
      </Text>
    </View>
  );
})()}
            <Text style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
              Lecciones completadas: {
                progress[
                  category.title === 'Jerga mexicana'
                    ? 'slang'
                    : category.title === 'Frases de la calle'
                      ? 'street'
                      : 'basics'
                ].lessons
              }
              {' · '}
              Mejor puntuación: {
                progress[
                  category.title === 'Jerga mexicana'
                    ? 'slang'
                    : category.title === 'Frases de la calle'
                      ? 'street'
                      : 'basics'
                ].bestScore
              }
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      ))}

      <Text style={styles.footer}>Hecho con ❤️ en México</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 35,
    paddingBottom: 40,
    backgroundColor: '#FFFDF8',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
    color: '#16834A',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#173D2A',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    color: '#647067',
    marginTop: 8,
    marginBottom: 24,
  },
  hero: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    backgroundColor: '#173D2A',
    borderRadius: 24,
    padding: 22,
    marginBottom: 30,
  },
  heroEmoji: {
    fontSize: 42,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 10,
  },
  heroText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#E4F1E8',
    marginTop: 8,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#F4C95D',
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#173D2A',
    fontWeight: '800',
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#173D2A',
    marginBottom: 15,
  },
  category: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  categoryEmoji: {
    fontSize: 30,
    marginRight: 13,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#24362A',
  },
  categoryDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: '#4D5B50',
    marginTop: 4,
  },
  arrow: {
    fontSize: 28,
    color: '#425347',
    marginLeft: 8,
  },
  footer: {
    textAlign: 'center',
    color: '#778078',
    marginTop: 22,
    fontSize: 13,
  },
});
