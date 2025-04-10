
export function isValidMobileNumber(mobileNumber: string) {
    const regexExpForMobileNumber = /^[6-9]\d{9}$/gi;
    return regexExpForMobileNumber.test(mobileNumber);
}

function removeCurlyBraces(str: string): string {
    const regex = /^{(.+)}$/;
    const match = regex.exec(str);
    return match ? match[1] : null;
}

export function createReplacementsForMsg91(replacementObj) {
    // Create replacements compatible with Msg91
    if (!replacementObj) return;
    Object.keys(replacementObj).forEach((key) => {
        delete Object.assign(replacementObj, { [removeCurlyBraces(key)]: replacementObj[key] })[key];
    })
}
