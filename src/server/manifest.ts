import {readFileSync} from 'fs';
import type {ManifestPlugin} from 'webpack';
import {assertDefined} from '../common/check/defined';
import type {Document, HTMLElement} from '../common/domStreamTypes';

type ManifestPluginOptions = NonNullable<ConstructorParameters<typeof ManifestPlugin>[0]>;
type GenerateFn = NonNullable<ManifestPluginOptions['generate']>;
type ManifestObject = Parameters<GenerateFn>[0];

const manifest = JSON.parse(readFileSync('out/webpack-manifest.json', 'utf-8')) as ManifestObject;

export function addScripts(document: Document, parent: HTMLElement, entry: string) {
  for (const name of assertDefined(manifest.entrypoints[entry]).imports) {
    const script = document.createElement('script');
    parent.append(script);
    script.setAttribute('type', 'module');
    script.setAttribute('src', `dist${assertDefined(manifest.assets[name]).file}`);
  }
}
