import { AxiosError } from 'axios';
import { window } from 'vscode';
import { getUploadToken } from '../api';
export const dataPath = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");
export function processAxiosErr(err: any) {
    let aerr = err as AxiosError<{ reason: string }>;
    if (aerr?.response) {
        window.showErrorMessage(aerr.response?.data.reason);
    } else {
        window.showErrorMessage('Network error!');
    }

}
// export const uploadImgsToQiniu = async (
//     blobs: File[],
//     callback: (imgprop: { src: string }) => void
// ) => {
//     const promises: Promise<void>[] = [];
//     for (let index = 0; index < blobs.length; index++) {
//         const element = blobs[index];
//         const promise = new Promise<void>((resolve, reject) => {
//             getUploadToken(element.name).then(val => {
//                 let ob = qiniu.upload(element, val.file_key, val.token);
//                 ob.subscribe(null, (err) => {
//                     reject(err);
//                 }, res => {
//                     callback({ src: '//cdn.mo2.leezeeyee.com/' + res.key })
//                     resolve();
//                 });
//             }).catch(err => reject(err));
//         });
//         promises.push(promise);
//     }

//     await Promise.all(promises);

// }