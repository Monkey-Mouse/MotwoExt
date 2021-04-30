// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as MarkdownIt from 'markdown-it';


let gmd: MarkdownIt;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "motwoext" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('motwoext.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		console.log(gmd);
		console.log(gmd.render(vscode.window.activeTextEditor?.document.getText() as string, { upload: true }));
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from MotwoExt!');
	});

	context.subscriptions.push(disposable);
	return {
		extendMarkdownIt(md: MarkdownIt) {
			gmd = md;
			const defaultRender = md.renderer.rules.image;
			gmd.renderer.rules.image = function (tokens, idx, options, env, self) {
				var token = tokens[idx],
					aIndex = token.attrIndex('src');
				if (token.attrs && !token.attrs[aIndex][1].startsWith('http') && env.upload) {
					console.log(token.attrs[aIndex][1]);
					token.attrs[aIndex][1] = token.attrs[aIndex][1];
				}

				// pass token to default renderer.
				if (defaultRender) {
					return defaultRender(tokens, idx, options, env, self);
				}
				return "";

			};
			return md;
		}
	};
}

// this method is called when your extension is deactivated
export function deactivate() { }
