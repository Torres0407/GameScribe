import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { Button } from '../ui/Button';

interface ScriptEditorProps {
  assetName: string;
  content: string;
  onRevise: (instructions: string) => Promise<void>;
}

export function ScriptEditor({ assetName, content, onRevise }: ScriptEditorProps) {
  const [isRevising, setIsRevising] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReviseSubmit = async () => {
    if (!instructions.trim()) return;
    setLoading(true);
    await onRevise(instructions);
    setInstructions('');
    setIsRevising(false);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{assetName}</Text>
        <Button
          title={isRevising ? 'Cancel' : '✏️ Revise Asset'}
          variant="secondary"
          onPress={() => setIsRevising(!isRevising)}
          style={styles.reviseButton}
          textStyle={styles.reviseButtonText}
        />
      </View>

      {isRevising && (
        <View style={styles.reviseBox}>
          <Text style={styles.reviseLabel}>Specify edits to apply to {assetName}:</Text>
          <TextInput
            style={styles.reviseInput}
            value={instructions}
            onChangeText={setInstructions}
            placeholder="e.g. Add a darker twist to Chapter 2 choice B..."
            placeholderTextColor="#64748B"
          />
          <Button
            title="Submit Revision"
            onPress={handleReviseSubmit}
            loading={loading}
          />
        </View>
      )}

      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentPadding}>
        <Text style={styles.markdownText}>{content}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerTitle: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '700',
  },
  reviseButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginVertical: 0,
  },
  reviseButtonText: {
    fontSize: 13,
  },
  reviseBox: {
    backgroundColor: '#161E2E',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  reviseLabel: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 6,
  },
  reviseInput: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    color: '#F8FAFC',
    fontSize: 14,
    marginBottom: 8,
  },
  contentScroll: {
    flex: 1,
  },
  contentPadding: {
    padding: 16,
  },
  markdownText: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Courier',
  },
});
