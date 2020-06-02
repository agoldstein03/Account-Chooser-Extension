// Listen for message from popup
chrome.runtime.onMessage.addListener((data, sender, sendResponse) => {
    // Get list of Google accounts
    fetch('https://accounts.google.com/ListAccounts?gpsia=1&source=ogb&mo=1&origin=https://accounts.google.com')
        .then(response => (
            response.text()
        ))
        .then(rawText => (
            // Parse HTML to get the inner JS script text
            new DOMParser()
            .parseFromString(rawText, 'application/xml')
            .querySelector('script')
            .innerHTML
            
            // Get the first tokenized string in the JS
            .split('\'')[1]
            
            // Replace JS string hex escapes (best way unfortunately, no built in function for this like for decodeURI)
            .replace(/\\x([0-9a-fA-F]{2})/g, (match, paren) => (
                String.fromCharCode(parseInt(paren, 16))
            ))

            // Replace JS string slash and newline escapes
            .replace(/\\\//g, '\/')
            .replace(/\\n/g, '')
        ))
        .then(text => (
            JSON.parse(text)
        ))
        .then(sendResponse);
    return true // Indicates async response
});