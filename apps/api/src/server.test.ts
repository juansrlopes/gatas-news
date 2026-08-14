import fs from 'fs';
import path from 'path';

describe('Server Module', () => {
  it('has a server entry file', () => {
    expect(fs.existsSync(path.join(__dirname, 'server.ts'))).toBe(true);
  });
});
