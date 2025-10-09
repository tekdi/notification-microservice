
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
        const keyWithoutBraces = removeCurlyBraces(key);
        
        // Only process if the key actually had curly braces
        if (keyWithoutBraces && keyWithoutBraces !== key) {
            delete Object.assign(replacementObj, { [keyWithoutBraces]: replacementObj[key] })[key];
        }
    });
    
    console.log('MSG91 Util - Output replacements:', JSON.stringify(replacementObj, null, 2));
}
