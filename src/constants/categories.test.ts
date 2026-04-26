import { CATEGORY_EMOJI, COLLECTION_CATEGORIES, type CollectionCategory } from './categories';

describe('COLLECTION_CATEGORIES', () => {
  it('contains exactly 10 categories', () => {
    expect(COLLECTION_CATEGORIES).toHaveLength(10);
  });

  it('has unique values', () => {
    const set = new Set<string>(COLLECTION_CATEGORIES);
    expect(set.size).toBe(COLLECTION_CATEGORIES.length);
  });

  it.each(COLLECTION_CATEGORIES)('has an emoji for %s', (category: CollectionCategory) => {
    expect(CATEGORY_EMOJI[category]).toBeTruthy();
  });
});
