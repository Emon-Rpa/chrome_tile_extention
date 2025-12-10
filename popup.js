const tabCountSelect = document.getElementById("tabCount");
const urlContainer = document.getElementById("urlContainer");

// Load saved data from localStorage
function loadSavedData() {
    const savedCount = localStorage.getItem("tabCount");
    const savedUrls = localStorage.getItem("savedUrls");
    
    if (savedCount) {
        tabCountSelect.value = savedCount;
    }
    
    return savedUrls ? JSON.parse(savedUrls) : null;
}

// Save data to localStorage
function saveData(count, urls) {
    localStorage.setItem("tabCount", count.toString());
    localStorage.setItem("savedUrls", JSON.stringify(urls));
}

// Create URL inputs based on selected tab count
function createInputs(count, savedUrls = null) {
    urlContainer.innerHTML = "";
    for (let i = 1; i <= count; i++) {
        const input = document.createElement("input");
        input.type = "text";
        input.id = `u${i}`;
        input.className = "url-input";
        input.placeholder = `URL ${i} (e.g., https://example.com)`;
        
        // Load saved URL if available
        if (savedUrls && savedUrls[i - 1]) {
            input.value = savedUrls[i - 1];
        }
        
        // Auto-save on input
        input.addEventListener("input", () => {
            saveCurrentInputs();
        });
        
        urlContainer.appendChild(input);
    }
}

// Save current inputs to localStorage
function saveCurrentInputs() {
    const count = parseInt(tabCountSelect.value);
    const urls = [];
    for (let i = 1; i <= count; i++) {
        const input = document.getElementById(`u${i}`);
        if (input) {
            urls.push(input.value.trim());
        }
    }
    saveData(count, urls);
}

// Initialize with saved data or default
const savedUrls = loadSavedData();
const initialCount = savedUrls ? parseInt(localStorage.getItem("tabCount")) || 6 : 6;
createInputs(initialCount, savedUrls);

// Update inputs when tab count changes
tabCountSelect.addEventListener("change", (e) => {
    const newCount = parseInt(e.target.value);
    const currentUrls = [];
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`u${i}`);
        if (input) {
            currentUrls.push(input.value.trim());
        }
    }
    createInputs(newCount, currentUrls);
    saveCurrentInputs();
});

// Open multi-panel view
document.getElementById("go").addEventListener("click", () => {
    const count = parseInt(tabCountSelect.value);
    const urls = [];

    for (let i = 1; i <= count; i++) {
        const val = document.getElementById(`u${i}`).value.trim();
        if (val) {
            // Add https:// if no protocol is specified
            const url = val.startsWith("http://") || val.startsWith("https://") 
                ? val 
                : `https://${val}`;
            urls.push(url);
        } else {
            urls.push("about:blank");
        }
    }

    // Save the URLs before opening
    saveData(count, urls);

    const param = encodeURIComponent(JSON.stringify(urls));
    const countParam = encodeURIComponent(count.toString());

    chrome.tabs.create({
        url: chrome.runtime.getURL(`panel.html?u=${param}&count=${countParam}`)
    });
});
