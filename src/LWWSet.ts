type Timestamp = Number

export default class LWWSet<T> {
  private addSet: Map<T, Timestamp>;
  private removeSet: Map<T, Timestamp>;
  private date: DateConstructor | { now: () => Timestamp };

  constructor(date?: DateConstructor | { now: () => Timestamp }) {
    this.addSet = new Map<T, Timestamp>();
    this.removeSet = new Map<T, Timestamp>();
    this.date = date || Date;
  }

  add(val: T) {
    this.addSet.set(val, this.date.now());
  }

  remove(val: T) {
    this.removeSet.set(val, this.date.now());
  }

  merge(data: {addSetData: [T, Timestamp][], removeSetData: [T, Timestamp][]}) {
    if (!(data && data.addSetData instanceof Array && data.removeSetData instanceof Array)) {
      throw new Error(
        'Merged data should not be undefined and should contain addSetData and removeSetData arrays'
      );
    }

    const mergeSets = (toSet: Map<T, Timestamp>, fromSet: Map<T, Timestamp>) => {
      fromSet.forEach((timestamp, val) => {
        if (toSet.has(val)) {
          const thisTimestamp = toSet.get(val);
          if (timestamp > thisTimestamp) {
            toSet.set(val, timestamp);
          }
        } else {
          toSet.set(val, timestamp);
        }
      });
    }

    const { addSetData, removeSetData } = data;
    const addSet = new Map(addSetData);
    const removeSet = new Map(removeSetData);
    
    mergeSets(this.addSet, addSet);
    mergeSets(this.removeSet, removeSet);
  }

  getData() {
    return {
      addSetData: Array.from(this.addSet.entries()),
      removeSetData: Array.from(this.removeSet.entries()),
    };
  }

  has(val: T) {
    if (this.addSet.has(val)) {
      if (this.removeSet.has(val)) {
        const addTime = this.addSet.get(val);
        const removeTime = this.removeSet.get(val);
        return addTime > removeTime; // >= is also a possibility depending on requirements
      }
      return true;
    }
    return false;
  }

  values(): T[] {
    const result: T[] = [];
    for (const val of this.addSet.keys()) {
      if (this.has(val)) {
        result.push(val);
      }
    }
    return result.sort();
  }
}

