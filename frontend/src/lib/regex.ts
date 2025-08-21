export const oneUppercaseRegex = /(?=.*[A-Z])/;
export const oneLowercaseRegex = /(?=.*[a-z])/;
export const oneDigitRegex = /(?=.*\d)/;
export const oneSpecialCharacterRegex = /(?=.*[@$!%*?&])/;
export const minLengthRegex = (min: number): RegExp => new RegExp(`.{${min},}`);
export const passwordRegex = new RegExp(
  oneUppercaseRegex.source +
    oneLowercaseRegex.source +
    oneDigitRegex.source +
    oneSpecialCharacterRegex.source +
    minLengthRegex(8).source
);
