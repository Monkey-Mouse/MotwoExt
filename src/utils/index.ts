import { AxiosError } from 'axios';
import { window } from 'vscode';
export const dataPath = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");
export function processAxiosErr(err: any) {
    let aerr = err as AxiosError<{ reason: string }>;
    if (aerr?.response) {
        window.showErrorMessage(aerr.response?.data.reason);
    } else {
        window.showErrorMessage('Network error!');
    }

}