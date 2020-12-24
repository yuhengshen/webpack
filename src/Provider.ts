import {
  CancellationToken,
  DefinitionProvider,
  Location,
  LocationLink,
  Position,
  ProviderResult,
  TextDocument,
  Uri,
} from "vscode";
import * as path from "path";
import { isFile, isRelativeStart } from "./utils";

type JumpConstructor = {
  extensions: string[];
  alias: { [key: string]: string };
};

export class JumpDefinitionProvider implements DefinitionProvider {
  private extensions: string[];
  private alias: { [key: string]: string };
  constructor({ extensions = [], alias = {} }: JumpConstructor) {
    this.extensions = extensions;
    this.alias = alias;
  }
  provideDefinition(
    document: TextDocument,
    position: Position,
    token: CancellationToken
  ): ProviderResult<Location | Location[] | LocationLink[]> {
    const wordPosition = document.getWordRangeAtPosition(
      position,
      /[',"].+?[',"]/
    );
    let word = document.getText(wordPosition).slice(1, -1);
    if (!word) return;
    const dir = path.dirname(document.uri.path);
    const commonExt = [".js", ".jsx", ".ts", ".tsx"];
    const isRelative = isRelativeStart(word);
    if (!isRelative) {
      // replace alias
      const isAlias = Object.keys(this.alias).some((alias) => {
        if (word.startsWith(alias)) {
          word = word.replace(alias, this.alias[alias]);
          return true;
        }
      });
      if (!isAlias) return;
    } else {
      const useDefaultCommonEnd = commonExt.some((ext) => {
        return (
          isFile(path.resolve(dir, `${word}${ext}`)) ||
          (word.endsWith(ext) && isFile(path.resolve(dir, word)))
        );
      });
      if (useDefaultCommonEnd) {
        // use default provider
        return;
      }
    }

    // replace extensions
    let fullPath: string = "";
    // word.vue or word/index.vue
    const exts = [
      "",
      ...this.extensions,
      ...[...commonExt, ...this.extensions].map((i) => `/index${i}`),
    ];
    exts.some((ext) => {
      const fp = path.resolve(dir, `${word}${ext}`);
      const file = isFile(fp);
      if (file) fullPath = fp;
      return file;
    });
    if (fullPath !== "") {
      return new Location(Uri.parse(fullPath), new Position(0, 0));
    }
  }
}
