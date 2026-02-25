/**
 * Character Avatar Generator
 * Generates instant, kid-friendly SVG avatars without API calls
 * Uses DiceBear for consistent, cute character designs
 */

import { createAvatar } from '@dicebear/core';
import { bottts, funEmoji, lorelei, bigSmile } from '@dicebear/collection';

// Color mapping for consistent theming
const COLOR_PALETTE: Record<string, string[]> = {
  Emerald: ['#10b981', '#059669', '#34d399'],
  Ocean: ['#0ea5e9', '#0284c7', '#38bdf8'],
  Sunset: ['#f59e0b', '#d97706', '#fbbf24'],
  Rose: ['#f43f5e', '#e11d48', '#fb7185'],
  Purple: ['#a855f7', '#9333ea', '#c084fc'],
  Mint: ['#6ee7b7', '#34d399', '#a7f3d0'],
};

export function generateCharacterAvatar(
  characterName: string,
  characterType: string,
  color: string
): string {
  // Get color palette
  const colors = COLOR_PALETTE[color] || COLOR_PALETTE.Emerald;
  const seed = characterName;

  let avatar;

  // Generate based on character type
  switch (characterType) {
    case 'Turtle':
    case 'Fox':
      avatar = createAvatar(funEmoji, {
        seed,
        backgroundColor: [colors[0]],
      });
      break;

    case 'Dolphin':
      avatar = createAvatar(lorelei, {
        seed,
        backgroundColor: [colors[0]],
      });
      break;

    case 'Crab':
    case 'Owl':
      avatar = createAvatar(bottts, {
        seed,
        backgroundColor: [colors[0]],
      });
      break;

    case 'Bunny':
      avatar = createAvatar(bigSmile, {
        seed,
        backgroundColor: [colors[0]],
      });
      break;

    default:
      avatar = createAvatar(funEmoji, {
        seed,
        backgroundColor: [colors[0]],
      });
  }

  // Convert to data URI
  const svg = avatar.toString();
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// Predefined character options for quick selection
export const PREDEFINED_CHARACTERS = [
  {
    name: 'Shelly',
    type: 'Turtle',
    color: 'Emerald',
    description: 'A wise and gentle turtle',
  },
  {
    name: 'Splash',
    type: 'Dolphin',
    color: 'Ocean',
    description: 'A playful and smart dolphin',
  },
  {
    name: 'Snippy',
    type: 'Crab',
    color: 'Sunset',
    description: 'A friendly and brave crab',
  },
  {
    name: 'Hoppy',
    type: 'Bunny',
    color: 'Mint',
    description: 'A cheerful and energetic bunny',
  },
  {
    name: 'Felix',
    type: 'Fox',
    color: 'Sunset',
    description: 'A clever and kind fox',
  },
  {
    name: 'Hoot',
    type: 'Owl',
    color: 'Purple',
    description: 'A wise and thoughtful owl',
  },
];

// Generate all predefined character avatars
export function getAllPredefinedAvatars() {
  return PREDEFINED_CHARACTERS.map(char => ({
    ...char,
    image: generateCharacterAvatar(char.name, char.type, char.color),
  }));
}
