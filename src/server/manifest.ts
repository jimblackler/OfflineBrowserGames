import {readFileSync} from 'fs';
import type {Express} from 'express';
import type {ManifestPlugin} from 'webpack';
import {assertDefined} from '../common/check/defined';
import type {Document, HTMLElement} from '../common/domStreamTypes';

type ManifestPluginOptions = NonNullable<ConstructorParameters<typeof ManifestPlugin>[0]>;
type GenerateFn = NonNullable<ManifestPluginOptions['generate']>;
type ManifestObject = Parameters<GenerateFn>[0];

const manifest = JSON.parse(readFileSync('out/webpack-manifest.json', 'utf-8')) as ManifestObject;

export function addScripts(
    document: Document, parent: HTMLElement, entry: string, module: boolean) {
  for (const name of assertDefined(manifest.entrypoints[entry]).imports) {
    const script = document.createElement('script');
    parent.append(script);
    if (module) {
      script.setAttribute('type', 'module');
    }
    script.setAttribute('src', `dist${assertDefined(manifest.assets[name]).file}`);
  }
}

export function makeEntryHandlers(app: Express) {
  for (const module of [true, false]) {
    for (const entry of Object.keys(manifest.entrypoints)) {
      app.route(`/${entry}${module ? 'Module' : ''}`).get((req, res) => {
        res.setHeader('Content-Type', 'text/javascript');
        for (const name of assertDefined(manifest.entrypoints[entry]).imports) {
          const path = `/dist${assertDefined(manifest.assets[name]).file}`;
          if (module) {
            res.write(`import '${path}';`);
          } else {
            res.write(`importScripts('${path}');`);
          }
        }
        res.end();
      });
    }
  }
}
