declare function createMachine<const machine>(
  machine: machine,
  config?: any,
): machine;

type Machine<name extends string = string> = {
  tsTypes: {
    events: unknown;
  };
  states: {
    [k in name]: State;
  };
};

type State<machine extends Machine = Machine> = {
  entry?: (event: machine['tsTypes']['events']) => unknown;
  on?: {
    NEXT: keyof machine['states'];
  };
};

type validateMachine<machine extends Machine> = {
  [k in keyof machine]: k extends 'initial'
    ? keyof machine
    : k extends 'states'
    ? validateStates<machine[k], machine>
    : machine[k];
};

type validateStates<states, machine> = {
  [k in keyof states]: states[k];
};

createMachine(
  {
    tsTypes: {
      events: {} as
        | {
            type: 'NEXT';
            payload: number;
          }
        | {
            type: 'MOAR';
          },
    },
    initial: 'a',
    states: {
      a: {
        on: {
          NEXT: 'b',
        },
      },
      b: {
        // inline aciton
        entry: (event) => {
          event; // { type: 'NEXT'; payload: number }
        },
        on: {
          NEXT: 'c',
        },
      },
      c: {
        entry: 'doStuff',
      },
    },
  },
  {
    actions: {
      doStuff: (event) => {
        event; // { type: 'NEXT'; payload: number }
      },
    },
  },
);

// targets:
// - #id - just any state that has this id
// - a - target a sibling state with a key
// - .foo - target a child state with foo key

const result = createMachine(
  {
    initial: 'a',
    states: {
      a: {
        initial: 'a1',
        states: {
          a1: {
            on: {
              NEXT: '#foo',
            },
          },
        },
      },
      b: {
        initial: 'b1',
        entry: 'doThing',
        states: {
          b1: {
            id: 'foo',
            always: 'b2',
          },
          b2: {
            entry: 'doSmthElse',
          },
        },
      },
    },
  },
  {
    actions: {
      doThing: (event) => {
        event; // { type: 'NEXT'; payload: number }
      },
      doSmthElse: (event) => {
        event; // { type: 'NEXT'; payload: number }
      },
    },
  },
);
