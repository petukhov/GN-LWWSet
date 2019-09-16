import LWWSet from '../LWWSet';
import { performance } from 'perf_hooks';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const mockDateObj = {
  now() {
    // performance.now is more precise than the default Date.now
    return performance.now();
  }
}

let set: LWWSet<String>;
beforeEach(() => {
  set = new LWWSet<String>(mockDateObj);
});

test('has value', () => {
  set.add('123');
  const has = set.has('123');
  expect(has).toBe(true);
});

test('has a complex Object value but not a different object with the same contents', () => {
  const set = new LWWSet<{a: Number, b: String}>();
  const obj = { a: 123, b: 'hello' };
  const diffObj = { a: 123, b: 'hello' };
  set.add(obj);
  expect(set.has(obj)).toBe(true);
  expect(!set.has(diffObj)).toBe(true);
});

test('doesn\'t have value', () => {
  expect(set.has('123')).toBe(false);
});

test('doesn\'t have value after removal', () => {
  set.add('123');
  expect(set.has('123')).toBe(true);
  set.remove('123');
  expect(set.has('123')).toBe(false);
});

test('has value after muliple add/remove', async () => {
  set.add('123');
  set.remove('123');
  set.add('123');
  expect(set.has('123')).toBe(true);
});

test('has value after muliple add/remove even when adding extra wait', async () => {
  set.add('123');
  await wait(10);
  set.remove('123');
  await wait(10);
  set.add('123');
  expect(set.has('123')).toBe(true);
});

test('doesn\'t have any values by default', () => {
  expect(set.values()).toStrictEqual([]);
});

test('doesn\'t have any values after removal', () => {
  set.add('123');
  set.add('abc');
  expect(set.values()).toStrictEqual(['123', 'abc']);
  set.remove('123');
  set.remove('abc');
  expect(set.values()).toStrictEqual([]);
});

test('basic merging', () => {
  set.add('123');
  const set2 = new LWWSet<String>(mockDateObj);
  set2.add('abc');
  set.merge(set2.getData());
  expect(set.values()).toStrictEqual(['123', 'abc']);
});

test('trying to merge non LWWSet instance', () => {
  // @ts-ignore
  expect(() => set.merge({})).toThrowError(
    'Merged data should not be undefined and should contain addSetData and removeSetData arrays'
  );
});

test('merging empty set into empty set', () => {
  set.merge(new LWWSet<String>(mockDateObj).getData());
  expect(set.values()).toStrictEqual([]);
});

test('merging set with removed values that were removed later', () => {
  set.add('123');
  const set2 = new LWWSet<String>(mockDateObj);
  set2.remove('123');
  set.merge(set2.getData());
  expect(set.has('123')).toBe(false);
});

test('merging set with removed values that were removed earlier', () => {
  const set2 = new LWWSet<String>(mockDateObj);
  set2.remove('123');
  set.add('123');
  set.merge(set2.getData());
  expect(set.has('123')).toBe(true);
});

test('merging set or being merged into another set, the result should be the same', () => {
  const set1 = new LWWSet<String>(mockDateObj);
  const set2 = new LWWSet<String>(mockDateObj);
  const set3 = new LWWSet<String>(mockDateObj);

  set1.add('abc');
  set1.add('123');
  set1.remove('abc');
  set2.add('abc');
  set2.merge(set1.getData());
  expect(set2.values()).toStrictEqual(['123', 'abc']);
  
  set3.add('abc');
  set1.merge(set3.getData());
  expect(set1.values()).toStrictEqual(['123', 'abc']);
});

test('merging set with removed values that were removed at the same time and order doesn\'t matter', () => {
  const sameTimeDate = {
    now: () => 9999,
  }
  const set1 = new LWWSet<String>(sameTimeDate);
  const set2 = new LWWSet<String>(sameTimeDate);
  const set3 = new LWWSet<String>(sameTimeDate);

  set2.remove('123');
  set1.add('123');
  set3.add('123');
  set1.merge(set2.getData());
  set2.merge(set3.getData());

  expect(set1.has('123')).toBe(false);
  expect(set2.has('123')).toBe(false);
});

test('merging same set twice and remerging back into source set', () => {
  const set1 = new LWWSet<String>(mockDateObj);
  const set2 = new LWWSet<String>(mockDateObj);
  
  set1.add('123');
  set1.add('abc');
  set1.remove('abc');
  set1.remove('123');
  set1.add('hello');
  set1.remove('456');
  
  set2.add('456');
  set2.remove('hello');
  set2.add('123');
  
  set2.merge(set1.getData());
  set2.merge(set1.getData());
  expect(set2.values()).toStrictEqual(['123', '456']);

  set1.merge(set2.getData());
  expect(set1.values()).toStrictEqual(['123', '456']);
});

test('merging itself', () => {
  set.remove('123');
  set.add('123');
  set.add('hello');
  set.remove('hello');
  set.merge(set.getData());
  expect(set.values()).toStrictEqual(['123']);
});

test('3 sets, 3 merges, data stays casually consistent', () => {
  const set1 = new LWWSet<String>(mockDateObj);
  const set2 = new LWWSet<String>(mockDateObj);
  const set3 = new LWWSet<String>(mockDateObj);

  set1.add('123');
  set1.add('abc');
  set1.remove('abc');
  set1.remove('123');
  set1.add('hello');
  set1.remove('456');
  
  set2.add('456');
  set2.remove('hello');
  set2.add('123');

  set3.add('hello');
  set3.remove('123');
  
  set3.merge(set1.getData());
  set2.merge(set3.getData());

  expect(set2.values()).toStrictEqual(['456', 'hello']);

  set2.merge(set1.getData());

  expect(set2.values()).toStrictEqual(['456', 'hello']);
});
