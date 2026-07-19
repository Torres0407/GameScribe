import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { GenerateScriptRequest } from '@gamescribe/shared-types';

interface GenerateFormProps {
  onSubmit: (data: GenerateScriptRequest) => void;
  loading?: boolean;
}

export function GenerateForm({ onSubmit, loading }: GenerateFormProps) {
  const [idea, setIdea] = useState('A detective trapped in a haunted, surreal hotel where rooms mirror his past unresolved cases.');
  const [genre, setGenre] = useState('horror');
  const [tone, setTone] = useState('psychological, slow-burn, atmospheric');
  const [targetLength, setTargetLength] = useState('medium (6-8 chapters)');
  const [platform, setPlatform] = useState('PC / Console');
  const [referenceGames, setReferenceGames] = useState('Silent Hill, Return of the Obra Dinn');
  const [endingsCount, setEndingsCount] = useState('3');

  const handleSubmit = () => {
    onSubmit({
      idea,
      genre,
      tone,
      targetLength,
      platform,
      referenceGames: referenceGames.split(',').map((s: string) => s.trim()).filter(Boolean),
      endingsCount: parseInt(endingsCount, 10) || 3,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Generate Script Package</Text>
      <Text style={styles.subtitle}>Configure your narrative parameters to generate STORY.md, CHARACTERS.md, DIALOGUE.md & more.</Text>

      <Input
        label="Game Idea / Premise"
        value={idea}
        onChangeText={setIdea}
        multiline
        numberOfLines={3}
        placeholder="Describe your game idea..."
      />

      <Input
        label="Genre"
        value={genre}
        onChangeText={setGenre}
        placeholder="e.g. horror, sci-fi, RPG, mystery"
      />

      <Input
        label="Tone & Atmosphere"
        value={tone}
        onChangeText={setTone}
        placeholder="e.g. psychological, dark, humorous"
      />

      <Input
        label="Target Length"
        value={targetLength}
        onChangeText={setTargetLength}
        placeholder="e.g. short, medium (6-8 chapters), epic"
      />

      <Input
        label="Target Platform"
        value={platform}
        onChangeText={setPlatform}
        placeholder="e.g. PC, Mobile, VR"
      />

      <Input
        label="Reference Games (Comma Separated)"
        value={referenceGames}
        onChangeText={setReferenceGames}
        placeholder="e.g. Silent Hill, Alan Wake"
      />

      <Input
        label="Number of Branching Endings"
        value={endingsCount}
        onChangeText={setEndingsCount}
        keyboardType="numeric"
      />

      <Button
        title={loading ? 'Generating Package...' : '✨ Generate Script Package'}
        onPress={handleSubmit}
        loading={loading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 20,
  },
});
