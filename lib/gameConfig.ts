import { Brain, Palette, Video, List } from 'lucide-react';

export const GAMES = [
    {
        id: 'rebus',
        name: 'Word Guess',
        icon: Brain,
        image: '/images/games/rebus_hand.png',
        color: '#ec4899',
        tagline: 'The Ultimate Visual Riddle',
        desc: 'Solve visual riddles against time. Decode the images to find the phrase!',
        howToPlay: 'In Word Guess (Rebus), you are presented with a series of icons, emojis, or clever text arrangements that represent a common word or phrase. Your goal is to decipher the visual code and type the correct answer before your friends do! Think outside the box—sometimes the position, color, or relative size of the elements is the key to the solution.',
        features: ['1000+ Unique Puzzles', 'Competitive Real-time Scoring', 'Themed Level Packs', 'Dynamic Difficulty'],
        rules: [
            'Guess the phrase from the images.',
            'Each correct guess earns points.',
            'Faster answers get more points!',
            '3 Rounds of intensity.'
        ]
    },
    {
        id: 'draw',
        name: 'Draw & Guess',
        icon: Palette,
        image: '/images/games/draw_hand.png',
        color: '#06b6d4',
        tagline: 'Sketch to Win',
        desc: 'Sketch your way to victory. One draws, others guess!',
        howToPlay: 'One player is chosen as the artist and receives a secret prompt. They must draw it on the digital canvas using various tools, while everyone else watches the strokes live and types their guesses in the chat. The faster you guess correctly, the more points you earn. No artistic skills? No problem! Often the funniest drawings lead to the best games.',
        features: ['Low-Latency Stroke Rendering', 'Multiplayer Live Chat', 'Custom Brush Presets', 'Word Difficulty Selection'],
        rules: [
            'The artist chooses a word to draw.',
            'Players guess the word.',
            'Points for the artist if guessed.',
            'Points for correct guessers.'
        ]
    },
    {
        id: 'charades',
        name: 'Video Charades',
        icon: Video,
        image: '/images/games/charades_hand.png',
        color: '#f472b6',
        tagline: 'High-Tech Acting',
        desc: 'Act it out on camera. No talking allowed!',
        howToPlay: 'A modern twist on the party staple. One player acts out a secret prompt on camera without speaking. The rest of the team must guess the answer. Our platform uses low-latency video streaming to ensure every gesture and expression is captured in real-time for yours friends to see.',
        features: ['HD Video Streaming', 'Integrated Gesture Detection', 'Team-Based Play', 'Automated Prompt Generation'],
        rules: [
            'Enable your camera.',
            'Act out the word without speaking.',
            'Team guesses within time limit.',
            'Creativity wins!'
        ]
    },
    {
        id: 'categories',
        name: 'Categories',
        icon: List,
        image: '/images/games/categories_hand.png',
        color: '#10b981',
        tagline: 'Think Fast, Type Faster',
        desc: 'Name things in categories starting with a specific letter.',
        howToPlay: 'A random letter is chosen for the round. You must quickly think of words that fit into several distinct categories (e.g., "City", "Animal", "Ice Cream Flavor") starting with that specific letter. Be unique! If another player has the same answer as you, you both lose points for that category.',
        features: ['Custom Category Lists', 'Unique Answer Multipliers', 'Timed Rounds', 'Global Answer Database'],
        rules: [
            'A letter is chosen randomly.',
            'Fill out valid words for each category.',
            'Vote on other players answers.',
            'Most points wins!'
        ]
    },
];
