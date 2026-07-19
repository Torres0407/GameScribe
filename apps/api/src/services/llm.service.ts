import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class LLMService {
  private static anthropic = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY || 'placeholder',
  });

  private static masterPrompt: string = '';
  private static styleGuideTemplate: string = '';

  private static loadPrompts() {
    if (!this.masterPrompt) {
      const pPath = path.join(__dirname, '../../prompts/systemPrompt.master.txt');
      if (fs.existsSync(pPath)) {
        this.masterPrompt = fs.readFileSync(pPath, 'utf8');
      }
    }
    if (!this.styleGuideTemplate) {
      const sPath = path.join(__dirname, '../../prompts/styleGuide.template.txt');
      if (fs.existsSync(sPath)) {
        this.styleGuideTemplate = fs.readFileSync(sPath, 'utf8');
      }
    }
  }

  /**
   * Generates a single script asset file (e.g., STORY.md, CHARACTERS.md)
   */
  static async generateAsset(
    assetName: string,
    promptContext: {
      idea: string;
      genre?: string;
      tone?: string;
      platform?: string;
      targetLength?: string;
      endingsCount?: number;
      references: Array<{ title: string; genre: string; snippet: string }>;
      projectMemory: Array<{ key: string; value: unknown }>;
    }
  ): Promise<string> {
    this.loadPrompts();

    const systemPrompt = `${this.masterPrompt}\n\n${this.styleGuideTemplate}`;

    const userContent = `
Task: Generate the game asset document "${assetName}".

Game Concept:
- Idea: ${promptContext.idea}
- Genre: ${promptContext.genre || 'General Narrative'}
- Tone: ${promptContext.tone || 'Immersive'}
- Platform: ${promptContext.platform || 'Multiplatform'}
- Target Length: ${promptContext.targetLength || 'Medium'}
- Target Endings Count: ${promptContext.endingsCount || 1}

Established Continuity / Project Memory:
${JSON.stringify(promptContext.projectMemory, null, 2)}

Top Retrieved Reference Scripts Exemplars:
${promptContext.references.map((r, i) => `--- Reference Exemplar #${i + 1}: ${r.title} (${r.genre}) ---\n${r.snippet}`).join('\n\n')}

Instructions for ${assetName}:
Generate exhaustive, beautifully formatted Markdown text for ${assetName}. Do not include markdown code block backticks surrounding the whole output. Output raw markdown content directly.
`;

    if (env.ANTHROPIC_API_KEY && !env.ANTHROPIC_API_KEY.includes('placeholder')) {
      try {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 4000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }],
        });

        const textContent = response.content.find((c: any) => c.type === 'text');
        if (textContent && textContent.type === 'text') {
          return textContent.text;
        }
      } catch (err) {
        logger.error({ err, assetName }, 'Anthropic Claude generation call failed, falling back to template mock generation...');
      }
    }

    // Mock response for dev when API key is unconfigured
    return this.generateMockAssetContent(assetName, promptContext);
  }

  /**
   * Regenerate / revise an existing asset based on instructions
   */
  static async reviseAsset(
    assetName: string,
    existingContent: string,
    instructions: string
  ): Promise<string> {
    this.loadPrompts();

    const userContent = `
Task: Revise the game script asset "${assetName}".

Current Content:
${existingContent}

User Revision Request:
${instructions}

Instructions:
Update the document according to the user instructions while maintaining character consistency and formatting. Output raw markdown content directly.
`;

    if (env.ANTHROPIC_API_KEY && !env.ANTHROPIC_API_KEY.includes('placeholder')) {
      try {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 4000,
          system: this.masterPrompt,
          messages: [{ role: 'user', content: userContent }],
        });

        const textContent = response.content.find((c: any) => c.type === 'text');
        if (textContent && textContent.type === 'text') {
          return textContent.text;
        }
      } catch (err) {
        logger.error({ err, assetName }, 'Anthropic revision request failed');
      }
    }

    return `${existingContent}\n\n## Revision Note\n- ${instructions} (Applied)`;
  }

  private static generateMockAssetContent(assetName: string, context: { idea: string; genre?: string }): string {
    switch (assetName) {
      case 'STORY.md':
        return `# STORY OUTLINE: ${context.idea}\n\n## Overview\nIn a world shaped by ${context.genre || 'mystery'}, the narrative unfolds through chapters of escalating tension.\n\n### Act I: The Catalyst\nThe protagonist discovers an unexpected anomaly.\n\n### Act II: The Descent\nUncovering secrets that blur the line between reality and hallucination.\n\n### Act III: Climax & Resolution\nFacing the final revelation where every decision matters.`;
      case 'CHARACTERS.md':
        return `# CHARACTER DOSSIERS\n\n## Protagonist\n- **Name**: Detective Reyes\n- **Role**: Lead Investigator\n- **Background**: Haunted by past unresolved cases.\n\n## Antagonist / Entity\n- **Name**: The Concierge\n- **Role**: Enigmatic Caretaker of the Hotel.`;
      case 'DIALOGUE.md':
        return `# SCENE SCRIPT: REVELATION\n\nDETECTIVE REYES\n(checking flashlight)\n"This room hasn't been opened in thirty years..."\n\nTHE CONCIERGE\n(smiling faintly from the shadows)\n"And yet, sir, your reservation was made this morning."`;
      case 'QUESTS.md':
        return `# QUEST LOG & OBJECTIVES\n\n## Main Quest 1: Room 304 Key\n- [ ] Search the lobby reception desk.\n- [ ] Decode the manager's diary entry.\n- [ ] Unlock the basement breaker box.`;
      case 'ENDINGS.md':
        return `# BRANCHING ENDINGS\n\n## Ending 1: Escape (Sanity intact)\nRequirements: Collect all 5 memory fragments.\n\n## Ending 2: Trapped in the Loop\nRequirements: Accept the Concierge's offer.`;
      default:
        return `# ${assetName}\n\nContent generated for ${context.idea}.`;
    }
  }
}
