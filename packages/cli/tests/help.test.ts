import { describe, expect, it } from 'vitest';

import {
  renderConnectHelp,
  renderInitHelp,
  renderMcpSetupHelp,
  renderRootHelp,
} from '../src/help.js';

describe('renderRootHelp', () => {
  it('keeps the root help output stable', () => {
    expect(
      renderRootHelp('9.9.9', {
        name: 'xerg',
        prefix: 'xerg',
      }),
    ).toMatchSnapshot();
  });

  it('renders init help', () => {
    expect(renderInitHelp('xerg')).toContain('Detect local OpenClaw or Hermes runtimes');
    expect(renderInitHelp('xerg')).toContain('Interactive only in v1');
  });

  it('renders connect help', () => {
    expect(renderConnectHelp('xerg')).toContain('Authenticate with Xerg Cloud');
    expect(renderConnectHelp('xerg')).toContain(
      'Standalone non-interactive mode reports auth status',
    );
  });

  it('renders mcp-setup help', () => {
    expect(renderMcpSetupHelp('xerg')).toContain('Generate hosted MCP client configuration');
    expect(renderMcpSetupHelp('xerg')).toContain('https://mcp.xerg.ai/mcp');
  });
});
