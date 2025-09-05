import { Celebrity, ICelebrity } from '../database/models/Celebrity';

/**
 * Test helper functions for common testing operations
 */

export const createTestCelebrity = async (data: Partial<ICelebrity>): Promise<ICelebrity> => {
  const celebrity = new Celebrity(data);
  return await celebrity.save();
};

export const createMultipleTestCelebrities = async (
  celebrities: Partial<ICelebrity>[]
): Promise<ICelebrity[]> => {
  const createdCelebrities: ICelebrity[] = [];

  for (const celebrityData of celebrities) {
    const celebrity = await createTestCelebrity(celebrityData);
    createdCelebrities.push(celebrity);
  }

  return createdCelebrities;
};

export const clearDatabase = async (): Promise<void> => {
  await Celebrity.deleteMany({});
};

export const countCelebrities = async (filter: Record<string, unknown> = {}): Promise<number> => {
  return await Celebrity.countDocuments(filter);
};

export const findCelebrityByName = async (name: string): Promise<ICelebrity | null> => {
  return await Celebrity.findOne({ name });
};

/**
 * Assertion helpers for common test patterns
 */
export const expectCelebrityToMatch = (actual: ICelebrity, expected: Partial<ICelebrity>): void => {
  expect(actual.name).toBe(expected.name);
  expect(actual.category).toBe(expected.category);
  expect(actual.priority).toBe(expected.priority);
  expect(actual.isActive).toBe(expected.isActive);

  if (expected.aliases) {
    expect(actual.aliases).toEqual(expect.arrayContaining(expected.aliases));
  }

  if (expected.socialMedia) {
    expect(actual.socialMedia).toMatchObject(expected.socialMedia);
  }
};

export const expectValidCelebrityStructure = (celebrity: ICelebrity): void => {
  expect(celebrity).toHaveProperty('_id');
  expect(celebrity).toHaveProperty('name');
  expect(celebrity).toHaveProperty('slug');
  expect(celebrity).toHaveProperty('category');
  expect(celebrity).toHaveProperty('priority');
  expect(celebrity).toHaveProperty('isActive');
  expect(celebrity).toHaveProperty('createdAt');
  expect(celebrity).toHaveProperty('updatedAt');

  // Validate data types
  expect(typeof celebrity.name).toBe('string');
  expect(typeof celebrity.slug).toBe('string');
  expect(typeof celebrity.priority).toBe('number');
  expect(typeof celebrity.isActive).toBe('boolean');
  expect(Array.isArray(celebrity.aliases)).toBe(true);
  expect(Array.isArray(celebrity.searchTerms)).toBe(true);
};
