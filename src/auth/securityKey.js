import CryptoJS from "crypto-js";

const SECRET_KEY = "prepExam_devloperLingamgunta";

export function encryptData(data) {
  const jsonString = JSON.stringify(data);
  return CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
}

export function decryptData(encryptedData) {
  if (!encryptedData) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    const text = bytes.toString(CryptoJS.enc.Utf8);
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}