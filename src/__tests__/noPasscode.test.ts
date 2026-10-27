// Экрана ввода пароля (PasscodeModal, код 2103) нет: главная открывается сразу (решение владельца 27.10.2026).
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const rel = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') out.push(...sources(rel));
    } else if (/\.(tsx?|jsx?|css)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

describe('без кода доступа', () => {
  const files = sources('src').map(rel => ({ rel, text: stripComments(readFileSync(join(root, rel), 'utf8')) }));
  const offenders = (re: RegExp) => files.filter(f => re.test(f.text)).map(f => f.rel);

  it('PasscodeModal удалён и нигде не подключается', () => {
    expect(existsSync(join(root, 'src/renderer/screens/home/PasscodeModal.tsx'))).toBe(false);
    expect(offenders(/PasscodeModal|home-passcode/)).toEqual([]);
  });

  it('нет кода 2103 и флага pinCode', () => {
    expect(offenders(/CORRECT_PASSCODE|['"]2103['"]|['"]pinCode['"]/)).toEqual([]);
  });

  it('главная сразу показывает поиск и подборки', () => {
    const home = stripComments(readFileSync(join(root, 'src/renderer/screens/home/HomeScreen.tsx'), 'utf8'));
    expect(home).not.toMatch(/isPasscodeVerified|showPasscodeModal/);
    expect(home).toMatch(/return \(\s*<div className="home">\s*<SearchSection /);
    expect(home).toContain('<PlaningTrip ');
    expect(home).toContain('<PopularDestinationsList ');
  });
});
