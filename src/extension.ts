import * as vscode from 'vscode';
import * as path from 'path';
import { JumpDefinitionProvider} from "./Provider";

const showError = vscode.window.showErrorMessage;
const showInfo = vscode.window.showInformationMessage;
const showWarn = vscode.window.showWarningMessage;

export function activate(context: vscode.ExtensionContext) {
	async function main() {
		const webpackConfigPath = context.workspaceState.get("webpackConfigPath") as string || "./webpack.config.js";
		const rootPath = vscode.workspace.workspaceFolders![0].uri.path;
		let webpackConfig;
		try {
			webpackConfig = await import(path.resolve(rootPath, webpackConfigPath));
		} catch (e) {
			return;
		}
		const alias = webpackConfig.resolve?.alias || {};
		const extensions = webpackConfig.resolve?.extensions || [];
		vscode.languages.registerDefinitionProvider({
			scheme: "file",
			pattern: "**/*.{js,jsx,ts,tsx,vue}"
		}, new JumpDefinitionProvider({extensions, alias}));
	}
	main();

	const disposable = vscode.commands.registerCommand("extension.path", async () => {
		vscode.window.showOpenDialog({
			canSelectFolders: false,
			canSelectMany: false,
			title: "select webpack configuration file"
		}).then(uri => {
			if (uri && uri.length > 0) {
				context.workspaceState.update("webpackConfigPath", uri[0].path);
			}
			main();
		});
	});
	context.subscriptions.push(disposable);
}
export function deactivate() { }
