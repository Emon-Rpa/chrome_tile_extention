const params = new URLSearchParams(window.location.search);
const urls = JSON.parse(decodeURIComponent(params.get("u")));
const count = parseInt(decodeURIComponent(params.get("count") || "6"));

// Determine grid layout based on count
let cols, rows;
if (count === 2) {
    cols = 2;
    rows = 1;
} else if (count === 4) {
    cols = 2;
    rows = 2;
} else if (count === 6) {
    cols = 3;
    rows = 2;
} else {
    // Default: try to make it as square as possible
    cols = Math.ceil(Math.sqrt(count));
    rows = Math.ceil(count / cols);
}

// Get panel container and address bar
const panelContainer = document.getElementById("panelContainer");
const addressInput = document.getElementById("addressInput");
const fitToggle = document.getElementById("fitToggle");

// Set grid template on panel container
panelContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
panelContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

// Track panels and selected panel
const panels = [];
let selectedPanelIndex = 0;
let fitToTile = true;

// Load fit preference
const savedFit = localStorage.getItem("fitToTile");
if (savedFit === "false") {
    fitToTile = false;
}
fitToggle.checked = fitToTile;

// Apply fit/scale + zoom to a panel iframe
function applyFit(panel) {
    if (!panel || !panel.container || !panel.iframe) return;
    const iframe = panel.iframe;
    const cw = panel.container.clientWidth || 1;
    const ch = panel.container.clientHeight || 1;
    const baseW = 1366; // typical desktop width
    const baseH = 768;  // typical desktop height
    const fitScale = fitToTile ? Math.min(1, cw / baseW, ch / baseH) : 1;
    const zoom = panel.zoom || 1;
    const totalScale = fitScale * zoom;

    iframe.style.transform = `scale(${totalScale})`;
    iframe.style.transformOrigin = "top left";
    iframe.style.width = `${100 / totalScale}%`;
    iframe.style.height = `${100 / totalScale}%`;

    // allow scrolling when zoomed in
    if (totalScale > 1.01) {
        iframe.style.overflow = "auto";
        panel.container.style.overflow = "auto";
        iframe.setAttribute("scrolling", "auto");
    } else {
        iframe.style.overflow = "hidden";
        panel.container.style.overflow = "hidden";
        iframe.setAttribute("scrolling", "no");
    }
}

function applyFitAll() {
    panels.forEach(applyFit);
}

// Function to update address bar
function updateAddressBar(index) {
    if (panels[index] && panels[index].currentUrl) {
        addressInput.value = panels[index].currentUrl;
    }
}

// Function to select a panel
function selectPanel(index) {
    // Save current address bar value before switching
    if (panels[selectedPanelIndex] && addressInput.value.trim()) {
        panels[selectedPanelIndex].pendingUrl = addressInput.value.trim();
    }
    
    // Remove selection from all panels
    panels.forEach((panel, i) => {
        if (panel.container) {
            panel.container.classList.remove("panel-selected");
        }
    });
    
    // Select the clicked panel
    if (panels[index] && panels[index].container) {
        panels[index].container.classList.add("panel-selected");
        selectedPanelIndex = index;
        updateAddressBar(index);
        // Restore pending URL if exists
        if (panels[index].pendingUrl) {
            addressInput.value = panels[index].pendingUrl;
        }
    }
}

// Save panel state to localStorage
function savePanelState() {
    const state = {
        urls: panels.map(p => p.currentUrl || ""),
        zooms: panels.map(p => p.zoom || 1),
        count: count,
        selectedIndex: selectedPanelIndex,
        fitToTile: fitToTile
    };
    localStorage.setItem("panelState", JSON.stringify(state));
}

// Handle address bar input - save on every change
addressInput.addEventListener("input", () => {
    // Save state as user types
    if (panels[selectedPanelIndex]) {
        panels[selectedPanelIndex].pendingUrl = addressInput.value;
    }
});

// Toggle fit-to-tile
fitToggle.addEventListener("change", () => {
    fitToTile = fitToggle.checked;
    localStorage.setItem("fitToTile", fitToTile ? "true" : "false");
    applyFitAll();
});

// Handle address bar navigation
addressInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        const newUrl = addressInput.value.trim();
        if (newUrl && panels[selectedPanelIndex]) {
            // Add https:// if no protocol is specified
            let urlToLoad = newUrl;
            if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://") && !newUrl.startsWith("about:")) {
                urlToLoad = `https://${newUrl}`;
            }
            
            // Update the selected panel's iframe
            panels[selectedPanelIndex].iframe.src = urlToLoad;
            panels[selectedPanelIndex].currentUrl = urlToLoad;
            addressInput.value = urlToLoad;
            
            // Save state after navigation
            savePanelState();
        }
    }
});

// Prevent address bar from losing focus unexpectedly
addressInput.addEventListener("blur", (e) => {
    // Small delay to allow clicking buttons
    setTimeout(() => {
        // If user is still interacting, don't lose the value
        if (panels[selectedPanelIndex] && panels[selectedPanelIndex].pendingUrl) {
            addressInput.value = panels[selectedPanelIndex].pendingUrl;
        }
    }, 100);
});

// Create iframes for each URL
urls.forEach((url, index) => {
    if (index < count) {
        const container = document.createElement("div");
        container.style.position = "relative";
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.border = "1px solid #ddd";
        container.style.boxSizing = "border-box";
        container.style.overflow = "hidden";
        container.style.cursor = "pointer";
        container.style.transition = "border 0.2s, box-shadow 0.2s";
        container.style.margin = "0";
        container.style.padding = "0";
        container.style.display = "block";
        
        // Make container clickable to select panel
        container.onclick = (e) => {
            // Don't select if clicking on buttons or overlays
            if (e.target === container || e.target === container.querySelector("iframe")) {
                selectPanel(index);
            }
        };
        
        const iframe = document.createElement("iframe");
        iframe.src = url;
        iframe.style.position = "absolute";
        iframe.style.top = "0";
        iframe.style.left = "0";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        iframe.style.margin = "0";
        iframe.style.padding = "0";
        iframe.style.display = "block";
        iframe.style.overflow = "auto"; // allow scrolling inside the tile
        iframe.style.backgroundColor = "#fff";
        iframe.allow = "fullscreen; autoplay; encrypted-media; picture-in-picture";
        iframe.setAttribute("allowfullscreen", "true");
        iframe.setAttribute("loading", "lazy");
        iframe.setAttribute("scrolling", "auto"); // show scrollbars when needed
        
        // Track current URL and zoom for this panel
        const panelData = {
            container: container,
            iframe: iframe,
            currentUrl: url,
            index: index,
            zoom: 1
        };
        panels.push(panelData);
        
        // Update URL when iframe navigates (if possible)
        iframe.onload = () => {
            try {
                // Try to get the current URL from iframe
                const iframeUrl = iframe.contentWindow.location.href;
                panelData.currentUrl = iframeUrl;
                if (selectedPanelIndex === index) {
                    updateAddressBar(index);
                }
                // Save state after iframe loads
                savePanelState();
            } catch (e) {
                // Cross-origin - can't access, keep current URL
                savePanelState();
            }
        };
        
        // Floating controls
        const openButton = document.createElement("button");
        openButton.innerHTML = "&#8599;"; // ↗ arrow using HTML entity
        openButton.title = "Open in New Tab";
        const zoomInButton = document.createElement("button");
        zoomInButton.textContent = "+";
        zoomInButton.title = "Zoom in";
        const zoomOutButton = document.createElement("button");
        zoomOutButton.textContent = "–";
        zoomOutButton.title = "Zoom out";

        const controlStyle = (btn) => {
            btn.style.position = "absolute";
            btn.style.width = "32px";
            btn.style.height = "32px";
            btn.style.padding = "0";
            btn.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
            btn.style.color = "white";
            btn.style.border = "none";
            btn.style.borderRadius = "4px";
            btn.style.cursor = "pointer";
            btn.style.fontSize = "16px";
            btn.style.fontWeight = "bold";
            btn.style.zIndex = "120";
            btn.style.opacity = "0.8";
            btn.style.transition = "all 0.2s";
            btn.style.display = "flex";
            btn.style.alignItems = "center";
            btn.style.justifyContent = "center";
            btn.onmouseenter = () => {
                btn.style.opacity = "1";
                btn.style.backgroundColor = "rgba(76, 175, 80, 0.95)";
                btn.style.transform = "scale(1.05)";
            };
            btn.onmouseleave = () => {
                btn.style.opacity = "0.8";
                btn.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
                btn.style.transform = "scale(1)";
            };
        };

        controlStyle(openButton);
        controlStyle(zoomInButton);
        controlStyle(zoomOutButton);

        // Position controls
        openButton.style.top = "8px";
        openButton.style.right = "8px";

        zoomInButton.style.top = "8px";
        zoomInButton.style.left = "8px";

        zoomOutButton.style.top = "48px";
        zoomOutButton.style.left = "8px";

        openButton.onclick = (e) => {
            e.stopPropagation();
            chrome.tabs.create({ url: panelData.currentUrl || url });
        };

        const clampZoom = (z) => Math.min(3, Math.max(0.5, z));
        const handleZoom = (delta) => {
            panelData.zoom = clampZoom((panelData.zoom || 1) + delta);
            applyFit(panelData);
            savePanelState();
        };

        zoomInButton.onclick = (e) => {
            e.stopPropagation();
            handleZoom(0.1);
        };

        zoomOutButton.onclick = (e) => {
            e.stopPropagation();
            handleZoom(-0.1);
        };
        
        // Error overlay (shown when iframe is blocked)
        const errorOverlay = document.createElement("div");
        errorOverlay.style.position = "absolute";
        errorOverlay.style.top = "0";
        errorOverlay.style.left = "0";
        errorOverlay.style.width = "100%";
        errorOverlay.style.height = "100%";
        errorOverlay.style.backgroundColor = "rgba(255, 255, 255, 0.98)";
        errorOverlay.style.display = "none";
        errorOverlay.style.flexDirection = "column";
        errorOverlay.style.alignItems = "center";
        errorOverlay.style.justifyContent = "center";
        errorOverlay.style.padding = "20px";
        errorOverlay.style.boxSizing = "border-box";
        errorOverlay.style.textAlign = "center";
        errorOverlay.style.fontFamily = "Arial, sans-serif";
        errorOverlay.style.zIndex = "50";
        errorOverlay.style.backdropFilter = "blur(2px)";
        
        const errorIcon = document.createElement("div");
        errorIcon.textContent = "🚫";
        errorIcon.style.fontSize = "48px";
        errorIcon.style.marginBottom = "15px";
        
        const errorTitle = document.createElement("div");
        errorTitle.textContent = "Site Cannot Be Embedded";
        errorTitle.style.marginBottom = "10px";
        errorTitle.style.color = "#333";
        errorTitle.style.fontSize = "16px";
        errorTitle.style.fontWeight = "bold";
        
        const errorText = document.createElement("div");
        errorText.textContent = "This website blocks iframe embedding for security reasons.";
        errorText.style.marginBottom = "20px";
        errorText.style.color = "#666";
        errorText.style.fontSize = "13px";
        errorText.style.maxWidth = "250px";
        errorText.style.lineHeight = "1.4";
        
        const errorOpenButton = document.createElement("button");
        errorOpenButton.textContent = "Open in New Tab";
        errorOpenButton.style.padding = "12px 24px";
        errorOpenButton.style.backgroundColor = "#4CAF50";
        errorOpenButton.style.color = "white";
        errorOpenButton.style.border = "none";
        errorOpenButton.style.borderRadius = "6px";
        errorOpenButton.style.cursor = "pointer";
        errorOpenButton.style.fontSize = "14px";
        errorOpenButton.style.fontWeight = "500";
        errorOpenButton.style.transition = "background-color 0.2s";
        errorOpenButton.onmouseenter = () => {
            errorOpenButton.style.backgroundColor = "#45a049";
        };
        errorOpenButton.onmouseleave = () => {
            errorOpenButton.style.backgroundColor = "#4CAF50";
        };
        errorOpenButton.onclick = () => {
            chrome.tabs.create({ url: panelData.currentUrl || url });
        };
        
        errorOverlay.appendChild(errorIcon);
        errorOverlay.appendChild(errorTitle);
        errorOverlay.appendChild(errorText);
        errorOverlay.appendChild(errorOpenButton);
        
        // Detect if iframe is blocked and show error overlay
        // Note: Due to browser security, we can't reliably detect blocked iframes
        // for cross-origin sites, so we use a timeout-based approach
        let contentLoaded = false;
        let errorTimeout;
        
        // Check if content loaded successfully
        const checkContent = () => {
            try {
                const doc = iframe.contentDocument || iframe.contentWindow.document;
                if (doc && doc.body) {
                    const bodyText = doc.body.innerText || "";
                    // Check for error messages indicating blocking
                    if (bodyText.includes("refused") || 
                        bodyText.includes("X-Frame-Options") ||
                        bodyText.includes("frame-ancestors") ||
                        bodyText.includes("denied")) {
                        errorOverlay.style.display = "flex";
                        contentLoaded = false;
                        return;
                    }
                    // If body has content, assume it loaded
                    if (doc.body.children.length > 0 || bodyText.trim().length > 0) {
                        contentLoaded = true;
                        errorOverlay.style.display = "none";
                        return;
                    }
                }
            } catch (e) {
                // Cross-origin - can't access, but this usually means content is there
                // For cross-origin, we assume it loaded unless we see the broken page icon
                contentLoaded = true;
            }
        };
        
        // Combined onload handler for URL tracking and content checking
        iframe.onload = () => {
            // Update URL tracking
            try {
                const iframeUrl = iframe.contentWindow.location.href;
                panelData.currentUrl = iframeUrl;
                if (selectedPanelIndex === index) {
                    updateAddressBar(index);
                }
            } catch (e) {
                // Cross-origin - can't access, but that's normal
            }
            
            // Wait a bit for content to render, then check
            setTimeout(() => {
                checkContent();
                applyFit(panelData);
                savePanelState();
            }, 1500);
        };
        
        // Show error overlay after delay if content didn't load
        // This catches sites that block iframe embedding
        errorTimeout = setTimeout(() => {
            if (!contentLoaded) {
                checkContent();
                // If still no content, show error (might be blocked)
                if (!contentLoaded) {
                    // For cross-origin, we can't be sure, so don't show error
                    // Error overlay will only show for same-origin blocked sites
                }
            }
        }, 4000);
        
        // Clear timeout if content loads successfully
        iframe.addEventListener('load', () => {
            setTimeout(() => {
                if (contentLoaded) {
                    clearTimeout(errorTimeout);
                }
            }, 2000);
        }, { once: true });
        
        container.appendChild(iframe);
        container.appendChild(openButton);
        container.appendChild(zoomInButton);
        container.appendChild(zoomOutButton);
        container.appendChild(errorOverlay);
        panelContainer.appendChild(container);
        applyFit(panelData);
    }
});

// Load saved panel state if available
function loadPanelState() {
    try {
        const savedState = localStorage.getItem("panelState");
        if (savedState) {
            const state = JSON.parse(savedState);
            // Only use saved state if count matches
            if (state.count === count && state.urls.length === count) {
                // Update URLs if they differ
                state.urls.forEach((savedUrl, index) => {
                    if (panels[index] && savedUrl && savedUrl !== urls[index]) {
                        panels[index].iframe.src = savedUrl;
                        panels[index].currentUrl = savedUrl;
                    }
                });
                // Restore zooms
                if (state.zooms && Array.isArray(state.zooms)) {
                    state.zooms.forEach((z, idx) => {
                        if (panels[idx]) {
                            panels[idx].zoom = z || 1;
                        }
                    });
                    applyFitAll();
                }
                // Restore fit toggle
                if (typeof state.fitToTile === "boolean") {
                    fitToTile = state.fitToTile;
                    fitToggle.checked = fitToTile;
                    applyFitAll();
                }
                // Restore selected panel
                if (state.selectedIndex >= 0 && state.selectedIndex < panels.length) {
                    selectPanel(state.selectedIndex);
                }
            }
        }
    } catch (e) {
        console.log("Could not load saved state:", e);
    }
}

// Select first panel by default
if (panels.length > 0) {
    selectPanel(0);
    // Try to load saved state after a short delay
    setTimeout(loadPanelState, 100);
}

// Re-apply fit on resize
window.addEventListener("resize", () => {
    applyFitAll();
});

