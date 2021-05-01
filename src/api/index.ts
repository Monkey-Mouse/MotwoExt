import axios from 'axios';
import { dataPath } from '../utils';
import * as path from 'path';
import * as vscode from 'vscode';
import { readFileSync, readFile, writeFile } from 'fs';

const ax = axios.create({
    baseURL: "https://www.motwo.cn/api"
});
const cookieFile = path.join(dataPath, 'mo2cookie.json');
readFile(cookieFile, { flag: "a+" }, (err, data) => {
    setCookie(data.toString());
});

function setCookie(cookie: string) {
    ax.defaults.headers.cookie = cookie;
}

export const saveCookie = () => {
    writeFile(cookieFile, ax.defaults.headers.cookie, () => { });
};

export const logAsync = async () => {
    const re = (await ax.get<{ name: string }>("logs"));
    if (re.headers['set-cookie']) {
        console.log(re.headers['set-cookie'][0]);
        setCookie(re.headers['set-cookie'][0]);
    }
    return re.data;
};
export const loginAsync = async (loginName: string, pass: string) => {
    const re = await ax.post<{ name: string }>('/accounts/login', { userNameOrEmail: loginName, password: pass });
    if (re.headers['set-cookie']) {
        console.log(re.headers['set-cookie'][0]);
        setCookie(re.headers['set-cookie'][0]);
    }
    return re.data;
};
export const publishAsync = async (blog: { id?: string, content: string, title: string }) => {
    const d = (await ax.post<{ id: string }>('blogs/publish?draft=true', blog)).data;
    vscode.env.openExternal(vscode.Uri.parse(`https://www.motwo.cn/article/${d.id}?draft=true`));
    vscode.window.activeTextEditor?.edit((e) => {
        const pos = new vscode.Position(vscode.window.activeTextEditor!.document.lineCount, 0);
        if (!blog.id) {
            e.insert(pos, `\n<!-- mo2id: ${d.id} -->`);
        }
    });
};
export async function getUploadToken(fname: string) {
    return (await ax.get<{
        token: string;
        file_key: string;
    }>('/img/' + fname)).data;
}
