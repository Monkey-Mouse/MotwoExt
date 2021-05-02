// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as MarkdownIt from 'markdown-it';
import { logAsync, loginAsync, publishAsync, saveCookie } from './api';
import { createHash } from 'crypto';
import { readFileSync, readFile, writeFile } from 'fs';
import * as path from 'path';
import { dataPath, processAxiosErr, uploadImg } from './utils';

let gmd: MarkdownIt;
let hashTable: { [key: string]: string } = {};
const dataFile = path.join(dataPath, 'mo2config.json');
let ps: Promise<void>[] = [];

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
	let disposable = vscode.commands.registerCommand('motwoext.publish', async () => {
		await vscode.window.withProgress({ cancellable: false, location: vscode.ProgressLocation.Notification, title: 'Publish article to mo2' },
			async (p, t) => {
				try {
					ps = [];
					if (t.isCancellationRequested) {
						return;
					}
					p.report({ message: 'Getting login status...', increment: 0 });
					let user = await logAsync();
					if (t.isCancellationRequested) {
						return;
					}
					if (user.name !== 'visitor') {
						p.report({ message: 'Welcome back, ' + user.name, increment: 10 });
					} else {
						p.report({ message: 'Login...', increment: 5 });
						const log = await vscLoginAsync();
						if (!log) {
							return;
						}
						p.report({ message: 'Login success!', increment: 5 });
					}
					p.report({ message: 'Saving active document...', increment: 5 });
					await vscode.window.activeTextEditor?.document.save();
					p.report({ message: 'Getting metadata from file...', increment: 5 });
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
						text = text.replace(arr[0], '').trim();
					}
					const idarr = text.match(/<!-- mo2id:[a-zA-Z0-9 ]* -->/);
					let id: string = '';
					if (idarr && idarr.length > 0) {
						id = idarr[0].split('mo2id:')[1].split('-->')[0].trim();
					}
					p.report({ message: 'Rendering markdown...', increment: 5 });
					let content = gmd.render(text, { upload: true, progress: p });

					await Promise.all(ps);
					content = content.replace(/~~~[a-zA-Z0-9]+~~~/g, (s) => {
						console.log(s);
						return hashTable[s.replace(/~~~/g, '')];
					});
					p.report({ message: `上传文章：${title}`, increment: 0 });
					console.log({ t: title, c: content });
					await publishAsync({ id: id ?? undefined, title: title, content: content });
					p.report({ message: `上传文章“${title}”成功！`, increment: 10 });
					// Display a message box to the user
					vscode.window.showInformationMessage('Hello World from MotwoExt!');
				} catch (error) {
					console.log(error);
				}
			}
		);
	});

	context.subscriptions.push(disposable);
	return {
		extendMarkdownIt(md: MarkdownIt) {
			gmd = md;
			const defaultRender = md.renderer.rules.image!;
			gmd.renderer.rules.image = function (tokens, idx, options, env, self) {
				var token = tokens[idx],
					aIndex = token.attrIndex('src');
				if (token.attrs && !token.attrs[aIndex][1].startsWith('http') && env.upload) {
					try {
						if (token.attrs[aIndex][1].toLowerCase().startsWith("http://")
							|| token.attrs[aIndex][1].toLowerCase().startsWith("https://")) {
							return defaultRender(tokens, idx, options, env, self);
						}
						const progress = env.progress as vscode.Progress<{ message: string, increment: number }>;
						const dir = path.dirname(vscode.window.activeTextEditor!.document.uri.fsPath);
						const p = path.join(dir, token.attrs[aIndex][1]);
						const fileName = path.basename(p);
						progress.report({ message: `发现链接的本地图片：${fileName}`, increment: 0 });
						const buff = readFileSync(p, {});
						const hash = createHash('md5').update(buff).digest('hex');
						if (hashTable[hash]) {
							token.attrs[aIndex][1] = hashTable[hash];
							progress.report({ message: `图片${fileName}存在于上传记录中，跳过上传流程`, increment: 0 });
						} else {
							token.attrs[aIndex][1] = '~~~' + hash + '~~~';
							progress.report({ message: `开始上传新图片${fileName}`, increment: 0 });
							ps.push(uploadImg(buff, fileName).then((url) => {
								hashTable[hash] = url;
								progress.report({ message: `图片${fileName}上传成功！`, increment: 60 / ps.length });
							}).catch((err) => {
								console.log(err);
								progress.report({ message: `图片${fileName}上传失败！`, increment: 60 / ps.length });
								vscode.window.showWarningMessage(`上传图片"${fileName}"失败！`);
								delete hashTable[hash];
							}));
						}
						// return `<img src="${token.attrs[aIndex][1]}">`;
					} catch (error) {
						console.log(error);
					}
				}

				// pass token to default renderer.
				const parsed = defaultRender(tokens, idx, options, env, self);
				return parsed;

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
