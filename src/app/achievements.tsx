
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function AchievementsScreen() {
  const [firstLessonBadge, setFirstLessonBadge] = useState(false);
  const [perfectLessonBadge, setPerfectLessonBadge] = useState(false);

  useEffect(() => {
    async function loadAchievements() {
      try {
        const first = await AsyncStorage.getItem(
          'mexicanSlangFirstLessonBadge'
        );
        const perfect = await AsyncStorage.getItem(
          'mexicanSlangPerfectLessonBadge'
        );

        setFirstLessonBadge(first === 'true');
        setPerfectLessonBadge(perfect === 'true');
      } catch (error) {
        console.log('Error al cargar los logros:', error);
      }
    }

    loadAchievements();
  }, []);

  const achievements = [
    {
      id: 'first',
      title: 'First Lesson',
      description: 'You completed your first lesson!',
      emoji: '🏅',
      unlocked: firstLessonBadge,
    },
    {
      id: 'perfect',
      title: 'Perfectionist!',
      description: 'You answered every question correctly!',
      emoji: '🏆',
      unlocked: perfectLessonBadge,
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>My Achievements</Text>
      <Text style={styles.subtitle}>
        Keep learning Mexican Spanish to unlock them all!
      </Text>

      {achievements.map((achievement) => (
        <View
          key={achievement.id}
          style={[
            styles.card,
            !achievement.unlocked && styles.lockedCard,
          ]}
        >
          <Text style={styles.emoji}>
            {achievement.unlocked ? achievement.emoji : '🔒'}
          </Text>

          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>{achievement.title}</Text>
            <Text style={styles.description}>
              {achievement.unlocked
                ? achievement.description
                : 'Complete the challenge to unlock this badge.'}
            </Text>
          </View>

          <Text style={styles.status}>
            {achievement.unlocked ? 'Unlocked' : 'Locked'}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  lockedCard: {
    opacity: 0.6,
  },
  emoji: {
    fontSize: 30,
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#64748B',
  },
  status: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0F766E',
    marginLeft: 8,
  },
});
