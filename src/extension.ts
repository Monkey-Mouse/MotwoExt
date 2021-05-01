// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as MarkdownIt from 'markdown-it';
import { logAsync, loginAsync, publishAsync, saveCookie } from './api';
import { createHash } from 'crypto';
import { readFileSync, readFile, writeFile } from 'fs';
import * as path from 'path';
import { dataPath, processAxiosErr } from './utils';

let gmd: MarkdownIt;
let hashTable: { [key: string]: string } = {};
const dataFile = path.join(dataPath, 'mo2config.json');

readFile(dataFile, { flag: "a+" }, (err, data) => {
	hashTable = JSON.parse(data.toString());
});

async function vscLoginAsync() {
	const name = await vscode.window.showInputBox({ placeHolder: 'name/email', prompt: 'Enter your email or userName' });
	if (name) {
		const pass = await vscode.window.showInputBox({
			placeHolder: 'password',
			prompt: 'Enter your password',
			password: true
		});
		if (pass) {
			try {
				const user = await loginAsync(name, pass);
				vscode.window.showInformationMessage('Welcome back, ' + user.name);
				return true;
			} catch (error) {
				processAxiosErr(error);
				return false;
			}

		}
	}
	vscode.window.showErrorMessage('Login canceled by user!');
	return false;
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "motwoext" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('motwoext.helloWorld', async () => {
		let user = await logAsync();
		if (user.name !== 'visitor') {
			vscode.window.showInformationMessage('Welcome back, ' + user.name);
		} else {
			const log = await vscLoginAsync();
			if (!log) {
				return;
			}
		}
		await vscode.window.activeTextEditor?.document.save();
		let text = vscode.window.activeTextEditor?.document.getText() as string;
		if (!text) {
			vscode.window.showErrorMessage('此命令只能对markdown文档使用！');
			return;
		}

		text = text.trim();
		let title = "默认标题";
		const arr = text.match(/#(?:[^\r\n]|\r(?!\n))+/);
		if (arr && arr?.length > 0) {
			title = arr[0].substr(1).trim();
			if (title.length === 0) {
				title = "默认标题";
			}
			text = text.replace(arr[0], '');
		}
		console.log({ t: title, c: text });
		// The code you place here will be executed every time your command is executed
		const content = gmd.render(text, { upload: true });
		const idarr = text.match(/<!-- mo2id:[a-zA-Z0-9 ]* -->/);
		let id: string = '';
		if (idarr && idarr.length > 0) {
			id = idarr[0].split('mo2id:')[1].split('-->')[0].trim();
		}
		await publishAsync({ id: id ?? undefined, title: title, content: content });
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from MotwoExt!');
	});

	context.subscriptions.push(disposable);
	return {
		extendMarkdownIt(md: MarkdownIt) {
			gmd = md;
			const defaultRender = md.renderer.rules.image;
			// const defaultHeadingRender = gmd.renderer.rules.html_block;
			// gmd.renderer.rules.html_block = function (tokens, idx, options, env, self) {
			// 	console.log(tokens);
			// 	return defaultHeadingRender!(tokens, idx, options, env, self);
			// };
			gmd.renderer.rules.image = function (tokens, idx, options, env, self) {
				var token = tokens[idx],
					aIndex = token.attrIndex('src');
				if (token.attrs && !token.attrs[aIndex][1].startsWith('http') && env.upload) {
					try {
						const dir = path.dirname(vscode.window.activeTextEditor!.document.uri.fsPath);
						const p = path.join(dir, token.attrs[aIndex][1]);
						const buff = readFileSync(p, {});
						const hash = createHash('md5').update(buff).digest('hex');
						hashTable[hash] = p;
						console.log(hash);
						token.attrs[aIndex][1] = hash;
					} catch (error) {
						console.log(error);
					}
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
export function deactivate() {
	writeFile(dataFile, JSON.stringify(hashTable), () => { });
	saveCookie();
}
