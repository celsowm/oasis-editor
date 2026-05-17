const stateAccessor = () => ({ a: 1, b: 2 });
const state = new Proxy({}, {
  get(_, prop) {
    return Reflect.get(stateAccessor(), prop);
  },
  has(_, prop) {
    return Reflect.has(stateAccessor(), prop);
  },
  ownKeys(_) {
    return Reflect.ownKeys(stateAccessor());
  },
  getOwnPropertyDescriptor(_, prop) {
    return {
      ...Reflect.getOwnPropertyDescriptor(stateAccessor(), prop),
      configurable: true,
      enumerable: true
    };
  }
});

console.log({ ...state, c: 3 });
