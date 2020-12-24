import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { JumpDefinitionProvider } from "./Provider";

const showError = vscode.window.showErrorMessage;
const showInfo = vscode.window.showInformationMessage;
const showWarn = vscode.window.showWarningMessage;
// 工作区目录可能有多个
// todo:: 处理多工作区
const projectDir = vscode.workspace.workspaceFolders?.[0].uri.path!;
export function activate(context: vscode.ExtensionContext) {
  if (!projectDir) return;
  const disposable = vscode.commands.registerCommand(
    "extension.path",
    async () => {
      const uri = await vscode.window.showOpenDialog({
        canSelectFolders: false,
        canSelectMany: false,
        title: "select webpack configuration file",
      });
      if (uri && uri.length > 0) {
        context.workspaceState.update("webpackConfigPath", uri[0].path);
        // reload file content
        main(context);
      }
    }
  );
  context.subscriptions.push(disposable);
  main(context);
}

let definitionProvider: vscode.Disposable | undefined;
let fileWatcher: vscode.FileSystemWatcher | undefined;

export function deactivate() {
  definitionProvider?.dispose();
  fileWatcher?.dispose();
}
const defaultWebpackConfigPath = [
  "./webpack.config.js",
  "./config/webpack.config.js",
  "node_modules/react-scripts/config/webpack", // create-react-app
  "node_modules/@vue/cli-service/webpack.config.js", // vue-cli
];
async function main(context: vscode.ExtensionContext): Promise<void> {
  const webpackConfigPaths = [
    context.workspaceState.get<string>("webpackConfigPath"),
    ...defaultWebpackConfigPath,
  ];
  const fullPath = webpackConfigPaths
    .filter((item) => item !== undefined)
    .map((item) => path.resolve(projectDir, item!))
    .find((path) => {
      let isFile = false;
      try {
        isFile = fs.statSync(path).isFile();
      } catch {}
      return isFile;
    });
  // no configuration file
  if (!fullPath) return;
  let webpackConfig;
  try {
    delete require.cache[require.resolve(fullPath)];
    // process cwd
    // create-react-app use [project dir, env.NODE_ENV]
    const cwd = process.cwd();
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    process.chdir(projectDir);
    webpackConfig = require(fullPath);
    // reset cwd & env
    process.chdir(cwd);
    process.env.NODE_ENV = env;
  } catch (e) {
    showError(`load webpack config error: ${e}`);
    return;
  }
  const alias = webpackConfig.resolve?.alias || {};
  const extensions = webpackConfig.resolve?.extensions || [];
  definitionProvider?.dispose();
  definitionProvider = vscode.languages.registerDefinitionProvider(
    {
      scheme: "file",
      pattern: "**/*.{js,jsx,ts,tsx,vue}",
    },
    new JumpDefinitionProvider({ extensions, alias })
  );
  // configuration file watcher
  fileWatcher?.dispose();
  fileWatcher = vscode.workspace.createFileSystemWatcher(
    fullPath,
    true,
    false,
    true
  );
  fileWatcher.onDidChange(() => main(context));

  showInfo("webpack helper has been enabled");
}
