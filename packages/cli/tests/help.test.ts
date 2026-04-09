import { describe, expect, it } from 'vitest';

import { renderRootHelp } from '../src/help.js';

describe('renderRootHelp', () => {
  it('keeps the root help output stable', () => {
    expect(
      renderRootHelp('9.9.9', {
        name: 'xerg',
        prefix: 'xerg',
      }),
    ).toMatchSnapshot();
  });
});
