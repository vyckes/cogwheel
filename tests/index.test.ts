/* eslint-disable @typescript-eslint/ban-types */
import { fsm } from '../src';

function delay(ms = 0) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const configDefault = {
  green: { on: { CHANGE: 'yellow' } },
  yellow: { on: { CHANGE: 'red' } },
  red: {},
};

test('Send - existing event', () => {
  const service = fsm('green', configDefault);
  expect(service.current).toBe('green');
  service.send('CHANGE');
  expect(service.current).toBe('yellow');
});

test('Send - non-existing event', () => {
  const service = fsm('green', configDefault);
  expect(service.current).toBe('green');
  service.send('NON_EXISTING_EVENT');
  expect(service.current).toBe('green');
});

test('Send - non-existing target', () => {
  const config = {
    green: { on: { CHANGE: 'blue' } },
    yellow: { on: { CHANGE: 'red' } },
    red: {},
  };

  const service = fsm('green', config);
  expect(service.current).toBe('green');
  service.send('CHANGE');
  expect(service.current).toBe('green');
});

test('Send - state without transition definition', () => {
  const config = { red: {} };
  const service = fsm('red', config);
  service.send('CHANGE');
  expect(service.current).toBe('red');
});

test('Send - transition object', () => {
  const config = {
    green: { on: { CHANGE: { target: 'yellow' } } },
    yellow: {},
  };

  const service = fsm('green', config);
  service.send('CHANGE');
  expect(service.current).toBe('yellow');
});

test('immutability', () => {
  const service = fsm('green', configDefault);
  expect(service.current).toBe('green');
  service.current = 'yellow';
  expect(service.current).toBe('green');
});

test('listener', () => {
  const cb = jest.fn((x) => x);
  const service = fsm('green', configDefault);
  service.listen(cb);
  service.send('CHANGE');
  expect(cb.mock.calls.length).toBe(1);
});

test('Incorrect initial state', () => {
  expect(() => fsm('wrongInitialState', configDefault)).toThrow(
    'Initial state does not exist'
  );
});

test('Entry actions - auto-transition', async () => {
  const configAutomatic = {
    green: { on: { CHANGE: 'yellow' } },
    yellow: {
      on: { CHANGE: 'red' },
      entry: (s: Function) => s('CHANGE'),
    },
    red: {
      on: { CHANGE: 'green' },
      entry: (s: Function) => s('CHANGE', { delay: 100 }),
    },
  };

  const service = fsm('green', configAutomatic);
  expect(service.current).toBe('green');
  service.send('CHANGE');
  expect(service.current).toBe('red');
  await delay(100);
  expect(service.current).toBe('green');
});

test('Entry actions - auto-transition on initial state', () => {
  const configStart = {
    start: {
      on: { CHANGE: 'end' },
      entry: (s: Function) => s('CHANGE'),
    },
    end: {},
  };

  const service = fsm('start', configStart);
  expect(service.current).toBe('end');
});

test('Guard - guarded transition', () => {
  const config = {
    green: {
      on: {
        CHANGE: {
          target: 'yellow',
          guard: (u: Record<string, unknown>) => u?.allowed as boolean,
        },
      },
    },
    yellow: {},
  };

  const service = fsm('green', config);
  service.send('CHANGE');
  expect(service.current).toBe('green');
  service.send('CHANGE', {}, { allowed: false });
  expect(service.current).toBe('green');
  service.send('CHANGE', {}, { allowed: true });
  expect(service.current).toBe('yellow');
});
