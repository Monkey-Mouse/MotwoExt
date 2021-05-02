import { AxiosError } from 'axios';
import { window } from 'vscode';
import { getUploadToken, ImgToken } from '../api';
import * as qiniu from 'qiniu';
export const dataPath = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");
export function processAxiosErr(err: any) {
    let aerr = err as AxiosError<{ reason: string }>;
    if (aerr?.response) {
        window.showErrorMessage(aerr.response?.data.reason);
    } else {
        window.showErrorMessage('Network error!');
    }

}
var formUploader = new qiniu.form_up.FormUploader();
export const uploadImg = async (buffer: Buffer, fname: string) => {
    const token = await getUploadToken(fname);
    const p = new Promise<void>((resolve, reject) => {
        formUploader.put(token.token, token.file_key, buffer, null, function (respErr,
            respBody, respInfo) {
            if (respErr) {
                reject({ reason: "上传文件失败" });
            }
            resolve();
        });
    });
    await p;
    return "https://cdn.mo2.leezeeyee.com/" + token.file_key;
};