import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useProject } from '../../hooks/useProject';
import { Button } from '../../components/ui/Button';
import { Project } from '@gamescribe/shared-types';

export default function DashboardScreen() {
  const router = useRouter();
  const { projects, loading, refetch } = useProject();

  return (
    <View style={styles.container}>
      <View style={styles.topBanner}>
        <Text style={styles.bannerTitle}>GameScribe Studio</Text>
        <Text style={styles.bannerSubtitle}>AI-powered game script generator and worldbuilding suite.</Text>
        <Button
          title="✨ New Game Script"
          onPress={() => router.push('/generate')}
          style={styles.newButton}
        />
      </View>

      <Text style={styles.sectionHeader}>Your In-Progress Projects</Text>

      {loading ? (
        <ActivityIndicator color="#6366F1" style={styles.loader} />
      ) : projects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No game script projects found.</Text>
          <Text style={styles.emptySubtext}>Tap "New Game Script" to generate your first script package!</Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          onRefresh={refetch}
          refreshing={loading}
          renderItem={({ item }: { item: Project }) => (
            <TouchableOpacity
              style={styles.projectCard}
              onPress={() => router.push(`/(tabs)/projects/${item.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.projectTitle}>{item.name}</Text>
                {item.genre ? <Text style={styles.genreBadge}>{item.genre.toUpperCase()}</Text> : null}
              </View>
              <Text style={styles.projectIdea} numberOfLines={2}>{item.idea}</Text>
              <Text style={styles.updatedAt}>Updated: {new Date(item.updatedAt).toLocaleDateString()}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
    padding: 16,
  },
  topBanner: {
    backgroundColor: '#1E1B4B',
    borderColor: '#4338CA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#818CF8',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#C7D2FE',
    marginBottom: 14,
  },
  newButton: {
    backgroundColor: '#6366F1',
    marginVertical: 0,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  loader: {
    marginTop: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  projectCard: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  projectTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
  },
  genreBadge: {
    backgroundColor: '#0284C7',
    color: '#F0F9FF',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  projectIdea: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  updatedAt: {
    color: '#64748B',
    fontSize: 11,
  },
});
