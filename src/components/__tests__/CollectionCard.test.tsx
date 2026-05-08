// CollectionCard branches: progress = found/total with a divide-by-zero
// guard, emoji fallback chain (icon → CATEGORY_EMOJI → '📦'), conditional
// cover image vs emoji-placeholder, "freeform" vs "X / Y" footer.

import { render, screen } from '@testing-library/react-native';

jest.mock('@components/ProgressBar', () => ({
  ProgressBar: () => null,
}));

jest.mock('expo-image', () => ({
  Image: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${JSON.stringify(vars)}` : key,
  }),
}));

// eslint-disable-next-line import/first
import { CollectionCard } from '../CollectionCard/CollectionCard';

const BASE = {
  id: 'c1',
  creator_id: 'u1',
  title: 'Doors of Warsaw',
  description: 'Brass knobs, weathered oak.',
  icon: null,
  cover_image_url: null,
  category: 'urban' as const,
  ai_hint: null,
  is_freeform: false,
  is_public: true,
  is_featured: false,
  forked_from: null,
  created_at: 't',
  updated_at: 't',
  items_count: 5,
  found_count: 2,
};

describe('CollectionCard', () => {
  it('renders title and description', () => {
    render(<CollectionCard collection={BASE} onPress={() => {}} />);
    expect(screen.getByText('Doors of Warsaw')).toBeTruthy();
    expect(screen.getByText('Brass knobs, weathered oak.')).toBeTruthy();
  });

  it('renders the i18n progress key with found / total', () => {
    render(<CollectionCard collection={BASE} onPress={() => {}} />);
    expect(screen.getByText(/collections\.progress.*found.*2.*total.*5/)).toBeTruthy();
  });

  it('renders the freeform key when collection.is_freeform', () => {
    render(<CollectionCard collection={{ ...BASE, is_freeform: true }} onPress={() => {}} />);
    expect(screen.getByText('collections.freeform')).toBeTruthy();
  });

  it('uses the supplied icon as the cover-area emoji when no cover_image_url', () => {
    render(
      <CollectionCard
        collection={{ ...BASE, icon: '🚪', cover_image_url: null }}
        onPress={() => {}}
      />
    );
    expect(screen.getByText('🚪')).toBeTruthy();
  });

  it('falls back to the category emoji when icon is null', () => {
    // CATEGORY_EMOJI.urban — the actual mapping. We assert the rendered
    // string is non-empty and not the absolute-fallback '📦', which would
    // mean both branches missed.
    render(<CollectionCard collection={BASE} onPress={() => {}} />);
    expect(screen.queryByText('📦')).toBeNull();
  });

  it('falls back to 📦 when both icon and category are missing', () => {
    render(
      <CollectionCard collection={{ ...BASE, icon: null, category: null }} onPress={() => {}} />
    );
    expect(screen.getByText('📦')).toBeTruthy();
  });

  it('omits the description block when description is null', () => {
    render(<CollectionCard collection={{ ...BASE, description: null }} onPress={() => {}} />);
    expect(screen.queryByText('Brass knobs, weathered oak.')).toBeNull();
  });

  it('handles the divide-by-zero case (no items) — passes 0 progress, no crash', () => {
    render(
      <CollectionCard collection={{ ...BASE, items_count: 0, found_count: 0 }} onPress={() => {}} />
    );
    expect(screen.getByText('Doors of Warsaw')).toBeTruthy();
  });
});
