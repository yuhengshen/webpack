import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from "fs";
import { JumpDefinitionProvider } from "./Provider";

const showError = vscode.window.showErrorMessage;
const showInfo = vscode.window.showInformationMessage;
const showWarn = vscode.window.showWarningMessage;

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand("extension.path", async () => {
		const uri = await vscode.window.showOpenDialog({
			canSelectFolders: false,
			canSelectMany: false,
			title: "select webpack configuration file"
		});
		if (uri && uri.length > 0) {
			context.workspaceState.update("webpackConfigPath", uri[0].path);
			// reload file content
			main(context);
		}
	});
	context.subscriptions.push(disposable);
	main(context);
}

let definitionProvider: vscode.Disposable | undefined;
let filewatcher: vscode.FileSystemWatcher | undefined;

export function deactivate() {
	definitionProvider?.dispose();
	filewatcher?.dispose();
 }

async function main(context: vscode.ExtensionContext) {
	const webpackConfigPath = context.workspaceState.get("webpackConfigPath") as string || "./webpack.config.js";
	const rootPath = vscode.workspace.workspaceFolders![0].uri.path;
	const fullPath = path.resolve(rootPath, webpackConfigPath);
	if (!fs.existsSync(fullPath)) {
		return [];
	}
	let webpackConfig;
	try {
		delete require.cache[require.resolve(path.resolve(rootPath, webpackConfigPath))];
		webpackConfig = require(path.resolve(rootPath, webpackConfigPath));
	} catch (e) {
		showError(`load webpack config error: ${e}`);
		return [];
	}
	const alias = webpackConfig.resolve?.alias || {};
	const extensions = webpackConfig.resolve?.extensions || [];
	definitionProvider?.dispose();
	definitionProvider = vscode.languages.registerDefinitionProvider({
		scheme: "file",
		pattern: "**/*.{js,jsx,ts,tsx,vue}"
	}, new JumpDefinitionProvider({ extensions, alias }));
	// configuration file watcher
	filewatcher?.dispose();
	filewatcher = vscode.workspace.createFileSystemWatcher(fullPath, true, false, true);
	filewatcher.onDidChange(() => main(context));

	showInfo("webpack helper has been enabled");
}