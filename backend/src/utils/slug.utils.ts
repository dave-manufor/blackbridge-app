import { randomInt } from "crypto";  

export function generateRandomSlug(length: number = 12): string {  
  if (!Number.isInteger(length) || length <= 0 || length > 128) {  
    throw new Error("generateRandomSlug: length must be a positive integer <= 128");  
  }  
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";  
  let result = "";  
  for (let i = 0; i < length; i++) {  
    result += chars[randomInt(0, chars.length)];  
  }  
  return result;  
}  