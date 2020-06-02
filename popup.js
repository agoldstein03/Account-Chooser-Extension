// If the browser is in dark mode, use the light icons. Otherwise, use the dark icons.
// This is run in a popup because a universal content script would be too invasive and performance-heavy, and it cannot be run in a background script because of https://crbug.com/968651
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    chrome.browserAction.setIcon({
        path : {
            "16": "lightlogo16.png",
            "24": "lightlogo24.png",
            "32": "lightlogo32.png",
            "48": "lightlogo48.png",
            "64": "lightlogo64.png",
            "128": "lightlogo128.png"
        }
    });
} else {
    chrome.browserAction.setIcon({
        path : {
            "16": "logo16.png",
            "24": "logo24.png",
            "32": "logo32.png",
            "48": "logo48.png",
            "64": "logo64.png",
            "128": "logo128.png"
        }
    });
}

function signIn(email) { // A builder that returns a function to set the url to allow the user to log in to a signed out account
    return (responses) => {
        let response = responses[0]
          , url;
        if (response.url.includes('google')) { // Weak test for if Google will redirect to that url
            url = new URL(response.url);
        } else {
            url = new URL('https://www.google.com/webhp');
        }
        let params = new URLSearchParams(url.search);

        // This empties the authuser and moves it to the end to model the format that Google uses for this
        params.delete('authuser'); 
        params.set('authuser', '');

        url.search = params.toString();
        let newURL = 'https://accounts.google.com/AccountChooser?source=ogb&continue='+encodeURIComponent(url.toString())+'&Email='+email;
        
        window.open(newURL);
        window.close(); // Just in case
        
    }
}

function setURL(index) { // A builder that returns a function to set the url to the corresponding authuser index
    function navigate(responses) { // Accepts the tab query response, changes the authuser URL param (causing main page reload), and closes the popup
        let response = responses[0]
          , url = new URL(response.url)
          , params = new URLSearchParams(url.search);
        params.set('authuser', index);
        url.search = params.toString();
        if (window.browser) {
            browser.tabs.update(response.id, {
                url: url.toString()
            }).then(window.close); // Close popup after setting url
        } else {
            chrome.tabs.update(response.id, {
                url: url.toString()
            }, window.close); // Close popup after setting url
        }
    }
    
    return () => {
        if (window.browser) {
            browser.tabs.query({ // Get current tab
                active: true,
                currentWindow: true
            }).then(navigate); // Navigate to the url with changed authuser
        } else {
            chrome.tabs.query({ // Get current tab
                active: true,
                currentWindow: true
            }, navigate); // Navigate to the url with changed authuser
        }
    }
}

function populate(response) { // Create the GUI from the strange nested Array structure that Google accounts responds with
    response[1].forEach(info => { // There is useless info in response[0]; response[1] has the accounts
        console.log('Account: ', info);
        
        let a = document.createElement('a');
        a.classList.add('topA')
        
        let img = document.createElement('img');
        img.classList.add('img')
        img.src = info[4]; // Profile image URL
        a.appendChild(img);
        
        let topDiv = document.createElement('div');
        topDiv.classList.add('top')
        
        let nameDiv = document.createElement('div');
        nameDiv.classList.add('name')
        nameDiv.appendChild(document.createTextNode(info[2])); // Name
        topDiv.appendChild(nameDiv);
        
        let emailDiv = document.createElement('div');
        emailDiv.classList.add('email')
        emailDiv.appendChild(document.createTextNode(info[3])); // Email
        topDiv.appendChild(emailDiv);
        
        a.appendChild(topDiv);
        
        if (info.length < 16) { // If the account is signed out (as far as I know)
            let cornerDiv = document.createElement('div');
            cornerDiv.classList.add('corner')
            cornerDiv.appendChild(document.createTextNode('Signed out'));
            a.appendChild(cornerDiv);
            a.addEventListener('click', () => {
                if (window.browser) {
                    browser.tabs.query({ // Get current tab
                        active: true,
                        currentWindow: true
                    }).then(signIn(info[3])); // Navigate to sign in page
                } else {
                    chrome.tabs.query({ // Get current tab
                        active: true,
                        currentWindow: true
                    }, signIn(info[3])); // Navigate to signin
                }
            });
        } else {
            if (info[7] == 0) { // Account index (pretty sure)
                let cornerDiv = document.createElement('div');
                cornerDiv.classList.add('corner')
                cornerDiv.appendChild(document.createTextNode('Default'));
                a.appendChild(cornerDiv);
            }
            a.addEventListener('click', setURL(info[7])); // Again, account index (pretty sure)
        }
        
        document.body.appendChild(a);
    });
}

if (window.browser) {
    browser.runtime.sendMessage(null).then(populate); // Get user list from background script (to elleviate cross-origin issues)
} else {
    chrome.runtime.sendMessage(null, populate); // Get user list from background script (to elleviate cross-origin issues)
}