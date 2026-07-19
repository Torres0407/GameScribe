import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useProject } from '../../../hooks/useProject';
import { ScriptEditor } from '../../../components/editor/ScriptEditor';
import { apiFetch } from '../../../lib/api-client';
import { ProjectAsset } from '@gamescribe/shared-types';

export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { currentProject, loading, refetchDetails } = useProject(projectId);
  const [selectedAsset, setSelectedAsset] = useState<string>('STORY.md');

  if (loading || !currentProject) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#6366F1" size="large" />
        <Text style={styles.loadingText}>Loading script assets...</Text>
      </View>
    );
  }

  const assetList = currentProject.assets || [];
  const activeAssetData = assetList.find((a: ProjectAsset) => a.assetName === selectedAsset) || assetList[0];

  const handleReviseAsset = async (instructions: string) => {
    if (!activeAssetData) return;
    await apiFetch(`/projects/${projectId}/assets/${activeAssetData.assetName}/revise`, {
      method: 'POST',
      body: JSON.stringify({ instructions }),
    });
    await refetchDetails(projectId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.projectHeader}>
        <Text style={styles.projectName}>{currentProject.name}</Text>
        <Text style={styles.projectIdea} numberOfLines={2}>{currentProject.idea}</Text>
      </View>

      {/* Asset Tab Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {['STORY.md', 'CHARACTERS.md', 'DIALOGUE.md', 'QUESTS.md', 'ENDINGS.md'].map(assetName => {
          const isSelected = selectedAsset === assetName;
          const exists = assetList.some((a: ProjectAsset) => a.assetName === assetName);
          return (
            <TouchableOpacity
              key={assetName}
              style={[styles.tabItem, isSelected ? styles.tabItemActive : null]}
              onPress={() => setSelectedAsset(assetName)}
            >
              <Text style={[styles.tabText, isSelected ? styles.tabTextActive : null]}>
                {assetName} {exists ? '' : '⏳'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Editor Content Area */}
      <View style={styles.editorArea}>
        {activeAssetData ? (
          <ScriptEditor
            assetName={activeAssetData.assetName}
            content={activeAssetData.content}
            onRevise={handleReviseAsset}
          />
        ) : (
          <View style={styles.noAssetBox}>
            <Text style={styles.noAssetText}>Asset "{selectedAsset}" has not been generated yet.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
    padding: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090D16',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
  },
  projectHeader: {
    backgroundColor: '#0F172A',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  projectName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  projectIdea: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  tabBar: {
    maxHeight: 44,
    marginBottom: 10,
  },
  tabItem: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    justifyContent: 'center',
  },
  tabItemActive: {
    backgroundColor: '#4338CA',
    borderColor: '#6366F1',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#F8FAFC',
  },
  editorArea: {
    flex: 1,
  },
  noAssetBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 24,
  },
  noAssetText: {
    color: '#64748B',
    fontSize: 14,
  },
});
