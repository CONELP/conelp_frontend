export async function importPublicKey(pem: string): Promise<CryptoKey> {
  const pemBody = pem.replace(/-----.*-----/g, "").replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemBody), (char) => char.charCodeAt(0));

  return crypto.subtle.importKey(
    "spki",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
}

export async function rsaEncrypt(cryptoKey: CryptoKey, text: string) {
  const encoded = new TextEncoder().encode(text);
  const encrypted = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, cryptoKey, encoded);
  const encryptedBytes = new Uint8Array(encrypted);

  return btoa(String.fromCharCode(...encryptedBytes));
}
