import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { GenerateForm } from '../components/forms/GenerateForm';
import { apiFetch } from '../lib/api-client';
import { useGeneration } from '../hooks/useGeneration';
import { GenerateScriptRequest, Project } from '@gamescribe/shared-types';
import { Button } from '../components/ui/Button';

export default function GenerateModalScreen() {
  const router = useRouter();
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { startGeneration, jobStatus, isGenerating, error } = useGeneration(createdProjectId || '');

  const handleStartGeneration = async (data: GenerateScriptRequest) => {
    setIsSubmitting(true);
    // Step 1: Create project record in DB
    const projectRes = await apiFetch<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: data.idea.substring(0, 30) + '...',
        idea: data.idea,
        genre: data.genre,
        metadata: {
          tone: data.tone,
          platform: data.platform,
          targetLength: data.targetLength,
          referenceGames: data.referenceGames,
          endingsCount: data.endingsCount,
        },
      }),
    });

    if (projectRes.success && projectRes.data) {
      const pId = projectRes.data.id;
      setCreatedProjectId(pId);
      setIsSubmitting(false);

      // Step 2: Trigger async generation job
      await startGeneration(data);
    } else {
      setIsSubmitting(false);
    }
  };

  if (isGenerating || (jobStatus && jobStatus.status === 'processing')) {
    return (
      <View style={styles.progressContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.progressTitle}>Architecting Game Script Package...</Text>

        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${jobStatus?.progress || 10}%` }]} />
        </View>

        <Text style={styles.progressPercent}>{jobStatus?.progress || 10}%</Text>
        <Text style={styles.progressStep}>{jobStatus?.currentStep || 'Initializing vector search & system prompts'}</Text>
      </View>
    );
  }

  if (jobStatus && jobStatus.status === 'completed' && createdProjectId) {
    return (
      <View style={styles.progressContainer}>
        <Text style={styles.successIcon}>✨</Text>
        <Text style={styles.progressTitle}>Game Script Package Generated!</Text>
        <Text style={styles.successSubtext}>
          Generated {jobStatus.assets?.length || 5} Markdown assets (`STORY.md`, `CHARACTERS.md`, etc.).
        </Text>

        <Button
          title="📖 Open Script Package"
          onPress={() => {
            router.replace(`/(tabs)/projects/${createdProjectId}`);
          }}
          style={styles.openBtn}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
      <GenerateForm onSubmit={handleStartGeneration} loading={isSubmitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  errorBanner: {
    backgroundColor: '#991B1B',
    color: '#FEE2E2',
    padding: 12,
    textAlign: 'center',
    fontSize: 13,
  },
  progressContainer: {
    flex: 1,
    backgroundColor: '#090D16',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 18,
    marginBottom: 24,
    textAlign: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 10,
    backgroundColor: '#1E293B',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '800',
    color: '#38BDF8',
    marginBottom: 6,
  },
  progressStep: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  successIcon: {
    fontSize: 48,
  },
  successSubtext: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  openBtn: {
    width: '100%',
  },
});
