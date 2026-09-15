'use client';

/**
 * Public API of features/media.
 * External features (articles, opinions) may consume ONLY this entry point
 * (MediaPicker + MediaOption type). Internal components/services stay
 * private to the feature — do not deep-import them from other features.
 */
export { MediaPicker } from './components/MediaPicker';
export type { MediaOption } from './types';
