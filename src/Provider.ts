import { CancellationToken, DefinitionProvider, extensions, Location, LocationLink, Position, ProviderResult, TextDocument, Uri, window } from "vscode";
import * as path from "path";
import * as fs from 'fs';
export class JumpDefinitionProvider implements DefinitionProvider {
    private extensions: string[];
    private alias: { [key: string]: string };
    constructor({ extensions = [], alias = {} }: { extensions: string[], alias: { [key: string]: any } }) {
        this.extensions = extensions;
        this.alias = alias;
    }
    provideDefinition(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Location | Location[] | LocationLink[]> {
        const wordPosition = document.getWordRangeAtPosition(position, /('|").+(\\|\/).+('|")/);
        if (!wordPosition) {
            // use vscode provider
            return;
        };
        let word = document.getText(wordPosition).slice(1, -1);

        // replace alias
        const aliasKeys = Object.keys(this.alias);
        let usedAlias = false;
        for (let i = 0; i < aliasKeys.length; i++) {
            if (word.startsWith(aliasKeys[i])) {
                word = word.replace(aliasKeys[i], this.alias[aliasKeys[i]]);
                usedAlias = true;
                break;
            }
        }
        // replace extensions
        const dir = path.dirname(document.uri.path);
        const reverse = (extensionsIndex: number): string | null => {
            const relativePath = extensionsIndex === -1 ? word : `${word}${this.extensions[extensionsIndex]}`;
            const tempPath = (path.resolve(dir, relativePath));
            try {
                const state = fs.statSync(tempPath);
                if (state.isFile()) {
                    // vetur has impl these provider
                    if (!usedAlias && ['.js', '.jsx', '.ts', '.tsx'].includes(this.extensions[extensionsIndex])) {
                        return null;
                    }
                    return tempPath;
                };
                if (extensionsIndex === -1) {
                    const arr = ['.js', '.jsx', '.ts', '.tsx', ...this.extensions];
                    // exit tempPath.js/tempPath.jsx/tempPath.jsx...
                    for (let i = 0; i < arr.length; i++) {
                        const isExit = fs.existsSync(`${tempPath}${arr[i]}`);
                        if (isExit) {
                            return `${tempPath}${arr[i]}`;
                        }
                    }
                    // exit tempPath/index.js/tempPath/index.jsx/tempPath/index.jsx...
                    if (state.isDirectory()) {
                        for (let i = 0; i < arr.length; i++) {
                            const isExit = fs.existsSync(path.resolve(tempPath, `./index${arr[i]}`));
                            if (isExit) {
                                return path.resolve(tempPath, `./index${arr[i]}`);
                            }
                        }
                    }
                }
            } catch {
                // not exit tempPath
                if (extensionsIndex < this.extensions.length) return reverse(extensionsIndex + 1);
             }
            return null;
        };
        const filepath = reverse(-1);

        if (filepath !== null) {
            return new Location(Uri.parse(filepath), new Position(0, 0));
        }
    }
}